/**
 * Client-side: registra o service worker e cria a PushSubscription.
 * Retorna null se o browser não suporta ou se a permissão foi negada.
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  try {
    const registration = await navigator.serviceWorker.ready

    const existing = await registration.pushManager.getSubscription()
    if (existing) return existing

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) {
      console.error('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY não configurada')
      return null
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    })

    return subscription
  } catch (err) {
    console.error('[push] erro ao criar subscription:', err)
    return null
  }
}

/** Converte a VAPID public key de base64url para Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw     = atob(base64)
  const output  = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}
