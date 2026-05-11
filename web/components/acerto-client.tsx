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
  // rawDigits representa centavos como string de dígitos
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

  // Valor em centavos (int)
  const valorCentavos = rawDigits ? parseInt(rawDigits, 10) : 0

  // Exibição formatada (R$ X,XX)
  function displayValor() {
    if (!rawDigits) return 'R$ 0,00'
    return formatCurrency(parseInt(rawDigits, 10))
  }

  // Ao alterar "De", inverte "Para" automaticamente
  function handleDe(apelido: Apelido) {
    setDe(apelido)
    setPara(apelido === 'Vitim' ? 'Gaia' : 'Vitim')
  }

  // Input numérico de valor (estilo calculadora)
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
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">De</label>
          <div className="flex gap-2">
            {(['Vitim', 'Gaia'] as Apelido[]).map(a => (
              <button
                key={a}
                type="button"
                onClick={() => handleDe(a)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  de === a
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-sm px-1">
          <span className="flex-1 border-t border-slate-700" />
          <span>paga para</span>
          <span className="flex-1 border-t border-slate-700" />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">Para</label>
          <div className="flex gap-2">
            {(['Vitim', 'Gaia'] as Apelido[]).map(a => (
              <button
                key={a}
                type="button"
                onClick={() => { setPara(a); setDe(a === 'Vitim' ? 'Gaia' : 'Vitim') }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  para === a
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Valor */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">Valor</label>
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-white">{displayValor()}</span>
          </div>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={rawDigits}
            onChange={handleValorInput}
            className="w-full h-14 rounded-lg bg-slate-800 border border-slate-700 text-transparent caret-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center"
            placeholder="0"
          />
        </div>
      </div>

      {/* Data */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">Data</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setData(todayStr())}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              data === todayStr()
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            Hoje
          </button>
          <button
            type="button"
            onClick={() => setData(yesterdayStr())}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              data === yesterdayStr()
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            Ontem
          </button>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Nota */}
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
          Nota <span className="normal-case text-slate-600">(opcional)</span>
        </label>
        <textarea
          value={nota}
          onChange={e => setNota(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="PIX do mês"
          className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-white placeholder-slate-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {/* Botão */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading || valorCentavos <= 0}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold py-4 text-base transition-colors"
        >
          {loading ? 'Registrando…' : 'Registrar acerto'}
        </button>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </form>
  )
}
