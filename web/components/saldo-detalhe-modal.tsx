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
        <p className="text-white font-semibold text-base leading-tight truncate">
          {mensagem}
          {detalhe && <span className="text-slate-500 text-xs ml-1">›</span>}
        </p>
      </button>

      {/* Botão refresh */}
      <button
        onClick={handleRefresh}
        aria-label="Atualizar dados"
        className={`shrink-0 text-slate-400 hover:text-white transition-all p-1 text-base ${refreshing ? 'animate-spin' : ''}`}
      >
        🔄
      </button>

      {/* Modal de detalhes */}
      {open && detalhe && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl bg-slate-800 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="text-white font-semibold text-base">Como chegamos nesse saldo?</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-lg p-1">✕</button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* Quem pagou o quê */}
              <div className="rounded-xl bg-slate-900 px-4 py-3 space-y-2">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Total desembolsado</p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{detalhe.apelido_a} pagou</span>
                  <span className="text-white text-sm font-medium">{formatCurrency(detalhe.pagou_a)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{detalhe.apelido_b} pagou</span>
                  <span className="text-white text-sm font-medium">{formatCurrency(detalhe.pagou_b)}</span>
                </div>
              </div>

              {/* Crédito acumulado */}
              <div className="rounded-xl bg-slate-900 px-4 py-3 space-y-2">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Crédito acumulado</p>
                <p className="text-slate-500 text-xs mb-2">
                  Quanto cada um pagou além da sua parte (considerando as divisões de cada gasto)
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{detalhe.apelido_a}</span>
                  <span className={`text-sm font-medium ${detalhe.credito_a >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {detalhe.credito_a >= 0 ? '+' : ''}{formatCurrency(detalhe.credito_a)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{detalhe.apelido_b}</span>
                  <span className={`text-sm font-medium ${detalhe.credito_b >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {detalhe.credito_b >= 0 ? '+' : ''}{formatCurrency(detalhe.credito_b)}
                  </span>
                </div>
              </div>

              {/* Acertos */}
              {detalhe.acertos_net !== 0 && (
                <div className="rounded-xl bg-slate-900 px-4 py-3">
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Acertos realizados</p>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm">
                      {detalhe.acertos_net > 0
                        ? `${detalhe.apelido_a} → ${detalhe.apelido_b}`
                        : `${detalhe.apelido_b} → ${detalhe.apelido_a}`}
                    </span>
                    <span className="text-blue-400 text-sm font-medium">{formatCurrency(Math.abs(detalhe.acertos_net))}</span>
                  </div>
                </div>
              )}

              {/* Resultado */}
              {saldoValor !== null && devedorApelido && credorApelido ? (
                <div className="rounded-xl bg-emerald-900/30 border border-emerald-700/40 px-4 py-3">
                  <p className="text-emerald-400 text-sm font-semibold text-center">
                    {devedorApelido} deve {formatCurrency(saldoValor)} para {credorApelido}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-900/30 border border-emerald-700/40 px-4 py-3">
                  <p className="text-emerald-400 text-sm font-semibold text-center">✅ Estão quite!</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
