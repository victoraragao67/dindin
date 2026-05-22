import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import { HomeBalanceCard, HomeBalanceCardSkeleton } from '@/components/home-balance-card'
import { HomeAcertoBanner } from '@/components/home-acerto-banner'
import { HomeInsightCard, HomeInsightCardSkeleton } from '@/components/home-insight-card'
import { HomeCategoryBars, HomeCategoryBarsSkeleton } from '@/components/home-category-bars'
import { HomeRecentTx, HomeRecentTxSkeleton } from '@/components/home-recent-tx'
import { BottomNav } from '@/components/bottom-nav'

/* ── Tipos ─────────────────────────────────────────────────── */

type SaldoRow = {
  devedor_id: string
  credor_id: string
  valor_centavos: number
}

type UserRow = {
  id: string
  apelido: string
}

type DetalheRow = {
  apelido_a: string
  apelido_b: string
  pagou_a: number
  pagou_b: number
}

type CategoriaRow = {
  categoria_id: number
  categoria_nome: string
  categoria_emoji: string
  total_centavos: number
}

type InstallmentRow = {
  id: string
  valor_centavos: number
  data_competencia: string
  expenses: {
    id: string
    descricao: string | null
    divisao: string
    pagador: { apelido: string } | { apelido: string }[] | null
    categoria: { nome: string; emoji: string } | { nome: string; emoji: string }[] | null
  }
}

type InsightData =
  | { tipo: 'crescimento'; emoji: string; nome: string; atual: number; variacao_pct: number; mesLabel: string }
  | { tipo: 'equilibrado'; total: number }
  | { tipo: 'primeiro_mes'; total: number }
  | { tipo: 'sem_dados' }

/* ── Helpers ────────────────────────────────────────────────── */

function currentMesStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 7) + '-01'
}

function prevMesStr(mesStr: string): string {
  const [y, m] = mesStr.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function mesRange(mesStr: string): { start: string; end: string } {
  const [year, month] = mesStr.split('-').map(Number)
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function mesLabel(mesStr: string): string {
  const [y, m] = mesStr.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })
}

/* ── Subcomponentes assíncronos ─────────────────────────────── */

async function BalanceSection({ userId }: { userId: string | null }) {
  const supabase = createClient()

  const [
    { data: saldoRows },
    { data: users },
    { data: detalheRows },
  ] = await Promise.all([
    supabase.from('v_saldo_atual').select('devedor_id, credor_id, valor_centavos'),
    supabase.from('users').select('id, apelido'),
    supabase.from('v_saldo_detalhado').select('apelido_a, apelido_b, pagou_a, pagou_b'),
  ])

  const saldo = (saldoRows as SaldoRow[] | null)?.[0] ?? null
  const userList = (users as UserRow[] | null) ?? []
  const detalhe = (detalheRows as DetalheRow[] | null)?.[0] ?? null

  // Acerto banner
  let saldoCentavos = 0
  let devedorApelido = ''
  let credorApelido = ''
  if (saldo) {
    saldoCentavos = saldo.valor_centavos
    devedorApelido = userList.find(u => u.id === saldo.devedor_id)?.apelido ?? ''
    credorApelido  = userList.find(u => u.id === saldo.credor_id)?.apelido ?? ''
  }

  return (
    <>
      <HomeBalanceCard
        currentUserId={userId}
        saldo={saldo}
        users={userList}
        detalhe={detalhe}
      />
      <HomeAcertoBanner
        saldoCentavos={saldoCentavos}
        devedorApelido={devedorApelido}
        credorApelido={credorApelido}
      />
    </>
  )
}

async function InsightSection() {
  const supabase = createClient()
  const mesAtual = currentMesStr()
  const mesAnterior = prevMesStr(mesAtual)

  const [catAtualRes, catPrevRes] = await Promise.all([
    supabase
      .from('v_gastos_por_categoria_mes')
      .select('categoria_id, categoria_nome, categoria_emoji, total_centavos')
      .gte('mes', mesAtual)
      .lte('mes', mesAtual)
      .order('total_centavos', { ascending: false }),
    supabase
      .from('v_gastos_por_categoria_mes')
      .select('categoria_id, total_centavos')
      .gte('mes', mesAnterior)
      .lte('mes', mesAnterior),
  ])

  const catAtual = (catAtualRes.data ?? []) as CategoriaRow[]
  const catPrev  = (catPrevRes.data ?? []) as { categoria_id: number; total_centavos: number }[]
  const totalAtual = catAtual.reduce((s, c) => s + c.total_centavos, 0)

  let insight: InsightData

  if (catAtual.length === 0) {
    insight = { tipo: 'sem_dados' }
  } else if (catPrev.length === 0) {
    insight = { tipo: 'primeiro_mes', total: totalAtual }
  } else {
    // Busca categoria com maior crescimento percentual
    let melhor: { cat: CategoriaRow; variacao: number } | null = null

    for (const cat of catAtual) {
      const prev = catPrev.find(p => p.categoria_id === cat.categoria_id)
      if (!prev || prev.total_centavos === 0) continue
      const variacao = Math.round(((cat.total_centavos - prev.total_centavos) / prev.total_centavos) * 100)
      if (variacao >= 5 && (melhor === null || variacao > melhor.variacao)) {
        melhor = { cat, variacao }
      }
    }

    if (melhor) {
      insight = {
        tipo: 'crescimento',
        emoji: melhor.cat.categoria_emoji,
        nome: melhor.cat.categoria_nome,
        atual: melhor.cat.total_centavos,
        variacao_pct: melhor.variacao,
        mesLabel: mesLabel(mesAnterior),
      }
    } else {
      insight = { tipo: 'equilibrado', total: totalAtual }
    }
  }

  return <HomeInsightCard insight={insight} />
}

async function CategorySection() {
  const supabase = createClient()
  const mesAtual = currentMesStr()

  const { data } = await supabase
    .from('v_gastos_por_categoria_mes')
    .select('categoria_id, categoria_nome, categoria_emoji, total_centavos')
    .gte('mes', mesAtual)
    .lte('mes', mesAtual)
    .order('total_centavos', { ascending: false })

  const categorias = (data ?? []) as CategoriaRow[]
  return <HomeCategoryBars categorias={categorias} />
}

async function RecentTxSection() {
  const supabase = createClient()
  const mesAtual = currentMesStr()
  const { start, end } = mesRange(mesAtual)

  const { data } = await supabase
    .from('expense_installments')
    .select(`
      id,
      valor_centavos,
      data_competencia,
      expenses!inner (
        id,
        descricao,
        divisao,
        pagador:users!expenses_pagador_id_fkey ( apelido ),
        categoria:categories!expenses_categoria_id_fkey ( nome, emoji )
      )
    `)
    .gte('data_competencia', start)
    .lte('data_competencia', end)
    .eq('expenses.cancelado', false)
    .order('data_competencia', { ascending: false })
    .limit(4)

  const rows = (data ?? []) as unknown as InstallmentRow[]

  const transacoes = rows.map(row => {
    const exp = row.expenses
    const pagador = Array.isArray(exp.pagador) ? exp.pagador[0] : exp.pagador
    const cat     = Array.isArray(exp.categoria) ? exp.categoria[0] : exp.categoria
    return {
      id:                row.id,
      valor_centavos:    row.valor_centavos,
      data_competencia:  row.data_competencia,
      descricao:         exp.descricao,
      pagador_apelido:   pagador?.apelido ?? '?',
      categoria_emoji:   cat?.emoji ?? '💸',
      categoria_nome:    cat?.nome ?? '',
      divisao:           exp.divisao,
    }
  })

  return <HomeRecentTx transacoes={transacoes} />
}

/* ── Page ───────────────────────────────────────────────────── */

export default async function HomePage() {
  const user = await getUser()

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pt-5 space-y-4 pb-24">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
            DinDin 💚
          </h1>
        </div>

        {/* Balance + Acerto Banner */}
        <Suspense fallback={<HomeBalanceCardSkeleton />}>
          <BalanceSection userId={user?.id ?? null} />
        </Suspense>

        {/* Insight */}
        <Suspense fallback={<HomeInsightCardSkeleton />}>
          <InsightSection />
        </Suspense>

        {/* Top categorias */}
        <Suspense fallback={<HomeCategoryBarsSkeleton />}>
          <CategorySection />
        </Suspense>

        {/* Últimas transações */}
        <Suspense fallback={<HomeRecentTxSkeleton />}>
          <RecentTxSection />
        </Suspense>
      </div>

      <BottomNav />
    </>
  )
}
