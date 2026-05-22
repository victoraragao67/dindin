'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/money'

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
}

type Props = {
  currentUserId: string | null
  saldo: SaldoRow | null
  users: UserRow[]
  detalhe: DetalheRow | null
}

export function HomeBalanceCard({ currentUserId, saldo, users, detalhe }: Props) {
  const [showModal, setShowModal] = useState(false)

  function getApelido(id: string) {
    return users.find(u => u.id === id)?.apelido ?? '?'
  }

  let badge: string | null = null
  let devedorApelido = ''
  let credorApelido  = ''
  let saldoValor     = 0

  if (saldo) {
    devedorApelido = getApelido(saldo.devedor_id)
    credorApelido  = getApelido(saldo.credor_id)
    saldoValor     = saldo.valor_centavos
    if (saldo.devedor_id === currentUserId) {
      badge = `Você deve ${formatCurrency(saldo.valor_centavos)} a ${credorApelido}`
    } else {
      badge = `${devedorApelido} deve ${formatCurrency(saldo.valor_centavos)} a você`
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
          <p className="text-sm mb-1" style={{ color: 'var(--muted)' }}>Total gasto no mês</p>
          <p className="font-serif text-5xl font-semibold tracking-tight" style={{ color: 'var(--ink)' }}>
            {formatCurrency(totalMes)}
          </p>
        </div>

        {/* Badge tappable — abre modal */}
        {badge ? (
          <button
            onClick={() => detalhe && setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium mb-4 transition-opacity active:opacity-70"
            style={{ background: 'var(--coral)', color: '#fff' }}
          >
            ⚡ {badge}
            {detalhe && <span className="opacity-70 text-xs">›</span>}
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
                {detalhe.apelido_a}
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
                {detalhe.apelido_b}
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {formatCurrency(detalhe.pagou_b)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal "Como chegamos nesse saldo?" */}
      {showModal && detalhe && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setShowModal(false)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 rounded-2xl shadow-2xl overflow-hidden border"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
              <h2 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>
                Como chegamos nesse saldo?
              </h2>
              <button onClick={() => setShowModal(false)} className="text-lg p-1" style={{ color: 'var(--muted)' }}>✕</button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* Quem pagou */}
              <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: 'var(--bg-2)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>Total desembolsado</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>{detalhe.apelido_a} pagou</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(detalhe.pagou_a)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>{detalhe.apelido_b} pagou</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(detalhe.pagou_b)}</span>
                </div>
              </div>

              {/* Crédito */}
              <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: 'var(--bg-2)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--muted)' }}>Crédito acumulado</p>
                <p className="text-xs mb-2" style={{ color: 'var(--muted)' }}>
                  Quanto cada um pagou além da sua parte
                </p>
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

              {/* Acertos */}
              {detalhe.acertos_net !== 0 && (
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

              {/* Resultado */}
              {saldo ? (
                <div className="rounded-xl px-4 py-3 border" style={{ background: 'color-mix(in srgb, var(--coral) 10%, transparent)', borderColor: 'var(--coral)' }}>
                  <p className="text-sm font-semibold text-center" style={{ color: 'var(--coral)' }}>
                    {devedorApelido} deve {formatCurrency(saldoValor)} para {credorApelido}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl px-4 py-3 border" style={{ background: 'color-mix(in srgb, var(--sage) 10%, transparent)', borderColor: 'var(--sage)' }}>
                  <p className="text-sm font-semibold text-center" style={{ color: 'var(--sage)' }}>✅ Estão quite!</p>
                </div>
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
