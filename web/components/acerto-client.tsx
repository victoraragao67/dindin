'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { registrarAcerto } from '@/app/(app)/actions'
import { formatCurrency } from '@/lib/money'
import { Toast } from '@/components/toast'
import { InfoTooltip } from '@/components/info-tooltip'
import type { RecurringImbalanceRow } from '@/app/(app)/acerto/page'

type SaldoRow = {
  devedor_id:     string
  credor_id:      string
  valor_centavos: number
}

type Props = {
  defaultDe:            string
  defaultPara:          string
  defaultValorCentavos: number
  apelidos:             [string, string]
  saldo:                SaldoRow | null
  imbalance:            RecurringImbalanceRow[]
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

/* ── Painel de Dívida Real (Feature A + C) ──────────────────────
 * Mostra:
 *  1. Dívida variável acumulada (v_saldo_atual)
 *  2. Desbalanceamento de recorrentes (v_recurring_imbalance)
 *  3. Dívida líquida real = (1) - (2)
 * Só exibe quando há imbalance relevante (>= R$ 50).
 */
function PainelDividaReal({
  saldo,
  imbalance,
  apelidos,
}: {
  saldo:     SaldoRow | null
  imbalance: RecurringImbalanceRow[]
  apelidos:  [string, string]
}) {
  // Imbalance: quem tem saldo_liquido positivo pagou mais que o ideal em recorrentes
  const credorRecorrente = imbalance.find(r => r.saldo_liquido_centavos > 0)
  const imbalanceCentavos = credorRecorrente?.saldo_liquido_centavos ?? 0
  const nomeCredorRec     = credorRecorrente?.apelido ?? ''
  const nomeDevedorRec    = apelidos.find(a => a !== nomeCredorRec) ?? ''

  // Só exibe se imbalance >= R$ 50
  if (imbalanceCentavos < 5000) return null

  const dividaVariavel = saldo?.valor_centavos ?? 0
  const credorVariavel = saldo ? imbalance.find(r => r.user_id === saldo.credor_id) : null
  const nomeCredorVar  = credorVariavel?.apelido ?? ''
  const nomeDevedorVar = saldo
    ? (imbalance.find(r => r.user_id === saldo.devedor_id)?.apelido ?? '')
    : ''

  // Dívida líquida: subtrai o crédito estrutural da dívida variável
  // O crédito de recorrentes vai do mesmo sentido que a dívida variável?
  let dividaLiquida = 0
  let devedorLiquido = ''
  let credorLiquido  = ''

  if (!saldo) {
    // Sem dívida variável: o crédito de recorrentes vira dívida inversa
    dividaLiquida  = imbalanceCentavos
    devedorLiquido = nomeDevedorRec
    credorLiquido  = nomeCredorRec
  } else if (nomeCredorVar === nomeCredorRec) {
    // Mesmo credor: dívida variável e estrutural apontam no mesmo sentido → somam
    dividaLiquida  = dividaVariavel + imbalanceCentavos
    devedorLiquido = nomeDevedorVar
    credorLiquido  = nomeCredorVar
  } else {
    // Sentidos opostos: subtrai
    const net = dividaVariavel - imbalanceCentavos
    if (net >= 0) {
      dividaLiquida  = net
      devedorLiquido = nomeDevedorVar
      credorLiquido  = nomeCredorVar
    } else {
      dividaLiquida  = Math.abs(net)
      devedorLiquido = nomeCredorVar   // inverteu
      credorLiquido  = nomeDevedorVar
    }
  }

  return (
    <div style={{
      borderRadius: 16,
      border:       '1px solid var(--border)',
      background:   'var(--card)',
      overflow:     'hidden',
    }}>
      {/* Linha 1: dívida variável */}
      <div style={{
        padding:      '12px 16px',
        borderBottom: '1px solid var(--border)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>💳</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Dívida variável</p>
            {saldo ? (
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                {nomeDevedorVar} deve a {nomeCredorVar}
              </p>
            ) : (
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>Estão quite</p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
            {formatCurrency(dividaVariavel)}
          </span>
          <InfoTooltip
            titulo="Dívida variável acumulada"
            explicacao={`${nomeCredorVar || 'Uma pessoa'} pagou mais do que sua parte em gastos variáveis (registrados manualmente). Calculado sobre todos os meses não acertados.`}
          />
        </div>
      </div>

      {/* Linha 2: imbalance de recorrentes */}
      <div style={{
        padding:      '12px 16px',
        borderBottom: '1px solid var(--border)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        background:   'color-mix(in srgb, var(--bg-2) 60%, transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>🏠</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>Crédito de recorrentes</p>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
              {nomeCredorRec} pagou {credorRecorrente?.meses_count ?? 0} {(credorRecorrente?.meses_count ?? 0) === 1 ? 'mês' : 'meses'} a mais
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sage)' }}>
            − {formatCurrency(imbalanceCentavos)}
          </span>
          <InfoTooltip
            titulo="Crédito estrutural de recorrentes"
            explicacao={`${nomeCredorRec} paga consistentemente mais do que ${nomeDevedorRec} nos gastos fixos (recorrentes). Esse valor é subtraído da dívida variável para calcular o que é realmente devido.`}
            formula={`${formatCurrency(dividaVariavel)} − ${formatCurrency(imbalanceCentavos)}`}
          />
        </div>
      </div>

      {/* Linha 3: dívida líquida real */}
      <div style={{
        padding:      '12px 16px',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'space-between',
        background:   dividaLiquida > 0
          ? 'color-mix(in srgb, var(--coral) 8%, transparent)'
          : 'color-mix(in srgb, var(--sage) 8%, transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>⚖️</span>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Dívida líquida real</p>
            {dividaLiquida > 0 ? (
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                {devedorLiquido} deve a {credorLiquido}
              </p>
            ) : (
              <p style={{ fontSize: 11, color: 'var(--sage)', margin: 0 }}>Estão quite!</p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: dividaLiquida > 0 ? 'var(--coral)' : 'var(--sage)',
          }}>
            {formatCurrency(dividaLiquida)}
          </span>
          <InfoTooltip
            titulo="Dívida líquida real"
            explicacao="Dívida real após descontar o crédito estrutural de recorrentes. Se positivo, alguém deve; se zero, estão quite levando em conta tudo."
            formula={`${formatCurrency(dividaVariavel)} − ${formatCurrency(imbalanceCentavos)} = ${formatCurrency(dividaLiquida)}`}
          />
        </div>
      </div>
    </div>
  )
}

/* ── Componente principal ──────────────────────────────────────── */

export function AcertoClient({ defaultDe, defaultPara, defaultValorCentavos, apelidos, saldo, imbalance }: Props) {
  const router = useRouter()

  const [de,        setDe]        = useState(defaultDe)
  const [para,      setPara]      = useState(defaultPara)
  const [rawDigits, setRawDigits] = useState(
    defaultValorCentavos > 0 ? String(defaultValorCentavos) : ''
  )
  const [data,      setData]      = useState(todayStr())
  const [nota,      setNota]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [toast,     setToast]     = useState<string | null>(null)
  const [erro,      setErro]      = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const valorCentavos = rawDigits ? parseInt(rawDigits, 10) : 0

  function displayValor() {
    if (!rawDigits) return 'R$ 0,00'
    return formatCurrency(parseInt(rawDigits, 10))
  }

  function handleDe(apelido: string) {
    setDe(apelido)
    const outro = apelidos.find(a => a !== apelido) ?? apelidos[0]
    setPara(outro)
  }

  function handleValorInput(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 7)
    setRawDigits(digits)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (valorCentavos <= 0) return
    setErro(null)
    setLoading(true)

    const result = await registrarAcerto({
      de_apelido:     de,
      para_apelido:   para,
      valor_centavos: valorCentavos,
      data,
      nota: nota.trim() || null,
    })

    setLoading(false)

    if (result.error) {
      setErro(result.error)
      return
    }

    setToast(`✅ Acerto de ${formatCurrency(valorCentavos)} registrado`)
    setTimeout(() => router.replace('/'), 1500)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 px-4 py-6 space-y-5">

      {/* Painel de dívida real (Feature A) */}
      <PainelDividaReal saldo={saldo} imbalance={imbalance} apelidos={apelidos} />

      {/* De / Para */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>De</label>
          <div className="flex gap-2">
            {apelidos.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => handleDe(a)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity active:opacity-70"
                style={{
                  background: de === a ? 'var(--sage)' : 'var(--bg-2)',
                  color: de === a ? '#fff' : 'var(--ink)',
                  border: '1px solid var(--border)',
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm px-1" style={{ color: 'var(--muted)' }}>
          <span className="flex-1 border-t" style={{ borderColor: 'var(--border)' }} />
          <span>paga para</span>
          <span className="flex-1 border-t" style={{ borderColor: 'var(--border)' }} />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Para</label>
          <div className="flex gap-2">
            {apelidos.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => {
                  setPara(a)
                  setDe(apelidos.find(x => x !== a) ?? apelidos[0])
                }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity active:opacity-70"
                style={{
                  background: para === a ? 'var(--coral)' : 'var(--bg-2)',
                  color: para === a ? '#fff' : 'var(--ink)',
                  border: '1px solid var(--border)',
                }}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Valor */}
      <div className="space-y-1">
        <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Valor</label>
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{displayValor()}</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={rawDigits}
            onChange={handleValorInput}
            className="w-full h-14 rounded-lg text-transparent focus:outline-none text-center"
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              caretColor: 'var(--sage)',
            }}
            placeholder="0"
          />
        </div>
      </div>

      {/* Data */}
      <div className="space-y-1">
        <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Data</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setData(todayStr())}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity active:opacity-70"
            style={{
              background: data === todayStr() ? 'var(--sage)' : 'var(--bg-2)',
              color: data === todayStr() ? '#fff' : 'var(--ink)',
              border: '1px solid var(--border)',
            }}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setData(yesterdayStr())}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity active:opacity-70"
            style={{
              background: data === yesterdayStr() ? 'var(--sage)' : 'var(--bg-2)',
              color: data === yesterdayStr() ? '#fff' : 'var(--ink)',
              border: '1px solid var(--border)',
            }}
          >
            Ontem
          </button>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none"
            style={{
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              color: 'var(--ink)',
            }}
          />
        </div>
      </div>

      {/* Nota */}
      <div className="space-y-1">
        <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Nota <span className="normal-case" style={{ color: 'var(--muted)' }}>(opcional)</span>
        </label>
        <textarea
          value={nota}
          onChange={e => setNota(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="PIX do mês"
          className="w-full rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none"
          style={{
            background: 'var(--bg-2)',
            border: '1px solid var(--border)',
            color: 'var(--ink)',
          }}
        />
      </div>

      {erro && <p className="text-sm" style={{ color: 'var(--coral)' }}>{erro}</p>}

      {/* Botão */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading || valorCentavos <= 0}
          className="w-full rounded-xl font-semibold py-4 text-base transition-opacity active:opacity-70 disabled:cursor-not-allowed"
          style={{
            background: valorCentavos > 0 && !loading ? 'var(--sage)' : 'var(--bg-2)',
            color: valorCentavos > 0 && !loading ? '#fff' : 'var(--muted)',
          }}
        >
          {loading ? 'Registrando…' : 'Registrar acerto'}
        </button>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </form>
  )
}
