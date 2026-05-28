'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

const emailSchema = z.string().email('E-mail inválido')
const otpSchema  = z.string().regex(/^\d{6,8}$/, 'Código deve ter 6 a 8 dígitos')

type Step = 'email' | 'otp' | 'loading_send' | 'loading_verify' | 'error'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [otp,      setOtp]      = useState('')
  const [step,     setStep]     = useState<Step>('email')
  const [errorMsg, setErrorMsg] = useState('')

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

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ email: parsed.data })

    if (error) {
      console.error('[login] signInWithOtp error:', error.message, error)
      setErrorMsg(`Falha ao enviar o código: ${error.message}`)
      setStep('error')
      return
    }

    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')
    setStep('loading_verify')

    const parsed = otpSchema.safeParse(otp.trim())
    if (!parsed.success) {
      setErrorMsg('Digite o código de 8 dígitos do e-mail.')
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

    // Full page reload para garantir que os cookies de sessão
    // (setados pelo Supabase após verifyOtp) sejam enviados ao servidor
    window.location.href = '/'
  }

  const loading   = step === 'loading_send' || step === 'loading_verify'
  const showEmail = step === 'email' || step === 'loading_send' || (step === 'error' && !otp)
  const showOtp   = step === 'otp'   || step === 'loading_verify' || (step === 'error' && !!otp)

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px 56px',
      background: 'var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* ── Logo ── */}
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
        }}>
          <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 28, fontWeight: 700, letterSpacing: -2, lineHeight: 1, color: 'var(--bg)' }}>D</span>
          <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 28, fontWeight: 700, letterSpacing: -2, lineHeight: 1, color: 'var(--coral)' }}>D</span>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontSize: 30, fontWeight: 700, letterSpacing: -1.5,
          color: 'var(--ink)', textAlign: 'center',
          marginBottom: 6, lineHeight: 1,
        }}>
          Din<em style={{ color: 'var(--coral)', fontStyle: 'italic', fontWeight: 300 }}>Din</em>
        </h1>

        <p style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
          Finanças a dois, sem enrolação.
        </p>

        {/* ── Pills de valor (só no step email) ── */}
        {showEmail && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { emoji: '⚡', label: '3 toques por gasto' },
              { emoji: '⚖️', label: 'Divide do seu jeito' },
              { emoji: '🧾', label: 'Saldo em tempo real' },
            ].map(p => (
              <span key={p.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 10px', borderRadius: 100,
                background: 'var(--card)', border: '1px solid var(--border)',
                fontSize: 12, color: 'var(--ink)', fontWeight: 500,
                whiteSpace: 'nowrap',
              }}>
                <span style={{ fontSize: 13 }}>{p.emoji}</span>
                {p.label}
              </span>
            ))}
          </div>
        )}

        {/* ── Form Card ── */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 24, padding: '24px 20px',
          width: '100%', display: 'flex', flexDirection: 'column', gap: 14,
        }}>

          {/* Passo 1: e-mail */}
          {showEmail && (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>

              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
                  Criar conta ou entrar
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
                  Basta seu e-mail — a gente cuida do resto.
                </p>

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
                  disabled={loading}
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    fontSize: 14,
                    color: 'var(--ink)',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    opacity: loading ? 0.6 : 1,
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--coral)')}
                  onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>

              {errorMsg && (
                <p role="alert" style={{ fontSize: 12, color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚠ {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                style={{
                  background: loading || !email.trim() ? 'var(--bg-2)' : 'var(--ink)',
                  color: loading || !email.trim() ? 'var(--muted)' : 'var(--bg)',
                  borderRadius: 100, padding: '13px', width: '100%',
                  fontSize: 14, fontWeight: 600, border: 'none',
                  cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {step === 'loading_send' ? 'Enviando…' : 'Continuar →'}
              </button>

              <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                Vamos enviar um código de 8 dígitos.{' '}
                <span style={{ color: 'var(--coral)', fontWeight: 500 }}>Digite-o aqui — não clique no link.</span>
              </p>
            </form>
          )}

          {/* Passo 2: código OTP */}
          {showOtp && (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>

              <div style={{
                background: 'rgba(122,158,126,0.12)',
                border: '1px solid rgba(122,158,126,0.3)',
                borderRadius: 12, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 18 }}>✉️</span>
                <div>
                  <p style={{ fontSize: 12, color: '#3d6440', fontWeight: 600, marginBottom: 2 }}>Código enviado!</p>
                  <p style={{ fontSize: 11, color: '#5a7a5e' }}>{email}</p>
                </div>
              </div>

              <div>
                <label htmlFor="otp" style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.8px',
                  textTransform: 'uppercase', color: 'var(--muted)',
                  display: 'block', marginBottom: 6,
                }}>
                  Código de 8 dígitos
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{8}"
                  maxLength={8}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''))
                    if (step === 'error') { setStep('otp'); setErrorMsg('') }
                  }}
                  placeholder="00000000"
                  disabled={loading}
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'var(--bg)',
                    border: '1.5px solid var(--coral)',
                    borderRadius: 12, padding: '14px',
                    fontSize: 22, letterSpacing: '0.4em',
                    textAlign: 'center', color: 'var(--ink)',
                    fontWeight: 600, fontFamily: 'monospace',
                    outline: 'none', opacity: loading ? 0.6 : 1,
                  }}
                />
              </div>

              {errorMsg && (
                <p role="alert" style={{ fontSize: 12, color: 'var(--coral)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚠ {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                style={{
                  background: loading || otp.length < 6 ? 'var(--bg-2)' : 'var(--ink)',
                  color: loading || otp.length < 6 ? 'var(--muted)' : 'var(--bg)',
                  borderRadius: 100, padding: '13px', width: '100%',
                  fontSize: 14, fontWeight: 600, border: 'none',
                  cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                {step === 'loading_verify' ? 'Verificando…' : 'Entrar →'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setOtp(''); setErrorMsg('') }}
                style={{
                  background: 'none', border: 'none', fontSize: 12,
                  color: 'var(--muted)', width: '100%', cursor: 'pointer',
                  padding: '4px 0', textAlign: 'center',
                }}
              >
                Outro e-mail?{' '}
                <span style={{ color: 'var(--coral)', fontWeight: 500 }}>Voltar</span>
              </button>
            </form>
          )}
        </div>

        {/* ── Conheça mais ── */}
        {showEmail && (
          <a
            href="/sobre"
            style={{
              marginTop: 20,
              fontSize: 12,
              color: 'var(--muted)',
              textDecoration: 'none',
              textAlign: 'center',
            }}
          >
            Conheça mais sobre o DinDin →
          </a>
        )}
      </div>
    </main>
  )
}
