'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function DissolveCasalButton({ casalId }: { casalId: string }) {
  const router = useRouter()
  const [step,    setStep]    = useState<'idle' | 'confirm'>('idle')
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState('')

  async function handleDissolve() {
    if (input !== 'ENCERRAR') {
      setErro('Digite ENCERRAR para confirmar.')
      return
    }

    setLoading(true)
    setErro('')

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('dissolver_casal', { p_casal_id: casalId })
    const result = data as { ok: boolean; error?: string } | null

    setLoading(false)

    if (error) { setErro((error as Error).message); return }
    if (!result?.ok) { setErro(result?.error ?? 'Erro ao encerrar casal.'); return }

    // Limpa qualquer cache local
    localStorage.removeItem('onboarding_concluido')
    router.replace('/onboarding')
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('confirm')}
        className="w-full rounded-xl py-3 text-sm font-semibold transition-opacity active:opacity-70"
        style={{ background: 'var(--coral)', color: '#fff' }}
      >
        Encerrar casal
      </button>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
        Digite <strong>ENCERRAR</strong> para confirmar:
      </p>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="ENCERRAR"
        autoFocus
        className="w-full rounded-xl px-4 py-3 text-base focus:outline-none"
        style={{
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          color: 'var(--ink)',
        }}
      />
      {erro && <p className="text-xs" style={{ color: 'var(--coral)' }}>{erro}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => { setStep('idle'); setInput(''); setErro('') }}
          className="flex-1 py-3 rounded-xl text-sm font-medium border transition-opacity active:opacity-70"
          style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
        >
          Cancelar
        </button>
        <button
          onClick={handleDissolve}
          disabled={loading}
          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity active:opacity-70 disabled:opacity-40"
          style={{ background: 'var(--coral)', color: '#fff' }}
        >
          {loading ? 'Encerrando…' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}
