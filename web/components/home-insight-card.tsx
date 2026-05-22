import { formatCurrency } from '@/lib/money'

type InsightData =
  | { tipo: 'crescimento'; emoji: string; nome: string; atual: number; variacao_pct: number; mesLabel: string }
  | { tipo: 'equilibrado'; total: number }
  | { tipo: 'primeiro_mes'; total: number }
  | { tipo: 'sem_dados' }

type Props = {
  insight: InsightData
}

export function HomeInsightCard({ insight }: Props) {
  let texto: string

  switch (insight.tipo) {
    case 'crescimento':
      texto = `${insight.emoji} Vocês gastaram ${formatCurrency(insight.atual)} com ${insight.nome} — ${insight.variacao_pct}% a mais que em ${insight.mesLabel}.`
      break
    case 'equilibrado':
      texto = `✨ Mês equilibrado! Gastos totais de ${formatCurrency(insight.total)}.`
      break
    case 'primeiro_mes':
      texto = `🎉 Primeiro mês! Total: ${formatCurrency(insight.total)}.`
      break
    case 'sem_dados':
      texto = '📊 Nenhum gasto registrado ainda este mês.'
      break
  }

  return (
    <div
      className="rounded-2xl px-4 py-4"
      style={{ background: 'var(--ink)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--muted)' }}>
        Insight do mês
      </p>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--card)' }}>
        {texto}
      </p>
    </div>
  )
}

export function HomeInsightCardSkeleton() {
  return (
    <div
      className="rounded-2xl px-4 py-4 animate-pulse"
      style={{ background: 'var(--ink)' }}
    >
      <div className="h-3 w-20 rounded mb-2" style={{ background: 'var(--bg-2)' }} />
      <div className="h-4 w-full rounded mb-1" style={{ background: 'var(--bg-2)' }} />
      <div className="h-4 w-3/4 rounded" style={{ background: 'var(--bg-2)' }} />
    </div>
  )
}
