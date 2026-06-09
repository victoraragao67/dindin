export type SubscribeResult =
  | { ok: true;  subscription: PushSubscription }
  | { ok: false; reason: 'unsupported' | 'denied' | 'sw-timeout' | 'error'; message: string }

/**
 * Client-side: registra o service worker e cria a PushSubscription.
 * Retorna { ok: true, subscription } ou { ok: false, reason, message }.
 */
export async function subscribeToPush(): Promise<SubscribeResult> {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'unsupported', message: 'Fora do browser.' }
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'Seu browser não suporta push. Use Safari (iOS 16.4+) ou Chrome (Android).',
    }
  }

  // Permissão já foi negada anteriormente — não adianta pedir de novo
  if (Notification.permission === 'denied') {
    return {
      ok: false,
      reason: 'denied',
      message: 'Notificações bloqueadas. Vá em Ajustes > Nosso DinDin > Notificações e ative.',
    }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return {
      ok: false,
      reason: 'denied',
      message: 'Permissão negada. Você pode ativar em Ajustes > Nosso DinDin > Notificações.',
    }
  }

  try {
    const registration = await getActiveRegistration()

    const existing = await registration.pushManager.getSubscription()
    if (existing) return { ok: true, subscription: existing }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) {
      console.error('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY não configurada')
      return { ok: false, reason: 'error', message: 'Configuração ausente no servidor.' }
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    })

    return { ok: true, subscription }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[push] erro ao criar subscription:', err)

    if (msg === 'sw-timeout') {
      return {
        ok: false,
        reason: 'sw-timeout',
        message: 'App desatualizado. Feche o Nosso DinDin completamente, aguarde 5s e reabra.',
      }
    }

    return { ok: false, reason: 'error', message: `Erro: ${msg}` }
  }
}

/**
 * Registra um SW mínimo e dedicado ao push (/push-sw.js) em escopo próprio
 * e aguarda sua ativação via statechange.
 *
 * Por que não usa o SW do next-pwa:
 *   O SW gerado pelo next-pwa carrega workbox + roteamento e pode levar
 *   vários segundos para ativar (especialmente na primeira abertura do PWA
 *   ou após atualização). O /push-sw.js é trivial: install + activate
 *   completam em < 100ms em qualquer conexão.
 */
async function getActiveRegistration(): Promise<ServiceWorkerRegistration> {
  // Escopo separado do SW principal (/sw.js) para evitar conflito
  const SCOPE = '/push-handler/'

  // register() retorna o registration imediatamente (mesmo enquanto instalando)
  const reg = await navigator.serviceWorker.register('/push-sw.js', { scope: SCOPE })

  // Caminho feliz: SW já estava ativo de uma sessão anterior
  if (reg.active) return reg

  // SW em waiting (atualização pendente): força skipWaiting
  if (reg.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  // Aguarda ativação pelo evento statechange — muito mais confiável que
  // navigator.serviceWorker.ready, que pode bloquear no SW do next-pwa
  const sw = reg.installing ?? reg.waiting
  if (!sw) throw new Error('sw-timeout')

  return new Promise<ServiceWorkerRegistration>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('sw-timeout')), 30_000)

    sw.addEventListener('statechange', function onState() {
      if (sw.state === 'activated') {
        clearTimeout(timer)
        sw.removeEventListener('statechange', onState)
        resolve(reg)
      } else if (sw.state === 'redundant') {
        clearTimeout(timer)
        sw.removeEventListener('statechange', onState)
        reject(new Error('sw-timeout'))
      }
    })
  })
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
