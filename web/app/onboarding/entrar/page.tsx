'use client'

import { useState } from 'react'
import { entrarCasal } from '../actions'
import Link from 'next/link'

export default function EntrarCasalPage() {
  const [token,   setToken]   = useState('')
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const result = await entrarCasal(token)

    if (!result.ok) {
      setErro(result.error)
      setLoading(false)
    }
    // Se ok=true, Server Action redireciona para /
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16">
      <div className="w-full max-w-xs space-y-8">
        <Link
          href="/onboarding"
          className="block text-sm transition-opacity active:opacity-70"
          style={{ color: 'var(--muted, #888)' }}
        >
          ← Voltar
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink, #111)' }}>
            Usar código 🔑
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted, #888)' }}>
            Peça o código de 6 letras para quem criou o casal.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={token}
            onChange={e => setToken(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="EX: AB3C7D"
            autoFocus
            maxLength={6}
            className="w-full rounded-xl px-4 py-5 text-3xl font-bold text-center tracking-[0.4em] focus:outline-none uppercase"
            style={{
              background: 'var(--bg-2, #f5f5f5)',
              border: '1px solid var(--border, #ddd)',
              color: 'var(--ink, #111)',
            }}
          />

          {erro && (
            <p className="text-sm text-center" style={{ color: 'var(--coral, #e57373)' }}>{erro}</p>
          )}

          <button
            type="submit"
            disabled={loading || token.length !== 6}
            className="w-full rounded-xl py-4 text-base font-semibold transition-opacity active:opacity-70 disabled:opacity-40"
            style={{ background: 'var(--sage, #7aab87)', color: '#fff' }}
          >
            {loading ? 'Verificando…' : 'Entrar no casal →'}
          </button>
        </form>
      </div>
    </div>
  )
}
