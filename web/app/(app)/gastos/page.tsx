import { Suspense } from 'react'
import { getCasal } from '@/lib/supabase/get-casal'
import { getUser } from '@/lib/supabase/get-user'
import { createClient } from '@/lib/supabase/server'
import { SaldoHeader, SaldoHeaderSkeleton } from '@/components/saldo-header'
import { ListaGastos, ListaGastosSkeleton } from '@/components/lista-gastos'
import { HomeClient } from '@/components/home-client'
import { MetaAlertBanner } from '@/components/meta-alert-banner'

export const metadata = { title: 'Gastos' }

export default async function GastosPage() {
  const [casal, user] = await Promise.all([getCasal(), getUser()])
  const currentApelido = casal.meuApelido ?? ''
  const apelidos = casal.apelidos ?? [currentApelido, currentApelido] as [string, string]

  // Verifica se usuário já tem subscription ativa no banco
  let pushAtivo = false
  if (user?.email) {
    const supabase = createClient()
    const { data: userRow } = await supabase
      .from('users')
      .select('id, push_subscriptions(ativo)')
      .eq('email', user.email)
      .maybeSingle()
    const subs = userRow?.push_subscriptions as { ativo: boolean }[] | undefined
    pushAtivo = subs?.some(s => s.ativo) ?? false
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
        <ListaGastos currentApelido={currentApelido} apelidos={apelidos} />
      </Suspense>

      <HomeClient currentApelido={currentApelido} apelidos={apelidos} pushAtivo={pushAtivo} />
    </>
  )
}
