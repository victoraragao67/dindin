import { Suspense } from 'react'
import { getCasal } from '@/lib/supabase/get-casal'
import { SaldoHeader, SaldoHeaderSkeleton } from '@/components/saldo-header'
import { ListaGastos, ListaGastosSkeleton } from '@/components/lista-gastos'
import { HomeClient } from '@/components/home-client'
import { MetaAlertBanner } from '@/components/meta-alert-banner'

export const metadata = { title: 'Gastos' }

export default async function GastosPage() {
  const casal = await getCasal()
  const currentApelido = casal.meuApelido ?? ''
  const apelidos = casal.apelidos ?? [currentApelido, currentApelido] as [string, string]

  return (
    <>
      <Suspense fallback={<SaldoHeaderSkeleton />}>
        <SaldoHeader />
      </Suspense>

      <Suspense fallback={null}>
        <MetaAlertBanner />
      </Suspense>

      <Suspense fallback={<ListaGastosSkeleton />}>
        <ListaGastos currentApelido={currentApelido} apelidos={apelidos} />
      </Suspense>

      <HomeClient currentApelido={currentApelido} apelidos={apelidos} />
    </>
  )
}
