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

type RecorrenteRow = {
  user_id: string
  apelido: string
  pago_centavos: number
  ideal_centavos: number
  saldo_centavos: number
  total_mes_centavos: number
}

export async function SaldoHeader() {
  const supabase = createClient()

  const [
    { data: { user } },
    { data: saldoRows },
    { data: users },
    { data: detalheRows },
    { data: recorrentesRows },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('v_saldo_atual').select('devedor_id, credor_id, valor_centavos'),
    supabase.from('users').select('id, apelido'),
    supabase.from('v_saldo_detalhado').select('*'),
    supabase.from('v_saldo_recorrentes').select('*').order('apelido'),
  ])

  const saldo = (saldoRows as SaldoRow[] | null)?.[0] ?? null
  const userList = (users as UserRow[] | null) ?? []
  const detalhe = (detalheRows as DetalheRow[] | null)?.[0] ?? null
  const recorrentes = (recorrentesRows as RecorrenteRow[] | null) ?? []

  function getApelido(id: string) {
    return userList.find(u => u.id === id)?.apelido ?? '?'
  }

  // ── Card 1: saldo variável ──────────────────────────────────
  let mensagem: string
  let devedorApelido: string | null = null
  let credorApelido:  string | null = null
  let saldoValor:     number | null = null

  if (!saldo) {
    mensagem = '✅ Variáveis: quite!'
  } else if (saldo.devedor_id === user?.id) {
    credorApelido  = getApelido(saldo.credor_id)
    devedorApelido = getApelido(saldo.devedor_id)
    saldoValor     = saldo.valor_centavos
    mensagem = `⚡ Você deve ${formatCurrency(saldo.valor_centavos)} para ${credorApelido}`
  } else {
    credorApelido  = getApelido(saldo.credor_id)
    devedorApelido = getApelido(saldo.devedor_id)
    saldoValor     = saldo.valor_centavos
    mensagem = `⚡ ${devedorApelido} te deve ${formatCurrency(saldo.valor_centavos)}`
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

  // ── Card 2: saldo recorrentes ───────────────────────────────
  const totalMesRec = recorrentes[0]?.total_mes_centavos ?? 0
  const equilibrado = totalMesRec > 0 && recorrentes.every(r => r.saldo_centavos === 0)
  const quemCobre   = recorrentes.find(r => r.saldo_centavos < 0)

  // Mês atual em pt-BR
  const mesLabelRec = new Date().toLocaleDateString('pt-BR', {
    month: 'short', year: '2-digit', timeZone: 'America/Sao_Paulo',
  })

  return (
    <div className="bg-slate-800 border-b border-slate-700">
      {/* Card 1 — Gastos variáveis */}
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <SaldoDetalheButton
          mensagem={mensagem}
          detalhe={detalheProps}
          devedorApelido={devedorApelido}
          credorApelido={credorApelido}
          saldoValor={saldoValor}
        />
        <Link href="/config" className="text-slate-400 hover:text-white transition-colors text-lg shrink-0" aria-label="Configurações">⚙️</Link>
      </div>

      {/* Card 2 — Recorrentes (só aparece se há recorrentes no mês) */}
      {totalMesRec > 0 && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-700/50">
          <div className="rounded-xl bg-slate-900/60 px-4 py-3 space-y-2">
            {/* Título */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🏠</span>
                <span className="text-slate-400 text-xs font-semibold uppercase tracking-wide">
                  Recorrentes · {mesLabelRec}
                </span>
              </div>
              <span className="text-slate-500 text-xs">{formatCurrency(totalMesRec)}</span>
            </div>

            {/* Quem pagou quanto */}
            <div className="space-y-1">
              {recorrentes.map(r => (
                <div key={r.apelido} className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{r.apelido} pagou</span>
                  <span className="text-white text-sm font-medium">{formatCurrency(r.pago_centavos)}</span>
                </div>
              ))}
            </div>

            {/* Status */}
            <div className="pt-1 border-t border-slate-700/50">
              {equilibrado ? (
                <p className="text-emerald-400 text-sm">✅ Fixos equilibrados este mês</p>
              ) : quemCobre ? (
                <p className="text-amber-400 text-sm">
                  → {quemCobre.apelido} precisa cobrir {formatCurrency(Math.abs(quemCobre.saldo_centavos))}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SaldoHeaderSkeleton() {
  return (
    <div className="bg-slate-800 border-b border-slate-700">
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div className="h-5 w-56 rounded bg-slate-700 animate-pulse" />
        <div className="h-4 w-8 rounded bg-slate-700 animate-pulse" />
      </div>
    </div>
  )
}
