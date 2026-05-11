'use client'

import { useEffect, useRef, useState } from 'react'
import { formatCurrency } from '@/lib/money'
import { criarGasto } from '@/app/(app)/actions'

const CATEGORIES = [
  { id: 1, nome: 'mercado',     emoji: '🛒' },
  { id: 2, nome: 'restaurante', emoji: '🍽️' },
  { id: 3, nome: 'fixo',        emoji: '🏠' },
  { id: 4, nome: 'lazer',       emoji: '🎉' },
  { id: 5, nome: 'saúde',       emoji: '⚕️' },
  { id: 6, nome: 'transporte',  emoji: '🚗' },
  { id: 7, nome: 'viagem',      emoji: '✈️' },
  { id: 8, nome: 'presente',    emoji: '🎁' },
  { id: 9, nome: 'outros',      emoji: '📦' },
] as const

type Apelido = 'Vitim' | 'Gaia'

type Props = {
  open: boolean
  onClose: () => void
  currentApelido: Apelido
  onSuccess: (msg: string) => void
}

export function NovoGastoModal({ open, onClose, currentApelido, onSuccess }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Valor armazenado como string de dígitos (representam centavos)
  const [rawDigits, setRawDigits] = useState('')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [pagador, setPagador] = useState<Apelido>(currentApelido)
  const [loading, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmAlto, setConfirmAlto] = useState(false)

  const centavos = rawDigits ? parseInt(rawDigits, 10) : 0
  const displayValue = centavos > 0 ? formatCurrency(centavos) : ''
  const canSave = centavos > 0 && categoriaId !== null && !loading

  // Autofocus ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      // Reset ao fechar
      setRawDigits('')
      setCategoriaId(null)
      setPagador(currentApelido)
      setError('')
      setConfirmAlto(false)
      setSaving(false)
    }
  }, [open, currentApelido])

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(-7)
    setRawDigits(digits)
    setError('')
  }

  async function handleSalvar() {
    if (!canSave || categoriaId === null) return

    // Alerta para valor alto (>= R$ 5.000)
    if (centavos >= 500_000 && !confirmAlto) {
      setConfirmAlto(true)
      return
    }

    setSaving(true)
    setError('')

    const result = await criarGasto({
      valor_total_centavos: centavos,
      categoria_id: categoriaId,
      pagador_apelido: pagador,
    })

    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }

    const cat = CATEGORIES.find(c => c.id === categoriaId)
    onSuccess(`✅ ${displayValue} — ${cat?.emoji} ${cat?.nome} · 50/50`)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Novo gasto"
        className={`
          fixed inset-x-0 bottom-0 z-50
          flex flex-col
          bg-slate-800 rounded-t-2xl
          max-h-[92dvh] overflow-y-auto
          transition-transform duration-100 ease-out
          ${open ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 shrink-0">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
            aria-label="Fechar"
          >
            ✕
          </button>
          <span className="text-white font-semibold text-base">Novo gasto</span>
          <div className="w-7" aria-hidden="true" />
        </div>

        <div className="px-4 py-5 space-y-6">
          {/* Campo valor */}
          <div>
            <label htmlFor="valor" className="block text-slate-400 text-xs font-medium mb-2">
              VALOR
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg pointer-events-none">
                R$
              </span>
              <input
                ref={inputRef}
                id="valor"
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleValueChange}
                placeholder="0,00"
                autoComplete="off"
                className="
                  w-full bg-slate-900 border border-slate-700 rounded-xl
                  pl-12 pr-4 py-4 text-white text-2xl font-semibold
                  placeholder-slate-600
                  focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
                "
              />
            </div>
          </div>

          {/* Categorias */}
          <div>
            <p className="text-slate-400 text-xs font-medium mb-3">CATEGORIA</p>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.slice(0, 5).map(cat => (
                <CategoryChip
                  key={cat.id}
                  cat={cat}
                  selected={categoriaId === cat.id}
                  onSelect={() => setCategoriaId(cat.id)}
                />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {CATEGORIES.slice(5).map(cat => (
                <CategoryChip
                  key={cat.id}
                  cat={cat}
                  selected={categoriaId === cat.id}
                  onSelect={() => setCategoriaId(cat.id)}
                />
              ))}
            </div>
          </div>

          {/* Pago por */}
          <div>
            <p className="text-slate-400 text-xs font-medium mb-3">PAGO POR</p>
            <div className="flex gap-3">
              {(['Vitim', 'Gaia'] as const).map(ap => (
                <button
                  key={ap}
                  onClick={() => setPagador(ap)}
                  className={`
                    flex-1 py-3 rounded-xl font-medium text-sm transition-colors
                    ${pagador === ap
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }
                  `}
                >
                  {ap}
                </button>
              ))}
            </div>
          </div>

          {/* Avançado (placeholder — F1-07) */}
          <button
            className="flex items-center gap-2 text-slate-500 text-sm py-1"
            disabled
            aria-disabled="true"
          >
            <span className="text-xs">▸</span>
            Avançado
          </button>

          {/* Erros */}
          {error && (
            <p className="text-red-400 text-sm" role="alert">{error}</p>
          )}

          {/* Confirmação valor alto */}
          {confirmAlto && (
            <div className="rounded-xl bg-amber-900/40 border border-amber-700 px-4 py-3">
              <p className="text-amber-300 text-sm mb-3">
                Valor de {displayValue} parece alto. Confirmar?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmAlto(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm"
                >
                  Corrigir
                </button>
                <button
                  onClick={handleSalvar}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {/* Botão Salvar */}
          {!confirmAlto && (
            <button
              onClick={handleSalvar}
              disabled={!canSave}
              className="
                w-full py-4 rounded-xl font-semibold text-base
                bg-emerald-600 hover:bg-emerald-500
                disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
                text-white transition-colors
                mb-2
              "
            >
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function CategoryChip({
  cat,
  selected,
  onSelect,
}: {
  cat: { id: number; nome: string; emoji: string }
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      title={cat.nome}
      aria-label={cat.nome}
      aria-pressed={selected}
      className={`
        flex flex-col items-center justify-center gap-1
        rounded-xl py-3 text-xl
        transition-colors
        ${selected
          ? 'bg-emerald-600/30 border-2 border-emerald-500 text-white'
          : 'bg-slate-700 border-2 border-transparent text-white hover:bg-slate-600'
        }
      `}
    >
      <span>{cat.emoji}</span>
    </button>
  )
}
