import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { SaldoHeader, SaldoHeaderSkeleton } from '@/components/saldo-header'
import { ListaGastos, ListaGastosSkeleton } from '@/components/lista-gastos'
import { HomeClient } from '@/components/home-client'

type Apelido = 'Vitim' | 'Gaia'

export default async function HomePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

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

      <Suspense fallback={<ListaGastosSkeleton />}>
        <ListaGastos currentApelido={currentApelido} />
      </Suspense>

      <HomeClient currentApelido={currentApelido} />
    </>
  )
}
