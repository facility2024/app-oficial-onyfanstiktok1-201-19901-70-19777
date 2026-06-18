// KILL SWITCH — desativa Service Worker legado (PWA antigo)
// Substitui o SW antigo (onytiktok-v3-mobile) que servia bundle defasado
// causando avatares "Usuário/default" no app publicado.
//
// Comportamento: ativa imediatamente, limpa os caches conhecidos deste app,
// se desregistra e força reload das abas abertas para baixar a build nova.

const APP_CACHE_PREFIXES = [
  'onytiktok-',
  'video-cache-',
  'api-cache-',
  'assets-cache-',
];

function isAppCache(name) {
  return APP_CACHE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const appCaches = cacheNames.filter(isAppCache);
        await Promise.allSettled(appCaches.map((name) => caches.delete(name)));

        await self.clients.claim();

        const windowClients = await self.clients.matchAll({ type: 'window' });
        await Promise.allSettled(
          windowClients.map((client) => client.navigate(client.url))
        );
      } finally {
        await self.registration.unregister();
      }
    })()
  );
});

// Pass-through: não intercepta nenhuma requisição
self.addEventListener('fetch', () => {});
