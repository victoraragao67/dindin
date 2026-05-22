import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import { SaldoHeader, SaldoHeaderSkeleton } from '@/components/saldo-header'
import { ListaGastos, ListaGastosSkeleton } from '@/components/lista-gastos'
import { HomeClient } from '@/components/home-client'
import { MetaAlertBanner } from '@/components/meta-alert-banner'

type Apelido = 'Vitim' | 'Gaia'

export const metadata = { title: 'Gastos' }

export default async function GastosPage() {
  const user = await getUser()
  const supabase = createClient()

  let currentApelido: Apelido = 'Vitim'
  if (user?.email) {
    const { data } = await supabase
      .from('users')
      .select('apelido')
      .eq('email', user.email)
      .maybeSingle()
    if (data?.apelido === 'Gaia') currentApelido = 'Gaia'
  }

  return (
    <>
      <Suspense fallback={<SaldoHeaderSkeleton />}>
        <SaldoHeader />
      </Suspense>

      <Suspense fallback={null}>
        <MetaAlertBanner />
      </Suspense>

      <Suspense fallback={<ListaGastosSkeleton />}>
        <ListaGastos currentApelido={currentApelido} />
      </Suspense>

      <HomeClient currentApelido={currentApelido} />
    </>
  )
}
