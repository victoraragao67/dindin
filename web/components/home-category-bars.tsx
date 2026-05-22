import { formatCurrency } from '@/lib/money'

type CategoriaRow = {
  categoria_id: number
  categoria_nome: string
  categoria_emoji: string
  total_centavos: number
}

type Props = {
  categorias: CategoriaRow[]
}

export function HomeCategoryBars({ categorias }: Props) {
  const top4 = categorias.slice(0, 4)
  const max = top4[0]?.total_centavos ?? 1

  if (top4.length === 0) {
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
      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>
        Top categorias
      </p>
      <div className="space-y-3">
        {top4.map(cat => {
          const pct = Math.round((cat.total_centavos / max) * 100)
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
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%`, background: 'var(--coral)' }}
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
      <div className="h-3 w-28 rounded mb-3" style={{ background: 'var(--bg-2)' }} />
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
