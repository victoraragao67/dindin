import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUser } from './get-user'

export type CasalStatus = 'pending' | 'active' | 'inactive' | 'blocked' | null

export type CasalContext = {
  casalId:    string | null
  status:     CasalStatus
  parceiro:   { id: string; apelido: string } | null
  meuApelido: string | null
  /** Ambos os apelidos [eu, parceiro] — útil para passar ao modal */
  apelidos:   [string, string] | null
}

/**
 * getCasal — busca o casal ativo (ou pending) do usuário autenticado.
 *
 * Usa o admin client (service role) depois de verificar o usuário via
 * getUser(). Isso evita problemas de RLS/sessão no servidor — o usuário
 * já foi autenticado pelo Supabase Auth, e todas as queries são filtradas
 * pelo user.id verificado. React cache() garante 1 chamada por request.
 */
export const getCasal = cache(async (): Promise<CasalContext> => {
  const empty: CasalContext = {
    casalId: null, status: null, parceiro: null, meuApelido: null, apelidos: null,
  }

  // Verifica identidade via Supabase Auth (seguro — valida JWT no servidor)
  const user = await getUser()
  if (!user) return empty

  // Admin client bypassa RLS; seguro pois filtramos sempre por user.id verificado
  const supabase = createAdminClient()

  const { data: membro } = await supabase
    .from('casal_membros')
    .select(`
      casal_id,
      casais ( id, status ),
      users!casal_membros_user_id_fkey ( id, apelido )
    `)
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membro) return empty

  const casal = Array.isArray(membro.casais) ? membro.casais[0] : (membro.casais as any)
  const eu    = Array.isArray(membro.users)  ? membro.users[0]  : (membro.users  as any)

  if (!casal || !['pending', 'active'].includes(casal.status)) return empty

  const { data: parceiroMembro } = await supabase
    .from('casal_membros')
    .select('users!casal_membros_user_id_fkey ( id, apelido )')
    .eq('casal_id', casal.id)
    .neq('user_id', user.id)
    .maybeSingle()

  const parceiro = parceiroMembro
    ? (Array.isArray(parceiroMembro.users) ? parceiroMembro.users[0] : (parceiroMembro.users as any))
    : null

  const meuApelido      = eu?.apelido      ?? null
  const parceiroApelido = parceiro?.apelido ?? null

  return {
    casalId:    casal.id,
    status:     casal.status as CasalStatus,
    parceiro:   parceiro ? { id: parceiro.id, apelido: parceiro.apelido } : null,
    meuApelido,
    apelidos:   meuApelido && parceiroApelido
      ? [meuApelido, parceiroApelido]
      : null,
  }
})
