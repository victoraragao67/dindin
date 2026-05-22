import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/money'

type CategoriaRow = {
  categoria_id: number
  categoria_nome: string
  categoria_emoji: string
  qtd_templates: number
  total_categoria_centavos: number
  percentual: number
}

type PagadorRow = {
  pagador_id: string
  pagador_apelido: string
  total_centavos: number
}

export async function PrevisibilidadeRecorrentes() {
  const supabase = createClient()

  const [
    { data: categorias },
    { data: pagadores },
  ] = await Promise.all([
    supabase.from('v_previsibilidade_recorrentes').select('*'),
    supabase.from('v_previsibilidade_por_pagador').select('*'),
  ])

  const cats    = (categorias as CategoriaRow[] | null) ?? []
  const pags    = (pagadores  as PagadorRow[]   | null) ?? []
  const total   = cats.reduce((acc, c) => acc + c.total_categoria_centavos, 0)

  // Empty state
  if (total === 0) {
    return (
      <div
        className="mx-4 mb-4 rounded-xl px-4 py-6 text-center border"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
          Vocês ainda não têm recorrentes cadastrados.
          <br />
          Toque em <strong style={{ color: 'var(--ink)' }}>+</strong> pra começar.
        </p>
      </div>
    )
  }

  return (
    <div
      className="mx-4 mb-4 rounded-xl overflow-hidden border"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm">📊</span>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Previsibilidade mensal
          </span>
        </div>
        <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
          {formatCurrency(total)}
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>por mês em recorrentes</p>
      </div>

      {/* Breakdown por categoria */}
      <div className="px-4 py-3 space-y-3">
        {cats.map(cat => (
          <div key={cat.categoria_id}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">{cat.categoria_emoji}</span>
                <span className="text-sm capitalize truncate" style={{ color: 'var(--ink)' }}>{cat.categoria_nome}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  {formatCurrency(cat.total_categoria_centavos)}
                </span>
                <span className="text-xs w-9 text-right" style={{ color: 'var(--muted)' }}>
                  {cat.percentual}%
                </span>
              </div>
            </div>
            {/* Barra de progresso */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${cat.percentual}%`, background: 'var(--sage)' }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Split por pagador */}
      {pags.some(p => p.total_centavos > 0) && (
        <div className="px-4 pb-4 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2 mt-2" style={{ color: 'var(--muted)' }}>
            Quem desembolsa
          </p>
          <div className="space-y-1">
            {pags.filter(p => p.total_centavos > 0).map(p => (
              <div key={p.pagador_id} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--muted)' }}>{p.pagador_apelido}</span>
                <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                  {formatCurrency(p.total_centavos)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
