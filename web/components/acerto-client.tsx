'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { registrarAcerto } from '@/app/(app)/actions'
import { formatCurrency } from '@/lib/money'
import { Toast } from '@/components/toast'

type Apelido = 'Vitim' | 'Gaia'

type Props = {
  defaultDe:            Apelido
  defaultPara:          Apelido
  defaultValorCentavos: number
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}
function yesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export function AcertoClient({ defaultDe, defaultPara, defaultValorCentavos }: Props) {
  const router = useRouter()

  const [de,        setDe]        = useState<Apelido>(defaultDe)
  const [para,      setPara]      = useState<Apelido>(defaultPara)
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

  function handleDe(apelido: Apelido) {
    setDe(apelido)
    setPara(apelido === 'Vitim' ? 'Gaia' : 'Vitim')
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

      {/* De / Para */}
      <div className="space-y-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--muted)' }}>De</label>
          <div className="flex gap-2">
            {(['Vitim', 'Gaia'] as Apelido[]).map(a => (
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
            {(['Vitim', 'Gaia'] as Apelido[]).map(a => (
              <button
                key={a}
                type="button"
                onClick={() => { setPara(a); setDe(a === 'Vitim' ? 'Gaia' : 'Vitim') }}
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
