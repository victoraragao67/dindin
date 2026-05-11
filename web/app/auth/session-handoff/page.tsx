'use client'

/**
 * Session Handoff — resolve o isolamento de storage do PWA no iOS.
 *
 * Fluxo:
 *  1. Usuário clica no magic link → abre no Safari (iOS redireciona links externos)
 *  2. /auth/callback troca o code pela sessão e redireciona para cá
 *     com os tokens no hash: #access_token=X&refresh_token=Y
 *  3. Esta página lê os tokens do hash e chama supabase.auth.setSession()
 *     — isso grava a sessão no storage do contexto atual (PWA ou browser)
 *  4. Redireciona para / com sessão ativa
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SessionHandoff() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash.substring(1) // remove o '#'
    const params = new URLSearchParams(hash)
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')

    if (accessToken && refreshToken) {
      const supabase = createClient()
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(() => router.replace('/'))
        .catch(() => router.replace('/login?error=session'))
    } else {
      // Hash ausente ou incompleto — volta ao login
      router.replace('/login')
    }
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-400 text-sm">Entrando…</p>
    </main>
  )
}
