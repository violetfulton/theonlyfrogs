const CACHE_NAME = 'blog-poster-cache-v1';
const URLS_TO_CACHE = [
  '/secret/post.html',
  '/secret/manifest.json',
  '/_scripts/firebaseConfig.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
