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

export type ResumoData = {
  mesLabel:       string
  totalMes:       number
  categorias:     CategoriaRow[]
  divisao:        DivisaoItem[]
  recorrentes:    RecorrenteItem[]
  topGastos:      TopGasto[]
  gastosMensais:  GastoMensalRow[]
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
  ] = await Promise.all([
    // Gastos por categoria no mês
    supabase
      .from('v_gastos_por_categoria_mes')
      .select('categoria_id, categoria_nome, categoria_emoji, total_centavos')
      .gte('mes', start)
      .lte('mes', start)   // mes é o primeiro dia do mês
      .order('total_centavos', { ascending: false }),

    // Divisão: quanto cada um pagou (expense_installments do mês)
    supabase
      .from('expense_installments')
      .select('valor_centavos, expenses!inner(pagador_id, cancelado)')
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
  ])

  const categorias = (categoriasRes.data ?? []) as CategoriaRow[]
  const totalMes = categorias.reduce((s, c) => s + c.total_centavos, 0)

  // Divisão por pagador
  const users = usersRes.data ?? []
  const totaisPorPagador: Record<string, number> = {}
  for (const row of (divisaoRes.data ?? []) as any[]) {
    const pagId = row.expenses?.pagador_id
    if (!pagId) continue
    totaisPorPagador[pagId] = (totaisPorPagador[pagId] ?? 0) + row.valor_centavos
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

  const resumoData: ResumoData = {
    mesLabel:      mesParaLabel(mesStr),
    totalMes,
    categorias,
    divisao,
    recorrentes,
    topGastos,
    gastosMensais,
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
