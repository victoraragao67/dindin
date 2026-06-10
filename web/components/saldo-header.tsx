import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import { formatCurrency } from '@/lib/money'
import { SaldoDetalheButton } from './saldo-detalhe-modal'
import type { SaldoDetalhe, ImbalanceInfo, DividaLiquidaInfo } from './saldo-detalhe-modal'

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
  ua: string
  ub: string
  apelido_a: string
  apelido_b: string
  pagou_a: number
  pagou_b: number
  credito_a: number
  credito_b: number
  acertos_net: number
}

type ImbalanceRow = {
  user_id: string
  apelido: string
  saldo_liquido_centavos: number
  meses_count: number
}

export async function SaldoHeader() {
  const supabase = createClient()

  const [
    user,
    { data: saldoRows },
    { data: users },
    { data: detalheRows },
    { data: imbalanceRows },
  ] = await Promise.all([
    getUser(),
    supabase.from('v_saldo_atual').select('devedor_id, credor_id, valor_centavos'),
    supabase.from('users').select('id, apelido'),
    supabase.from('v_saldo_detalhado_mes').select('*'),
    supabase.from('v_recurring_imbalance').select('user_id, apelido, saldo_liquido_centavos, meses_count'),
  ])

  const saldo      = (saldoRows as SaldoRow[] | null)?.[0] ?? null
  const userList   = (users as UserRow[] | null) ?? []
  const detalhe    = (detalheRows as DetalheRow[] | null)?.[0] ?? null
  const imbalance  = (imbalanceRows as ImbalanceRow[] | null) ?? []

  function getApelido(id: string) {
    return userList.find(u => u.id === id)?.apelido ?? '?'
  }

  // ── Imbalance de recorrentes ─────────────────────────────────
  const credorRecorrente  = imbalance.find(r => r.saldo_liquido_centavos > 0)
  const imbalanceCentavos = credorRecorrente ? Math.max(credorRecorrente.saldo_liquido_centavos, 0) : 0
  const nomeCredorRec     = credorRecorrente?.apelido ?? ''
  const nomeDevedorRec    = imbalance.find(r => r.apelido !== nomeCredorRec)?.apelido ?? ''
  const mesesCount        = credorRecorrente?.meses_count ?? 0
  const hasImbalance      = imbalanceCentavos >= 5000

  // ── Dívida líquida real (mesma lógica do BalanceSection) ──────
  const dividaVariavel   = saldo?.valor_centavos ?? 0
  const nomeCredorVar    = saldo ? getApelido(saldo.credor_id) : ''
  const nomeDevedorVar   = saldo ? getApelido(saldo.devedor_id) : ''

  let dividaLiquidaValor    = 0
  let dividaLiquidaDevedor  = ''
  let dividaLiquidaCredor   = ''

  if (!hasImbalance) {
    dividaLiquidaValor   = dividaVariavel
    dividaLiquidaDevedor = nomeDevedorVar
    dividaLiquidaCredor  = nomeCredorVar
  } else if (!saldo) {
    dividaLiquidaValor   = imbalanceCentavos
    dividaLiquidaDevedor = nomeDevedorRec
    dividaLiquidaCredor  = nomeCredorRec
  } else if (nomeCredorVar === nomeCredorRec) {
    // Mesmo credor em variável e recorrente: as dívidas somam
    dividaLiquidaValor   = dividaVariavel + imbalanceCentavos
    dividaLiquidaDevedor = nomeDevedorVar
    dividaLiquidaCredor  = nomeCredorVar
  } else {
    // Credores opostos: crédito de recorrente abate dívida variável
    const net = dividaVariavel - imbalanceCentavos
    if (net >= 0) {
      dividaLiquidaValor   = net
      dividaLiquidaDevedor = nomeDevedorVar
      dividaLiquidaCredor  = nomeCredorVar
    } else {
      dividaLiquidaValor   = Math.abs(net)
      dividaLiquidaDevedor = nomeCredorVar   // inverteu
      dividaLiquidaCredor  = nomeDevedorVar
    }
  }

  // ── Card 1: mensagem do chip ─────────────────────────────────
  // Usa o valor LÍQUIDO para isonomia de dados
  let mensagem: string
  let devedorApelido: string | null = null
  let credorApelido:  string | null = null

  const exibeValor = hasImbalance ? dividaLiquidaValor : dividaVariavel

  if (exibeValor <= 0) {
    mensagem = '✅ Variáveis: quite!'
  } else {
    const devApelido = hasImbalance ? dividaLiquidaDevedor : nomeDevedorVar
    const crdApelido = hasImbalance ? dividaLiquidaCredor  : nomeCredorVar
    devedorApelido = devApelido
    credorApelido  = crdApelido
    if (devApelido === getApelido(user?.id ?? '')) {
      mensagem = `⚡ Você deve ${formatCurrency(exibeValor)} para ${crdApelido}`
    } else {
      mensagem = `⚡ ${devApelido} te deve ${formatCurrency(exibeValor)}`
    }
  }

  const detalheProps: SaldoDetalhe | null = detalhe ? {
    apelido_a:   detalhe.apelido_a,
    apelido_b:   detalhe.apelido_b,
    pagou_a:     detalhe.pagou_a,
    pagou_b:     detalhe.pagou_b,
    credito_a:   detalhe.credito_a,
    credito_b:   detalhe.credito_b,
    acertos_net: detalhe.acertos_net,
  } : null

  const imbalanceProps: ImbalanceInfo | null = hasImbalance ? {
    imbalanceCentavos,
    nomeCredorRec,
    nomeDevedorRec,
    mesesCount,
  } : null

  const dividaLiquidaProps: DividaLiquidaInfo | null = hasImbalance ? {
    valor:   dividaLiquidaValor,
    devedor: dividaLiquidaDevedor,
    credor:  dividaLiquidaCredor,
  } : null

  return (
    <div className="border-b" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      {/* Card 1 — Gastos variáveis */}
      <div className="flex items-center px-4 py-4">
        <SaldoDetalheButton
          mensagem={mensagem}
          detalhe={detalheProps}
          devedorApelido={devedorApelido}
          credorApelido={credorApelido}
          saldoValor={dividaVariavel > 0 ? dividaVariavel : null}
          imbalance={imbalanceProps}
          dividaLiquida={dividaLiquidaProps}
        />
      </div>

    </div>
  )
}

export function SaldoHeaderSkeleton() {
  return (
    <div className="border-b" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div className="h-5 w-56 rounded animate-pulse" style={{ background: 'var(--bg-2)' }} />
        <div className="h-4 w-8 rounded animate-pulse" style={{ background: 'var(--bg-2)' }} />
      </div>
    </div>
  )
}
