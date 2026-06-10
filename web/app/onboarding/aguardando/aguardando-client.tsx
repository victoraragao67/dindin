'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  casalId:        string
  token:          string | null
  emailConvidado: string | null
}

export function AguardandoClient({ casalId, token, emailConvidado }: Props) {
  const router = useRouter()
  const [copiado, setCopiado] = useState(false)

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
              Enviamos um código de acesso para{' '}
              <strong style={{ color: 'var(--ink, #111)' }}>{emailConvidado}</strong>
            </p>
          )}
        </div>

        {token && (
          <div className="space-y-3">
            <div
              className="rounded-2xl py-6 px-4"
              style={{ background: 'var(--bg-2, #f5f5f5)', border: '1px solid var(--border, #ddd)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--muted, #888)' }}>
                Código do casal
              </p>
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
          </div>
        )}

        <p className="text-xs" style={{ color: 'var(--muted, #888)' }}>
          Válido por 7 dias · Aguardando entrada do parceiro…
        </p>
      </div>
    </div>
  )
}
