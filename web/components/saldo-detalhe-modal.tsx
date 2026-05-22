'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/money'

export type SaldoDetalhe = {
  apelido_a: string
  apelido_b: string
  pagou_a: number
  pagou_b: number
  credito_a: number
  credito_b: number
  acertos_net: number  // positivo = a pagou para b
}

type Props = {
  mensagem: string
  detalhe: SaldoDetalhe | null
  devedorApelido: string | null
  credorApelido:  string | null
  saldoValor:     number | null
}

export function SaldoDetalheButton({ mensagem, detalhe, devedorApelido, credorApelido, saldoValor }: Props) {
  const [open, setOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  async function handleRefresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1200)
  }

  return (
    <>
      {/* Saldo clicável */}
      <button
        onClick={() => detalhe && setOpen(true)}
        className={`flex-1 text-left min-w-0 ${detalhe ? 'active:opacity-70' : ''}`}
        aria-label={detalhe ? 'Ver detalhes do saldo' : undefined}
      >
        <p className="font-semibold text-base leading-tight truncate" style={{ color: 'var(--ink)' }}>
          {mensagem}
          {detalhe && <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>›</span>}
        </p>
      </button>

      {/* Botão refresh */}
      <button
        onClick={handleRefresh}
        aria-label="Atualizar dados"
        className={`shrink-0 transition-all p-1 text-base ${refreshing ? 'animate-spin' : ''}`}
        style={{ color: 'var(--muted)' }}
      >
        🔄
      </button>

      {/* Modal de detalhes */}
      {open && detalhe && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl shadow-2xl overflow-hidden border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>Como chegamos nesse saldo?</h2>
              <button onClick={() => setOpen(false)} className="text-lg p-1" style={{ color: 'var(--muted)' }}>✕</button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* Quem pagou o quê */}
              <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: 'var(--bg-2)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>Total desembolsado</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>{detalhe.apelido_a} pagou</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(detalhe.pagou_a)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>{detalhe.apelido_b} pagou</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(detalhe.pagou_b)}</span>
                </div>
              </div>

              {/* Crédito acumulado */}
              <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: 'var(--bg-2)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>Crédito acumulado</p>
                <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                  Quanto cada um pagou além da sua parte (considerando as divisões de cada gasto)
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>{detalhe.apelido_a}</span>
                  <span className="text-sm font-medium" style={{ color: detalhe.credito_a >= 0 ? 'var(--sage)' : 'var(--coral)' }}>
                    {detalhe.credito_a >= 0 ? '+' : ''}{formatCurrency(detalhe.credito_a)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>{detalhe.apelido_b}</span>
                  <span className="text-sm font-medium" style={{ color: detalhe.credito_b >= 0 ? 'var(--sage)' : 'var(--coral)' }}>
                    {detalhe.credito_b >= 0 ? '+' : ''}{formatCurrency(detalhe.credito_b)}
                  </span>
                </div>
              </div>

              {/* Acertos */}
              {detalhe.acertos_net !== 0 && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-2)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>Acertos realizados</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>
                      {detalhe.acertos_net > 0
                        ? `${detalhe.apelido_a} → ${detalhe.apelido_b}`
                        : `${detalhe.apelido_b} → ${detalhe.apelido_a}`}
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--sage)' }}>{formatCurrency(Math.abs(detalhe.acertos_net))}</span>
                  </div>
                </div>
              )}

              {/* Resultado */}
              {saldoValor !== null && devedorApelido && credorApelido ? (
                <div
                  className="rounded-xl px-4 py-3 border"
                  style={{ background: 'color-mix(in srgb, var(--coral) 10%, transparent)', borderColor: 'var(--coral)' }}
                >
                  <p className="text-sm font-semibold text-center" style={{ color: 'var(--coral)' }}>
                    {devedorApelido} deve {formatCurrency(saldoValor)} para {credorApelido}
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-xl px-4 py-3 border"
                  style={{ background: 'color-mix(in srgb, var(--sage) 10%, transparent)', borderColor: 'var(--sage)' }}
                >
                  <p className="text-sm font-semibold text-center" style={{ color: 'var(--sage)' }}>✅ Estão quite!</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
