import { formatCurrency } from '@/lib/money'
import type { PreditivaCategoria } from '@/lib/preditiva'

const STATUS_COLOR: Record<string, string> = {
  estourou:     'var(--coral)',
  vai_estourar: '#e68a2e',
  no_limite:    '#c4803a',
  ok:           'var(--sage)',
  sem_meta:     'var(--muted)',
}

const STATUS_LABEL: Record<string, string> = {
  estourou:     'Estourou',
  vai_estourar: 'Vai estourar',
  no_limite:    'No limite',
  ok:           'No ritmo',
  sem_meta:     'Sem meta',
}

type Props = {
  preditiva:     PreditivaCategoria[]
  insightResumo: string | null
}

export function RitmoCard({ preditiva, insightResumo }: Props) {
  const categorias = preditiva.filter(c => c.status !== 'sem_meta')

  if (categorias.length === 0) return null

  const criticas = categorias
    .filter(c => c.status === 'estourou' || c.status === 'vai_estourar')
    .sort((a, b) => (b.projecao - (b.meta ?? 0)) - (a.projecao - (a.meta ?? 0)))
    .slice(0, 2)

  const resto = categorias
    .filter(c => c.status !== 'estourou' && c.status !== 'vai_estourar')

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

      {/* Categorias críticas em destaque */}
      {criticas.length > 0 && (
        <div className="space-y-2">
          {criticas.map(cat => {
            const cor     = STATUS_COLOR[cat.status]
            const label   = STATUS_LABEL[cat.status]
            const pctMeta = cat.meta ? Math.round((cat.gastoAcumulado / cat.meta) * 100) : 0
            const diff    = cat.projecao - (cat.meta ?? 0)
            return (
              <div
                key={cat.categoriaId}
                className="rounded-xl px-4 py-3 border"
                style={{
                  background:   'var(--card)',
                  borderColor:  cor,
                  borderWidth:  1,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                    {cat.emoji} {cat.nome}
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `color-mix(in srgb, ${cor} 14%, transparent)`, color: cor }}
                  >
                    {label}
                  </span>
                </div>
                <div className="flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
                  <span>Gasto: <strong style={{ color: 'var(--ink)' }}>{formatCurrency(cat.gastoAcumulado)}</strong></span>
                  <span>Meta: {formatCurrency(cat.meta ?? 0)}</span>
                </div>
                <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  <span>
                    Projeção: <strong style={{ color: cor }}>{formatCurrency(cat.projecao)}</strong>
                  </span>
                  {diff > 0 && (
                    <span style={{ color: cor }}>+{formatCurrency(diff)} acima</span>
                  )}
                </div>
                {cat.meta && (
                  <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${Math.min(pctMeta, 100)}%`, background: cor }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Demais categorias em lista compacta */}
      {resto.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden divide-y"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          {resto.map(cat => {
            const cor = STATUS_COLOR[cat.status]
            return (
              <div
                key={cat.categoriaId}
                className="flex items-center justify-between px-4 py-2.5"
                style={{ borderColor: 'var(--border)' }}
              >
                <span className="text-sm" style={{ color: 'var(--ink)' }}>
                  {cat.emoji} {cat.nome}
                </span>
                <div className="text-right">
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                    {formatCurrency(cat.projecao)}
                  </p>
                  <p className="text-xs" style={{ color: cor }}>
                    {cat.meta ? `${Math.round((cat.gastoAcumulado / cat.meta) * 100)}% da meta` : formatCurrency(cat.gastoAcumulado)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
