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

  const supabase = createClient()
  const { data: convite } = await supabase
    .from('casal_convites')
    .select('token, email_convidado')
    .eq('casal_id', casal.casalId)
    .is('usado_em', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <AguardandoClient
      casalId={casal.casalId}
      token={convite?.token ?? null}
      emailConvidado={convite?.email_convidado ?? null}
    />
  )
}
