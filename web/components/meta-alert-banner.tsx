import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type CategoriaAlert = {
  nome:  string
  emoji: string
  pct:   number
}

export async function MetaAlertBanner() {
  const supabase = createClient()

  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  )
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()
  const start = `${ano}-${String(mes).padStart(2, '0')}-01`

  const [metasRes, gastosRes] = await Promise.all([
    supabase
      .from('spending_goals')
      .select('categoria_id, valor_centavos')
      .eq('mes', mes)
      .eq('ano', ano),

    supabase
      .from('v_gastos_por_categoria_mes')
      .select('categoria_id, categoria_nome, categoria_emoji, total_centavos')
      .gte('mes', start)
      .lte('mes', start),
  ])

  const metas: Record<number, number> = {}
  for (const m of (metasRes.data ?? []) as any[]) {
    metas[m.categoria_id] = m.valor_centavos
  }

  const alertas: CategoriaAlert[] = []
  for (const g of (gastosRes.data ?? []) as any[]) {
    const meta = metas[g.categoria_id]
    if (!meta) continue
    const pct = Math.round((g.total_centavos / meta) * 100)
    if (pct >= 90) {
      alertas.push({ nome: g.categoria_nome, emoji: g.categoria_emoji, pct })
    }
  }

  if (alertas.length === 0) return null

  const primeiro = alertas[0]

  return (
    <Link href="/metas" style={{ display: 'block', margin: '8px 16px 0', textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        borderRadius: 14,
        background: 'color-mix(in srgb, var(--coral) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--coral) 25%, transparent)',
        padding: '10px 14px',
      }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
        <p style={{ fontSize: 13, color: 'var(--ink)', flex: 1, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 600 }}>{primeiro.emoji} {primeiro.nome}</span>
          {' '}está em{' '}
          <span style={{ fontWeight: 700, color: 'var(--coral)' }}>{primeiro.pct}% da meta do mês</span>
          {alertas.length > 1 && (
            <span style={{ color: 'var(--muted)', fontSize: 11 }}> (+{alertas.length - 1} categoria{alertas.length > 2 ? 's' : ''})</span>
          )}
        </p>
        <span style={{ color: 'var(--coral)', fontSize: 12, flexShrink: 0, fontWeight: 600 }}>Ver →</span>
      </div>
    </Link>
  )
}
