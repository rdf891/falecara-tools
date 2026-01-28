const CACHE_NAME = 'falecara-tools-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './rescisao.html',
  './salario-liquido.html',
  './seguro-desemprego.html',
  './custo-funcionario.html',
  './politica-privacidade.html',
  './css/style.css',
  './js/main.js',
  './js/simulador-rescisao.js',
  './js/calculadora-salario.js',
  './js/seguro-desemprego.js',
  './js/custo-funcionario.js',
  './js/pdf-generator.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
