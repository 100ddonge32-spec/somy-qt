self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        clients.claim().then(() => {
            // 모든 기존 캐시 삭제 (필요한 경우)
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
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: '/somy.png',
            badge: '/somy.png',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/'
            }
        };

        const notificationPromise = self.registration.showNotification(data.title, options);

        // 배지 업데이트 로직 (지원하는 경우)
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
