'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarCasal } from '../actions'
import Link from 'next/link'

export default function CriarCasalPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const result = await criarCasal(email)

    // Se chegar aqui sem redirect, houve erro
    if (!result.ok) {
      setErro(result.error)
      setLoading(false)
    }
    // Se ok=true, o Server Action redirecionou para /onboarding/aguardando
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16">
      <div className="w-full max-w-xs space-y-8">
        {/* Voltar */}
        <Link
          href="/onboarding"
          className="block text-sm transition-opacity active:opacity-70"
          style={{ color: 'var(--muted, #888)' }}
        >
          ← Voltar
        </Link>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink, #111)' }}>
            Criar meu casal 💑
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--muted, #888)' }}>
            Informe o e-mail do seu parceiro. Ele receberá um código para entrar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label
              htmlFor="email"
              className="block text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--muted, #888)' }}
            >
              E-mail do parceiro
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="parceiro@exemplo.com"
              autoComplete="email"
              autoFocus
              className="w-full rounded-xl px-4 py-4 text-base focus:outline-none"
              style={{
                background: 'var(--bg-2, #f5f5f5)',
                border: '1px solid var(--border, #ddd)',
                color: 'var(--ink, #111)',
              }}
            />
          </div>

          {erro && (
            <p className="text-sm" style={{ color: 'var(--coral, #e57373)' }}>{erro}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full rounded-xl py-4 text-base font-semibold transition-opacity active:opacity-70 disabled:opacity-40"
            style={{ background: 'var(--sage, #7aab87)', color: '#fff' }}
          >
            {loading ? 'Criando casal…' : 'Criar e gerar código →'}
          </button>
        </form>
      </div>
    </div>
  )
}
