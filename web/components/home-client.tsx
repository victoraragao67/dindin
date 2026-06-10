'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { NovoGastoModal } from '@/components/novo-gasto-modal'
import { Toast } from '@/components/toast'
import { Onboarding } from '@/components/onboarding'
import { BottomNav } from '@/components/bottom-nav'
import { Fab } from '@/components/fab'

type Props = {
  currentApelido: string
  apelidos?: [string, string]
  hideBottomNav?: boolean
}

export function HomeClient({ currentApelido, apelidos, hideBottomNav = false }: Props) {
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

  return (
    <>
      {/* Onboarding sobrepõe tudo — só aparece no primeiro acesso */}
      <Onboarding apelido={currentApelido} />

      <NovoGastoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        currentApelido={currentApelido}
        apelidos={apelidos ?? [currentApelido, currentApelido]}
        onSuccess={handleSuccess}
      />

      {toast && <Toast message={toast} onDismiss={dismissToast} />}

      {!hideBottomNav && <BottomNav />}

      {/* FAB flutuante para adicionar gasto — oculto enquanto modal está aberto */}
      {!modalOpen && <Fab onClick={() => setModalOpen(true)} />}
    </>
  )
}
