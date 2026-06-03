'use client'

import { useState } from 'react'
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

export type ImbalanceInfo = {
  imbalanceCentavos: number  // crédito acumulado de recorrentes (>= 0)
  nomeCredorRec:     string  // quem pagou mais em recorrentes
  nomeDevedorRec:    string
  mesesCount:        number
}

export type DividaLiquidaInfo = {
  valor:          number
  devedor:        string
  credor:         string
}

type Props = {
  mensagem:       string
  detalhe:        SaldoDetalhe | null
  devedorApelido: string | null
  credorApelido:  string | null
  saldoValor:     number | null       // dívida variável bruta
  imbalance?:     ImbalanceInfo | null
  dividaLiquida?: DividaLiquidaInfo | null
}

export function SaldoDetalheButton({
  mensagem,
  detalhe,
  devedorApelido,
  credorApelido,
  saldoValor,
  imbalance,
  dividaLiquida,
}: Props) {
  const [open, setOpen] = useState(false)

  const hasImbalance = (imbalance?.imbalanceCentavos ?? 0) >= 5000
  const canOpen = !!(detalhe || hasImbalance)

  return (
    <>
      {/* Saldo clicável */}
      <button
        onClick={() => canOpen && setOpen(true)}
        className={`flex-1 text-left min-w-0 ${canOpen ? 'active:opacity-70' : ''}`}
        aria-label={canOpen ? 'Ver detalhes do saldo' : undefined}
      >
        <p className="font-semibold text-base leading-tight truncate" style={{ color: 'var(--ink)' }}>
          {mensagem}
          {canOpen && <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>›</span>}
        </p>
      </button>


      {/* Modal de detalhes */}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl shadow-2xl overflow-hidden border max-h-[82dvh] flex flex-col"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>Como chegamos nesse saldo?</h2>
              <button onClick={() => setOpen(false)} className="text-lg p-1" style={{ color: 'var(--muted)' }}>✕</button>
            </div>

            <div className="px-5 py-5 space-y-4 overflow-y-auto">
              {/* Quem pagou o quê */}
              {detalhe && (
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
              )}

              {/* Acertos */}
              {detalhe && detalhe.acertos_net !== 0 && (
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

              {/* ── Recorrentes — Imbalance ── */}
              {hasImbalance && imbalance && (
                <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: 'var(--bg-2)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>
                    Recorrentes — Imbalance
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>
                      {imbalance.nomeCredorRec} paga a mais (acumulado)
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--sage)' }}>
                      +{formatCurrency(imbalance.imbalanceCentavos)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>Meses acumulados</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{imbalance.mesesCount}</span>
                  </div>
                  <p className="text-xs pt-1" style={{ color: 'var(--muted)' }}>
                    Esse crédito é subtraído da dívida variável para calcular o valor real do PIX.
                  </p>
                </div>
              )}

              {/* ── Dívida Líquida Real ── */}
              {hasImbalance && dividaLiquida != null ? (
                <div
                  className="rounded-xl px-4 py-3 border space-y-1"
                  style={{
                    background:   dividaLiquida.valor > 0
                      ? 'color-mix(in srgb, var(--coral) 10%, transparent)'
                      : 'color-mix(in srgb, var(--sage) 10%, transparent)',
                    borderColor: dividaLiquida.valor > 0 ? 'var(--coral)' : 'var(--sage)',
                  }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>
                    Dívida Líquida Real
                  </p>
                  {dividaLiquida.valor > 0 ? (
                    <p className="text-sm font-semibold text-center" style={{ color: 'var(--coral)' }}>
                      {dividaLiquida.devedor} deve {formatCurrency(dividaLiquida.valor)} a {dividaLiquida.credor}
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-center" style={{ color: 'var(--sage)' }}>
                      ✅ Estão quite (incluindo recorrentes)!
                    </p>
                  )}
                  {saldoValor !== null && imbalance && (
                    <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
                      {formatCurrency(saldoValor)} − {formatCurrency(imbalance.imbalanceCentavos)} = {formatCurrency(dividaLiquida.valor)}
                    </p>
                  )}
                </div>
              ) : (
                /* Resultado variável simples (sem imbalance significativo) */
                saldoValor !== null && devedorApelido && credorApelido ? (
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
                )
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
