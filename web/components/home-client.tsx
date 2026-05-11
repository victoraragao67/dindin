'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Fab } from '@/components/fab'
import { NovoGastoModal } from '@/components/novo-gasto-modal'
import { Toast } from '@/components/toast'
import { PushBanner } from '@/components/push-banner'

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

  function handlePushSubscribed() {
    setToast('✅ Tudo certo! Te avisamos às 22h.')
  }

  return (
    <>
      <PushBanner onSubscribed={handlePushSubscribed} />

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
