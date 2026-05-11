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
      <div className="rounded-xl bg-red-900/20 border border-red-800/40 px-4 py-4 space-y-3">
        <p className="text-red-300 text-sm text-center">Tem certeza que quer sair?</p>
        <div className="flex gap-3">
          <button
            onClick={() => setConfirmando(false)}
            className="flex-1 py-2.5 rounded-lg bg-slate-700 text-slate-300 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-medium transition-colors"
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
      className="w-full flex items-center gap-3 rounded-xl bg-slate-800 px-4 py-4 text-left hover:bg-slate-700 transition-colors"
    >
      <span className="text-xl">🚪</span>
      <span className="text-red-400 text-sm font-medium">Sair da conta</span>
    </button>
  )
}
