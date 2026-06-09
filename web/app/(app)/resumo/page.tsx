import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { SaldoHeader, SaldoHeaderSkeleton } from '@/components/saldo-header'
import { ResumoClient } from '@/components/resumo-client'
import { formatCurrency } from '@/lib/money'

/* ── Tipos ─────────────────────────────────────────────────── */

type CategoriaRow = {
  categoria_id:   number
  categoria_nome: string
  categoria_emoji: string
  total_centavos: number
}

type GastoMensalRow = {
  mes:            string
  total_centavos: number
}

type TopGasto = {
  id:                    string
  valor_total_centavos:  number
  descricao:             string | null
  data_compra:           string
  categoria_emoji:       string
  categoria_nome:        string
  pagador_apelido:       string
}

type DivisaoItem = {
  apelido:       string
  total:         number
  pct:           number
}

type RecorrenteItem = {
  apelido:          string
  descricao:        string
  valor_centavos:   number
  categoria_emoji:  string
}

export type CustoRealRow = {
  apelido:          string
  custo_variavel:   number
  custo_recorrente: number
  custo_total:      number
  pct:              number  // % do custo total do casal
}

export type CompraItem = {
  installment_valor: number
  data_competencia:  string
  expense_id:        string
  descricao:         string | null
  pagador_apelido:   string
  categoria_id:      number
  categoria_nome:    string
  categoria_emoji:   string
}

export type ParcelaEmAberto = {
  expense_id:          string
  descricao:           string | null
  categoria_emoji:     string
  categoria_nome:      string
  pagador_apelido:     string
  valor_parcela:       number
  num_parcelas:        number
  parcelas_restantes:  number
  parcela_atual:       number  // 1-based: qual parcela está no mês atual
  proxima_data:        string  // primeiro mês futuro em aberto
}

export type ResumoData = {
  mesLabel:             string
  totalMes:             number
  categorias:           CategoriaRow[]
  divisao:              DivisaoItem[]   // quanto cada um pagou fisicamente (variável + recorrente)
  custoRealCompleto:    CustoRealRow[]  // custo real por pessoa (variável + recorrente, splits aplicados)
  recorrentes:          RecorrenteItem[]
  metasPorCategoria:    Record<number, number>
  topGastos:            TopGasto[]
  gastosMensais:        GastoMensalRow[]
  compras:              CompraItem[]
  parcelasEmAberto:     ParcelaEmAberto[]
}

/* ── Helpers ────────────────────────────────────────────────── */

function mesParaLabel(mesStr: string): string {
  const [year, month] = mesStr.split('-').map(Number)
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function mesRange(mesStr: string): { start: string; end: string } {
  const [year, month] = mesStr.split('-').map(Number)
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function currentMesStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 7) + '-01'
}

/* ── Page ───────────────────────────────────────────────────── */

export default async function ResumoPage({
  searchParams,
}: {
  searchParams: { mes?: string }
}) {
  const mesStr = searchParams.mes ?? currentMesStr()
  const { start, end } = mesRange(mesStr)

  const supabase = createClient()

  const [
    categoriasRes,
    divisaoRes,
    topGastosRes,
    mensaisRes,
    usersRes,
    recorrentesRes,
    metasRes,
    comprasRes,
    parcelasAbertoRes,
    custoRealRes,
  ] = await Promise.all([
    // Gastos por categoria no mês
    supabase
      .from('v_gastos_por_categoria_mes')
      .select('categoria_id, categoria_nome, categoria_emoji, total_centavos')
      .gte('mes', start)
      .lte('mes', start)   // mes é o primeiro dia do mês
      .order('total_centavos', { ascending: false }),

    // Divisão: quanto cada um pagou — variável + recorrente (todos os origins)
    // Aba "Quanto pagou" mostra o desembolso físico total de cada pessoa no mês.
    supabase
      .from('expense_installments')
      .select('valor_centavos, expenses!inner(pagador_id, cancelado, origem, divisao, split_pagador_pct)')
      .gte('data_competencia', start)
      .lte('data_competencia', end)
      .eq('expenses.cancelado', false),

    // Top 5 gastos
    supabase
      .from('expenses')
      .select('id, valor_total_centavos, descricao, data_compra, categoria:categories(nome, emoji), pagador:users!expenses_pagador_id_fkey(apelido)')
      .gte('data_compra', start)
      .lte('data_compra', end)
      .eq('cancelado', false)
      .order('valor_total_centavos', { ascending: false })
      .limit(5),

    // Últimos 6 meses
    supabase
      .from('v_gastos_mensais')
      .select('mes, total_centavos')
      .order('mes', { ascending: true })
      .limit(6),

    // Usuários para resolver apelidos da divisão
    supabase.from('users').select('id, apelido'),

    // Recorrentes ativos para exibir compromissos fixos por pessoa
    supabase
      .from('recurring_templates')
      .select('pagador_id, descricao, valor_centavos, categoria:categories(emoji)')
      .eq('ativo', true)
      .order('valor_centavos', { ascending: false }),

    // Metas de gasto do mês
    supabase
      .from('spending_goals')
      .select('categoria_id, valor_centavos')
      .eq('mes', Number(mesStr.split('-')[1]))
      .eq('ano', Number(mesStr.split('-')[0])),

    // Compras individuais do mês (para drawers de categoria e pessoa)
    supabase
      .from('expense_installments')
      .select('valor_centavos, data_competencia, expenses!inner(id, descricao, cancelado, pagador:users!expenses_pagador_id_fkey(apelido), categoria:categories(id, nome, emoji))')
      .gte('data_competencia', start)
      .lte('data_competencia', end)
      .eq('expenses.cancelado', false)
      .order('data_competencia', { ascending: false }),

    // Parcelas em aberto — installments após o mês selecionado
    supabase
      .from('expense_installments')
      .select('expense_id, valor_centavos, data_competencia, expenses!inner(id, descricao, parcelas, cancelado, pagador:users!expenses_pagador_id_fkey(apelido), categoria:categories(nome, emoji))')
      .gt('data_competencia', end)
      .eq('expenses.cancelado', false)
      .order('data_competencia', { ascending: true }),

    // Custo real completo (variável + recorrente, splits dos dois lados)
    // Nota: v_custo_real_mes sempre usa o mês atual via current_date —
    // só faz sentido quando o mês selecionado é o atual.
    supabase
      .from('v_custo_real_mes')
      .select('user_id, apelido, custo_variavel, custo_recorrente, custo_total'),
  ])

  const categorias = (categoriasRes.data ?? []) as CategoriaRow[]
  const totalMes = categorias.reduce((s, c) => s + c.total_centavos, 0)

  // Divisão por pagador — desembolso físico total (variável + recorrente)
  const users = usersRes.data ?? []
  const totaisPorPagador: Record<string, number> = {}

  for (const row of (divisaoRes.data ?? []) as any[]) {
    const pagId = row.expenses?.pagador_id
    const valor = row.valor_centavos as number
    if (!pagId) continue
    totaisPorPagador[pagId] = (totaisPorPagador[pagId] ?? 0) + valor
  }

  const totalDivisao = Object.values(totaisPorPagador).reduce((s, v) => s + v, 0)

  const divisao: DivisaoItem[] = users.map(u => ({
    apelido: u.apelido,
    total:   totaisPorPagador[u.id] ?? 0,
    pct:     totalDivisao > 0 ? Math.round(((totaisPorPagador[u.id] ?? 0) / totalDivisao) * 100) : 0,
  })).sort((a, b) => b.total - a.total)

  // Top gastos — normaliza o join (pode vir como array)
  const topGastos: TopGasto[] = ((topGastosRes.data ?? []) as any[]).map(e => ({
    id:                   e.id,
    valor_total_centavos: e.valor_total_centavos,
    descricao:            e.descricao,
    data_compra:          e.data_compra,
    categoria_emoji:      Array.isArray(e.categoria) ? e.categoria[0]?.emoji : e.categoria?.emoji ?? '💸',
    categoria_nome:       Array.isArray(e.categoria) ? e.categoria[0]?.nome  : e.categoria?.nome  ?? '',
    pagador_apelido:      Array.isArray(e.pagador)   ? e.pagador[0]?.apelido : e.pagador?.apelido ?? '',
  }))

  const gastosMensais: GastoMensalRow[] = ((mensaisRes.data ?? []) as any[]).map(r => ({
    mes:            r.mes,
    total_centavos: r.total_centavos,
  }))

  // Metas por categoria
  const metasPorCategoria: Record<number, number> = {}
  for (const m of (metasRes.data ?? []) as any[]) {
    metasPorCategoria[m.categoria_id] = m.valor_centavos
  }

  // Recorrentes — mapeia pagador_id → apelido e normaliza join de categoria
  const recorrentes: RecorrenteItem[] = ((recorrentesRes.data ?? []) as any[]).map(r => {
    const user = users.find(u => u.id === r.pagador_id)
    return {
      apelido:         user?.apelido ?? '?',
      descricao:       r.descricao,
      valor_centavos:  r.valor_centavos,
      categoria_emoji: Array.isArray(r.categoria) ? r.categoria[0]?.emoji : r.categoria?.emoji ?? '📦',
    }
  })

  // Compras individuais — normaliza join aninhado
  const compras: CompraItem[] = ((comprasRes.data ?? []) as any[]).flatMap(row => {
    const exp = row.expenses
    if (!exp) return []
    const pagadorApelido = Array.isArray(exp.pagador) ? exp.pagador[0]?.apelido : exp.pagador?.apelido
    const cat = Array.isArray(exp.categoria) ? exp.categoria[0] : exp.categoria
    if (!pagadorApelido || !cat) return []
    return [{
      installment_valor: row.valor_centavos,
      data_competencia:  row.data_competencia,
      expense_id:        exp.id,
      descricao:         exp.descricao ?? null,
      pagador_apelido:   pagadorApelido,
      categoria_id:      cat.id,
      categoria_nome:    cat.nome,
      categoria_emoji:   cat.emoji,
    }]
  })

  // Parcelas em aberto — agrupa por expense_id
  const parcelasMap: Record<string, ParcelaEmAberto> = {}
  for (const row of (parcelasAbertoRes.data ?? []) as any[]) {
    const exp = row.expenses
    if (!row.expense_id || !exp) continue
    if (!parcelasMap[row.expense_id]) {
      const pagador = Array.isArray(exp.pagador) ? exp.pagador[0] : exp.pagador
      const cat     = Array.isArray(exp.categoria) ? exp.categoria[0] : exp.categoria
      const numTotal = exp.parcelas ?? 0
      parcelasMap[row.expense_id] = {
        expense_id:         row.expense_id,
        descricao:          exp.descricao ?? null,
        categoria_emoji:    cat?.emoji  ?? '📦',
        categoria_nome:     cat?.nome   ?? '',
        pagador_apelido:    pagador?.apelido ?? '?',
        valor_parcela:      row.valor_centavos,
        num_parcelas:       numTotal,
        parcelas_restantes: 0,
        parcela_atual:      0,
        proxima_data:       row.data_competencia,
      }
    }
    parcelasMap[row.expense_id].parcelas_restantes++
  }
  // Calcula parcela_atual = num_parcelas - parcelas_restantes
  const parcelasEmAberto: ParcelaEmAberto[] = Object.values(parcelasMap)
    .map(p => ({ ...p, parcela_atual: p.num_parcelas - p.parcelas_restantes }))
    .sort((a, b) => a.proxima_data.localeCompare(b.proxima_data))

  // Custo real completo (variável + recorrente)
  const custoRealRaw = (custoRealRes.data ?? []) as { user_id: string; apelido: string; custo_variavel: number; custo_recorrente: number; custo_total: number }[]
  const totalCustoReal = custoRealRaw.reduce((s, r) => s + r.custo_total, 0)
  const custoRealCompleto: CustoRealRow[] = custoRealRaw
    .map(r => ({
      apelido:          r.apelido,
      custo_variavel:   r.custo_variavel,
      custo_recorrente: r.custo_recorrente,
      custo_total:      r.custo_total,
      pct:              totalCustoReal > 0 ? Math.round((r.custo_total / totalCustoReal) * 100) : 0,
    }))
    .sort((a, b) => b.custo_total - a.custo_total)

  const resumoData: ResumoData = {
    mesLabel:          mesParaLabel(mesStr),
    totalMes,
    categorias,
    divisao,
    custoRealCompleto,
    recorrentes,
    metasPorCategoria,
    topGastos,
    gastosMensais,
    compras,
    parcelasEmAberto,
  }

  return (
    <>
      <Suspense fallback={<SaldoHeaderSkeleton />}>
        <SaldoHeader />
      </Suspense>

      <ResumoClient data={resumoData} mesAtual={mesStr} />
    </>
  )
}
