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
    <Link href="/resumo" className="block mx-4 mt-3">
      <div className="flex items-center gap-3 rounded-xl bg-amber-900/30 border border-amber-700/50 px-4 py-3">
        <span className="text-xl shrink-0">⚠️</span>
        <p className="text-amber-300 text-sm flex-1">
          <span className="font-medium">{primeiro.emoji} {primeiro.nome}</span>
          {' '}está em{' '}
          <span className="font-semibold">{primeiro.pct}%</span>
          {' '}da meta do mês
          {alertas.length > 1 && (
            <span className="text-amber-400/70 text-xs"> (+{alertas.length - 1} categoria{alertas.length > 2 ? 's' : ''})</span>
          )}
        </p>
        <span className="text-amber-500 text-xs shrink-0">Ver →</span>
      </div>
    </Link>
  )
}
