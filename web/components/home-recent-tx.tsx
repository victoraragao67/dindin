import Link from 'next/link'
import { formatCurrency } from '@/lib/money'

type Tx = {
  id: string
  valor_centavos: number
  data_competencia: string
  descricao: string | null
  pagador_apelido: string
  categoria_emoji: string
  categoria_nome: string
  divisao: string
}

type Props = {
  transacoes: Tx[]
}

function valorCada(tx: Tx): string | null {
  if (tx.divisao === '50_50') {
    return `R$ ${(tx.valor_centavos / 100 / 2).toFixed(2).replace('.', ',')} cada`
  }
  if (tx.divisao === 'so_pagador' || tx.divisao === 'so_outro') return null
  return null
}

export function HomeRecentTx({ transacoes }: Props) {
  const top4 = transacoes.slice(0, 4)

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Últimos gastos
        </p>
        <Link
          href="/gastos"
          className="text-xs font-medium"
          style={{ color: 'var(--coral)' }}
        >
          Ver todos →
        </Link>
      </div>

      {top4.length === 0 ? (
        <div className="px-4 pb-4">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhum gasto este mês.</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {top4.map(tx => {
            const cada = valorCada(tx)
            return (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl shrink-0">{tx.categoria_emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                      {tx.descricao ?? tx.categoria_nome}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {tx.pagador_apelido}
                      {cada ? ` · ${cada}` : ''}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold shrink-0" style={{ color: 'var(--ink)' }}>
                  {formatCurrency(tx.valor_centavos)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function HomeRecentTxSkeleton() {
  return (
    <div
      className="rounded-2xl border animate-pulse"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="flex justify-between px-4 pt-4 pb-2">
        <div className="h-3 w-24 rounded" style={{ background: 'var(--bg-2)' }} />
        <div className="h-3 w-16 rounded" style={{ background: 'var(--bg-2)' }} />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded" style={{ background: 'var(--bg-2)' }} />
            <div>
              <div className="h-4 w-28 rounded mb-1" style={{ background: 'var(--bg-2)' }} />
              <div className="h-3 w-16 rounded" style={{ background: 'var(--bg-2)' }} />
            </div>
          </div>
          <div className="h-4 w-16 rounded" style={{ background: 'var(--bg-2)' }} />
        </div>
      ))}
    </div>
  )
}
