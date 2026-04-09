// Fix #17: Versão incrementada para invalidar cache de convidados antigos
// Incremente CACHE_VERSION sempre que fizer importação em massa ou mudar o schema
const CACHE_VERSION = 3;
const CACHE_NAME = `zenith-edge-v${CACHE_VERSION}`;
const API_CACHE_NAME = `zenith-api-cache-v${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Intercepta requisições de API com estratégia Network-First e Fallback
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Salva uma cópia no cache se for um GET bem-sucedido
          if (event.request.method === 'GET' && response.status === 200) {
            const resClone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(event.request, resClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback para cache se a rede falhar
          return caches.match(event.request);
        })
    );
    return;
  }

  // Estáticos: Cache-First
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// BACKGROUND SYNC (Zenith Standard)
self.addEventListener('sync', (event) => {
    if (event.tag === 'zenith-edge-sync') {
        console.log('🔄 SW: Iniciando Sincronização em Background...');
        // O sincronismo é gerenciado pelo componente ZenithEdge no frontend, 
        // mas aqui poderíamos rodar a lógica completa se o dbLocal estivesse no worker.
    }
});
