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
    <div
      className="mx-4 mt-3 rounded-xl px-4 py-4 shadow-lg border"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <p className="text-sm font-medium mb-1" style={{ color: 'var(--ink)' }}>🔔 Quer ser lembrado?</p>
      <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--muted)' }}>
        Avisamos 1x por dia, às 22h, para você registrar os gastos.
      </p>
      {erro && (
        <p className="text-xs mb-3" style={{ color: 'var(--coral)' }}>{erro}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={handleRecusar}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg text-sm transition-opacity active:opacity-70 disabled:opacity-50"
          style={{ background: 'var(--bg-2)', color: 'var(--ink)', border: '1px solid var(--border)' }}
        >
          Agora não
        </button>
        <button
          onClick={handleAceitar}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity active:opacity-70 disabled:opacity-60"
          style={{ background: 'var(--sage)' }}
        >
          {loading ? '⏳ Ativando…' : 'Sim, quero!'}
        </button>
      </div>
    </div>
  )
}
