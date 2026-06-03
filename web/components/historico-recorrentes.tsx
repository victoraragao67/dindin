'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/money'
import type { HistoricoMes } from '@/app/(app)/recorrentes/page'

type Props = {
  historico: HistoricoMes[]
}

export function HistoricoRecorrentes({ historico }: Props) {
  const [expandido, setExpandido] = useState<string | null>(null)

  // Imbalance DO MÊS (não acumulado) para cada card
  const imbalancePorMes: Record<string, { apelido: string; centavos: number } | null> = {}
  for (const m of historico) {
    if (m.pagamentos.length < 2) {
      imbalancePorMes[m.mes] = null
    } else {
      const media = m.totalMes / m.pagamentos.length
      const maior = m.pagamentos[0] // já vem sorted por total desc
      const delta = maior.total - media
      imbalancePorMes[m.mes] = delta >= 100
        ? { apelido: maior.apelido, centavos: Math.round(delta) }
        : null
    }
  }

  // Imbalance ACUMULADO para o banner (correndo do mais antigo)
  const mesOrdenado = [...historico].sort((a, b) => a.mes.localeCompare(b.mes))
  const acumulado: Record<string, number> = {}
  for (const m of mesOrdenado) {
    for (const p of m.pagamentos) {
      acumulado[p.apelido] = (acumulado[p.apelido] ?? 0) + p.total
    }
  }

  // Imbalance final acumulado
  const apelidos     = Object.keys(acumulado)
  const totalMeses   = historico.length
  const imbalanceFinal = apelidos.length >= 2
    ? (() => {
        const [a, b] = apelidos
        const media   = (acumulado[a] + acumulado[b]) / 2
        const delta   = acumulado[a] - media
        return Math.abs(delta) >= 100
          ? { apelido: delta > 0 ? a : b, centavos: Math.abs(Math.round(delta)) }
          : null
      })()
    : null

  return (
    <div className="mx-4 mt-2 mb-6">
      {/* Título */}
      <p className="text-xs font-semibold uppercase tracking-wide mb-3 px-1" style={{ color: 'var(--muted)' }}>
        Histórico · {totalMeses} {totalMeses === 1 ? 'mês' : 'meses'}
      </p>

      {/* Banner de imbalance acumulado */}
      {imbalanceFinal && (
        <div
          className="rounded-xl px-4 py-3 mb-3 flex items-center justify-between"
          style={{ background: 'color-mix(in srgb, var(--coral) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--coral) 30%, transparent)' }}
        >
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>Imbalance acumulado</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: 'var(--coral)' }}>
              {imbalanceFinal.apelido} pagou {formatCurrency(imbalanceFinal.centavos)} a mais
            </p>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>{totalMeses} {totalMeses === 1 ? 'mês' : 'meses'}</p>
        </div>
      )}

      {/* Cards por mês */}
      <div className="space-y-2">
        {historico.map(m => {
          const isOpen   = expandido === m.mes
          const max      = m.pagamentos[0]?.total ?? 1
          const imb      = imbalancePorMes[m.mes]

          return (
            <div
              key={m.mes}
              className="rounded-xl border overflow-hidden"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              {/* Header do mês — sempre visível */}
              <button
                className="w-full flex items-center justify-between px-4 py-3 transition-opacity active:opacity-70"
                onClick={() => setExpandido(isOpen ? null : m.mes)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold capitalize" style={{ color: 'var(--ink)' }}>
                    {m.mesLabel}
                  </span>
                  {imb && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: 'color-mix(in srgb, var(--coral) 12%, transparent)',
                      color: 'var(--coral)',
                    }}>
                      {imb.apelido} +{formatCurrency(imb.centavos)}
                    </span>
                  )}
                  {!imb && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                      background: 'color-mix(in srgb, var(--sage) 12%, transparent)',
                      color: 'var(--sage)',
                    }}>
                      ✅ Equilibrado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>
                    {formatCurrency(m.totalMes)}
                  </span>
                  <span
                    className="text-xs transition-transform duration-200"
                    style={{
                      color: 'var(--muted)',
                      display: 'inline-block',
                      transform: isOpen ? 'rotate(90deg)' : 'none',
                    }}
                  >›</span>
                </div>
              </button>

              {/* Detalhe expandido */}
              {isOpen && (
                <div className="px-4 pb-4 pt-1 space-y-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  {m.pagamentos.map(p => {
                    const pct = Math.round((p.total / Math.max(max, 1)) * 100)
                    return (
                      <div key={p.apelido}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm" style={{ color: 'var(--muted)' }}>{p.apelido} pagou</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                            {formatCurrency(p.total)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: 'var(--sage)' }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
