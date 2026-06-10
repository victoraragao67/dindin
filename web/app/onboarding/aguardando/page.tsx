import { redirect } from 'next/navigation'
import { getCasal } from '@/lib/supabase/get-casal'
import { createClient } from '@/lib/supabase/server'
import { AguardandoClient } from './aguardando-client'

export default async function AguardandoPage() {
  const casal = await getCasal()

  // Casal já ativo → vai para home
  if (casal.casalId && casal.status === 'active') {
    redirect('/')
  }

  // Sem casal → voltar para onboarding
  if (!casal.casalId) {
    redirect('/onboarding')
  }

  // Busca o e-mail do convidado para exibir na tela
  const supabase = createClient()
  const { data: convite } = await supabase
    .from('casal_convites')
    .select('email_convidado')
    .eq('casal_id', casal.casalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <AguardandoClient
      casalId={casal.casalId}
      emailConvidado={convite?.email_convidado ?? null}
    />
  )
}
