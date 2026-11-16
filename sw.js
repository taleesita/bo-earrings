// Bo Earrings Service Worker
const CACHE = 'bo-earrings-v1.2.3';

const PRECACHE = [
  './index.html',
  './earrings.json',
  './icon.png',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7/babel.min.js',
  'https://cdn.tailwindcss.com',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Firebase auth / identity — always network
  if (url.hostname.includes('firebaseio.com') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebase.google.com') ||
      url.hostname.includes('identitytoolkit') ||
      url.hostname.includes('gstatic.com') && url.pathname.includes('firebase')) {
    return; // let browser handle
  }

  // CDN scripts — cache-first (versioned)
  if (url.hostname.includes('unpkg.com') ||
      url.hostname.includes('cdn.tailwindcss.com') ||
      url.hostname.includes('fonts.g') ||
      url.hostname.includes('gstatic.com')) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
    return;
  }

  // earring photos — cache-first (they never change once cropped)
  if (url.pathname.includes('/img/') || url.pathname.includes('/cut/')) {
    e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
      return res;
    })));
    return;
  }

  // earrings.json and app shell — network-first (pick up updates), fall back to cache
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
      return res;
    }).catch(() => caches.match(e.request).then(cached => cached || caches.match('./index.html')))
  );
});
