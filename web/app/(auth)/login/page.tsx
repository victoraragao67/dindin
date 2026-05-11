'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const ALLOWED_EMAILS = ['victoraragao67@gmail.com', 'leticiar.gaia@gmail.com']
const emailSchema = z.string().email('E-mail inválido')
const otpSchema  = z.string().regex(/^\d{6}$/, 'Código deve ter 6 dígitos')

type Step = 'email' | 'otp' | 'loading_send' | 'loading_verify' | 'error'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [otp,      setOtp]      = useState('')
  const [step,     setStep]     = useState<Step>('email')
  const [errorMsg, setErrorMsg] = useState('')

  /* ── Passo 1: enviar OTP ─────────────────────────────────────── */
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setStep('loading_send')

    const parsed = emailSchema.safeParse(email.trim().toLowerCase())
    if (!parsed.success) {
      setErrorMsg('Digite um e-mail válido.')
      setStep('error')
      return
    }
    if (!ALLOWED_EMAILS.includes(parsed.data)) {
      setErrorMsg('E-mail não autorizado.')
      setStep('error')
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      // Sem shouldCreateUser:false — a whitelist acima já é a guarda de acesso
    })

    if (error) {
      console.error('[login] signInWithOtp error:', error.message, error)
      setErrorMsg(`Falha ao enviar o código: ${error.message}`)
      setStep('error')
      return
    }

    setStep('otp')
  }

  /* ── Passo 2: verificar código ───────────────────────────────── */
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setStep('loading_verify')

    const parsed = otpSchema.safeParse(otp.trim())
    if (!parsed.success) {
      setErrorMsg('Digite o código de 6 dígitos do e-mail.')
      setStep('otp')
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: parsed.data,
      type:  'email',
    })

    if (error) {
      setErrorMsg('Código inválido ou expirado. Solicite um novo.')
      setStep('otp')
      return
    }

    // Sessão gravada no storage do PWA — navega para home
    router.replace('/')
  }

  /* ── UI ──────────────────────────────────────────────────────── */
  const loading = step === 'loading_send' || step === 'loading_verify'

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 bg-slate-900">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center space-y-2">
          <span className="text-6xl" role="img" aria-label="dinheiro">💰</span>
          <h1 className="text-3xl font-bold text-white tracking-tight">DinDin</h1>
          <p className="text-slate-400 text-sm">Finanças do casal</p>
        </div>

        {/* ── Passo 1: e-mail ── */}
        {(step === 'email' || step === 'loading_send' || (step === 'error' && !otp)) && (
          <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
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
                  if (step === 'error') { setStep('email'); setErrorMsg('') }
                }}
                placeholder="seu@email.com"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                disabled={loading}
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-red-400" role="alert">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 text-base transition-colors"
            >
              {step === 'loading_send' ? 'Enviando…' : 'Enviar código'}
            </button>
          </form>
        )}

        {/* ── Passo 2: código OTP ── */}
        {(step === 'otp' || step === 'loading_verify' || (step === 'error' && !!otp)) && (
          <form onSubmit={handleVerifyOtp} className="space-y-4" noValidate>
            <div className="rounded-xl bg-slate-800 border border-slate-700 p-4 text-center space-y-1">
              <p className="text-white font-medium text-sm">Código enviado! ✉️</p>
              <p className="text-slate-400 text-xs">
                Verifique <span className="text-emerald-400">{email}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="otp" className="block text-sm font-medium text-slate-300">
                Digite o código de 6 dígitos
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ''))
                  if (step === 'error') { setStep('otp'); setErrorMsg('') }
                }}
                placeholder="000000"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 text-2xl tracking-[0.5em] text-center font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                disabled={loading}
                autoFocus
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-red-400" role="alert">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-3 text-base transition-colors"
            >
              {step === 'loading_verify' ? 'Verificando…' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setErrorMsg('') }}
              className="w-full text-slate-500 text-sm hover:text-slate-300 transition-colors py-1"
            >
              Usar outro e-mail
            </button>
          </form>
        )}

      </div>
    </main>
  )
}
