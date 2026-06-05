'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/money'
import { formatDate, currentMonthLabel } from '@/lib/date'
import { GastoActionsSheet } from './gasto-actions-sheet'
import { NovoGastoModal } from './novo-gasto-modal'
import type { GastoSelecionado } from './gasto-actions-sheet'
import type { GastoInitial } from './novo-gasto-modal'

type Installment = {
  id: string
  numero: number
  valor_centavos: number
  data_competencia: string
  expenses: {
    id: string
    descricao: string | null
    parcelas: number
    divisao: string
    split_pagador_pct: number | null
    data_compra: string
    valor_total_centavos: number
    created_at: string
    origem: string
    pagador: { id: string; apelido: string } | null
    categoria: { id: number; nome: string; emoji: string } | null
  }
}

type Props = {
  installments: Installment[]
  currentApelido?: string
  apelidos?: [string, string]
}

export function ListaGastosClient({ installments, currentApelido = '', apelidos }: Props) {
  const router = useRouter()
  const [gastoSelecionado, setGastoSelecionado] = useState<GastoSelecionado | null>(null)
  const [editandoGasto, setEditandoGasto] = useState<GastoInitial | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modo, setModo] = useState<'dia_a_dia' | 'fixos'>('dia_a_dia')

  // Separa por origem
  const pwa      = installments.filter(i => i.expenses.origem === 'pwa')
  const fixos    = installments.filter(i => i.expenses.origem === 'recorrente')
  const visiveis = modo === 'dia_a_dia' ? pwa : fixos

  const totalMes = visiveis.reduce((acc, i) => acc + i.valor_centavos, 0)

  const sorted = [...visiveis].sort((a, b) => {
    if (b.data_competencia !== a.data_competencia) {
      return b.data_competencia.localeCompare(a.data_competencia)
    }
    return b.expenses.created_at.localeCompare(a.expenses.created_at)
  })

  const grupos = new Map<string, Installment[]>()
  for (const item of sorted) {
    const key = item.data_competencia
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(item)
  }

  const mesLabel = currentMonthLabel()

  function handleToque(item: Installment) {
    const { expenses: exp } = item
    setGastoSelecionado({
      id: exp.id,
      descricao: exp.descricao,
      categoria_nome:  exp.categoria?.nome  ?? 'Outros',
      categoria_emoji: exp.categoria?.emoji ?? '📦',
      valor_centavos:  item.valor_centavos,
      pagador_apelido: exp.pagador?.apelido ?? '?',
      // Para o modal de edição
      valor_total_centavos: exp.valor_total_centavos,
      categoria_id:    exp.categoria?.id ?? 9,
      parcelas:        exp.parcelas,
      divisao:         exp.divisao as GastoSelecionado['divisao'],
      split_pagador_pct: exp.split_pagador_pct,
      data_compra:     exp.data_compra,
    })
  }

  function handleEditar(gasto: GastoSelecionado) {
    const pagadorApelido = gasto.pagador_apelido || currentApelido
    setEditandoGasto({
      id:                   gasto.id,
      valor_total_centavos: gasto.valor_total_centavos,
      categoria_id:         gasto.categoria_id,
      pagador_apelido:      pagadorApelido,
      parcelas:             gasto.parcelas,
      divisao:              gasto.divisao,
      split_pagador_pct:    gasto.split_pagador_pct,
      data_compra:          gasto.data_compra,
      descricao:            gasto.descricao,
    })
    setModalOpen(true)
  }

  function handleSucesso(msg: string) {
    router.refresh()
  }

  function handleModalClose() {
    setModalOpen(false)
    setEditandoGasto(null)
  }

  return (
    <>
      <section className="flex-1 overflow-y-auto px-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {/* Resumo do mês + toggle */}
        <div className="py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm capitalize" style={{ color: 'var(--muted)' }}>
              {mesLabel} · <span className="font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(totalMes)} gasto</span>
            </p>
            {/* Toggle Dia a dia / Fixos */}
            <div className="flex rounded-lg overflow-hidden border text-xs shrink-0" style={{ borderColor: 'var(--border)' }}>
              {(['dia_a_dia', 'fixos'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  style={{
                    padding:    '4px 10px',
                    background: modo === m ? 'var(--ink)' : 'var(--bg-2)',
                    color:      modo === m ? 'var(--bg)'  : 'var(--muted)',
                    fontWeight: modo === m ? 600 : 400,
                    border:     'none',
                    cursor:     'pointer',
                    transition: 'background 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {m === 'dia_a_dia' ? 'Dia a dia' : 'Fixos'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-px" style={{ background: 'var(--border)' }} />
        </div>

        {/* Lista vazia */}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            {modo === 'dia_a_dia' ? (
              <>
                <span className="text-5xl">🪹</span>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                  Nenhum gasto registrado este mês.
                  <br />
                  Toque em <strong style={{ color: 'var(--ink)' }}>+</strong> para começar!
                </p>
              </>
            ) : (
              <>
                <span className="text-5xl">✅</span>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                  Nenhum fixo lançado ainda este mês.
                </p>
              </>
            )}
          </div>
        )}

        {/* Grupos por dia */}
        {Array.from(grupos.entries()).map(([dateStr, items]) => {
          const label = formatDate(new Date(dateStr + 'T12:00:00'))
          return (
            <div key={dateStr} className="mb-5">
              <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>
                {label}
              </p>
              <div className="space-y-1.5">
                {items.map((item) => {
                  const { expenses: exp } = item
                  const emoji    = exp.categoria?.emoji ?? '📦'
                  const nome     = exp.categoria?.nome  ?? 'Outros'
                  const apelido  = exp.pagador?.apelido ?? '?'
                  const isParcelado = exp.parcelas > 1

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleToque(item)}
                      className="w-full flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-left border transition-opacity active:opacity-70"
                      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                    >
                      {/* Esquerda: emoji + nome + parcela */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">{emoji}</span>
                        <div className="min-w-0">
                          <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>
                            {exp.descricao || nome}
                            {isParcelado && (
                              <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>
                                · {item.numero}/{exp.parcelas}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      {/* Direita: valor + apelido */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                          {formatCurrency(item.valor_centavos)}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>{apelido}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </section>

      {/* Bottom sheet de ações */}
      <GastoActionsSheet
        gasto={gastoSelecionado}
        onClose={() => setGastoSelecionado(null)}
        onEditar={handleEditar}
        onExcluido={() => router.refresh()}
        apelidos={apelidos}
      />

      {/* Modal de edição */}
      <NovoGastoModal
        open={modalOpen}
        onClose={handleModalClose}
        currentApelido={currentApelido}
        apelidos={apelidos ?? [currentApelido, currentApelido]}
        onSuccess={handleSucesso}
        editandoGasto={editandoGasto ?? undefined}
      />
    </>
  )
}
