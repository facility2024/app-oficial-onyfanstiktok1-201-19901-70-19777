const CACHE_NAME = 'onytiktok-v3-mobile';
const VIDEO_CACHE = 'video-cache-v3';
const API_CACHE = 'api-cache-v3';

// Optimized cache list for faster mobile startup
const urlsToCache = [
  '/',
  '/app',
  '/static/js/bundle.js',
  '/static/css/main.css',
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
  const url = new URL(request.url);
  const isVideo = request.destination === 'video' || /(\.mp4|\.webm|\.m3u8)(\?.*)?$/i.test(url.pathname);
  const isRange = request.headers.has('range');
  const isCDN = /tiktokonyfans\.b-cdn\.net$/i.test(url.hostname);
  const isAPI = url.pathname.includes('/api/') || url.hostname.includes('supabase');
  const isNavigation = request.mode === 'navigate';
  const isSupabaseFunctions = url.hostname.includes('supabase.co') && url.pathname.includes('/functions/v1/');

  // Bypass SW handling for all Supabase function requests to avoid offline false-positives
  if (isSupabaseFunctions) {
    event.respondWith(fetch(request));
    return;
  }

  // Handle navigation requests (page loads) - DISABLED for iOS
  if (isNavigation) {
    // Detect iOS and disable PWA for it
    const userAgent = request.headers.get('User-Agent') || '';
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
    
    if (isIOSDevice) {
      // For iOS, always go to network first and don't cache
      event.respondWith(fetch(request));
      return;
    }
    
    event.respondWith(
      (async () => {
        try {
          // Try network first
          const networkResponse = await fetch(request);
          return networkResponse;
        } catch (error) {
          // If offline, return cached main page
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match('/') || await cache.match('/index.html');
          
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Fallback offline page
          return new Response(
            `<!DOCTYPE html>
            <html>
              <head>
                <title>OnlyTikTok - Offline</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 50px; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                  }
                  .offline-icon { font-size: 60px; margin-bottom: 20px; }
                  h1 { margin-bottom: 10px; }
                  p { margin-bottom: 20px; opacity: 0.8; }
                  button { 
                    background: #fff; 
                    color: #667eea; 
                    border: none; 
                    padding: 10px 20px; 
                    border-radius: 5px; 
                    cursor: pointer; 
                    font-size: 16px;
                  }
                  button:hover { background: #f0f0f0; }
                </style>
              </head>
              <body>
                <div class="offline-icon">📱</div>
                <h1>OnlyTikTok</h1>
                <p>Você está offline</p>
                <p>Verifique sua conexão com a internet e tente novamente.</p>
                <button onclick="window.location.reload()">Tentar Novamente</button>
              </body>
            </html>`,
            {
              headers: { 'Content-Type': 'text/html' }
            }
          );
        }
      })()
    );
    return;
  }

  // Handle video requests - simplified for iOS compatibility
  if (isVideo && isCDN) {
    // Detect iOS and handle differently
    const userAgent = request.headers.get('User-Agent') || '';
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
    
    if (isIOSDevice || isRange) {
      // For iOS or range requests, always fetch directly without caching
      event.respondWith(fetch(request));
      return;
    }

    // For other devices, use limited caching
    event.respondWith(
      (async () => {
        try {
          const resp = await fetch(request);
          return resp;
        } catch (error) {
          // Return error response for offline videos
          return new Response(
            JSON.stringify({
              error: 'Offline',
              message: 'Este vídeo não está disponível offline'
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      })()
    );
    return;
  }

  // Handle API requests
  if (isAPI) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          
          // Cache successful GET requests
          if (request.method === 'GET' && networkResponse.ok) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, networkResponse.clone());
          }
          
          return networkResponse;
        } catch (error) {
          // Try cache for GET requests when offline
          if (request.method === 'GET') {
            const cache = await caches.open(API_CACHE);
            const cachedResponse = await cache.match(request);
            
            if (cachedResponse) {
              return cachedResponse;
            }
          }
          
          // Return offline response
          return new Response(
            JSON.stringify({
              error: 'Offline',
              message: 'Você está offline. Algumas funcionalidades podem não estar disponíveis.',
              cached: false
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      })()
    );
    return;
  }

  // Handle all other requests with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request);
      })
      .catch(() => {
        // Return generic offline response for failed requests
        return new Response(
          'Recurso não disponível offline',
          {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          }
        );
      })
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