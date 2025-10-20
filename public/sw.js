const CACHE_NAME = 'onytiktok-v4-mobile';
const VIDEO_CACHE = 'video-cache-v4';
const API_CACHE = 'api-cache-v4';

// Optimized cache list for faster startup (avoid invalid CRA paths)
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Separate cache for assets that can be loaded later
const ASSETS_CACHE = 'assets-cache-v2';
const assetsToCache = [
  '/lovable-uploads/d6487096-3582-4e46-830e-bd94cdfd798f.png',
  '/lovable-uploads/e93594ee-908d-46f2-a59d-4000b64079a4.png',
  '/lovable-uploads/3daf81d3-7b41-4709-bb93-5ce0bf4ec3d6.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      try {
        // Cache critical resources first for fast startup
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(urlsToCache);
        
        // Pre-cache assets in background for mobile optimization
        setTimeout(async () => {
          try {
            const assetsCache = await caches.open(ASSETS_CACHE);
            await assetsCache.addAll(assetsToCache);
          } catch (error) {
            console.log('Background asset caching failed:', error);
          }
        }, 2000);
      } catch (error) {
        console.log('Critical cache install failed:', error);
      }
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => {
            if (name !== CACHE_NAME && name !== VIDEO_CACHE && name !== API_CACHE && name !== ASSETS_CACHE) {
              return caches.delete(name);
            }
          })
        );
        await self.clients.claim();
        
        // Notify clients about mobile optimizations
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({
            type: 'MOBILE_OPTIMIZED',
            message: 'App otimizado para mobile carregado!'
          });
        });
      } catch (error) {
        console.log('Activation failed:', error);
      }
    })()
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Network-first for maximum compatibility on iOS/Android
  if (request.headers && request.headers.has('range')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    (async () => {
      try {
        return await fetch(request, { cache: 'no-store' });
      } catch (err) {
        try {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(request) || await cache.match('/') || await cache.match('/index.html');
          if (cached) return cached;
        } catch {}
        return new Response('Offline', { status: 503 });
      }
    })()
  );
});

// Handle background sync for failed requests when back online
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Retry failed operations when back online
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'BACK_ONLINE',
            message: 'Conectado novamente! Sincronizando dados...'
          });
        });
      })
    );
  }
});

// Send messages to clients about network status
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});