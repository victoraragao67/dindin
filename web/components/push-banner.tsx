'use client'

import { useEffect, useState } from 'react'
import { subscribeToPush } from '@/lib/push/subscribe'

const STORAGE_KEY = 'push_recusas'
const MAX_RECUSAS = 2

type Props = {
  onSubscribed: () => void
}

export function PushBanner({ onSubscribed }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Só mostrar se:
    // 1. PWA instalado (standalone)
    // 2. Notificações suportadas
    // 3. Permissão ainda não concedida nem negada
    // 4. Usuário não recusou 2x
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const suportado    = 'Notification' in window && 'serviceWorker' in navigator
    const permissao    = 'Notification' in window ? Notification.permission : 'denied'
    const recusas      = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10)

    if (isStandalone && suportado && permissao === 'default' && recusas < MAX_RECUSAS) {
      setVisible(true)
    }
  }, [])

  async function handleAceitar() {
    setVisible(false)
    const subscription = await subscribeToPush()
    if (!subscription) return

    try {
      const { p256dh, auth } = subscription.toJSON().keys as { p256dh: string; auth: string }
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint:  subscription.endpoint,
          p256dh,
          auth,
          userAgent: navigator.userAgent,
        }),
      })
      onSubscribed()
    } catch (err) {
      console.error('[push-banner] erro ao salvar subscription:', err)
    }
  }

  function handleRecusar() {
    const recusas = parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10)
    localStorage.setItem(STORAGE_KEY, String(recusas + 1))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="mx-4 mt-3 rounded-xl bg-slate-800 border border-slate-700 px-4 py-4 shadow-lg">
      <p className="text-white text-sm font-medium mb-1">🔔 Quer ser lembrado?</p>
      <p className="text-slate-400 text-xs mb-4 leading-relaxed">
        Avisamos 1x por dia, às 22h, para você registrar os gastos.
      </p>
      <div className="flex gap-3">
        <button
          onClick={handleRecusar}
          className="flex-1 py-2.5 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600 transition-colors"
        >
          Agora não
        </button>
        <button
          onClick={handleAceitar}
          className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors"
        >
          Sim, quero!
        </button>
      </div>
    </div>
  )
}
