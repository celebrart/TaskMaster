const CACHE_NAME = 'taskmaster-v1';
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// Instala o SW e faz cache dos arquivos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Busca no cache antes de fazer requisição pra rede
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Retorna do cache se encontrar, senão vai para a rede
      return response || fetch(event.request);
    })
  );
});
