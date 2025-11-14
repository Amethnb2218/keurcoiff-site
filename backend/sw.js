// backend/utils/sw.js
const path = require('path');
const fs = require('fs');

class ServiceWorkerGenerator {
    constructor() {
        this.cacheName = 'keurcoiff-v2.0.0';
        this.urlsToCache = [
            '/',
            '/index.html',
            '/reservation.html', 
            '/paiement.html',
            '/confirmation.html',
            '/profile.html',
            '/mes-reservations.html',
            '/css/styles.css',
            '/js/app.js'
        ];
    }

    generate() {
        const swContent = `
const CACHE_NAME = '${this.cacheName}';
const urlsToCache = ${JSON.stringify(this.urlsToCache, null, 2)};

// Installation
self.addEventListener('install', (event) => {
    console.log('🚀 Service Worker KeurCoiff installé');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(urlsToCache);
            })
    );
});

// Activation
self.addEventListener('activate', (event) => {
    console.log('🎯 Service Worker KeurCoiff activé');
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

// Fetch - Stratégie Cache First
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Retourne la version cache si disponible
                if (response) {
                    return response;
                }

                // Sinon, fetch du réseau
                return fetch(event.request).then((response) => {
                    // Vérifie si la réponse est valide
                    if(!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone la réponse
                    const responseToCache = response.clone();

                    // Met en cache la nouvelle ressource
                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
            .catch(() => {
                // Fallback pour les pages
                if (event.request.destination === 'document') {
                    return caches.match('/offline.html');
                }
            })
    );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Clic sur les notifications
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({type: 'window'}).then((clientList) => {
            for (const client of clientList) {
                if (client.url === event.notification.data.url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});
        `;

        return swContent;
    }

    saveToFile(outputPath = '../public/sw.js') {
        const content = this.generate();
        const fullPath = path.join(__dirname, outputPath);
        
        // Créer le dossier public s'il n'existe pas
        const publicDir = path.dirname(fullPath);
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, content);
        console.log('✅ Service Worker généré:', fullPath);
    }
}

module.exports = ServiceWorkerGenerator;

// Utilisation
if (require.main === module) {
    const generator = new ServiceWorkerGenerator();
    generator.saveToFile();
}