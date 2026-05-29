'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/money'

type Props = {
  dividaLiquidaValor:   number    // valor líquido real (após descontar imbalance)
  dividaLiquidaDevedor: string    // apelido de quem deve
  dividaLiquidaCredor:  string    // apelido de quem recebe
  imbalanceCentavos:    number    // imbalance de recorrentes (0 se equilibrado)
  nomePagaMais:         string    // apelido de quem paga mais em recorrentes
}

export function HomeAcertoBanner({
  dividaLiquidaValor,
  dividaLiquidaDevedor,
  dividaLiquidaCredor,
  imbalanceCentavos,
  nomePagaMais,
}: Props) {
  const router = useRouter()
  const [showFriccao, setShowFriccao] = useState(false)

  if (dividaLiquidaValor <= 0) return null

  const hasImbalance = imbalanceCentavos >= 5000  // R$ 50 threshold

  function handleClick() {
    if (hasImbalance) {
      setShowFriccao(true)
    } else {
      router.push('/acerto')
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        className="flex items-center justify-between rounded-2xl px-4 py-3 border w-full text-left transition-opacity active:opacity-70"
        style={{
          background: 'color-mix(in srgb, var(--sage) 12%, transparent)',
          borderColor: 'var(--sage)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">💸</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              Registrar acerto via PIX
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {dividaLiquidaDevedor} deve {formatCurrency(dividaLiquidaValor)} a {dividaLiquidaCredor}
            </p>
          </div>
        </div>
        <span className="text-lg" style={{ color: 'var(--sage)' }}>→</span>
      </button>

      {/* Fricção de imbalance de recorrentes */}
      {showFriccao && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setShowFriccao(false)}
            aria-hidden="true"
          />
          <div
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl shadow-2xl px-6 py-6 space-y-4"
            style={{ background: 'var(--card)' }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-1" style={{ background: 'var(--border)' }} />

            <div className="text-center space-y-2">
              <p className="text-2xl">⚖️</p>
              <h2 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>
                Seu acerto inclui recorrentes
              </h2>
            </div>

            <div
              className="rounded-xl px-4 py-3 text-sm space-y-1"
              style={{ background: 'var(--bg-2)', color: 'var(--muted)' }}
            >
              <p>
                <strong style={{ color: 'var(--ink)' }}>{nomePagaMais}</strong> paga{' '}
                <strong style={{ color: 'var(--ink)' }}>{formatCurrency(imbalanceCentavos)}</strong>{' '}
                a mais em fixos acumulados.
              </p>
              <p>
                O valor sugerido ({formatCurrency(dividaLiquidaValor)}) já desconta isso.
              </p>
            </div>

            <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
              Se você equilibrar os recorrentes agora,{' '}
              os próximos acertos serão só sobre o dia a dia — mais simples e previsíveis.
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => router.push('/recorrentes/rebalancear')}
                className="w-full rounded-xl font-semibold py-3.5 text-sm transition-opacity active:opacity-70"
                style={{ background: 'var(--sage)', color: '#fff' }}
              >
                Equilibrar recorrentes →
              </button>
              <button
                onClick={() => router.push('/acerto')}
                className="w-full rounded-xl font-medium py-3 text-sm transition-opacity active:opacity-70"
                style={{ background: 'var(--bg-2)', color: 'var(--ink)' }}
              >
                Continuar para PIX
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
