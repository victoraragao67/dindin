import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * getUser — busca o usuário autenticado com deduplicação por request.
 *
 * React cache() garante que, mesmo que múltiplos Server Components chamem
 * getUser() no mesmo render (layout + page + sub-components), o Supabase
 * recebe apenas 1 chamada auth.getUser() por request HTTP.
 */
export const getUser = cache(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
