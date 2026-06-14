import { Suspense } from 'react'
import { getCasal } from '@/lib/supabase/get-casal'
import { createClient } from '@/lib/supabase/server'
import { SaldoHeader, SaldoHeaderSkeleton } from '@/components/saldo-header'
import { ListaGastos, ListaGastosSkeleton } from '@/components/lista-gastos'
import { HomeClient } from '@/components/home-client'
import { MetaAlertBanner } from '@/components/meta-alert-banner'

export const metadata = { title: 'Gastos' }

export default async function GastosPage() {
  const supabase = createClient()
  const [casal, categoriasRes] = await Promise.all([
    getCasal(),
    supabase.from('categories').select('id, nome, emoji, ordem').eq('ativo', true).order('ordem', { ascending: true }),
  ])
  const currentApelido = casal.meuApelido ?? ''
  const apelidos = casal.apelidos ?? [currentApelido, currentApelido] as [string, string]
  const categorias = (categoriasRes.data ?? []) as { id: number; nome: string; emoji: string; ordem: number }[]

  return (
    <>
      <Suspense fallback={<SaldoHeaderSkeleton />}>
        <SaldoHeader />
      </Suspense>

      <Suspense fallback={null}>
        <MetaAlertBanner />
      </Suspense>

      <Suspense fallback={<ListaGastosSkeleton />}>
        <ListaGastos currentApelido={currentApelido} apelidos={apelidos} categorias={categorias} />
      </Suspense>

      <HomeClient currentApelido={currentApelido} apelidos={apelidos} categorias={categorias} />
    </>
  )
}
