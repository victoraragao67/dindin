import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import { formatCurrency } from '@/lib/money'
import { SaldoDetalheButton } from './saldo-detalhe-modal'
import { MenuSheet } from './menu-sheet'
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
    user,
    { data: saldoRows },
    { data: users },
    { data: detalheRows },
    { data: recorrentesRows },
  ] = await Promise.all([
    getUser(),  // deduplica com layout + page (React cache)
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
    <div className="border-b" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      {/* Card 1 — Gastos variáveis */}
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <SaldoDetalheButton
          mensagem={mensagem}
          detalhe={detalheProps}
          devedorApelido={devedorApelido}
          credorApelido={credorApelido}
          saldoValor={saldoValor}
        />
        <MenuSheet />
      </div>

      {/* Card 2 — Recorrentes (só aparece se há recorrentes no mês) */}
      {totalMesRec > 0 && (
        <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: 'var(--bg-2)' }}>
            {/* Título */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🏠</span>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  Recorrentes · {mesLabelRec}
                </span>
              </div>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>{formatCurrency(totalMesRec)}</span>
            </div>

            {/* Quem pagou quanto */}
            <div className="space-y-1">
              {recorrentes.map(r => (
                <div key={r.apelido} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>{r.apelido} pagou</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(r.pago_centavos)}</span>
                </div>
              ))}
            </div>

            {/* Status */}
            <div className="pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
              {equilibrado ? (
                <p className="text-sm" style={{ color: 'var(--sage)' }}>✅ Fixos equilibrados este mês</p>
              ) : quemCobre ? (
                <p className="text-sm" style={{ color: 'var(--coral)' }}>
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
    <div className="border-b" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between gap-3 px-4 py-4">
        <div className="h-5 w-56 rounded animate-pulse" style={{ background: 'var(--bg-2)' }} />
        <div className="h-4 w-8 rounded animate-pulse" style={{ background: 'var(--bg-2)' }} />
      </div>
    </div>
  )
}
