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
 * Obtém um ServiceWorkerRegistration ativo, aguardando a ativação se necessário.
 *
 * Usa navigator.serviceWorker.ready que é a API padrão e lida internamente
 * com SW em installing/waiting/active. Timeout de 30s para cobrir iOS lento.
 * Se já existe um SW ativo registrado, retorna imediatamente.
 */
async function getActiveRegistration(): Promise<ServiceWorkerRegistration> {
  // SW já ativo — caminho feliz, sem espera
  const reg = await navigator.serviceWorker.getRegistration()
  if (reg?.active) {
    return reg
  }

  // SW em waiting — manda skipWaiting para acelerar a transição
  if (reg?.waiting) {
    reg.waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  // Aguarda o SW ficar ativo (instalar + ativar). 30s cobre iOS lento.
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('sw-timeout')), 30_000)
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
