'use client'

import { useState } from 'react'
import { subscribeToPush } from '@/lib/push/subscribe'

type Props = {
  pushAtivo: boolean
}

export function PushToggle({ pushAtivo: initialAtivo }: Props) {
  const [ativo, setAtivo] = useState(initialAtivo)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleToggle() {
    setLoading(true)
    setMsg('')

    if (!ativo) {
      const result = await subscribeToPush()
      if (!result.ok) {
        setMsg(result.message)
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
          setAtivo(true)
          setMsg('✅ Notificações ativadas!')
        } else {
          setMsg('Erro ao salvar. Tente novamente.')
        }
      } catch {
        setMsg('Erro de conexão. Tente novamente.')
      }
    } else {
      try {
        const registration = await navigator.serviceWorker.ready
        const sub = await registration.pushManager.getSubscription()
        if (sub) {
          const res = await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          if (res.ok) {
            await sub.unsubscribe()
            setAtivo(false)
            setMsg('Notificações desativadas.')
          }
        } else {
          setAtivo(false)
        }
      } catch {
        setMsg('Erro ao desativar. Tente novamente.')
      }
    }

    setLoading(false)
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="text-xl">🔔</span>
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Notificações diárias</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Lembrete às 22h para registrar gastos</p>
          {msg && <p className="text-xs mt-1" style={{ color: 'var(--sage)' }}>{msg}</p>}
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        role="switch"
        aria-checked={ativo}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ background: ativo ? 'var(--sage)' : 'var(--bg-2)', border: '1px solid var(--border)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform duration-200"
          style={{
            background: 'var(--card)',
            transform: ativo ? 'translateX(1.5rem)' : 'translateX(0)',
          }}
        />
      </button>
    </div>
  )
}
