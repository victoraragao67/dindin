'use client'

import { useEffect, useRef, useState } from 'react'
import { formatCurrency } from '@/lib/money'
import { todayBRTStr } from '@/lib/date'
import { criarGasto, atualizarGasto, criarRecorrente, editarRecorrente } from '@/app/(app)/actions'
import type { NovoGastoInput, RecorrenteInput } from '@/app/(app)/actions'
import { useCategorias } from '@/lib/hooks/use-categorias'
import type { Categoria } from '@/lib/hooks/use-categorias'

export type { Categoria }

type Divisao = '50_50' | 'so_pagador' | 'so_outro' | 'customizada'

export type RecorrenteInitial = RecorrenteInput & { id: string }
export type GastoInitial = NovoGastoInput & { id: string }

type Props = {
  open: boolean
  onClose: () => void
  currentApelido: string
  /** Tupla com os dois apelidos do casal [eu, parceiro] */
  apelidos: [string, string]
  onSuccess: (msg: string) => void
  modo?: 'gasto' | 'recorrente'
  editando?: RecorrenteInitial    // edição de recorrente
  editandoGasto?: GastoInitial    // edição de gasto
  /** Categorias pré-carregadas do servidor — evita fetch client-side */
  categorias?: Categoria[]
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

export function NovoGastoModal({ open, onClose, currentApelido, apelidos, onSuccess, modo = 'gasto', editando, editandoGasto, categorias: categoriasProp }: Props) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const dateRef   = useRef<HTMLInputElement>(null)
  const isRecorrente = modo === 'recorrente'
  const titulo = isRecorrente
    ? (editando ? 'Editar recorrente' : 'Novo recorrente')
    : editandoGasto ? 'Editar gasto' : 'Novo gasto'

  // ── Categorias dinâmicas ────────────────────────────────────
  const { categorias, loading: loadingCats } = useCategorias(categoriasProp)

  // ── Campos básicos ──────────────────────────────────────────
  const [rawDigits, setRawDigits]     = useState('')
  const [categoriaId, setCategoriaId] = useState<number | null>(null)
  const [pagador, setPagador]         = useState<string>(currentApelido)

  // ── Recorrente ──────────────────────────────────────────────
  const [diaDoMes, setDiaDoMes]       = useState(1)
  const [descricaoMain, setDescricaoMain] = useState('')   // obrigatória p/ recorrente

  // ── Avançado (gastos) ───────────────────────────────────────
  const [avancadoOpen, setAvancadoOpen] = useState(false)
  const [parcelas, setParcelas]         = useState(1)
  const [divisao, setDivisao]           = useState<Divisao>('50_50')
  const [splitPct, setSplitPct]         = useState(50)
  // Modo de input de divisão customizada — por valor monetário (padrão) ou percentual
  const [splitInputMode, setSplitInputMode] = useState<'valor' | 'pct'>('valor')
  // Qual card está ativo (pagador ou outro)
  const [splitValorRaw, setSplitValorRaw]   = useState<'pagador' | 'outro'>('pagador')
  // Valores em centavos como string ('' = não digitado ainda → usa calculado de splitPct)
  const [splitValorPagador, setSplitValorPagador] = useState('')
  const [splitValorOutro, setSplitValorOutro]     = useState('')
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
  const outraApelido: string = apelidos.find(a => a !== pagador) ?? apelidos[0]

  // ── Reset / preencher ao abrir ──────────────────────────────
  useEffect(() => {
    if (open) {
      if (editando) {
        setRawDigits(String(editando.valor_centavos))
        setCategoriaId(editando.categoria_id)
        setPagador(editando.pagador_apelido)
        setDescricaoMain(editando.descricao)
        setDivisao(editando.divisao)
        const pctRec = editando.split_pagador_pct ?? 50
        setSplitPct(pctRec)
        if (editando.divisao === 'customizada') {
          const val = editando.valor_centavos
          setSplitValorPagador(String(Math.floor(val * pctRec / 100)))
          setSplitValorOutro(String(val - Math.floor(val * pctRec / 100)))
        }
        setDiaDoMes(editando.dia_do_mes)
      } else if (editandoGasto) {
        setRawDigits(String(editandoGasto.valor_total_centavos))
        setCategoriaId(editandoGasto.categoria_id)
        setPagador(editandoGasto.pagador_apelido)
        setParcelas(editandoGasto.parcelas)
        setDivisao(editandoGasto.divisao)
        const pctGasto = editandoGasto.split_pagador_pct ?? 50
        setSplitPct(pctGasto)
        if (editandoGasto.divisao === 'customizada') {
          const val = editandoGasto.valor_total_centavos
          setSplitValorPagador(String(Math.floor(val * pctGasto / 100)))
          setSplitValorOutro(String(val - Math.floor(val * pctGasto / 100)))
        }
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
      setSplitInputMode('valor')
      setSplitValorRaw('pagador')
      setSplitValorPagador('')
      setSplitValorOutro('')
      setDataCompra(todayBRTStr())
      setShowDatePicker(false)
      setDescricao('')
      setError('')
      setConfirmAlto(false)
      setConfirmParcelas(false)
      setSaving(false)
    }
  }, [open, currentApelido, editando])

  // Seleciona a primeira categoria assim que a lista carrega (apenas se nenhuma já selecionada)
  useEffect(() => {
    if (categorias.length > 0 && categoriaId === null) {
      setCategoriaId(categorias[0].id)
    }
  }, [categorias, categoriaId])

  // Reseta campos de split quando o valor total muda (evita valores inválidos)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (divisao === 'customizada') {
      setSplitValorPagador('')
      setSplitValorOutro('')
      setSplitPct(50)
    }
  }, [centavos])

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(-7)
    setRawDigits(digits)
    setError('')
  }

  function handleSplitValorPagador(raw: string) {
    const clean = raw.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(-7)
    if (!clean) { setSplitValorPagador(''); return }
    if (centavos > 0) {
      const typed = parseInt(clean, 10)
      if (typed > centavos) return  // trava o dígito — não aceita acima do total
      const outro = centavos - typed
      setSplitValorPagador(String(typed))
      setSplitValorOutro(String(outro))
      setSplitPct(typed >= centavos ? 99 : Math.max(1, Math.round((typed / centavos) * 100)))
    } else {
      setSplitValorPagador(clean)
    }
  }

  function handleSplitValorOutro(raw: string) {
    const clean = raw.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(-7)
    if (!clean) { setSplitValorOutro(''); return }
    if (centavos > 0) {
      const typed = parseInt(clean, 10)
      if (typed > centavos) return  // trava o dígito — não aceita acima do total
      const pagadorVal = centavos - typed
      setSplitValorOutro(String(typed))
      setSplitValorPagador(String(pagadorVal))
      setSplitPct(pagadorVal <= 0 ? 1 : Math.min(99, Math.round((pagadorVal / centavos) * 100)))
    } else {
      setSplitValorOutro(clean)
    }
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

    const cat = categorias.find(c => c.id === categoriaId)
    if (isRecorrente) {
      onSuccess(`✅ ${descricaoMain} — ${cat?.emoji} ${cat?.nome} · dia ${diaDoMes}`)
    } else {
      const outroAp = apelidos.find(a => a !== pagador) ?? apelidos[0]
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
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl max-h-[92dvh] overflow-y-auto transition-transform duration-100 ease-out ${open ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ background: 'var(--card)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={onClose}
            className="transition-opacity active:opacity-70 p-1"
            style={{ color: 'var(--muted)' }}
            aria-label="Fechar"
          >✕</button>
          <span className="font-semibold text-base" style={{ color: 'var(--ink)' }}>{titulo}</span>
          <div className="w-7" aria-hidden="true" />
        </div>

        <div className="px-4 py-5 space-y-6 pb-8">

          {/* Valor */}
          <div>
            <label htmlFor="valor" className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>VALOR</label>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-lg pointer-events-none"
                style={{ color: 'var(--muted)' }}
              >R$</span>
              <input
                ref={inputRef}
                id="valor"
                type="text"
                inputMode="decimal"
                value={displayValue}
                onChange={handleValueChange}
                placeholder="0,00"
                autoComplete="off"
                className="w-full rounded-xl pl-12 pr-4 py-4 text-2xl font-semibold focus:outline-none"
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                }}
              />
            </div>
          </div>

          {/* Categorias */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>CATEGORIA</p>
              {categoriaId !== null && !loadingCats && (() => {
                const cat = categorias.find(c => c.id === categoriaId)
                return cat ? (
                  <span className="text-xs font-semibold" style={{ color: 'var(--sage)' }}>
                    {cat.nome}
                  </span>
                ) : null
              })()}
            </div>
            {loadingCats ? (
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl py-3"
                    style={{ background: 'var(--bg-2)', height: 52 }}
                  />
                ))}
              </div>
            ) : categorias.length === 0 ? (
              <div className="text-xs py-2" style={{ color: 'var(--muted)' }}>
                Nenhuma categoria disponível.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-5 gap-2">
                  {categorias.slice(0, 5).map(cat => (
                    <CategoryChip key={cat.id} cat={cat} selected={categoriaId === cat.id} onSelect={() => setCategoriaId(cat.id)} />
                  ))}
                </div>
                {categorias.length > 5 && (
                  <div className="grid grid-cols-5 gap-2 mt-2">
                    {categorias.slice(5).map(cat => (
                      <CategoryChip key={cat.id} cat={cat} selected={categoriaId === cat.id} onSelect={() => setCategoriaId(cat.id)} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pago por */}
          <div>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--muted)' }}>PAGO POR</p>
            <div className="flex gap-3">
              {apelidos.map(ap => (
                <button
                  key={ap}
                  onClick={() => setPagador(ap)}
                  className="flex-1 py-3 rounded-xl font-medium text-sm transition-opacity active:opacity-70"
                  style={{
                    background: pagador === ap ? 'var(--sage)' : 'var(--bg-2)',
                    color: pagador === ap ? '#fff' : 'var(--ink)',
                    border: '1px solid var(--border)',
                  }}
                >
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
                <label htmlFor="dia" className="block text-xs font-medium mb-3" style={{ color: 'var(--muted)' }}>DIA DO MÊS</label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setDiaDoMes(v => Math.max(1, v - 1))}
                    className="w-10 h-10 rounded-lg text-lg font-medium transition-opacity active:opacity-70"
                    style={{ background: 'var(--bg-2)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                  >−</button>
                  <input
                    id="dia"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={28}
                    value={diaDoMes}
                    onChange={e => setDiaDoMes(Math.min(28, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center rounded-lg py-2 text-lg font-semibold focus:outline-none"
                    style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                  />
                  <button
                    onClick={() => setDiaDoMes(v => Math.min(28, v + 1))}
                    className="w-10 h-10 rounded-lg text-lg font-medium transition-opacity active:opacity-70"
                    style={{ background: 'var(--bg-2)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                  >+</button>
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>de cada mês</span>
                </div>
              </div>

              {/* Descrição (obrigatória) */}
              <div>
                <label htmlFor="descricao-rec" className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>
                  DESCRIÇÃO <span style={{ color: 'var(--coral)' }}>*</span>
                </label>
                <input
                  id="descricao-rec"
                  type="text"
                  value={descricaoMain}
                  onChange={e => setDescricaoMain(e.target.value.slice(0, 200))}
                  placeholder="Ex: Aluguel, Netflix, Plano saúde…"
                  className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                  style={{
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
            </>
          )}

          {/* Descrição — para gastos */}
          {!isRecorrente && (
            <div>
              <label htmlFor="descricao" className="block text-xs font-medium mb-2" style={{ color: 'var(--muted)' }}>DESCRIÇÃO</label>
              <input
                id="descricao"
                type="text"
                value={descricao}
                onChange={e => setDescricao(e.target.value.slice(0, 200))}
                placeholder="Ex: Supermercado, Farmácia, Uber… (opcional)"
                className="w-full rounded-lg px-4 py-3 text-sm focus:outline-none"
                style={{
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--ink)',
                }}
              />
              {descricao.length > 150 && (
                <p className="text-xs mt-1 text-right" style={{ color: 'var(--muted)' }}>{descricao.length}/200</p>
              )}
            </div>
          )}

          {/* Divisão */}
          <div>
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--muted)' }}>DIVISÃO</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ['50_50',      '50/50'],
                ['so_pagador', `Só ${pagador}`],
                ['so_outro',   `Só ${outraApelido}`],
                ['customizada','Customizada'],
              ] as [Divisao, string][]).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => {
                    setDivisao(val)
                    if (val === 'customizada') {
                      setSplitPct(50)
                      setSplitValorPagador(centavos > 0 ? String(Math.floor(centavos / 2)) : '')
                      setSplitValorOutro(centavos > 0 ? String(centavos - Math.floor(centavos / 2)) : '')
                    }
                  }}
                  className="py-2.5 rounded-xl text-sm font-medium transition-opacity active:opacity-70"
                  style={{
                    background: divisao === val ? 'var(--sage)' : 'var(--bg-2)',
                    color: divisao === val ? '#fff' : 'var(--ink)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {divisao === 'customizada' && (
              <div className="mt-4 space-y-3">

                {/* Barra de proporção visual */}
                {centavos > 0 && (
                  <div>
                    <div className="h-2 rounded-full overflow-hidden flex" style={{ background: 'var(--bg-2)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-150"
                        style={{ width: `${splitPct}%`, background: 'var(--sage)' }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs font-semibold" style={{ color: 'var(--sage)' }}>
                        {pagador} {splitPct}%
                      </span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--muted)' }}>
                        {outraApelido} {100 - splitPct}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Dois cards — label nativa abre teclado direto no mobile */}
                <div className="flex gap-2">

                  {/* Card do pagador */}
                  <label
                    htmlFor="split-input-pagador"
                    className="flex-1 rounded-xl p-3 block cursor-pointer transition-colors"
                    style={{
                      background: splitValorRaw === 'pagador' ? 'var(--card)' : 'var(--bg-2)',
                      border: splitValorRaw === 'pagador' ? '1.5px solid var(--sage)' : '1.5px solid var(--border)',
                    }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>{pagador}</p>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>R$</span>
                      <input
                        id="split-input-pagador"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        className="bg-transparent text-xl font-bold focus:outline-none min-w-0 w-full"
                        style={{ color: 'var(--ink)' }}
                        value={splitValorPagador
                          ? formatCurrency(parseInt(splitValorPagador, 10)).replace('R$ ', '').replace('R$', '')
                          : ''}
                        placeholder={centavos > 0
                          ? formatCurrency(Math.floor(centavos * splitPct / 100)).replace('R$ ', '').replace('R$', '')
                          : '0,00'}
                        onChange={e => {
                          const digits = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(-7)
                          handleSplitValorPagador(digits)
                        }}
                        onFocus={e => { setSplitValorRaw('pagador'); e.target.select() }}
                        readOnly={centavos === 0}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--sage)' }}>{splitPct}%</p>
                  </label>

                  {/* Card do outro */}
                  <label
                    htmlFor="split-input-outro"
                    className="flex-1 rounded-xl p-3 block cursor-pointer transition-colors"
                    style={{
                      background: splitValorRaw === 'outro' ? 'var(--card)' : 'var(--bg-2)',
                      border: splitValorRaw === 'outro' ? '1.5px solid var(--sage)' : '1.5px solid var(--border)',
                    }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: 'var(--muted)' }}>{outraApelido}</p>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--muted)' }}>R$</span>
                      <input
                        id="split-input-outro"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        className="bg-transparent text-xl font-bold focus:outline-none min-w-0 w-full"
                        style={{ color: 'var(--ink)' }}
                        value={splitValorOutro
                          ? formatCurrency(parseInt(splitValorOutro, 10)).replace('R$ ', '').replace('R$', '')
                          : ''}
                        placeholder={centavos > 0
                          ? formatCurrency(Math.floor(centavos * (100 - splitPct) / 100)).replace('R$ ', '').replace('R$', '')
                          : '0,00'}
                        onChange={e => {
                          const digits = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(-7)
                          handleSplitValorOutro(digits)
                        }}
                        onFocus={e => { setSplitValorRaw('outro'); e.target.select() }}
                        readOnly={centavos === 0}
                      />
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{100 - splitPct}%</p>
                  </label>

                </div>

                {/* Hint */}
                {centavos > 0 && (
                  <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
                    Total {formatCurrency(centavos)} · toque num campo e digite o valor
                  </p>
                )}

              </div>
            )}
          </div>

          {/* ── Avançado — só para gastos: parcelas + data ─────── */}
          {!isRecorrente && (
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setAvancadoOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm transition-opacity active:opacity-70"
                style={{ color: 'var(--muted)' }}
              >
                <span>{avancadoOpen ? '▾' : '▸'} Avançado</span>
                {(parcelas > 1 || dataCompra !== todayBRTStr()) && (
                  <span className="text-xs" style={{ color: 'var(--sage)' }}>editado</span>
                )}
              </button>

              {avancadoOpen && (
                <div className="px-4 pb-5 space-y-5 border-t" style={{ borderColor: 'var(--border)' }}>

                  {/* Parcelas */}
                  <div className="pt-4">
                    <label className="block text-xs font-medium mb-3" style={{ color: 'var(--muted)' }}>PARCELAS</label>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setParcelas(v => Math.max(1, v - 1))}
                        className="w-10 h-10 rounded-lg text-lg font-medium transition-opacity active:opacity-70"
                        style={{ background: 'var(--bg-2)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                      >−</button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={24}
                        value={parcelas}
                        onChange={e => setParcelas(Math.min(24, Math.max(1, parseInt(e.target.value) || 1)))}
                        className="w-16 text-center rounded-lg py-2 text-lg font-semibold focus:outline-none"
                        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                      />
                      <button
                        onClick={() => setParcelas(v => Math.min(24, v + 1))}
                        className="w-10 h-10 rounded-lg text-lg font-medium transition-opacity active:opacity-70"
                        style={{ background: 'var(--bg-2)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                      >+</button>
                      <span className="text-sm" style={{ color: 'var(--ink)' }}>{previewParcelas}</span>
                    </div>
                  </div>

                  {/* Data */}
                  <div>
                    <p className="text-xs font-medium mb-3" style={{ color: 'var(--muted)' }}>DATA DA COMPRA</p>
                    <div className="flex flex-wrap gap-2">
                      {[todayBRTStr(), dateMinus(1), dateMinus(2)].map((d, i) => (
                        <button
                          key={d}
                          onClick={() => { setDataCompra(d); setShowDatePicker(false) }}
                          className="px-4 py-2 rounded-lg text-sm transition-opacity active:opacity-70"
                          style={{
                            background: dataCompra === d && !showDatePicker ? 'var(--sage)' : 'var(--bg-2)',
                            color: dataCompra === d && !showDatePicker ? '#fff' : 'var(--ink)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {i === 0 ? 'Hoje' : i === 1 ? 'Ontem' : 'Anteontem'}
                        </button>
                      ))}
                      <button
                        onClick={() => { setShowDatePicker(true); setTimeout(() => dateRef.current?.showPicker?.(), 50) }}
                        className="px-4 py-2 rounded-lg text-sm transition-opacity active:opacity-70"
                        style={{
                          background: showDatePicker ? 'var(--sage)' : 'var(--bg-2)',
                          color: showDatePicker ? '#fff' : 'var(--ink)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {showDatePicker ? labelForDate(dataCompra) : 'Outro'}
                      </button>
                    </div>
                    <input
                      ref={dateRef}
                      type="date"
                      value={dataCompra}
                      onChange={e => { setDataCompra(e.target.value); setShowDatePicker(true) }}
                      className={`mt-2 w-full rounded-lg px-4 py-2.5 text-sm focus:outline-none ${showDatePicker ? 'block' : 'hidden'}`}
                      style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--ink)' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Erros */}
          {error && (
            <p className="text-sm" role="alert" style={{ color: 'var(--coral)' }}>{error}</p>
          )}

          {/* Confirmações */}
          {confirmAlto && !confirmParcelas && (
            <ConfirmBox
              message={`Valor de ${displayValue} parece alto. Confirmar?`}
              onCancel={() => setConfirmAlto(false)}
              onConfirm={() => { setConfirmAlto(false); handleSalvar() }}
            />
          )}
          {confirmParcelas && (
            <ConfirmBox
              message={`${parcelas} parcelas é bastante. Confirmar?`}
              onCancel={() => setConfirmParcelas(false)}
              onConfirm={() => { setConfirmParcelas(false); handleSalvar() }}
            />
          )}

          {/* Salvar */}
          {!confirmAlto && !confirmParcelas && (
            <button
              onClick={handleSalvar}
              disabled={!canSave}
              className="w-full py-4 rounded-xl font-semibold text-base transition-opacity active:opacity-70 disabled:cursor-not-allowed mb-2"
              style={{
                background: canSave ? 'var(--sage)' : 'var(--bg-2)',
                color: canSave ? '#fff' : 'var(--muted)',
              }}
            >
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function CategoryChip({ cat, selected, onSelect }: { cat: Categoria; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      title={cat.nome}
      aria-label={cat.nome}
      aria-pressed={selected}
      className="flex flex-col items-center justify-center gap-1 rounded-xl py-3 text-xl transition-opacity active:opacity-70"
      style={{
        background: selected ? 'color-mix(in srgb, var(--sage) 20%, transparent)' : 'var(--bg-2)',
        border: selected ? '2px solid var(--sage)' : '2px solid var(--border)',
      }}
    >
      <span>{cat.emoji}</span>
    </button>
  )
}

function ConfirmBox({ message, onCancel, onConfirm }: { message: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div
      className="rounded-xl px-4 py-3 border"
      style={{
        background: 'color-mix(in srgb, var(--blush) 20%, transparent)',
        borderColor: 'var(--blush)',
      }}
    >
      <p className="text-sm mb-3" style={{ color: 'var(--ink)' }}>{message}</p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg text-sm transition-opacity active:opacity-70"
          style={{ background: 'var(--bg-2)', color: 'var(--ink)', border: '1px solid var(--border)' }}
        >Corrigir</button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity active:opacity-70"
          style={{ background: 'var(--sage)' }}
        >Confirmar</button>
      </div>
    </div>
  )
}
