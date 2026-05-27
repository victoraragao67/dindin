'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { salvarApelido } from './actions'

export function ApelidoForm() {
  const router = useRouter()
  const [apelido, setApelido] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = apelido.trim()
    if (!trimmed) return

    setLoading(true)
    setErro('')

    const result = await salvarApelido(trimmed)
    setLoading(false)

    if (!result.ok) {
      setErro(result.error)
      return
    }

    router.refresh() // Revalida a página server-side para mostrar o step 2
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        value={apelido}
        onChange={e => setApelido(e.target.value)}
        placeholder="Ex: Vitim, Gaia, Ju…"
        maxLength={30}
        autoFocus
        className="w-full rounded-xl px-4 py-4 text-base focus:outline-none"
        style={{
          background: 'var(--bg-2, #f5f5f5)',
          border: '1px solid var(--border, #ddd)',
          color: 'var(--ink, #111)',
        }}
      />

      {erro && (
        <p className="text-sm" style={{ color: 'var(--coral, #e57373)' }}>{erro}</p>
      )}

      <button
        type="submit"
        disabled={loading || !apelido.trim()}
        className="w-full rounded-xl py-4 text-base font-semibold transition-opacity active:opacity-70 disabled:opacity-40"
        style={{ background: 'var(--sage, #7aab87)', color: '#fff' }}
      >
        {loading ? 'Salvando…' : 'Continuar →'}
      </button>
    </form>
  )
}
