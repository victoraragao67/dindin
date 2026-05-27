'use client'

import { useTransition } from 'react'
import { bloquearCasal, reativarCasal } from './actions'

export function BloqueioButton({
  casalId,
  status,
}: {
  casalId: string
  status: string
}) {
  const [isPending, startTransition] = useTransition()

  if (status === 'inactive') {
    return <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>—</span>
  }

  const isBlocked = status === 'blocked'

  return (
    <button
      disabled={isPending}
      onClick={() => {
        if (isBlocked) {
          startTransition(() => reativarCasal(casalId))
        } else {
          if (!confirm('Bloquear este casal? Ambos perderão acesso imediatamente.')) return
          startTransition(() => bloquearCasal(casalId))
        }
      }}
      style={{
        background: isBlocked ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
        color:      isBlocked ? '#4ade80'               : '#f87171',
        border:     `1px solid ${isBlocked ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
        borderRadius: 7,
        fontSize: 11,
        fontWeight: 700,
        padding: '4px 10px',
        cursor: isPending ? 'default' : 'pointer',
        opacity: isPending ? 0.5 : 1,
      }}
    >
      {isPending ? '...' : isBlocked ? 'Reativar' : 'Bloquear'}
    </button>
  )
}
