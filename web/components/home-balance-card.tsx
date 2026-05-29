'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/money'
import { InfoTooltip } from '@/components/info-tooltip'

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

        {/* Pills: quem pagou quanto */}
        {detalhe && (
          <div className="flex gap-2">
            <div
              className="flex-1 rounded-2xl px-3 py-2 text-center"
              style={{ background: 'var(--bg-2)' }}
            >
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--muted)' }}>
                {detalhe.apelido_a} pagou
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {formatCurrency(detalhe.pagou_a)}
              </p>
            </div>
            <div
              className="flex-1 rounded-2xl px-3 py-2 text-center"
              style={{ background: 'var(--bg-2)' }}
            >
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--muted)' }}>
                {detalhe.apelido_b} pagou
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {formatCurrency(detalhe.pagou_b)}
              </p>
            </div>
          </div>
        )}
      </div>

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
