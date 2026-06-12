'use client'

import { useState } from 'react'
import type { PreditivaCategoria } from '@/lib/preditiva'
import { formatCurrency } from '@/lib/money'

const COR: Record<string, string> = {
  estourou:     'var(--coral)',
  vai_estourar: '#e68a2e',
  no_limite:    '#c4803a',
}

const LABEL: Record<string, string> = {
  estourou:     'Estourou',
  vai_estourar: 'Vai estourar',
  no_limite:    'No limite',
}

type Props = {
  preditiva:     PreditivaCategoria[]
  insightResumo: string | null
}

export function RitmoCard({ preditiva, insightResumo }: Props) {
  const [expandido, setExpandido] = useState(false)

  const criticas = preditiva.filter(
    c => c.status === 'estourou' || c.status === 'vai_estourar' || c.status === 'no_limite',
  )

  if (!insightResumo && criticas.length === 0) return null

  const visiveis = expandido ? criticas : criticas.slice(0, 3)
  const temMais  = criticas.length > 3

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
        Ritmo do mês
      </h2>

      {/* Texto do LLM / fallback */}
      {insightResumo && (
        <div
          className="rounded-xl px-4 py-3 border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>
            {insightResumo}
          </p>
        </div>
      )}

      {/* Cards por categoria crítica */}
      {visiveis.map(c => {
        const cor      = COR[c.status] ?? 'var(--coral)'
        const label    = LABEL[c.status] ?? c.status
        const meta     = c.meta ?? 0
        const pct      = meta > 0 ? Math.min((c.gastoAcumulado / meta) * 100, 100) : 100
        const projecao = c.projecao ?? c.gastoAcumulado
        const excesso  = projecao - meta

        return (
          <div
            key={c.categoriaId}
            className="rounded-xl px-4 py-3 border"
            style={{
              background: `color-mix(in srgb, ${cor} 5%, var(--card))`,
              borderColor: `color-mix(in srgb, ${cor} 25%, transparent)`,
            }}
          >
            {/* Linha 1: nome + chip */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {c.emoji} {c.nome}
              </span>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: `color-mix(in srgb, ${cor} 15%, transparent)`,
                  color: cor,
                }}
              >
                {label}
              </span>
            </div>

            {/* Linha 2: gasto / meta */}
            <div className="flex justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                Gasto: <span className="font-semibold" style={{ color: 'var(--ink)' }}>{formatCurrency(c.gastoAcumulado)}</span>
              </span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                Meta: {formatCurrency(meta)}
              </span>
            </div>

            {/* Linha 3: projeção / delta */}
            <div className="flex justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: cor }}>
                Projeção: {formatCurrency(projecao)}
              </span>
              {excesso > 0 && (
                <span className="text-xs font-semibold" style={{ color: cor }}>
                  +{formatCurrency(excesso)} acima
                </span>
              )}
            </div>

            {/* Barra de progresso */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: cor }}
              />
            </div>
          </div>
        )
      })}

      {/* Expand / collapse */}
      {temMais && (
        <button
          onClick={() => setExpandido(v => !v)}
          className="w-full text-xs font-medium py-1"
          style={{ color: 'var(--muted)' }}
        >
          {expandido
            ? '↑ Mostrar menos'
            : `↓ Ver mais ${criticas.length - 3} categoria${criticas.length - 3 > 1 ? 's' : ''}`}
        </button>
      )}
    </section>
  )
}
