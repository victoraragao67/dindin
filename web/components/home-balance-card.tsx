'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/money'
import { InfoTooltip } from '@/components/info-tooltip'
import { createClient } from '@/lib/supabase/client'

type GastoItem = {
  id: string
  valor_centavos: number
  data_competencia: string
  descricao: string | null
  categoria_nome: string
  categoria_emoji: string
}

type SaldoRow = {
  devedor_id: string
  credor_id: string
  valor_centavos: number
}

type UserRow = {
  id: string
  apelido: string
}

// v_saldo_detalhado_mes: escopo mês atual, só variáveis, + custo real
type DetalheRow = {
  apelido_a: string
  apelido_b: string
  pagou_a: number
  pagou_b: number
  credito_a: number
  credito_b: number
  acertos_net: number
  custo_a?: number
  custo_b?: number
}

type RecurringImbalanceRow = {
  user_id: string
  apelido: string
  saldo_bruto_centavos: number
  saldo_liquido_centavos: number
  total_pago_centavos: number
  meses_count: number
}

// Pre-computed dívida líquida real (variável − crédito estrutural)
type DividaLiquidaInfo = {
  valor: number
  devedorId: string
  credorId: string
  devedorApelido: string
  credorApelido: string
}

type Props = {
  currentUserId: string | null
  saldo: SaldoRow | null
  users: UserRow[]
  detalhe: DetalheRow | null
  imbalance?: RecurringImbalanceRow[]
  dividaLiquida?: DividaLiquidaInfo | null
}

export function HomeBalanceCard({
  currentUserId,
  saldo,
  users,
  detalhe,
  imbalance = [],
  dividaLiquida,
}: Props) {
  const [showModal, setShowModal] = useState(false)
  const [gastosApelido, setGastosApelido] = useState<string | null>(null)
  const [gastosList, setGastosList] = useState<GastoItem[]>([])
  const [gastosLoading, setGastosLoading] = useState(false)

  function formatDia(dateStr: string): string {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    const y1 = new Date(Date.now() - 86400000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
    if (dateStr === today) return 'Hoje'
    if (dateStr === y1) return 'Ontem'
    const [, m, d] = dateStr.split('-')
    return `${d}/${m}`
  }

  async function abrirGastosPagador(apelido: string) {
    const userId = users.find(u => u.apelido === apelido)?.id
    if (!userId) return
    setGastosApelido(apelido)
    setGastosLoading(true)
    setGastosList([])
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const end = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    const supabase = createClient()
    const { data } = await supabase
      .from('expense_installments')
      .select('id, valor_centavos, data_competencia, expenses!inner(descricao, cancelado, origem, pagador_id, categoria:categories!expenses_categoria_id_fkey(nome, emoji))')
      .eq('expenses.pagador_id', userId)
      .gte('data_competencia', start)
      .lte('data_competencia', end)
      .eq('expenses.cancelado', false)
      .eq('expenses.origem', 'pwa')
      .order('data_competencia', { ascending: false })
    const items = ((data ?? []) as any[]).map(row => {
      const exp = row.expenses
      const cat = Array.isArray(exp?.categoria) ? exp.categoria[0] : exp?.categoria
      return {
        id: row.id,
        valor_centavos: row.valor_centavos,
        data_competencia: row.data_competencia,
        descricao: exp?.descricao ?? null,
        categoria_nome: cat?.nome ?? '',
        categoria_emoji: cat?.emoji ?? '💸',
      }
    })
    setGastosList(items)
    setGastosLoading(false)
  }

  function getApelido(id: string) {
    return users.find(u => u.id === id)?.apelido ?? '?'
  }

  // Variável saldo info (for modal details)
  const devedorApelidoVar = saldo ? getApelido(saldo.devedor_id) : ''
  const credorApelidoVar  = saldo ? getApelido(saldo.credor_id) : ''
  const saldoVariavel     = saldo?.valor_centavos ?? 0

  // Imbalance de recorrentes
  const credorRecorrente    = imbalance.find(r => r.saldo_liquido_centavos > 0)
  const imbalanceCentavos   = credorRecorrente ? Math.max(credorRecorrente.saldo_liquido_centavos, 0) : 0
  const nomeCredorRec       = credorRecorrente?.apelido ?? ''
  const nomeDevedorRec      = imbalance.find(r => r.apelido !== nomeCredorRec)?.apelido ?? ''
  const mesesCount          = credorRecorrente?.meses_count ?? 0
  const hasSignificantImbalance = imbalanceCentavos >= 5000  // R$ 50

  // Badge: use dívida líquida real when available, else variável
  const badgeValor    = dividaLiquida ? dividaLiquida.valor : saldoVariavel
  const badgeDevedorId = dividaLiquida ? dividaLiquida.devedorId : (saldo?.devedor_id ?? '')
  const badgeCredorId  = dividaLiquida ? dividaLiquida.credorId  : (saldo?.credor_id ?? '')
  const badgeDevedorApelido = dividaLiquida ? dividaLiquida.devedorApelido : devedorApelidoVar
  const badgeCredorApelido  = dividaLiquida ? dividaLiquida.credorApelido  : credorApelidoVar

  let badge: string | null = null
  const canShowModal = !!(detalhe || hasSignificantImbalance)

  if (badgeValor > 0) {
    if (badgeDevedorId === currentUserId) {
      badge = `Você deve ${formatCurrency(badgeValor)} a ${badgeCredorApelido}`
    } else {
      badge = `${badgeDevedorApelido} deve ${formatCurrency(badgeValor)} a você`
    }
  }

  const totalMes = (detalhe?.pagou_a ?? 0) + (detalhe?.pagou_b ?? 0)

  return (
    <>
      <div
        className="rounded-[28px] p-5 border"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        {/* Total do mês */}
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-1">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Total gasto no mês</p>
            <InfoTooltip
              titulo="Total gasto no mês"
              explicacao="Soma de todos os gastos variáveis com data de competência no mês atual, registrados manualmente. Não inclui recorrentes (fixos)."
            />
          </div>
          <p className="font-serif text-5xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            {formatCurrency(totalMes)}
          </p>
        </div>

        {/* Badge tappable — abre modal */}
        {badge ? (
          <button
            onClick={() => canShowModal && setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium mb-4 transition-opacity active:opacity-70"
            style={{ background: 'var(--coral)', color: '#fff' }}
          >
            ⚡ {badge}
            {canShowModal && <span className="opacity-70 text-xs">›</span>}
          </button>
        ) : (
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium mb-4"
            style={{ background: 'var(--sage)', color: '#fff' }}
          >
            ✅ Quits!
          </div>
        )}

        {/* Pills: quem pagou quanto — clicável para auditoria */}
        {detalhe && (
          <div className="flex gap-2">
            <button
              onClick={() => abrirGastosPagador(detalhe.apelido_a)}
              className="flex-1 rounded-2xl px-3 py-2.5 text-center transition-opacity active:opacity-70"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--muted)' }}>
                {detalhe.apelido_a} pagou
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {formatCurrency(detalhe.pagou_a)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>ver lista ›</p>
            </button>
            <button
              onClick={() => abrirGastosPagador(detalhe.apelido_b)}
              className="flex-1 rounded-2xl px-3 py-2.5 text-center transition-opacity active:opacity-70"
              style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
            >
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--muted)' }}>
                {detalhe.apelido_b} pagou
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {formatCurrency(detalhe.pagou_b)}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>ver lista ›</p>
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom sheet: auditoria de gastos por pessoa ── */}
      {gastosApelido !== null && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setGastosApelido(null)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl max-h-[85dvh]"
            style={{ background: 'var(--card)' }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-4 border-b shrink-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <button
                onClick={() => setGastosApelido(null)}
                className="p-1 transition-opacity active:opacity-70 text-lg"
                style={{ color: 'var(--muted)' }}
              >✕</button>
              <div className="text-center">
                <p className="font-semibold text-base" style={{ color: 'var(--ink)' }}>
                  Gastos de {gastosApelido}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {new Date().toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' })} · variáveis
                </p>
              </div>
              <div className="w-7" />
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1 px-4 py-2">
              {gastosLoading ? (
                <div className="space-y-4 animate-pulse py-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl shrink-0" style={{ background: 'var(--bg-2)' }} />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-28 rounded" style={{ background: 'var(--bg-2)' }} />
                          <div className="h-3 w-16 rounded" style={{ background: 'var(--bg-2)' }} />
                        </div>
                      </div>
                      <div className="h-4 w-16 rounded" style={{ background: 'var(--bg-2)' }} />
                    </div>
                  ))}
                </div>
              ) : gastosList.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-4xl mb-3">🌿</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    Nenhum gasto registrado este mês
                  </p>
                </div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {gastosList.map(g => (
                    <div key={g.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                          style={{ background: 'var(--bg-2)' }}
                        >
                          {g.categoria_emoji}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                            {g.descricao || g.categoria_nome}
                          </p>
                          {g.descricao && (
                            <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                              {g.categoria_nome}
                            </p>
                          )}
                          <p className="text-xs" style={{ color: 'var(--muted)' }}>
                            {formatDia(g.data_competencia)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold shrink-0" style={{ color: 'var(--ink)' }}>
                        {formatCurrency(g.valor_centavos)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer: total */}
            {!gastosLoading && gastosList.length > 0 && (
              <div
                className="px-4 py-3 border-t shrink-0"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {gastosList.length} item{gastosList.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>
                    {formatCurrency(gastosList.reduce((s, g) => s + g.valor_centavos, 0))}
                  </p>
                </div>
              </div>
            )}
            <div className="shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
          </div>
        </>
      )}

      {/* Modal "Como chegamos nesse saldo?" */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setShowModal(false)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl shadow-2xl overflow-hidden border max-h-[80dvh] flex flex-col"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>
                Como chegamos nesse saldo?
              </h2>
              <button onClick={() => setShowModal(false)} className="text-lg p-1" style={{ color: 'var(--muted)' }}>✕</button>
            </div>

            <div className="px-5 py-5 space-y-4 overflow-y-auto">
              {/* Quem pagou — mês atual, só variáveis */}
              {detalhe && (
                <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: 'var(--bg-2)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>
                    Desembolsado este mês (variáveis)
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>{detalhe.apelido_a} pagou</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(detalhe.pagou_a)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>{detalhe.apelido_b} pagou</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(detalhe.pagou_b)}</span>
                  </div>
                </div>
              )}

              {/* Custo real (se disponível) */}
              {detalhe?.custo_a !== undefined && detalhe?.custo_b !== undefined && (
                <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: 'var(--bg-2)' }}>
                  <div className="flex items-center gap-1.5 mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Custo real</p>
                    <InfoTooltip
                      titulo="Custo real"
                      explicacao="Quanto custou de fato para cada um: gastos 100% deles + a parte que lhes cabe nos gastos compartilhados (50% em 50/50, % definido em customizado)."
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>Custo {detalhe.apelido_a}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(detalhe.custo_a)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>Custo {detalhe.apelido_b}</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(detalhe.custo_b)}</span>
                  </div>
                </div>
              )}

              {/* Crédito acumulado */}
              {detalhe && (
                <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: 'var(--bg-2)' }}>
                  <div className="flex items-center gap-1.5 mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Crédito acumulado</p>
                    <InfoTooltip
                      titulo="Crédito acumulado"
                      explicacao="Quanto cada um pagou além da sua parte em todos os meses não acertados. Quem pagou mais tem crédito positivo — o outro deve esse valor."
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>{detalhe.apelido_a}</span>
                    <span className="text-sm font-medium" style={{ color: detalhe.credito_a >= 0 ? 'var(--sage)' : 'var(--coral)' }}>
                      {detalhe.credito_a >= 0 ? '+' : ''}{formatCurrency(detalhe.credito_a)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>{detalhe.apelido_b}</span>
                    <span className="text-sm font-medium" style={{ color: detalhe.credito_b >= 0 ? 'var(--sage)' : 'var(--coral)' }}>
                      {detalhe.credito_b >= 0 ? '+' : ''}{formatCurrency(detalhe.credito_b)}
                    </span>
                  </div>
                </div>
              )}

              {/* Acertos realizados */}
              {detalhe && detalhe.acertos_net !== 0 && (
                <div className="rounded-xl px-4 py-3" style={{ background: 'var(--bg-2)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>Acertos realizados</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>
                      {detalhe.acertos_net > 0
                        ? `${detalhe.apelido_a} → ${detalhe.apelido_b}`
                        : `${detalhe.apelido_b} → ${detalhe.apelido_a}`}
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--sage)' }}>
                      {formatCurrency(Math.abs(detalhe.acertos_net))}
                    </span>
                  </div>
                </div>
              )}

              {/* ── NOVO: Recorrentes — Imbalance ── */}
              {hasSignificantImbalance && (
                <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: 'var(--bg-2)' }}>
                  <div className="flex items-center gap-1.5 mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                      Recorrentes — Imbalance
                    </p>
                    <InfoTooltip
                      titulo="Crédito estrutural de recorrentes"
                      explicacao={`${nomeCredorRec} paga consistentemente mais do que ${nomeDevedorRec} nos gastos fixos (recorrentes). Esse crédito acumulado é subtraído da dívida variável para calcular o valor real do PIX.`}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>
                      {nomeCredorRec} paga a mais (acumulado)
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--sage)' }}>
                      +{formatCurrency(imbalanceCentavos)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>Meses acumulados</span>
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{mesesCount}</span>
                  </div>
                </div>
              )}

              {/* ── NOVO: Dívida Líquida Real ── */}
              {hasSignificantImbalance && dividaLiquida != null ? (
                <div
                  className="rounded-xl px-4 py-3 border space-y-2"
                  style={{
                    background: dividaLiquida.valor > 0
                      ? 'color-mix(in srgb, var(--coral) 10%, transparent)'
                      : 'color-mix(in srgb, var(--sage) 10%, transparent)',
                    borderColor: dividaLiquida.valor > 0 ? 'var(--coral)' : 'var(--sage)',
                  }}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                      Dívida Líquida Real
                    </p>
                    <InfoTooltip
                      titulo="Dívida líquida real"
                      explicacao="Dívida variável acumulada menos o crédito estrutural de recorrentes. Esse é o valor real que precisa ser acertado via PIX."
                      formula={`${formatCurrency(saldoVariavel)} − ${formatCurrency(imbalanceCentavos)} = ${formatCurrency(dividaLiquida.valor)}`}
                    />
                  </div>
                  {dividaLiquida.valor > 0 ? (
                    <p className="text-sm font-semibold text-center" style={{ color: 'var(--coral)' }}>
                      {dividaLiquida.devedorApelido} deve {formatCurrency(dividaLiquida.valor)} a {dividaLiquida.credorApelido}
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-center" style={{ color: 'var(--sage)' }}>
                      ✅ Estão quite (incluindo recorrentes)!
                    </p>
                  )}
                </div>
              ) : (
                /* Resultado variável (quando não há imbalance significativo) */
                saldo ? (
                  <div className="rounded-xl px-4 py-3 border" style={{ background: 'color-mix(in srgb, var(--coral) 10%, transparent)', borderColor: 'var(--coral)' }}>
                    <p className="text-sm font-semibold text-center" style={{ color: 'var(--coral)' }}>
                      {devedorApelidoVar} deve {formatCurrency(saldoVariavel)} para {credorApelidoVar}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl px-4 py-3 border" style={{ background: 'color-mix(in srgb, var(--sage) 10%, transparent)', borderColor: 'var(--sage)' }}>
                    <p className="text-sm font-semibold text-center" style={{ color: 'var(--sage)' }}>✅ Estão quite!</p>
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}

export function HomeBalanceCardSkeleton() {
  return (
    <div
      className="rounded-[28px] p-5 border animate-pulse"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="h-4 w-32 rounded mb-2" style={{ background: 'var(--bg-2)' }} />
      <div className="h-12 w-48 rounded mb-3" style={{ background: 'var(--bg-2)' }} />
      <div className="h-7 w-40 rounded-full mb-4" style={{ background: 'var(--bg-2)' }} />
      <div className="flex gap-2">
        <div className="flex-1 h-12 rounded-2xl" style={{ background: 'var(--bg-2)' }} />
        <div className="flex-1 h-12 rounded-2xl" style={{ background: 'var(--bg-2)' }} />
      </div>
    </div>
  )
}
