const CACHE_NAME = "carefreecasa-v2"
const STATIC_URLS = ["/", "/login"]

self.addEventListener("install", (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_URLS))
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return
  if (event.request.url.includes("/api/")) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
