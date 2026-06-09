/**
 * Utilitário SERVER-SIDE para enviar Web Push de Server Actions.
 *
 * Requer em Vercel (além do NEXT_PUBLIC_VAPID_PUBLIC_KEY já existente):
 *   VAPID_SUBJECT   → ex: "mailto:victor@example.com"
 *   VAPID_PRIVATE_KEY → chave privada VAPID
 */
import webpush from 'web-push'

let initialized = false

function init() {
  if (initialized) return
  const subject    = process.env.VAPID_SUBJECT
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  if (!subject || !publicKey || !privateKey) {
    console.warn('[push/send-server] VAPID keys não configuradas — push ignorado')
    return
  }
  webpush.setVapidDetails(subject, publicKey, privateKey)
  initialized = true
}

export type PushPayload = {
  title: string
  body:  string
  url?:  string
}

type Sub = { endpoint: string; p256dh: string; auth: string }

/**
 * Envia push para uma lista de subscriptions.
 * Fire-and-forget seguro: erros são logados mas não propagados.
 * Subscriptions com status 410 devem ser desativadas pelo chamador.
 */
export async function sendPushToSubs(subs: Sub[], payload: PushPayload): Promise<void> {
  init()
  if (!initialized || subs.length === 0) return

  await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? '/' })
      ).catch(err => {
        const status = (err as { statusCode?: number }).statusCode
        console.warn(`[push/send-server] falha ao enviar (status ${status}):`, sub.endpoint)
      })
    )
  )
}
