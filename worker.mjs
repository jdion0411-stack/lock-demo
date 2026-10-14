import { VIDEO_PATH, videoResponse } from './video-stream.mjs';
export { EotaApi } from './api.mjs';
// All requests pass through this handler before static assets.
const publicPaths = new Map([['/', '/public.html'], ['/index.html', '/public.html'], ['/public.html', '/public.html'], ['/public-background.webp', '/public-background.webp']]);
for (const filename of ['eota-browser-demo-mobile.mp4', 'eota-browser-demo.mp4', 'eota-browser-demo-poster.jpg', 'eota-browser-demo.vtt']) publicPaths.set('/' + filename, '/' + filename);
publicPaths.set('/eota-demo-hq-01.mp4', '/eota-demo-hq-01.mp4');
publicPaths.set('/eota-demo-hq-02.mp4', '/eota-demo-hq-02.mp4');
publicPaths.set('/eota-demo-hq-03.mp4', '/eota-demo-hq-03.mp4');
publicPaths.set('/eota-demo-hq-04.mp4', '/eota-demo-hq-04.mp4');
publicPaths.set('/eota-demo-hq-05.mp4', '/eota-demo-hq-05.mp4');
publicPaths.set('/eota-demo-hq-06.mp4', '/eota-demo-hq-06.mp4');
publicPaths.set('/eota-demo-hq-07.mp4', '/eota-demo-hq-07.mp4');
publicPaths.set('/eota-demo-hq-08.mp4', '/eota-demo-hq-08.mp4');
publicPaths.set('/eota-demo-hq-09.mp4', '/eota-demo-hq-09.mp4');
publicPaths.set('/eota-demo-hq-10.mp4', '/eota-demo-hq-10.mp4');
publicPaths.set('/eota-demo-hq-11.mp4', '/eota-demo-hq-11.mp4');
publicPaths.set('/eota-demo-hq-12.mp4', '/eota-demo-hq-12.mp4');
publicPaths.set('/eota-demo-hq-13.mp4', '/eota-demo-hq-13.mp4');
publicPaths.set('/eota-expanded-hq-01.mp4', '/eota-expanded-hq-01.mp4');
publicPaths.set('/eota-expanded-hq-02.mp4', '/eota-expanded-hq-02.mp4');
publicPaths.set('/eota-expanded-hq-03.mp4', '/eota-expanded-hq-03.mp4');
publicPaths.set('/eota-expanded-hq-04.mp4', '/eota-expanded-hq-04.mp4');
publicPaths.set('/eota-expanded-hq-05.mp4', '/eota-expanded-hq-05.mp4');
publicPaths.set('/eota-expanded-hq-06.mp4', '/eota-expanded-hq-06.mp4');
publicPaths.set('/eota-expanded-hq-07.mp4', '/eota-expanded-hq-07.mp4');
publicPaths.set('/eota-expanded-hq-08.mp4', '/eota-expanded-hq-08.mp4');
publicPaths.set('/eota-expanded-hq-09.mp4', '/eota-expanded-hq-09.mp4');
publicPaths.set('/eota-expanded-hq-10.mp4', '/eota-expanded-hq-10.mp4');
publicPaths.set('/eota-expanded-hq-11.mp4', '/eota-expanded-hq-11.mp4');
publicPaths.set('/eota-expanded-hq-12.mp4', '/eota-expanded-hq-12.mp4');
publicPaths.set('/eota-expanded-mobile-01.mp4', '/eota-expanded-mobile-01.mp4');
publicPaths.set('/eota-expanded-mobile-02.mp4', '/eota-expanded-mobile-02.mp4');
publicPaths.set('/eota-expanded-mobile-03.mp4', '/eota-expanded-mobile-03.mp4');
publicPaths.set('/eota-expanded-mobile-04.mp4', '/eota-expanded-mobile-04.mp4');
publicPaths.set('/eota-expanded-mobile-05.mp4', '/eota-expanded-mobile-05.mp4');
for(const filename of ["/eota-hls.min.js", "/eota-mobile.m3u8", "/eota-mobile-000.ts", "/eota-mobile-001.ts", "/eota-mobile-002.ts", "/eota-mobile-003.ts", "/eota-mobile-004.ts", "/eota-mobile-005.ts", "/eota-mobile-006.ts", "/eota-mobile-007.ts", "/eota-mobile-008.ts", "/eota-mobile-009.ts", "/eota-mobile-010.ts", "/eota-mobile-011.ts", "/eota-mobile-012.ts", "/eota-mobile-013.ts", "/eota-mobile-014.ts", "/eota-mobile-015.ts", "/eota-mobile-016.ts", "/eota-mobile-017.ts", "/eota-mobile-018.ts", "/eota-mobile-019.ts", "/eota-mobile-020.ts", "/eota-mobile-021.ts", "/eota-mobile-022.ts", "/eota-mobile-023.ts", "/eota-mobile-024.ts", "/eota-mobile-025.ts", "/eota-mobile-026.ts", "/eota-mobile-027.ts", "/eota-mobile-028.ts", "/eota-mobile-029.ts", "/eota-mobile-030.ts", "/eota-mobile-031.ts", "/eota-mobile-032.ts", "/eota-mobile-033.ts", "/eota-mobile-034.ts", "/eota-mobile-035.ts", "/eota-mobile-036.ts", "/eota-mobile-037.ts", "/eota-mobile-038.ts", "/eota-mobile-039.ts", "/eota-mobile-040.ts", "/eota-mobile-041.ts", "/eota-mobile-042.ts", "/eota-mobile-043.ts", "/eota-mobile-044.ts", "/eota-mobile-045.ts", "/eota-mobile-046.ts", "/eota-mobile-047.ts", "/eota-mobile-048.ts", "/eota-mobile-049.ts", "/eota-mobile-050.ts", "/eota-mobile-051.ts", "/eota-mobile-052.ts", "/eota-mobile-053.ts", "/eota-mobile-054.ts", "/eota-mobile-055.ts", "/eota-mobile-056.ts", "/eota-mobile-057.ts", "/eota-mobile-058.ts", "/eota-mobile-059.ts", "/eota-mobile-060.ts", "/eota-expanded-hq-01.mp4", "/eota-expanded-hq-02.mp4", "/eota-expanded-hq-03.mp4", "/eota-expanded-hq-04.mp4", "/eota-expanded-hq-05.mp4", "/eota-expanded-hq-06.mp4", "/eota-expanded-hq-07.mp4", "/eota-expanded-hq-08.mp4", "/eota-expanded-hq-09.mp4", "/eota-expanded-hq-10.mp4", "/eota-expanded-hq-11.mp4", "/eota-expanded-hq-12.mp4", "/eota-expanded-hq-13.mp4", "/eota-expanded-mobile-01.mp4", "/eota-expanded-mobile-02.mp4", "/eota-expanded-mobile-03.mp4", "/eota-expanded-mobile-04.mp4", "/eota-expanded-mobile-05.mp4", "/eota-expanded-mobile-06.mp4"])publicPaths.set(filename,filename);
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

async function assetResponse(request, env) {
 const response = await env.ASSETS.fetch(request);
 const path = new URL(request.url).pathname;
 if (!/\.(mp4|webm)$/i.test(path) || ![200,206].includes(response.status)) return response;
 const headers = new Headers(response.headers);
 headers.set('Accept-Ranges', 'bytes');
 headers.set('Content-Type', path.endsWith('.webm') ? 'video/webm' : 'video/mp4');
 const range = request.headers.get('Range');
 // Preserve valid partial responses supplied by the asset service.
 if (!range || response.status === 206 || request.method === 'HEAD') {
  return new Response(response.body, {status: response.status, headers});
 }
 // Some asset configurations return the whole file for a Range request.
 // Supply the requested bytes explicitly so native video seeking still works.
 const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
 if (!match || (!match[1] && !match[2])) return new Response(response.body, {status: response.status, headers});
 const bytes = await response.arrayBuffer();
 const size = bytes.byteLength;
 let start, end;
 if (!match[1]) {start = Math.max(0, size - Number(match[2])); end = size - 1;}
 else {start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;}
 if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) {
  headers.set('Content-Range', `bytes */${size}`);
  headers.set('Content-Length', '0');
  return new Response(null, {status:416, headers});
 }
 const part = bytes.slice(start, end + 1);
 headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
 headers.set('Content-Length', String(part.byteLength));
 return new Response(part, {status:206, headers});
}

export default {
 async fetch(request, env, ctx) {
  const url = new URL(request.url);
  if (url.pathname === VIDEO_PATH) return videoResponse(request, env);
  const access = authorized(request, env);
  if (!access) {
   const target = publicPaths.get(url.pathname);
   if (!target || !['GET','HEAD'].includes(request.method)) return protectedResponse(Response.json({reason:'EOTA_BROWSER_REQUIRED'}, {status:403}));
   url.pathname = target;
   url.search = '';
   return protectedResponse(await assetResponse(new Request(url, request), env));
  }
  if (url.pathname.startsWith('/api/')) {
   if (!env.EOTA_API) return protectedResponse(Response.json({reason:'SERVER_CONFIGURATION_ERROR'}, {status:503}));
   const id=env.EOTA_API.idFromName(url.hostname);
   return protectedResponse(await env.EOTA_API.get(id).fetch(request));
  }
  if (!['GET','HEAD'].includes(request.method)) return protectedResponse(new Response('Method not allowed', {status:405}));
  if (url.pathname === '/' || url.pathname === '/index.html') url.pathname = '/index.html';
  else if (!publicPaths.has(url.pathname) && !mediaExtensions.test(url.pathname)) return protectedResponse(new Response('Not found', {status:404}));
  return protectedResponse(await assetResponse(new Request(url, request), env));
 }
};
