/* sw.js – 세무 계산 앱 런처 PWA 서비스 워커 */
const CACHE_NAME = 'tax-launcher-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

// 빠른 업데이트를 위해 메시지로 skipWaiting 지원
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 설치: 핵심 정적 리소스 프리캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  );
});

// 활성화: 오래된 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)))).then(() => self.clients.claim())
  );
});

// 네비게이션 요청은 Network-first, 정적 리소스는 Cache-first
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 외부 원본은 패스
  if (url.origin !== location.origin) return;

  // HTML navigation: network-first with fallback to cache
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // 기타: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, copy));
        return res;
      });
    })
  );
});
