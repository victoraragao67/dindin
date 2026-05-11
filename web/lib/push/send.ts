/**
 * Server-side: envia uma Web Push notification para uma subscription.
 * setVapidDetails é chamado de forma lazy dentro da função
 * para evitar erro em build time (env vars não disponíveis).
 */
import webpush from 'web-push'

type Subscription = {
  endpoint: string
  p256dh:   string
  auth:     string
}

type Payload = {
  title: string
  body:  string
  url?:  string
}

/**
 * Envia push para um dispositivo.
 * Lança erro se a entrega falhar (incluindo 410 Gone — subscription expirada).
 */
export async function sendPushNotification(
  subscription: Subscription,
  payload: Payload
): Promise<void> {
  // Lazy — chamado em runtime, não em build time
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth:   subscription.auth,
      },
    },
    JSON.stringify({
      title: payload.title,
      body:  payload.body,
      url:   payload.url ?? '/',
    })
  )
}
