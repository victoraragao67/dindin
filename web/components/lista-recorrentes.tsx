'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/money'
import { toggleRecorrente, removerRecorrente } from '@/app/(app)/actions'
import { NovoGastoModal, type RecorrenteInitial } from '@/components/novo-gasto-modal'
import { Toast } from '@/components/toast'

const CATEGORIES: Record<number, { nome: string; emoji: string }> = {
  1:  { nome: 'mercado',     emoji: '🛒' },
  2:  { nome: 'restaurante', emoji: '🍽️' },
  3:  { nome: 'casa',        emoji: '🏠' },
  4:  { nome: 'lazer',       emoji: '🎉' },
  10: { nome: 'streaming',   emoji: '📺' },
  5:  { nome: 'saúde',       emoji: '⚕️' },
  6:  { nome: 'transporte',  emoji: '🚗' },
  7:  { nome: 'viagem',      emoji: '✈️' },
  8:  { nome: 'presente',    emoji: '🎁' },
  9:  { nome: 'outros',      emoji: '📦' },
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
  const [loading, setLoading] = useState<string | null>(null)

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
      <div className="space-y-2 px-4" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
        {templates.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <span className="text-5xl">🔁</span>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              Nenhum recorrente cadastrado.
              <br />
              Toque em <strong style={{ color: 'var(--ink)' }}>+</strong> para adicionar.
            </p>
          </div>
        )}

        {templates.map(t => {
          const cat  = CATEGORIES[t.categoria_id] ?? { nome: 'outros', emoji: '📦' }
          const isExpanded = expandedId === t.id
          const isLoading  = loading === t.id

          return (
            <div
              key={t.id}
              className={`rounded-xl overflow-hidden border transition-opacity ${!t.ativo ? 'opacity-50' : ''}`}
              style={{ borderColor: 'var(--border)' }}
            >
              {/* Item principal */}
              <button
                onClick={() => handleItemTap(t.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-opacity active:opacity-70"
                style={{ background: 'var(--card)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{cat.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{t.descricao}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      dia {t.dia_do_mes} · {t.pagador_apelido}
                      {!t.ativo && <span className="ml-2" style={{ color: 'var(--coral)' }}>pausado</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(t.valor_centavos)}</span>
                  <span className={`text-xs transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--muted)' }}>▾</span>
                </div>
              </button>

              {/* Ações expandidas */}
              {isExpanded && (
                <div
                  className="border-t px-4 py-3 flex gap-2"
                  style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}
                >
                  {confirmRemoverId === t.id ? (
                    <>
                      <p className="text-sm self-center mr-auto" style={{ color: 'var(--ink)' }}>Remover este recorrente?</p>
                      <button
                        onClick={() => setConfirmRemoverId(null)}
                        className="px-3 py-2 rounded-lg text-xs"
                        style={{ background: 'var(--card)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                      >
                        Não
                      </button>
                      <button
                        onClick={() => handleRemover(t.id)}
                        disabled={isLoading}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-50"
                        style={{ background: 'var(--coral)' }}
                      >
                        {isLoading ? '…' : 'Sim, remover'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEditar(t)}
                        className="flex-1 py-2 rounded-lg text-sm transition-opacity active:opacity-70"
                        style={{ background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleToggle(t)}
                        disabled={isLoading}
                        className="flex-1 py-2 rounded-lg text-sm transition-opacity active:opacity-70 disabled:opacity-50"
                        style={{ background: 'var(--card)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                      >
                        {isLoading ? '…' : t.ativo ? '⏸ Pausar' : '▶️ Reativar'}
                      </button>
                      <button
                        onClick={() => setConfirmRemoverId(t.id)}
                        className="flex-1 py-2 rounded-lg text-sm transition-opacity active:opacity-70"
                        style={{ background: 'color-mix(in srgb, var(--coral) 10%, transparent)', color: 'var(--coral)', border: '1px solid var(--coral)' }}
                      >
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
        style={{
          position: 'fixed',
          bottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)',
          right: '1.5rem',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '3.5rem',
          height: '3.5rem',
          borderRadius: '9999px',
          background: 'var(--coral)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          color: '#fff',
          fontSize: '1.875rem',
          fontWeight: 300,
        }}
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
