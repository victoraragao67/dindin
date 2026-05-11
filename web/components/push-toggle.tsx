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
      // Ativar: pedir permissão e salvar subscription
      const subscription = await subscribeToPush()
      if (!subscription) {
        setMsg('Permissão negada ou browser não suporta push.')
        setLoading(false)
        return
      }

      try {
        const { p256dh, auth } = subscription.toJSON().keys as { p256dh: string; auth: string }
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint:  subscription.endpoint,
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
      // Desativar: marcar subscription como inativa via API
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
          <p className="text-white text-sm font-medium">Notificações diárias</p>
          <p className="text-slate-400 text-xs">Lembrete às 22h para registrar gastos</p>
          {msg && <p className="text-emerald-400 text-xs mt-1">{msg}</p>}
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        role="switch"
        aria-checked={ativo}
        className={`
          relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0
          ${ativo ? 'bg-emerald-600' : 'bg-slate-600'}
          ${loading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span
          className={`
            absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow
            transition-transform duration-200
            ${ativo ? 'translate-x-6' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  )
}
