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
      message: 'Notificações bloqueadas. Vá em Ajustes > DinDin > Notificações e ative.',
    }
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return {
      ok: false,
      reason: 'denied',
      message: 'Permissão negada. Você pode ativar em Ajustes > DinDin > Notificações.',
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
        message: 'Service Worker demorou para ativar. Feche o PWA completamente, aguarde 10s e reabra.',
      }
    }

    return { ok: false, reason: 'error', message: `Erro: ${msg}` }
  }
}

/**
 * Obtém um ServiceWorkerRegistration ativo, aguardando a ativação se necessário.
 *
 * Estratégia em 3 camadas (mais robusta que navigator.serviceWorker.ready puro):
 * 1. Se já existe um SW ativo, usa direto — sem esperar.
 * 2. Se tem SW em "waiting", manda skipWaiting e espera o controllerchange.
 * 3. Fallback: navigator.serviceWorker.ready com timeout de 20s.
 */
async function getActiveRegistration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.getRegistration()

  // Caso ideal: SW já está ativo
  if (reg?.active) {
    console.log('[push] SW já ativo')
    return reg
  }

  // SW em "waiting" — força skipWaiting e aguarda controllerchange
  if (reg?.waiting) {
    console.log('[push] SW em waiting — enviando skipWaiting')
    reg.waiting.postMessage({ type: 'SKIP_WAITING' })

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('sw-timeout')), 10_000)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        clearTimeout(timeout)
        resolve()
      }, { once: true })
    })

    const updated = await navigator.serviceWorker.getRegistration()
    if (updated?.active) return updated
  }

  // SW ainda instalando (ou nenhum registro) — espera com timeout de 20s
  console.log('[push] SW instalando — aguardando ready (20s timeout)')
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('sw-timeout')), 20_000)
    ),
  ])
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
