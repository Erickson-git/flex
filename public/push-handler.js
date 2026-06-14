/* global self */
// Handlers de notifications push, importés dans le service worker FLEX.
// - Messages / likes / etc. : notif classique + son côté app (postMessage).
// - Appels (tag 'call') : notif PERSISTANTE (requireInteraction) + bouton
//   « Répondre », et fermeture automatique quand l'appelant raccroche
//   (push { cancel: true }).

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' }
  }

  event.waitUntil(
    (async () => {
      const isCall = data.tag === 'call'

      // L'appelant a raccroché / l'appel est fini → on ferme la notif d'appel.
      if (data.cancel) {
        const existing = await self.registration.getNotifications({ tag: data.tag || 'call' })
        existing.forEach((n) => n.close())
        return
      }

      const options = {
        body: data.body || '',
        icon: '/icons/icon-192.jpg',
        badge: '/icons/icon-192.jpg',
        tag: data.tag,
        renotify: !!data.tag,
        data: { url: data.url || '/app' },
        vibrate: isCall ? [300, 200, 300, 200, 300, 200, 300] : [80, 40, 80],
        requireInteraction: isCall, // l'appel reste affiché jusqu'à interaction
      }
      if (isCall) {
        options.actions = [{ action: 'accept', title: '📞 Répondre' }]
      }

      await self.registration.showNotification(data.title || 'FLEX', options)

      // Pastille de comptage sur l'icône (app fermée). Si le serveur fournit
      // `data.badge`, on l'utilise ; sinon une pastille générique. L'app
      // recalcule le nombre exact dès sa réouverture.
      if (!isCall) {
        try {
          if (self.navigator && self.navigator.setAppBadge) {
            self.navigator.setAppBadge(typeof data.badge === 'number' ? data.badge : undefined)
          }
        } catch (e) {
          /* Badging non supporté */
        }
      }

      // Prévient les onglets ouverts pour jouer le son (~1 s) / la sonnerie.
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clients) client.postMessage({ type: 'flex-push', payload: data })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/app'
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        if ('focus' in client) {
          try {
            await client.navigate(url)
          } catch (e) {
            /* navigation peut échouer — on focus quand même */
          }
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    })(),
  )
})
