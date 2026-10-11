export { EotaApi } from './api.mjs';
// All requests pass through this handler before static assets.
const publicPaths = new Map([['/', '/public.html'], ['/index.html', '/public.html'], ['/public.html', '/public.html'], ['/public-background.webp', '/public-background.webp']]);
const mediaExtensions = /\.(css|png|jpe?g|gif|svg|webp|avif|ico|mp3|wav|ogg|m4a|mp4|webm|woff2?|ttf)$/i;
function authorized(request, env) {
 const expected = env.EOTA_BROWSER_ACCESS_KEY;
 const actual = request.headers.get('X-EOTA-Access') || '';
 if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/.test(expected) || actual.length !== 64) return false;
 let difference = 0;
 for (let i=0;i<64;i++) difference |= expected.charCodeAt(i) ^ actual.charCodeAt(i);
 return difference === 0;
}
function protectedResponse(response) {
 const headers = new Headers(response.headers);
 headers.set('Cache-Control', 'private, no-store');
 headers.set('Vary', 'X-EOTA-Access');
 headers.set('X-Content-Type-Options', 'nosniff');
 return new Response(response.body, {status:response.status, statusText:response.statusText, headers});
}
export default {
 async fetch(request, env, ctx) {
  const url = new URL(request.url);
  const access = authorized(request, env);
  if (!access) {
   const target = publicPaths.get(url.pathname);
   if (!target || !['GET','HEAD'].includes(request.method)) return protectedResponse(Response.json({reason:'EOTA_BROWSER_REQUIRED'}, {status:403}));
   url.pathname = target;
   url.search = '';
   return protectedResponse(await env.ASSETS.fetch(new Request(url, {method:request.method})));
  }
  if (url.pathname.startsWith('/api/')) {
   if (!env.EOTA_API) return protectedResponse(Response.json({reason:'SERVER_CONFIGURATION_ERROR'}, {status:503}));
   const id=env.EOTA_API.idFromName(url.hostname);
   return protectedResponse(await env.EOTA_API.get(id).fetch(request));
  }
  if (!['GET','HEAD'].includes(request.method)) return protectedResponse(new Response('Method not allowed', {status:405}));
  if (url.pathname === '/' || url.pathname === '/index.html') url.pathname = '/index.html';
  else if (!publicPaths.has(url.pathname) && !mediaExtensions.test(url.pathname)) return protectedResponse(new Response('Not found', {status:404}));
  return protectedResponse(await env.ASSETS.fetch(new Request(url, request)));
 }
};
