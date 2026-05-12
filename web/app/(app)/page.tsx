import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import { SaldoHeader, SaldoHeaderSkeleton } from '@/components/saldo-header'
import { ListaGastos, ListaGastosSkeleton } from '@/components/lista-gastos'
import { HomeClient } from '@/components/home-client'
import { MetaAlertBanner } from '@/components/meta-alert-banner'

type Apelido = 'Vitim' | 'Gaia'

export default async function HomePage() {
  const user = await getUser()  // deduplica com layout + saldo-header (React cache)
  const supabase = createClient()

  // Resolve apelido do usuário logado para o default do pagador no modal
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
