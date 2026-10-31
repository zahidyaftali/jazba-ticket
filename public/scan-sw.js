// Jazba Scan service worker (scope: /scan). It makes the scanner installable
// as an app and shows a clear message when the phone is offline. Nothing is
// cached: every check needs live data, and every deploy shows up at once.

const OFFLINE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Jazba Scan</title>
<style>
  body { margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
         background: #000; color: #fff; font: 16px/1.5 system-ui, sans-serif; text-align: center; padding: 24px; box-sizing: border-box; }
  h1 { font-size: 24px; margin: 0 0 8px; }
  p { color: rgba(255,255,255,.65); margin: 0 0 24px; }
  button { background: #ffed00; color: #000; border: 0; font: 700 16px system-ui, sans-serif; padding: 14px 24px; }
</style></head><body><div>
  <h1>No internet connection</h1>
  <p>Jazba Scan needs internet to check tickets. Connect to Wi-Fi or mobile data, then try again.</p>
  <button onclick="location.reload()">Try again</button>
</div></body></html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }),
    ),
  );
});
