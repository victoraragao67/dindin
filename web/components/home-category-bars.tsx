'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/money'

type CategoriaRow = {
  categoria_id:    number
  categoria_nome:  string
  categoria_emoji: string
  total_centavos:  number
}

type RecCat = { nome: string; emoji: string; total: number }

type Props = {
  categorias:           CategoriaRow[]
  recorrentePorCategoria: Record<number, RecCat>
}

export function HomeCategoryBars({ categorias, recorrentePorCategoria }: Props) {
  const [modo, setModo] = useState<'variavel' | 'total'>('variavel')

  const temRecorrentes = Object.keys(recorrentePorCategoria).length > 0

  type CatItem = { id: number; nome: string; emoji: string; total: number }

  // ── Modo Variável: top 4 só pwa ──────────────────────────────
  const top4Var: CatItem[] = categorias.slice(0, 4).map(c => ({
    id:    c.categoria_id,
    nome:  c.categoria_nome,
    emoji: c.categoria_emoji,
    total: c.total_centavos,
  }))
  const totalVariavel  = categorias.reduce((s, c) => s + c.total_centavos, 0)

  // ── Modo Total: funde pwa + recorrente por categoria ─────────
  const catMapTotal: Record<number, { id: number; nome: string; emoji: string; total: number }> = {}
  for (const c of categorias) {
    catMapTotal[c.categoria_id] = {
      id:    c.categoria_id,
      nome:  c.categoria_nome,
      emoji: c.categoria_emoji,
      total: c.total_centavos,
    }
  }
  for (const [idStr, rec] of Object.entries(recorrentePorCategoria)) {
    const id = Number(idStr)
    if (catMapTotal[id]) {
      catMapTotal[id].total += rec.total
    } else {
      catMapTotal[id] = { id, nome: rec.nome, emoji: rec.emoji, total: rec.total }
    }
  }
  const top4Total: CatItem[] = Object.values(catMapTotal)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)
  const totalGeral  = Object.values(catMapTotal).reduce((s, c) => s + c.total, 0)

  // ── Dados e total do modo ativo ──────────────────────────────
  const items: CatItem[] = modo === 'total' ? top4Total : top4Var
  const totalAtivo = modo === 'total' ? totalGeral : totalVariavel
  const maxValor   = items[0]?.total ?? 1

  if (categorias.length === 0 && !temRecorrentes) {
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
      <p className="text-xl font-bold mb-3" style={{ color: 'var(--ink)' }}>
        {formatCurrency(totalAtivo)}
      </p>

      {/* Barras por categoria */}
      <div className="space-y-3">
        {items.map(cat => {
          const pct = Math.round((cat.total / Math.max(maxValor, 1)) * 100)
          return (
            <div key={cat.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm" style={{ color: 'var(--ink)' }}>
                  {cat.emoji} {cat.nome}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  {formatCurrency(cat.total)}
                </span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'var(--bg-2)' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width:      `${pct}%`,
                    background: modo === 'total' ? 'color-mix(in srgb, var(--sage) 70%, var(--coral))' : 'var(--coral)',
                  }}
                />
              </div>
            </div>
          )
        })}
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
