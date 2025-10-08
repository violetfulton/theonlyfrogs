const CACHE_NAME = 'blog-poster-v1';
const urlsToCache = [
  '/secret/post.html',
  '/secret/manifest.json',
  // Add other static assets you want to cache
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch event - EXCLUDE Firebase domains
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Don't intercept Firebase requests
  if (url.includes('firebaseapp.com') ||
      url.includes('googleapis.com') ||
      url.includes('firebasestorage.googleapis.com') ||
      url.includes('firestore.googleapis.com')) {
    return; // Let Firebase handle these requests directly
  }

  // Only cache GET requests for your own domain
  if (event.request.method === 'GET' && url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request);
        })
    );
  }
});
