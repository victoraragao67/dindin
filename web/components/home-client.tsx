'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Fab } from '@/components/fab'
import { NovoGastoModal } from '@/components/novo-gasto-modal'
import { Toast } from '@/components/toast'

type Apelido = 'Vitim' | 'Gaia'

type Props = {
  currentApelido: Apelido
}

export function HomeClient({ currentApelido }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const handleSuccess = useCallback((msg: string) => {
    setToast(msg)
    router.refresh()
  }, [router])

  const dismissToast = useCallback(() => setToast(null), [])

  return (
    <>
      <Fab onClick={() => setModalOpen(true)} />

      <NovoGastoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        currentApelido={currentApelido}
        onSuccess={handleSuccess}
      />

      {toast && <Toast message={toast} onDismiss={dismissToast} />}
    </>
  )
}
