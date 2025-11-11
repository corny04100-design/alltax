/* sw.js — 재산세 계산 PWA 서비스워커 */
const CACHE_NAME = "tax-launcher-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192-v3.png",
  "./icon-512-v3.png"
];

// ▶ 설치 (Install): 핵심 리소스 사전 캐시
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ▶ 활성화 (Activate): 이전 버전 캐시 정리
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// ▶ 요청 가로채기 (Fetch): 
// HTML은 network-first, 정적 리소스는 cache-first 전략
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // 외부 도메인 요청은 무시
  if (new URL(req.url).origin !== location.origin) return;

  // 네비게이션 요청 (페이지 이동)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match("./index.html")) ||
            new Response("<h1>오프라인입니다</h1>", {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            });
        })
    );
    return;
  }

  // 기타 정적 리소스 (CSS/JS/아이콘 등)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});

// ▶ 메시지 수신: 즉시 업데이트용 (선택 사항)
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
