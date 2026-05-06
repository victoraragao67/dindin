import { Suspense } from 'react'
import { SaldoHeader, SaldoHeaderSkeleton } from '@/components/saldo-header'
import { ListaGastos, ListaGastosSkeleton } from '@/components/lista-gastos'
import { Fab } from '@/components/fab'

export default function HomePage() {
  return (
    <>
      <Suspense fallback={<SaldoHeaderSkeleton />}>
        <SaldoHeader />
      </Suspense>

      <Suspense fallback={<ListaGastosSkeleton />}>
        <ListaGastos />
      </Suspense>

      <Fab />
    </>
  )
}
