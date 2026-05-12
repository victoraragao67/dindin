import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/money'
import { SaldoDetalheButton } from './saldo-detalhe-modal'
import type { SaldoDetalhe } from './saldo-detalhe-modal'

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

export async function SaldoHeader() {
  const supabase = createClient()

  const [
    { data: { user } },
    { data: saldoRows },
    { data: users },
    { data: detalheRows },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('v_saldo_atual').select('devedor_id, credor_id, valor_centavos'),
    supabase.from('users').select('id, apelido'),
    supabase.from('v_saldo_detalhado').select('*'),
  ])

  const saldo = (saldoRows as SaldoRow[] | null)?.[0] ?? null
  const userList = (users as UserRow[] | null) ?? []
  const detalhe = (detalheRows as DetalheRow[] | null)?.[0] ?? null

  function getApelido(id: string) {
    return userList.find(u => u.id === id)?.apelido ?? '?'
  }

  let mensagem: string
  let devedorApelido: string | null = null
  let credorApelido:  string | null = null
  let saldoValor:     number | null = null

  if (!saldo) {
    mensagem = '✅ Estão quite!'
  } else if (saldo.devedor_id === user?.id) {
    credorApelido  = getApelido(saldo.credor_id)
    devedorApelido = getApelido(saldo.devedor_id)
    saldoValor     = saldo.valor_centavos
    mensagem = `💸 Você deve ${formatCurrency(saldo.valor_centavos)} para ${credorApelido}`
  } else {
    credorApelido  = getApelido(saldo.credor_id)
    devedorApelido = getApelido(saldo.devedor_id)
    saldoValor     = saldo.valor_centavos
    mensagem = `💰 ${devedorApelido} te deve ${formatCurrency(saldo.valor_centavos)}`
  }

  const detalheProps: SaldoDetalhe | null = detalhe ? {
    apelido_a:  detalhe.apelido_a,
    apelido_b:  detalhe.apelido_b,
    pagou_a:    detalhe.pagou_a,
    pagou_b:    detalhe.pagou_b,
    credito_a:  detalhe.credito_a,
    credito_b:  detalhe.credito_b,
    acertos_net: detalhe.acertos_net,
  } : null

  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4 bg-slate-800 border-b border-slate-700">
      <SaldoDetalheButton
        mensagem={mensagem}
        detalhe={detalheProps}
        devedorApelido={devedorApelido}
        credorApelido={credorApelido}
        saldoValor={saldoValor}
      />
      <Link href="/config" className="text-slate-400 hover:text-white transition-colors text-lg shrink-0" aria-label="Configurações">⚙️</Link>
    </header>
  )
}

export function SaldoHeaderSkeleton() {
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-4 bg-slate-800 border-b border-slate-700">
      <div className="h-5 w-56 rounded bg-slate-700 animate-pulse" />
      <div className="h-4 w-8 rounded bg-slate-700 animate-pulse" />
    </header>
  )
}
