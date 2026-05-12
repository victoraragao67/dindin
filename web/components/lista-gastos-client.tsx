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
    pagador: { id: string; apelido: string } | null
    categoria: { id: number; nome: string; emoji: string } | null
  }
}

type Apelido = 'Vitim' | 'Gaia'

type Props = {
  installments: Installment[]
  currentApelido?: Apelido
}

export function ListaGastosClient({ installments, currentApelido = 'Vitim' }: Props) {
  const router = useRouter()
  const [gastoSelecionado, setGastoSelecionado] = useState<GastoSelecionado | null>(null)
  const [editandoGasto, setEditandoGasto] = useState<GastoInitial | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const totalMes = installments.reduce((acc, i) => acc + i.valor_centavos, 0)

  const sorted = [...installments].sort((a, b) => {
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
    const pagadorApelido = (gasto.pagador_apelido === 'Vitim' || gasto.pagador_apelido === 'Gaia')
      ? gasto.pagador_apelido
      : currentApelido
    setEditandoGasto({
      id:                   gasto.id,
      valor_total_centavos: gasto.valor_total_centavos,
      categoria_id:         gasto.categoria_id,
      pagador_apelido:      pagadorApelido,
      parcelas:             gasto.parcelas,
      divisao:              gasto.divisao,
      split_pagador_pct:    gasto.split_pagador_pct,
      data_compra:          gasto.data_compra,
      descricao:            null,
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
        {/* Resumo do mês */}
        <div className="py-4">
          <p className="text-slate-400 text-sm capitalize">
            {mesLabel} · <span className="text-white font-medium">{formatCurrency(totalMes)} gasto</span>
          </p>
          <div className="mt-2 h-px bg-slate-700" />
        </div>

        {/* Lista vazia */}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="text-5xl">🪹</span>
            <p className="text-slate-400 text-sm leading-relaxed">
              Nenhum gasto registrado este mês.
              <br />
              Toque em <strong className="text-white">+</strong> para começar!
            </p>
          </div>
        )}

        {/* Grupos por dia */}
        {Array.from(grupos.entries()).map(([dateStr, items]) => {
          const label = formatDate(new Date(dateStr + 'T12:00:00'))
          return (
            <div key={dateStr} className="mb-5">
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">
                {label}
              </p>
              <div className="space-y-1">
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
                      className="w-full flex items-center justify-between gap-2 rounded-lg bg-slate-800 px-4 py-3 active:bg-slate-700 transition-colors text-left"
                    >
                      {/* Esquerda: emoji + nome + parcela */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl shrink-0">{emoji}</span>
                        <div className="min-w-0">
                          <p className="text-white text-sm truncate">
                            {exp.descricao || nome}
                            {isParcelado && (
                              <span className="text-slate-400 text-xs ml-1">
                                · {item.numero}/{exp.parcelas}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      {/* Direita: valor + apelido */}
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-white text-sm font-medium">
                          {formatCurrency(item.valor_centavos)}
                        </span>
                        <span className="text-slate-400 text-xs">{apelido}</span>
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
      />

      {/* Modal de edição */}
      <NovoGastoModal
        open={modalOpen}
        onClose={handleModalClose}
        currentApelido={currentApelido}
        onSuccess={handleSucesso}
        editandoGasto={editandoGasto ?? undefined}
      />
    </>
  )
}
