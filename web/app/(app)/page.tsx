import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import { formatCurrency } from '@/lib/money'
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
  credito_a: number
  credito_b: number
  acertos_net: number
  custo_a: number
  custo_b: number
}

type RecurringImbalanceRow = {
  user_id: string
  apelido: string
  saldo_bruto_centavos: number
  saldo_liquido_centavos: number
  total_pago_centavos: number
  meses_count: number
}

type SaldoRecorrentesRow = {
  user_id: string
  apelido: string
  pago_centavos: number
  ideal_centavos: number
  saldo_centavos: number
  total_mes_centavos: number
}

type PrevisibilidadePagadorRow = {
  pagador_id: string
  pagador_apelido: string
  total_centavos: number
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
    { data: imbalanceRows },
  ] = await Promise.all([
    supabase.from('v_saldo_atual').select('devedor_id, credor_id, valor_centavos'),
    supabase.from('users').select('id, apelido'),
    // v_saldo_detalhado_mes: escopo mês atual, só gastos variáveis (origem='pwa'), + custo real
    supabase.from('v_saldo_detalhado_mes').select('apelido_a, apelido_b, pagou_a, pagou_b, credito_a, credito_b, acertos_net, custo_a, custo_b'),
    supabase.from('v_recurring_imbalance').select('user_id, apelido, saldo_bruto_centavos, saldo_liquido_centavos, total_pago_centavos, meses_count'),
  ])

  const saldo      = (saldoRows as SaldoRow[] | null)?.[0] ?? null
  const userList   = (users as UserRow[] | null) ?? []
  const detalhe    = (detalheRows as DetalheRow[] | null)?.[0] ?? null
  const imbalance  = (imbalanceRows as RecurringImbalanceRow[] | null) ?? []

  // ── Compute dívida líquida real (isonomia de dados) ──────────
  const credorRecorrente  = imbalance.find(r => r.saldo_liquido_centavos > 0)
  const imbalanceCentavos = credorRecorrente ? Math.max(credorRecorrente.saldo_liquido_centavos, 0) : 0
  const nomeCredorRec     = credorRecorrente?.apelido ?? ''
  const nomeDevedorRec    = imbalance.find(r => r.apelido !== nomeCredorRec)?.apelido ?? ''

  const dividaVariavel   = saldo?.valor_centavos ?? 0
  const nomeCredorVar    = saldo ? (userList.find(u => u.id === saldo.credor_id)?.apelido ?? '') : ''
  const nomeDevedorVar   = saldo ? (userList.find(u => u.id === saldo.devedor_id)?.apelido ?? '') : ''
  const hasImbalance     = imbalanceCentavos >= 5000  // R$ 50 threshold

  let dividaLiquidaValor   = 0
  let devedorLiquidoApelido = ''
  let credorLiquidoApelido  = ''

  if (!hasImbalance) {
    dividaLiquidaValor    = dividaVariavel
    devedorLiquidoApelido = nomeDevedorVar
    credorLiquidoApelido  = nomeCredorVar
  } else if (!saldo) {
    // Só imbalance de recorrentes, sem dívida variável
    dividaLiquidaValor    = imbalanceCentavos
    devedorLiquidoApelido = nomeDevedorRec
    credorLiquidoApelido  = nomeCredorRec
  } else if (nomeCredorVar === nomeCredorRec) {
    // Mesmo credor: somam
    dividaLiquidaValor    = dividaVariavel + imbalanceCentavos
    devedorLiquidoApelido = nomeDevedorVar
    credorLiquidoApelido  = nomeCredorVar
  } else {
    // Sentidos opostos: subtrai
    const net = dividaVariavel - imbalanceCentavos
    if (net >= 0) {
      dividaLiquidaValor    = net
      devedorLiquidoApelido = nomeDevedorVar
      credorLiquidoApelido  = nomeCredorVar
    } else {
      dividaLiquidaValor    = Math.abs(net)
      devedorLiquidoApelido = nomeCredorVar   // inverteu
      credorLiquidoApelido  = nomeDevedorVar
    }
  }

  const devedorLiquidoId = userList.find(u => u.apelido === devedorLiquidoApelido)?.id ?? ''
  const credorLiquidoId  = userList.find(u => u.apelido === credorLiquidoApelido)?.id ?? ''

  const dividaLiquida = {
    valor:          dividaLiquidaValor,
    devedorId:      devedorLiquidoId,
    credorId:       credorLiquidoId,
    devedorApelido: devedorLiquidoApelido,
    credorApelido:  credorLiquidoApelido,
  }

  return (
    <>
      <HomeBalanceCard
        currentUserId={userId}
        saldo={saldo}
        users={userList}
        detalhe={detalhe}
        imbalance={imbalance}
        dividaLiquida={dividaLiquidaValor > 0 ? dividaLiquida : null}
      />
      <HomeAcertoBanner
        dividaLiquidaValor={dividaLiquidaValor}
        dividaLiquidaDevedor={devedorLiquidoApelido}
        dividaLiquidaCredor={credorLiquidoApelido}
        imbalanceCentavos={imbalanceCentavos}
        nomePagaMais={nomeCredorRec}
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
  const { start, end } = mesRange(mesAtual)

  const [catRes, recRes] = await Promise.all([
    supabase
      .from('v_gastos_por_categoria_mes')
      .select('categoria_id, categoria_nome, categoria_emoji, total_centavos')
      .gte('mes', mesAtual)
      .lte('mes', mesAtual)
      .order('total_centavos', { ascending: false }),
    supabase
      .from('expense_installments')
      .select('valor_centavos, expenses!inner(cancelado, origem)')
      .gte('data_competencia', start)
      .lte('data_competencia', end)
      .eq('expenses.cancelado', false)
      .eq('expenses.origem', 'recorrente'),
  ])

  const categorias = (catRes.data ?? []) as CategoriaRow[]
  const totalRecorrentes = ((recRes.data ?? []) as any[])
    .reduce((s, r) => s + (r.valor_centavos as number), 0)

  return <HomeCategoryBars categorias={categorias} totalRecorrentes={totalRecorrentes} />
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

async function RecorrentesSection() {
  const supabase = createClient()

  // Data atual em BRT para calcular início do mês
  const now    = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const mesStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const [{ data: templates }, { data: prevPagRows }, lancadosRes] = await Promise.all([
    supabase.from('recurring_templates').select('valor_centavos').eq('ativo', true),
    // Projeção mensal por pagador (baseada nos templates, independente do que foi lançado)
    supabase.from('v_previsibilidade_por_pagador').select('pagador_id, pagador_apelido, total_centavos'),
    // Quantos recorrentes já foram lançados este mês
    supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .eq('origem', 'recorrente')
      .eq('cancelado', false)
      .gte('data_competencia', mesStr),
  ])

  const items = (templates ?? []) as { valor_centavos: number }[]
  const total = items.reduce((s, r) => s + r.valor_centavos, 0)
  const count = items.length

  if (count === 0) return null

  // Desequilíbrio projetado (baseado nos templates, não no que foi lançado)
  const prevPag = (prevPagRows ?? []) as PrevisibilidadePagadorRow[]
  const sorted  = [...prevPag].filter(p => p.total_centavos > 0).sort((a, b) => b.total_centavos - a.total_centavos)
  const maiorPagador = sorted[0]
  const totalPrevisto = prevPag.reduce((s, p) => s + p.total_centavos, 0)
  // Quem paga mais do que a metade: é o credor projetado
  const deltaPrevisto = maiorPagador ? maiorPagador.total_centavos - Math.floor(totalPrevisto / 2) : 0
  const showAlerta = deltaPrevisto > 20000 // > R$ 200

  const lancadosCount = lancadosRes.count ?? 0
  const todosLancados = lancadosCount >= count

  return (
    <Link
      href="/recorrentes"
      className="flex items-center justify-between rounded-2xl px-4 py-4 border transition-opacity active:opacity-70"
      style={{ background: 'var(--card)', borderColor: 'var(--border)', textDecoration: 'none' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: 'var(--bg-2)' }}
        >
          🔁
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Recorrentes</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            {count} item{count !== 1 ? 's' : ''} · {formatCurrency(total)}<span>/mês</span>
          </p>
          {/* Linha: lançados este mês */}
          <p className="text-xs mt-0.5" style={{ color: todosLancados ? 'var(--sage)' : 'var(--muted)' }}>
            {todosLancados
              ? `✅ ${lancadosCount} lançado${lancadosCount !== 1 ? 's' : ''} este mês`
              : `⏳ ${lancadosCount} de ${count} lançado${count !== 1 ? 's' : ''} este mês`}
          </p>
          {/* Linha: desequilíbrio projetado */}
          {showAlerta ? (
            <p className="text-xs mt-0.5" style={{ color: 'var(--coral)' }}>
              ⚠️ {maiorPagador!.pagador_apelido} paga {formatCurrency(deltaPrevisto)} a mais — Rebalancear →
            </p>
          ) : (
            <p className="text-xs mt-0.5" style={{ color: 'var(--sage)' }}>✅ Split equilibrado</p>
          )}
        </div>
      </div>
      <span className="text-sm" style={{ color: 'var(--muted)' }}>›</span>
    </Link>
  )
}

function RecorrentesSectionSkeleton() {
  return (
    <div className="rounded-2xl px-4 py-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl" style={{ background: 'var(--bg-2)' }} />
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 rounded" style={{ background: 'var(--bg-2)' }} />
          <div className="h-3 w-20 rounded" style={{ background: 'var(--bg-2)' }} />
        </div>
      </div>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────── */

export default async function HomePage() {
  const user = await getUser()

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pt-5 space-y-4" data-scroll-root style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>

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

        {/* Recorrentes — card com total mensal */}
        <div className="pb-2">
          <Suspense fallback={<RecorrentesSectionSkeleton />}>
            <RecorrentesSection />
          </Suspense>
        </div>
      </div>

      <BottomNav />
    </>
  )
}

          <div className="h-3 w-20 rounded" style={{ background: 'var(--bg-2)' }} />
        </div>
      </div>
    </div>
  )
}

/* ── Page ───────────────────────────────────────────────────── */

export default async function HomePage() {
  const user = await getUser()

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pt-5 space-y-4" data-scroll-root style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>

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

        {/* Recorrentes — card com total mensal */}
        <div className="pb-2">
          <Suspense fallback={<RecorrentesSectionSkeleton />}>
            <RecorrentesSection />
          </Suspense>
        </div>
      </div>

      <BottomNav />
    </>
  )
}
