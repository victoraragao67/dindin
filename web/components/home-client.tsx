'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Fab } from '@/components/fab'
import { NovoGastoModal } from '@/components/novo-gasto-modal'
import { Toast } from '@/components/toast'
import { PushBanner } from '@/components/push-banner'
import { Onboarding } from '@/components/onboarding'

type Apelido = 'Vitim' | 'Gaia'

type Props = {
  currentApelido: Apelido
}

export function HomeClient({ currentApelido }: Props) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Abre o modal automaticamente quando a URL tem ?modal=novo-gasto
  // (usado pela notificação push diária)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('modal') === 'novo-gasto') {
      setModalOpen(true)
      // Limpa o param da URL sem recarregar a página
      const url = new URL(window.location.href)
      url.searchParams.delete('modal')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

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
      {/* Onboarding sobrepõe tudo — só aparece no primeiro acesso */}
      <Onboarding apelido={currentApelido} />

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
