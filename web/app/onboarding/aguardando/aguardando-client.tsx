'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { gerarNovoConvite } from '../actions'
import { createClient } from '@/lib/supabase/client'

type Props = {
  casalId:        string
  token:          string | null
  emailConvidado: string | null
  expiresAt:      string | null
}

export function AguardandoClient({ casalId, token: initialToken, emailConvidado, expiresAt }: Props) {
  const router = useRouter()
  const [token,    setToken]    = useState(initialToken)
  const [copiado,  setCopiado]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState('')

  // Polling a cada 5s para detectar ativação do casal
  useEffect(() => {
    const supabase = createClient()
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('casais')
        .select('status')
        .eq('id', casalId)
        .single()

      const row = data as { status: string } | null
      if (row?.status === 'active') {
        clearInterval(interval)
        router.replace('/')
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [casalId, router])

  const copiar = useCallback(() => {
    if (!token) return
    navigator.clipboard.writeText(token).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }, [token])

  async function handleNovoConvite() {
    setLoading(true)
    setErro('')
    const result = await gerarNovoConvite()
    setLoading(false)

    if (!result.ok) {
      setErro(result.error)
      return
    }

    // Recarrega para pegar o novo token do servidor
    router.refresh()
  }

  const expirado = expiresAt ? new Date(expiresAt) < new Date() : false

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center">
      <div className="w-full max-w-xs space-y-8">
        <div className="space-y-2">
          <div className="text-5xl">⏳</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink, #111)' }}>
            Aguardando parceiro
          </h1>
          {emailConvidado && (
            <p className="text-sm" style={{ color: 'var(--muted, #888)' }}>
              Compartilhe o código abaixo com <strong>{emailConvidado}</strong>
            </p>
          )}
        </div>

        {token && !expirado ? (
          <div className="space-y-4">
            {/* Código em destaque */}
            <div
              className="rounded-2xl py-6 px-4"
              style={{ background: 'var(--bg-2, #f5f5f5)', border: '1px solid var(--border, #ddd)' }}
            >
              <p
                className="text-5xl font-bold tracking-[0.3em] select-all"
                style={{ color: 'var(--ink, #111)', fontVariantNumeric: 'tabular-nums' }}
              >
                {token}
              </p>
            </div>

            <button
              onClick={copiar}
              className="w-full rounded-xl py-3.5 text-base font-semibold transition-opacity active:opacity-70"
              style={{
                background: copiado ? 'var(--sage, #7aab87)' : 'var(--bg-2, #f5f5f5)',
                color: copiado ? '#fff' : 'var(--ink, #111)',
                border: '1px solid var(--border, #ddd)',
              }}
            >
              {copiado ? '✓ Copiado!' : 'Copiar código'}
            </button>

            <p className="text-xs" style={{ color: 'var(--muted, #888)' }}>
              Válido por 7 dias · Aguardando entrada do parceiro…
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--coral, #e57373)' }}>
              Código expirado ou não encontrado.
            </p>
            <button
              onClick={handleNovoConvite}
              disabled={loading}
              className="w-full rounded-xl py-4 text-base font-semibold transition-opacity active:opacity-70 disabled:opacity-40"
              style={{ background: 'var(--sage, #7aab87)', color: '#fff' }}
            >
              {loading ? 'Gerando…' : 'Gerar novo código'}
            </button>
          </div>
        )}

        {token && !expirado && (
          <button
            onClick={handleNovoConvite}
            disabled={loading}
            className="text-sm transition-opacity active:opacity-70 disabled:opacity-40"
            style={{ color: 'var(--muted, #888)' }}
          >
            {loading ? 'Gerando…' : 'Gerar novo código'}
          </button>
        )}

        {erro && (
          <p className="text-sm" style={{ color: 'var(--coral, #e57373)' }}>{erro}</p>
        )}
      </div>
    </div>
  )
}
