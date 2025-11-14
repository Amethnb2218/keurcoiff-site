const CACHE_NAME = 'keurcoiff-v2.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/reservation.html',
  '/paiement.html',
  '/confirmation.html',
  '/404.html',
  '/profile.html',
  '/mes-reservations.html',
  '/dashboard-coiffeur.html',
  '/login.html',
  '/register.html',
  '/forgot-password.html',
  '/css/styles.css',
  '/js/app.js',
  '/manifest.json'
];

// Installation
self.addEventListener('install', (event) => {
  console.log('🚀 Service Worker installé');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('🎯 Service Worker activé');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Suppression ancien cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});