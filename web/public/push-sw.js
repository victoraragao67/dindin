/**
 * Service Worker STANDALONE e MÍNIMO para Push Notifications.
 *
 * Registrado em escopo /push-handler/ — independente do SW gerado
 * pelo next-pwa. Não tem precaching, não usa workbox, ativa em < 100ms.
 *
 * Por que existe: o SW do next-pwa tem workbox + precaching de ~40 arquivos,
 * o que em 4G lento pode levar 30s+ para ativar. Este SW não tem nada disso.
 */

// Ativa imediatamente sem esperar que clientes fechem
self.skipWaiting()

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: '💚 Nosso DinDin', body: event.data.text(), url: '/' }
  }

  const { title = '💚 Nosso DinDin', body = '', url = '/' } = payload

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url },
      requireInteraction: false,
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url)
            return client.focus()
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url)
        }
      })
  )
})
