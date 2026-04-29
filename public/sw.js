self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        clients.claim().then(() => {
            return caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            });
        })
    );
});

self.addEventListener('push', function (event) {
    if (event.data) {
        let data = {};
        try {
            data = event.data.json();
        } catch (e) {
            data = { title: '알림', body: event.data.text() };
        }

        // Service Worker Version: 2.1 (VAPID Key Update)
        const options = {
            body: data.body || '',
            icon: '/somy.png',
            badge: '/somy.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/'
            }
        };

        const notificationPromise = self.registration.showNotification(data.title || '소미 QT', options);

        let badgePromise = Promise.resolve();
        if (data.userId && 'setAppBadge' in navigator) {
            badgePromise = fetch(`/api/notifications?user_id=${data.userId}`)
                .then(res => res.json())
                .then(list => {
                    if (Array.isArray(list)) {
                        const unreadCount = list.filter(n => !n.is_read).length;
                        if (unreadCount > 0) return navigator.setAppBadge(unreadCount);
                        else return navigator.clearAppBadge();
                    }
                })
                .catch(e => console.error('Badge update failed:', e));
        }

        event.waitUntil(Promise.all([notificationPromise, badgePromise]));
    }
});

// [PWA Fix] fetch 핸들러를 추가하여 안드로이드에서 '앱 설치'가 가능하도록 합니다.
// 이 핸들러가 없으면 크롬은 단순한 바로가기만 생성하며, 이는 홈화면에서 쉽게 사라질 수 있습니다.
self.addEventListener('fetch', (event) => {
    // 기본적으로 네트워크 요청을 그대로 통과시킵니다.
    // 향후 오프라인 캐싱이 필요하면 이 부분을 확장할 수 있습니다.
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
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
