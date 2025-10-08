const CACHE_NAME = 'blog-poster-v1';
const urlsToCache = [
  '/secret/post.html',
  '/secret/manifest.json',
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event - COMPLETELY EXCLUDE Firebase and Google domains
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // List of Firebase/Google domains to completely ignore
  const firebaseDomains = [
    'firebaseapp.com',
    'googleapis.com',
    'firebasestorage.googleapis.com',
    'firestore.googleapis.com',
    'firebase.googleapis.com',
    'gstatic.com',
    'google.com'
  ];

  // Check if request is to any Firebase domain
  const isFirebaseRequest = firebaseDomains.some(domain => url.includes(domain));

  if (isFirebaseRequest) {
    // Don't intercept at all - let it pass through completely
    return;
  }

  // Only handle your own domain's GET requests
  if (event.request.method === 'GET' &&
      url.startsWith(self.location.origin) &&
      !isFirebaseRequest) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request);
        })
        .catch(() => {
          // If cache fails, try network
          return fetch(event.request);
        })
    );
  }
});
