'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/money'
import { cancelarGasto } from '@/app/(app)/actions'

export type GastoSelecionado = {
  id: string
  descricao: string | null
  categoria_nome: string
  categoria_emoji: string
  valor_centavos: number
  pagador_apelido: string
  // para preencher o modal de edição
  valor_total_centavos: number
  categoria_id: number
  parcelas: number
  divisao: '50_50' | 'so_pagador' | 'so_outro' | 'customizada'
  split_pagador_pct: number | null
  data_compra: string
}

type Props = {
  gasto: GastoSelecionado | null
  onClose: () => void
  onEditar: (gasto: GastoSelecionado) => void
  onExcluido: () => void
  apelidos?: [string, string]
}

export function GastoActionsSheet({ gasto, onClose, onEditar, onExcluido, apelidos }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const isOpen = gasto !== null

  function handleFechar() {
    setConfirmando(false)
    setErro('')
    onClose()
  }

  async function handleExcluir() {
    if (!gasto) return
    setLoading(true)
    setErro('')
    const res = await cancelarGasto(gasto.id)
    setLoading(false)
    if (res.error) { setErro(res.error); return }
    setConfirmando(false)
    onExcluido()
    handleFechar()
  }

  if (!isOpen) return null

  const titulo = gasto.descricao || gasto.categoria_nome

  function divisaoLabel(g: GastoSelecionado): string {
    if (g.divisao === '50_50')      return '50/50'
    if (g.divisao === 'so_pagador') return `só ${g.pagador_apelido}`
    if (g.divisao === 'so_outro') {
      const outro = apelidos?.find(a => a !== g.pagador_apelido) ?? '?'
      return `só ${outro}`
    }
    if (g.divisao === 'customizada' && g.split_pagador_pct !== null) {
      return `${g.split_pagador_pct}/${100 - g.split_pagador_pct}`
    }
    return g.divisao
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        onClick={handleFechar}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl overflow-hidden border-t"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        {/* Cabeçalho do gasto */}
        <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{gasto.categoria_emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate" style={{ color: 'var(--ink)' }}>{titulo}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {gasto.pagador_apelido} · {formatCurrency(gasto.valor_centavos)} · {divisaoLabel(gasto)}
              </p>
            </div>
          </div>
        </div>

        {/* Opções */}
        {!confirmando ? (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => { onEditar(gasto); handleFechar() }}
              className="w-full flex items-center gap-3 px-5 py-4 text-left transition-opacity active:opacity-70"
              style={{ color: 'var(--ink)' }}
            >
              <span className="text-lg">✏️</span>
              <span className="text-sm font-medium">Editar gasto</span>
            </button>
            <button
              onClick={() => setConfirmando(true)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left transition-opacity active:opacity-70"
              style={{ color: 'var(--coral)' }}
            >
              <span className="text-lg">🗑️</span>
              <span className="text-sm font-medium">Excluir gasto</span>
            </button>
            <button
              onClick={handleFechar}
              className="w-full flex items-center justify-center px-5 py-4 transition-opacity active:opacity-70"
              style={{ color: 'var(--muted)' }}
            >
              <span className="text-sm">✕ Cancelar</span>
            </button>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-4">
            <p className="text-sm text-center" style={{ color: 'var(--ink)' }}>
              Excluir &ldquo;{titulo}&rdquo;? Esta ação não pode ser desfeita.
            </p>
            {erro && <p className="text-xs text-center" style={{ color: 'var(--coral)' }}>{erro}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmando(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-opacity active:opacity-70"
                style={{ background: 'var(--bg-2)', color: 'var(--ink)', border: '1px solid var(--border)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleExcluir}
                disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white transition-opacity active:opacity-70 disabled:opacity-60"
                style={{ background: 'var(--coral)' }}
              >
                {loading ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
