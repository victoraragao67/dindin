'use client'

import { useEffect, useRef, useState } from 'react'
import { formatCurrency } from '@/lib/money'
import { todayBRTStr } from '@/lib/date'
import { criarGasto, atualizarGasto, criarRecorrente, editarRecorrente } from '@/app/(app)/actions'
import type { NovoGastoInput, RecorrenteInput } from '@/app/(app)/actions'

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
type Divisao = '50_50' | 'so_pagador' | 'so_outro' | 'customizada'

export type RecorrenteInitial = RecorrenteInput & { id: string }
export type GastoInitial = NovoGastoInput & { id: string }

type Props = {
  open: boolean
  onClose: () => void
  currentApelido: Apelido
  onSuccess: (msg: string) => void
  modo?: 'gasto' | 'recorrente'
  editando?: RecorrenteInitial    // edição de recorrente
  editandoGasto?: GastoInitial    // edição de gasto
}

function dateMinus(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

function labelForDate(dateStr: string): string {
  const today = todayBRTStr()
  const y1    = dateMinus(1)
  const y2    = dateMinus(2)
  if (dateStr === today) return 'Hoje'
  if (dateStr === y1)    return 'Ontem'
  if (dateStr === y2)    return 'Anteontem'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export function NovoGastoModal({ open, onClose, currentApelido, onSuccess, modo = 'gasto', editando, editandoGasto }: Props) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const dateRef   = useRef<HTMLInputElement>(null)
  const isRecorrente = modo === 'recorrente'
  const titulo = isRecorrente
    ? (editando ? 'Editar recorrente' : 'Novo recorrente')
    : editandoGasto ? 'Editar gasto' : 'Novo gasto'

  // ── Campos básicos ──────────────────────────────────────────
  const [rawDigits, setRawDigits]     = useState('')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [pagador, setPagador]         = useState<Apelido>(currentApelido)

  // ── Recorrente ──────────────────────────────────────────────
  const [diaDoMes, setDiaDoMes]       = useState(1)
  const [descricaoMain, setDescricaoMain] = useState('')   // obrigatória p/ recorrente

  // ── Avançado (gastos) ───────────────────────────────────────
  const [avancadoOpen, setAvancadoOpen] = useState(false)
  const [parcelas, setParcelas]         = useState(1)
  const [divisao, setDivisao]           = useState<Divisao>('50_50')
  const [splitPct, setSplitPct]         = useState(50)
  const [dataCompra, setDataCompra]     = useState(todayBRTStr())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [descricao, setDescricao]       = useState('')

  // ── Estado ──────────────────────────────────────────────────
  const [loading, setSaving]         = useState(false)
  const [error, setError]            = useState('')
  const [confirmAlto, setConfirmAlto]         = useState(false)
  const [confirmParcelas, setConfirmParcelas] = useState(false)

  const centavos     = rawDigits ? parseInt(rawDigits, 10) : 0
  const displayValue = centavos > 0 ? formatCurrency(centavos) : ''

  const canSave = isRecorrente
    ? centavos > 0 && categoriaId !== null && descricaoMain.trim().length > 0 && !loading
    : centavos > 0 && categoriaId !== null && !loading

  const valorPorParcela = parcelas > 1 ? Math.floor(centavos / parcelas) : centavos
  const previewParcelas = parcelas > 1 ? `${parcelas}x de ${formatCurrency(valorPorParcela)}` : 'à vista'
  const outraApelido: Apelido = pagador === 'Vitim' ? 'Gaia' : 'Vitim'

  // ── Reset / preencher ao abrir ──────────────────────────────
  useEffect(() => {
    if (open) {
      if (editando) {
        // Preencher com dados existentes (recorrente)
        setRawDigits(String(editando.valor_centavos))
        setCategoriaId(editando.categoria_id)
        setPagador(editando.pagador_apelido)
        setDescricaoMain(editando.descricao)
        setDivisao(editando.divisao)
        setSplitPct(editando.split_pagador_pct ?? 50)
        setDiaDoMes(editando.dia_do_mes)
      } else if (editandoGasto) {
        // Preencher com dados existentes (gasto)
        setRawDigits(String(editandoGasto.valor_total_centavos))
        setCategoriaId(editandoGasto.categoria_id)
        setPagador(editandoGasto.pagador_apelido)
        setParcelas(editandoGasto.parcelas)
        setDivisao(editandoGasto.divisao)
        setSplitPct(editandoGasto.split_pagador_pct ?? 50)
        setDataCompra(editandoGasto.data_compra ?? todayBRTStr())
        setDescricao(editandoGasto.descricao ?? '')
        if (editandoGasto.parcelas > 1) {
          setAvancadoOpen(true)
        }
      }
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setRawDigits('')
      setCategoriaId(null)
      setPagador(currentApelido)
      setDescricaoMain('')
      setDiaDoMes(1)
      setAvancadoOpen(false)
      setParcelas(1)
      setDivisao('50_50')
      setSplitPct(50)
      setDataCompra(todayBRTStr())
      setShowDatePicker(false)
      setDescricao('')
      setError('')
      setConfirmAlto(false)
      setConfirmParcelas(false)
      setSaving(false)
    }
  }, [open, currentApelido, editando])

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(-7)
    setRawDigits(digits)
    setError('')
  }

  async function handleSalvar() {
    if (!canSave || categoriaId === null) return

    if (centavos >= 500_000 && !confirmAlto) { setConfirmAlto(true); return }
    if (!isRecorrente && parcelas > 12 && !confirmParcelas) { setConfirmParcelas(true); return }

    setSaving(true)
    setError('')

    let result

    if (isRecorrente) {
      const payload = {
        valor_centavos: centavos,
        categoria_id: categoriaId,
        descricao: descricaoMain.trim(),
        pagador_apelido: pagador,
        divisao,
        split_pagador_pct: divisao === 'customizada' ? splitPct : null,
        dia_do_mes: diaDoMes,
      }
      result = editando
        ? await editarRecorrente(editando.id, payload)
        : await criarRecorrente(payload)
    } else {
      const gastoPayload = {
        valor_total_centavos: centavos,
        categoria_id: categoriaId,
        pagador_apelido: pagador,
        parcelas,
        divisao,
        split_pagador_pct: divisao === 'customizada' ? splitPct : null,
        data_compra: dataCompra,
        descricao: descricao.trim() || null,
      }
      result = editandoGasto
        ? await atualizarGasto(editandoGasto.id, gastoPayload)
        : await criarGasto(gastoPayload)
    }

    setSaving(false)

    if (result.error) { setError(result.error); return }

    const cat = CATEGORIES.find(c => c.id === categoriaId)
    if (isRecorrente) {
      onSuccess(`✅ ${descricaoMain} — ${cat?.emoji} ${cat?.nome} · dia ${diaDoMes}`)
    } else {
      const outroAp = pagador === 'Vitim' ? 'Gaia' : 'Vitim'
      const divisaoLabel = divisao === '50_50' ? '50/50'
        : divisao === 'so_pagador' ? `só ${pagador}`
        : divisao === 'so_outro'   ? `só ${outroAp}`
        : `${splitPct}/${100 - splitPct}`
      const parcelasLabel = parcelas > 1 ? ` · ${parcelas}x` : ''
      onSuccess(`✅ ${displayValue} — ${cat?.emoji} ${cat?.nome}${parcelasLabel} · ${divisaoLabel}`)
    }
    onClose()
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} aria-hidden="true" />}

      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col bg-slate-800 rounded-t-2xl max-h-[92dvh] overflow-y-auto transition-transform duration-100 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 shrink-0">
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1" aria-label="Fechar">✕</button>
          <span className="text-white font-semibold text-base">{titulo}</span>
          <div className="w-7" aria-hidden="true" />
        </div>

        <div className="px-4 py-5 space-y-6 pb-8">

          {/* Valor */}
          <div>
            <label htmlFor="valor" className="block text-slate-400 text-xs font-medium mb-2">VALOR</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg pointer-events-none">R$</span>
              <input
                ref={inputRef}
                id="valor"
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleValueChange}
                placeholder="0,00"
                autoComplete="off"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-4 py-4 text-white text-2xl font-semibold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Categorias */}
          <div>
            <p className="text-slate-400 text-xs font-medium mb-3">CATEGORIA</p>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.slice(0, 5).map(cat => (
                <CategoryChip key={cat.id} cat={cat} selected={categoriaId === cat.id} onSelect={() => setCategoriaId(cat.id)} />
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {CATEGORIES.slice(5).map(cat => (
                <CategoryChip key={cat.id} cat={cat} selected={categoriaId === cat.id} onSelect={() => setCategoriaId(cat.id)} />
              ))}
            </div>
          </div>

          {/* Pago por */}
          <div>
            <p className="text-slate-400 text-xs font-medium mb-3">PAGO POR</p>
            <div className="flex gap-3">
              {(['Vitim', 'Gaia'] as const).map(ap => (
                <button key={ap} onClick={() => setPagador(ap)}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${pagador === ap ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                  {ap}
                </button>
              ))}
            </div>
          </div>

          {/* ── Campos exclusivos de recorrente ───────────────── */}
          {isRecorrente && (
            <>
              {/* Dia do mês */}
              <div>
                <label htmlFor="dia" className="block text-slate-400 text-xs font-medium mb-3">DIA DO MÊS</label>
                <div className="flex items-center gap-4">
                  <button onClick={() => setDiaDoMes(v => Math.max(1, v - 1))} className="w-10 h-10 rounded-lg bg-slate-700 text-white text-lg font-medium hover:bg-slate-600 transition-colors">−</button>
                  <input
                    id="dia"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={28}
                    value={diaDoMes}
                    onChange={e => setDiaDoMes(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center bg-slate-900 border border-slate-700 rounded-lg py-2 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button onClick={() => setDiaDoMes(v => Math.min(28, v + 1))} className="w-10 h-10 rounded-lg bg-slate-700 text-white text-lg font-medium hover:bg-slate-600 transition-colors">+</button>
                  <span className="text-slate-400 text-sm">de cada mês</span>
                </div>
              </div>

              {/* Descrição (obrigatória) */}
              <div>
                <label htmlFor="descricao-rec" className="block text-slate-400 text-xs font-medium mb-2">DESCRIÇÃO <span className="text-red-400">*</span></label>
                <input
                  id="descricao-rec"
                  type="text"
                  value={descricaoMain}
                  onChange={e => setDescricaoMain(e.target.value.slice(0, 200))}
                  placeholder="Ex: Aluguel, Netflix, Plano saúde…"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}

          {/* Descrição — para gastos (fora do Avançado) */}
          {!isRecorrente && (
            <div>
              <label htmlFor="descricao" className="block text-slate-400 text-xs font-medium mb-2">DESCRIÇÃO</label>
              <input
                id="descricao"
                type="text"
                value={descricao}
                onChange={e => setDescricao(e.target.value.slice(0, 200))}
                placeholder="Ex: Supermercado, Farmácia, Uber… (opcional)"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {descricao.length > 150 && <p className="text-slate-500 text-xs mt-1 text-right">{descricao.length}/200</p>}
            </div>
          )}

          {/* Divisão — visível por padrão (fora do Avançado) */}
          <div>
            <p className="text-slate-400 text-xs font-medium mb-3">DIVISÃO</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['50_50',      '50/50'],
                ['so_pagador', `Só ${pagador}`],
                ['so_outro',   `Só ${outraApelido}`],
                ['customizada','Customizada'],
              ] as [Divisao, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setDivisao(val)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${divisao === val ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {divisao === 'customizada' && (
              <div className="mt-4 space-y-3">
                <input type="range" min={1} max={99} value={splitPct} onChange={e => setSplitPct(Number(e.target.value))} className="w-full accent-emerald-500" />
                <div className="flex gap-2">
                  <input type="number" min={1} max={99} value={splitPct}
                    onChange={e => setSplitPct(Math.min(99, Math.max(1, Number(e.target.value))))}
                    className="w-16 text-center bg-slate-900 border border-slate-700 rounded-lg py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  <span className="text-slate-400 text-sm self-center">% para {pagador}</span>
                </div>
                <p className="text-slate-400 text-xs">
                  {pagador} paga {splitPct}%{centavos > 0 ? ` (${formatCurrency(Math.floor(centavos * splitPct / 100))})` : ''}
                  {' · '}
                  {outraApelido} paga {100 - splitPct}%{centavos > 0 ? ` (${formatCurrency(Math.floor(centavos * (100 - splitPct) / 100))})` : ''}
                </p>
              </div>
            )}
          </div>

          {/* ── Avançado — só para gastos: parcelas + data ─────── */}
          {!isRecorrente && (
            <div className="border border-slate-700 rounded-xl overflow-hidden">
              <button
                onClick={() => setAvancadoOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <span>{avancadoOpen ? '▾' : '▸'} Avançado</span>
                {(parcelas > 1 || dataCompra !== todayBRTStr()) && (
                  <span className="text-emerald-400 text-xs">editado</span>
                )}
              </button>

              {avancadoOpen && (
                <div className="px-4 pb-5 space-y-5 border-t border-slate-700">

                  {/* Parcelas */}
                  <div className="pt-4">
                    <label className="block text-slate-400 text-xs font-medium mb-3">PARCELAS</label>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setParcelas(v => Math.max(1, v - 1))} className="w-10 h-10 rounded-lg bg-slate-700 text-white text-lg font-medium hover:bg-slate-600 transition-colors">−</button>
                      <input type="number" inputMode="numeric" min={1} max={24} value={parcelas}
                        onChange={e => setParcelas(Math.min(24, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-16 text-center bg-slate-900 border border-slate-700 rounded-lg py-2 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                      <button onClick={() => setParcelas(v => Math.min(24, v + 1))} className="w-10 h-10 rounded-lg bg-slate-700 text-white text-lg font-medium hover:bg-slate-600 transition-colors">+</button>
                      <span className="text-slate-300 text-sm">{previewParcelas}</span>
                    </div>
                  </div>

                  {/* Data */}
                  <div>
                    <p className="text-slate-400 text-xs font-medium mb-3">DATA DA COMPRA</p>
                    <div className="flex flex-wrap gap-2">
                      {[todayBRTStr(), dateMinus(1), dateMinus(2)].map((d, i) => (
                        <button key={d} onClick={() => { setDataCompra(d); setShowDatePicker(false) }}
                          className={`px-4 py-2 rounded-lg text-sm transition-colors ${dataCompra === d && !showDatePicker ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                          {i === 0 ? 'Hoje' : i === 1 ? 'Ontem' : 'Anteontem'}
                        </button>
                      ))}
                      <button onClick={() => { setShowDatePicker(true); setTimeout(() => dateRef.current?.showPicker?.(), 50) }}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${showDatePicker ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                        {showDatePicker ? labelForDate(dataCompra) : 'Outro'}
                      </button>
                    </div>
                    <input ref={dateRef} type="date" value={dataCompra} onChange={e => { setDataCompra(e.target.value); setShowDatePicker(true) }}
                      className={`mt-2 w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${showDatePicker ? 'block' : 'hidden'}`} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Erros */}
          {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}

          {/* Confirmações */}
          {confirmAlto && !confirmParcelas && (
            <ConfirmBox message={`Valor de ${displayValue} parece alto. Confirmar?`}
              onCancel={() => setConfirmAlto(false)} onConfirm={() => { setConfirmAlto(false); handleSalvar() }} />
          )}
          {confirmParcelas && (
            <ConfirmBox message={`${parcelas} parcelas é bastante. Confirmar?`}
              onCancel={() => setConfirmParcelas(false)} onConfirm={() => { setConfirmParcelas(false); handleSalvar() }} />
          )}

          {/* Salvar */}
          {!confirmAlto && !confirmParcelas && (
            <button onClick={handleSalvar} disabled={!canSave}
              className="w-full py-4 rounded-xl font-semibold text-base bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white transition-colors mb-2">
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function CategoryChip({ cat, selected, onSelect }: { cat: { id: number; nome: string; emoji: string }; selected: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} title={cat.nome} aria-label={cat.nome} aria-pressed={selected}
      className={`flex flex-col items-center justify-center gap-1 rounded-xl py-3 text-xl transition-colors ${selected ? 'bg-emerald-600/30 border-2 border-emerald-500 text-white' : 'bg-slate-700 border-2 border-transparent text-white hover:bg-slate-600'}`}>
      <span>{cat.emoji}</span>
    </button>
  )
}

function ConfirmBox({ message, onCancel, onConfirm }: { message: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="rounded-xl bg-amber-900/40 border border-amber-700 px-4 py-3">
      <p className="text-amber-300 text-sm mb-3">{message}</p>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm">Corrigir</button>
        <button onClick={onConfirm} className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium">Confirmar</button>
      </div>
    </div>
  )
}
