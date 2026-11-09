let CACHE_NAME = 'site-v1'; // 預設值，啟動後會更新

const FILES = [
  './index.htm',
  './manifest.json',
  './version.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    fetch('./version.json')
      .then(r => r.json())
      .then(({ version }) => {
        CACHE_NAME = 'site-' + version;
        return caches.open(CACHE_NAME).then(cache => cache.addAll(FILES));
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    fetch('./version.json')
      .then(r => r.json())
      .then(({ version }) => {
        CACHE_NAME = 'site-' + version;
        return Promise.all([
          clients.claim(),
          caches.keys().then(keys =>
            Promise.all(
              keys.filter(key => key !== CACHE_NAME)
                  .map(key => caches.delete(key))
            )
          )
        ]);
      })
  );
});

self.addEventListener('fetch', event => {

  // 排除非 http/https 請求
  if (!event.request.url.startsWith('http')) return;
  
  event.respondWith(
    caches.match(event.request).then(res => {

      if (res) {
		return res;
	  }

      // 沒有快取，去網路拿，拿到後存起來
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });

        return response;
      });
    })
  );
});