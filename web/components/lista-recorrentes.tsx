'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/money'
import { toggleRecorrente, removerRecorrente } from '@/app/(app)/actions'
import { NovoGastoModal, type RecorrenteInitial } from '@/components/novo-gasto-modal'
import { Toast } from '@/components/toast'

const CATEGORIES: Record<number, { nome: string; emoji: string }> = {
  1: { nome: 'mercado',     emoji: '🛒' },
  2: { nome: 'restaurante', emoji: '🍽️' },
  3: { nome: 'fixo',        emoji: '🏠' },
  4: { nome: 'lazer',       emoji: '🎉' },
  5: { nome: 'saúde',       emoji: '⚕️' },
  6: { nome: 'transporte',  emoji: '🚗' },
  7: { nome: 'viagem',      emoji: '✈️' },
  8: { nome: 'presente',    emoji: '🎁' },
  9: { nome: 'outros',      emoji: '📦' },
}

type Template = {
  id: string
  categoria_id: number
  valor_centavos: number
  descricao: string
  pagador_apelido: 'Vitim' | 'Gaia'
  divisao: '50_50' | 'so_pagador' | 'so_outro' | 'customizada'
  split_pagador_pct: number | null
  dia_do_mes: number
  ativo: boolean
}

type Props = {
  templates: Template[]
  currentApelido: 'Vitim' | 'Gaia'
}

export function ListaRecorrentes({ templates, currentApelido }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmRemoverId, setConfirmRemoverId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<RecorrenteInitial | undefined>()
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)  // id em processamento

  const dismissToast = useCallback(() => setToast(null), [])

  function handleItemTap(id: string) {
    setExpandedId(prev => (prev === id ? null : id))
    setConfirmRemoverId(null)
  }

  function handleEditar(t: Template) {
    setEditando({
      id: t.id,
      categoria_id: t.categoria_id,
      valor_centavos: t.valor_centavos,
      descricao: t.descricao,
      pagador_apelido: t.pagador_apelido,
      divisao: t.divisao,
      split_pagador_pct: t.split_pagador_pct,
      dia_do_mes: t.dia_do_mes,
    })
    setModalOpen(true)
    setExpandedId(null)
  }

  async function handleToggle(t: Template) {
    setLoading(t.id)
    await toggleRecorrente(t.id, !t.ativo)
    setLoading(null)
    setExpandedId(null)
    router.refresh()
  }

  async function handleRemover(id: string) {
    setLoading(id)
    await removerRecorrente(id)
    setLoading(null)
    setConfirmRemoverId(null)
    setExpandedId(null)
    router.refresh()
  }

  function handleSuccess(msg: string) {
    setToast(msg)
    router.refresh()
  }

  return (
    <>
      <div className="space-y-2 px-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {templates.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="text-5xl">🔁</span>
            <p className="text-slate-400 text-sm leading-relaxed">
              Nenhum recorrente cadastrado.
              <br />
              Toque em <strong className="text-white">+</strong> para adicionar.
            </p>
          </div>
        )}

        {templates.map(t => {
          const cat  = CATEGORIES[t.categoria_id] ?? { nome: 'outros', emoji: '📦' }
          const isExpanded = expandedId === t.id
          const isLoading  = loading === t.id

          return (
            <div key={t.id} className={`rounded-xl overflow-hidden transition-opacity ${!t.ativo ? 'opacity-50' : ''}`}>
              {/* Item principal */}
              <button
                onClick={() => handleItemTap(t.id)}
                className="w-full flex items-center justify-between gap-3 bg-slate-800 px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{cat.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{t.descricao}</p>
                    <p className="text-slate-400 text-xs">
                      dia {t.dia_do_mes} · {t.pagador_apelido}
                      {!t.ativo && <span className="ml-2 text-amber-400">pausado</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-white text-sm font-medium">{formatCurrency(t.valor_centavos)}</span>
                  <span className={`text-slate-500 text-xs transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                </div>
              </button>

              {/* Ações expandidas */}
              {isExpanded && (
                <div className="bg-slate-750 border-t border-slate-700 px-4 py-3 flex gap-2">
                  {confirmRemoverId === t.id ? (
                    <>
                      <p className="text-slate-300 text-sm self-center mr-auto">Remover este recorrente?</p>
                      <button onClick={() => setConfirmRemoverId(null)} className="px-3 py-2 rounded-lg bg-slate-700 text-slate-300 text-xs">Não</button>
                      <button onClick={() => handleRemover(t.id)} disabled={isLoading}
                        className="px-3 py-2 rounded-lg bg-red-700 text-white text-xs font-medium disabled:opacity-50">
                        {isLoading ? '…' : 'Sim, remover'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleEditar(t)}
                        className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-200 text-sm hover:bg-slate-600 transition-colors">
                        ✏️ Editar
                      </button>
                      <button onClick={() => handleToggle(t)} disabled={isLoading}
                        className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-200 text-sm hover:bg-slate-600 transition-colors disabled:opacity-50">
                        {isLoading ? '…' : t.ativo ? '⏸ Pausar' : '▶️ Reativar'}
                      </button>
                      <button onClick={() => setConfirmRemoverId(t.id)}
                        className="flex-1 py-2 rounded-lg bg-slate-700 text-red-400 text-sm hover:bg-slate-600 transition-colors">
                        🗑 Remover
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => { setEditando(undefined); setModalOpen(true) }}
        aria-label="Novo recorrente"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 shadow-lg shadow-black/40 text-white text-3xl font-light transition-colors"
      >
        +
      </button>

      <NovoGastoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        currentApelido={currentApelido}
        onSuccess={handleSuccess}
        modo="recorrente"
        editando={editando}
      />

      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </>
  )
}
