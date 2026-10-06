import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import path from 'node:path';

export function installAnalytics(app, root, options = {}) {
  const env = options.env || process.env;
  const request = options.fetch || fetch;
  const projectUrl = String(env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
  const enabled = env.ANALYTICS_ENABLED === 'true' && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(projectUrl) && !!key;
  const password = env.ANALYTICS_ADMIN_PASSWORD || '';
  const adminReady = enabled && password.length >= 20;
  const originList = new Set((env.ANALYTICS_ALLOWED_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean));
  const dailySalt = randomBytes(32);
  const events = new Set(['site_load', 'dial_view', 'file_compress', 'file_open', 'clip_change']);
  const modes = new Set(['lock', 'rhyme', 'eye', 'smdial', 'desktop', 'browser', 'notes', 'clips', 'legal', 'qr', 'files']);
  const rates = new Map(), sessions = new Map();
  const limits = { collect: 90, login: 6 };
  let geoLookup = options.geoLookup || null;
  let geoState = env.ANALYTICS_GEOIP === 'true' ? 'loading' : 'disabled';
  if (env.ANALYTICS_GEOIP === 'true' && !geoLookup) {
    import('geoip-lite').then(module => { geoLookup = (module.default || module).lookup; geoState = 'ready'; }).catch(() => { geoState = 'unavailable'; });
  } else if (geoLookup) geoState = 'ready';
  const clean = (value, max = 80) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : '';
  const same = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
  function clientIp(req) {
    const forwarded = env.RENDER === 'true' ? String(req.get('x-forwarded-for') || '').split(',')[0].trim() : '';
    let ip = forwarded || req.socket.remoteAddress || '';
    if (ip.startsWith('::ffff:')) ip = ip.slice(7);
    return isIP(ip) ? ip : '';
  }
  function allowedOrigin(req) {
    const origin = req.get('origin');
    if (!origin) return false;
    return origin === `${req.protocol}://${req.get('host')}` || originList.has(origin);
  }
  function originGate(req, res, next) {
    if (!allowedOrigin(req)) return res.status(403).json({ error: 'Origin not allowed' });
    res.set('Access-Control-Allow-Origin', req.get('origin'));
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Credentials', 'true');
    return next();
  }
  function limit(req, lane) {
    // Only temporary, salted rate-limit keys live in server memory. No raw IP is persisted.
    const digest = createHmac('sha256', dailySalt).update(lane + clientIp(req)).digest('hex');
    const now = Date.now(), old = rates.get(digest);
    const bucket = old && old.until > now ? old : { count: 0, until: now + 60000 };
    if (!old && rates.size >= 10000) return false;
    bucket.count++; rates.set(digest, bucket);
    return bucket.count <= limits[lane];
  }
  const cleanup = setInterval(() => { const now = Date.now(); for (const [k,v] of rates) if (v.until <= now) rates.delete(k); for (const [k,v] of sessions) if (v <= now) sessions.delete(k); }, 60000);
  cleanup.unref();
  function admin(req, res, next) {
    const cookie = String(req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('eyeota_analytics_admin='));
    const token = cookie?.split('=')[1];
    if (!token || (sessions.get(token) || 0) <= Date.now()) return res.status(401).json({ error: 'Sign in to analytics' });
    next();
  }
  const headers = { apikey: key, 'Content-Type': 'application/json' };
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  async function db(route, body) {
    const response = await request(projectUrl + '/rest/v1/' + route, { method: body ? 'POST' : 'GET', headers, ...(body ? {body: JSON.stringify(body)} : {}), signal: AbortSignal.timeout(7000) });
    if (!response.ok) throw Error('Database request failed');
    return response.status === 204 ? null : response.json();
  }
  app.options('/api/analytics/collect', originGate, (req, res) => { res.set('Access-Control-Allow-Methods','POST, OPTIONS'); res.set('Access-Control-Allow-Headers','Content-Type'); res.status(204).end(); });
  app.get('/api/analytics/config', (req,res) => res.json({ enabled, consentRequired: true }));
  app.post('/api/analytics/collect', originGate, async (req,res) => {
    if (!enabled) return res.status(503).json({ error: 'Analytics not configured' });
    if (req.get('sec-gpc') === '1' || req.get('dnt') === '1') return res.status(204).end();
    const body = req.body || {};
    if (body.consent !== true || !events.has(body.event) || !modes.has(body.mode) || Object.keys(body).some(k => !['consent','event','mode'].includes(k))) return res.status(400).json({ error: 'Invalid analytics event' });
    if (!limit(req, 'collect')) return res.status(429).json({ error: 'Too many events' });
    let city = '', region = '', country = '';
    if (env.ANALYTICS_GEOIP === 'true' && geoLookup) {
      try { const result = geoLookup(clientIp(req)); city = clean(result?.city); region = clean(result?.region); country = clean(result?.country, 2); } catch { /* Unknown location is a valid bucket. */ }
    }
    try {
      await db('rpc/eyeota_record_analytics', { p_event: body.event, p_mode: body.mode, p_city: city, p_region: region, p_country: country });
      return res.status(204).end();
    } catch { return res.status(503).json({ error: 'Analytics temporarily unavailable' }); }
  });
  app.get('/analytics', (req,res) => { res.set('Cache-Control','no-store'); res.sendFile(path.join(root, 'analytics-dashboard.html')); });
  app.post('/api/analytics/admin/login', originGate, (req,res) => {
    if (!adminReady) return res.status(503).json({ error: 'Analytics or dashboard password is not configured' });
    if (!req.secure && env.NODE_ENV === 'production') return res.status(400).json({ error: 'HTTPS required' });
    if (!limit(req,'login')) return res.status(429).json({ error: 'Wait a minute before trying again' });
    if (!same(req.body?.password, password)) return res.status(401).json({ error: 'Password incorrect' });
    if (sessions.size >= 1000) return res.status(503).json({error:'Try later'});
    const token = randomBytes(32).toString('hex'); sessions.set(token, Date.now() + 6 * 60 * 60 * 1000);
    res.cookie('eyeota_analytics_admin', token, {httpOnly:true,secure:req.secure,sameSite:'strict',path:'/api/analytics/admin',maxAge:6*60*60*1000});
    res.json({ signedIn: true });
  });
  app.post('/api/analytics/admin/logout', originGate, (req,res) => {
    const cookie=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('eyeota_analytics_admin='));if(cookie)sessions.delete(cookie.split('=')[1]);
    res.clearCookie('eyeota_analytics_admin',{path:'/api/analytics/admin',sameSite:'strict',secure:req.secure});res.status(204).end();
  });
  app.get('/api/analytics/admin/summary', admin, async (req,res) => {
    try { const result = await db('rpc/eyeota_analytics_summary', { p_days: 30 }); res.json({ ...result, locationLookup: geoState, retentionDays: 90, countsAreEvents: true }); }
    catch { res.status(503).json({ error: 'Could not read analytics. Check Supabase setup.' }); }
  });
  return { enabled, stop: () => cleanup && clearInterval(cleanup) };
}
