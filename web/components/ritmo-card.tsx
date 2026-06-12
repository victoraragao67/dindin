import type { PreditivaCategoria } from '@/lib/preditiva'

type Props = {
  preditiva:     PreditivaCategoria[]
  insightResumo: string | null
}

export function RitmoCard({ preditiva, insightResumo }: Props) {
  const criticas = preditiva.filter(
    c => c.status === 'estourou' || c.status === 'vai_estourar',
  )

  if (!insightResumo && criticas.length === 0) return null

  const ctaTexto = criticas.length === 1
    ? '1 categoria pedindo atenção'
    : `${criticas.length} categorias pedindo atenção`

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

      {/* CTA único para categorias críticas → navega para /metas */}
      {criticas.length > 0 && (
        <a href="/metas">
          <div
            className="rounded-xl px-4 py-3 border flex items-center justify-between"
            style={{
              background: 'color-mix(in srgb, var(--coral) 6%, var(--card))',
              borderColor: 'color-mix(in srgb, var(--coral) 30%, transparent)',
            }}
          >
            <p className="text-sm" style={{ color: 'var(--ink)' }}>
              {ctaTexto}
            </p>
            <span className="text-sm font-medium" style={{ color: 'var(--coral)' }}>
              Ver metas →
            </span>
          </div>
        </a>
      )}
    </section>
  )
}
