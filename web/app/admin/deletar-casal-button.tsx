'use client'

import { useTransition } from 'react'
import { deletarCasal } from './actions'

export function DeletarCasalButton({
  casalId,
  label,
}: {
  casalId: string
  label: string   // ex: "Vitim & Gaia" — para exibir no confirm
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() => {
        if (!confirm(
          `DELETAR PERMANENTEMENTE o casal "${label}"?\n\n` +
          `Todos os gastos, recorrentes, metas e usuários serão removidos do banco e do Auth.\n\n` +
          `Esta ação NÃO pode ser desfeita.`
        )) return
        startTransition(async () => { await deletarCasal(casalId) })
      }}
      style={{
        background: 'rgba(248,113,113,0.1)',
        color: '#f87171',
        border: '1px solid rgba(248,113,113,0.25)',
        borderRadius: 7,
        fontSize: 11,
        fontWeight: 700,
        padding: '4px 10px',
        cursor: isPending ? 'default' : 'pointer',
        opacity: isPending ? 0.5 : 1,
      }}
    >
      {isPending ? '...' : 'Deletar'}
    </button>
  )
}
