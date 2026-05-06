'use client'

import { useState } from 'react'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const ALLOWED_EMAILS = ['victoraragao67@gmail.com', 'leticiar.gaia@gmail.com']

const emailSchema = z.string().email('E-mail inválido')

type State = 'idle' | 'loading' | 'sent' | 'error'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setState('loading')

    // 1. Validar formato
    const parsed = emailSchema.safeParse(email.trim().toLowerCase())
    if (!parsed.success) {
      setErrorMsg('Digite um e-mail válido.')
      setState('error')
      return
    }

    // 2. Whitelist — ANTES de chamar qualquer API
    if (!ALLOWED_EMAILS.includes(parsed.data)) {
      setErrorMsg('E-mail não autorizado.')
      setState('error')
      return
    }

    // 3. Enviar magic link
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setErrorMsg('Falha ao enviar o link. Tente novamente.')
      setState('error')
      return
    }

    setState('sent')
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-slate-900">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <span className="text-6xl" role="img" aria-label="dinheiro">
            💰
          </span>
          <h1 className="text-3xl font-bold text-white tracking-tight">DinDin</h1>
          <p className="text-slate-400 text-sm">Finanças do casal</p>
        </div>

        {state === 'sent' ? (
          /* Confirmação */
          <div className="rounded-xl bg-slate-800 border border-slate-700 p-6 text-center space-y-3">
            <span className="text-4xl" role="img" aria-label="ok">✅</span>
            <p className="text-white font-medium">Link enviado!</p>
            <p className="text-slate-400 text-sm">
              Verifique seu e-mail e toque no link para entrar.
            </p>
          </div>
        ) : (
          /* Formulário */
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Digite seu e-mail
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (state === 'error') {
                    setState('idle')
                    setErrorMsg('')
                  }
                }}
                placeholder="seu@email.com"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                disabled={state === 'loading'}
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-red-400" role="alert">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={state === 'loading' || !email.trim()}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 text-base transition-colors"
            >
              {state === 'loading' ? 'Enviando…' : 'Entrar com magic link'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
