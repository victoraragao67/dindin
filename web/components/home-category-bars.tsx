'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/money'

type CategoriaRow = {
  categoria_id: number
  categoria_nome: string
  categoria_emoji: string
  total_centavos: number
}

type Props = {
  categorias:       CategoriaRow[]
  totalRecorrentes: number
}

export function HomeCategoryBars({ categorias, totalRecorrentes }: Props) {
  const [modo, setModo] = useState<'variavel' | 'total'>('variavel')

  const top4          = categorias.slice(0, 4)
  const totalVariavel = categorias.reduce((s, c) => s + c.total_centavos, 0)
  const totalGeral    = totalVariavel + totalRecorrentes
  const temRecorrentes = totalRecorrentes > 0

  // Maior valor para escalar as barras — inclui recorrentes se modo total
  const maxValor = modo === 'total' && temRecorrentes
    ? Math.max(top4[0]?.total_centavos ?? 0, totalRecorrentes)
    : (top4[0]?.total_centavos ?? 1)

  if (top4.length === 0 && !temRecorrentes) {
    return (
      <div
        className="rounded-2xl px-4 py-4 border"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
          Nenhuma categoria ainda.
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl px-4 py-4 border"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {/* Header: título + toggle */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Gastos do mês
        </p>
        {temRecorrentes && (
          <div className="flex rounded-md overflow-hidden border text-xs" style={{ borderColor: 'var(--border)' }}>
            {(['variavel', 'total'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                style={{
                  padding:    '2px 8px',
                  background: modo === m ? 'var(--ink)' : 'var(--bg-2)',
                  color:      modo === m ? 'var(--bg)'  : 'var(--muted)',
                  fontWeight: modo === m ? 600 : 400,
                  border:     'none',
                  cursor:     'pointer',
                  transition: 'background 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {m === 'variavel' ? 'Variável' : 'Total'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Total em destaque */}
      <p className="text-xl font-bold mb-3 transition-all" style={{ color: 'var(--ink)' }}>
        {formatCurrency(modo === 'total' ? totalGeral : totalVariavel)}
      </p>

      {/* Barras por categoria */}
      <div className="space-y-3">
        {top4.map(cat => {
          const pct = Math.round((cat.total_centavos / Math.max(maxValor, 1)) * 100)
          return (
            <div key={cat.categoria_id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm" style={{ color: 'var(--ink)' }}>
                  {cat.categoria_emoji} {cat.categoria_nome}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  {formatCurrency(cat.total_centavos)}
                </span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-2)' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: 'var(--coral)' }}
                />
              </div>
            </div>
          )
        })}

        {/* Linha de fixos — só no modo Total */}
        {modo === 'total' && temRecorrentes && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm" style={{ color: 'var(--ink)' }}>
                🔁 Fixos do mês
              </span>
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {formatCurrency(totalRecorrentes)}
              </span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-2)' }}>
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width:      `${Math.round((totalRecorrentes / Math.max(maxValor, 1)) * 100)}%`,
                  background: 'var(--sage)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function HomeCategoryBarsSkeleton() {
  return (
    <div
      className="rounded-2xl px-4 py-4 border animate-pulse"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="flex justify-between items-center mb-1">
        <div className="h-3 w-28 rounded" style={{ background: 'var(--bg-2)' }} />
        <div className="h-5 w-24 rounded" style={{ background: 'var(--bg-2)' }} />
      </div>
      <div className="h-6 w-32 rounded mb-3" style={{ background: 'var(--bg-2)' }} />
      {[80, 60, 45, 30].map(w => (
        <div key={w} className="mb-3">
          <div className="flex justify-between mb-1">
            <div className="h-4 w-24 rounded" style={{ background: 'var(--bg-2)' }} />
            <div className="h-4 w-16 rounded" style={{ background: 'var(--bg-2)' }} />
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-2)' }}>
            <div className="h-1.5 rounded-full" style={{ width: `${w}%`, background: 'var(--border)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
