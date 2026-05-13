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
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

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
    setLoading(true)
    setErro(null)

    const result = await subscribeToPush()
    if (!result.ok) {
      setErro(result.message)
      setLoading(false)
      return
    }

    try {
      const { p256dh, auth } = result.subscription.toJSON().keys as { p256dh: string; auth: string }
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint:  result.subscription.endpoint,
          p256dh,
          auth,
          userAgent: navigator.userAgent,
        }),
      })
      if (res.ok) {
        setVisible(false)
        onSubscribed()
      } else {
        setErro('Erro ao salvar. Tente novamente.')
      }
    } catch (err) {
      console.error('[push-banner] erro ao salvar subscription:', err)
      setErro('Erro de conexão. Tente novamente.')
    }

    setLoading(false)
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
      {erro && (
        <p className="text-amber-400 text-xs mb-3">{erro}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={handleRecusar}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          Agora não
        </button>
        <button
          onClick={handleAceitar}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-60"
        >
          {loading ? '⏳ Ativando…' : 'Sim, quero!'}
        </button>
      </div>
    </div>
  )
}
