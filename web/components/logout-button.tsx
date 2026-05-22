'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (confirmando) {
    return (
      <div
        className="rounded-xl px-4 py-4 space-y-3 border"
        style={{
          background: 'color-mix(in srgb, var(--coral) 8%, transparent)',
          borderColor: 'var(--coral)',
        }}
      >
        <p className="text-sm text-center" style={{ color: 'var(--ink)' }}>Tem certeza que quer sair?</p>
        <div className="flex gap-3">
          <button
            onClick={() => setConfirmando(false)}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity active:opacity-70"
            style={{ background: 'var(--bg-2)', color: 'var(--ink)', border: '1px solid var(--border)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity active:opacity-70 disabled:opacity-60"
            style={{ background: 'var(--coral)' }}
          >
            {loading ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirmando(true)}
      className="w-full flex items-center gap-3 rounded-xl px-4 py-4 text-left border transition-opacity active:opacity-70"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <span className="text-xl">🚪</span>
      <span className="text-sm font-medium" style={{ color: 'var(--coral)' }}>Sair da conta</span>
    </button>
  )
}
