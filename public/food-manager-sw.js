self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const current = clients.find((client) => 'focus' in client);
    if (current) {
      await current.focus();
      return;
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow('/');
    }
  })());
});
