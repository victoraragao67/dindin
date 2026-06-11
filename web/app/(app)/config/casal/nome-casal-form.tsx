'use client'

import { useState, useTransition } from 'react'
import { renomearCasal } from '@/app/(app)/actions'

export function NomeCasalForm({ nomeAtual }: { nomeAtual: string | null }) {
  const [nome, setNome]       = useState(nomeAtual ?? '')
  const [status, setStatus]   = useState<'idle' | 'ok' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()

  const dirty = nome.trim() !== (nomeAtual ?? '')

  function handleSave() {
    setStatus('idle')
    startTransition(async () => {
      const res = await renomearCasal(nome)
      setStatus(res.error ? 'error' : 'ok')
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={nome}
        onChange={e => { setNome(e.target.value); setStatus('idle') }}
        maxLength={50}
        placeholder="Ex: Vitim & Gaia"
        disabled={isPending}
        className="rounded-xl px-4 py-3 text-sm border focus:outline-none transition-colors"
        style={{
          background: 'var(--bg)',
          borderColor: status === 'error' ? 'var(--coral)' : 'var(--border)',
          color: 'var(--ink)',
        }}
      />

      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: status === 'ok' ? 'var(--sage)' : status === 'error' ? 'var(--coral)' : 'var(--muted)' }}>
          {status === 'ok'    ? '✓ Nome salvo!'             :
           status === 'error' ? 'Erro ao salvar. Tente novamente.' :
           `${nome.trim().length}/50 caracteres`}
        </p>

        <button
          onClick={handleSave}
          disabled={isPending || !dirty}
          className="text-sm font-semibold px-4 py-1.5 rounded-full transition-opacity disabled:opacity-40"
          style={{
            background: 'var(--sage)',
            color: '#fff',
            cursor: isPending || !dirty ? 'not-allowed' : 'pointer',
          }}
        >
          {isPending ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
