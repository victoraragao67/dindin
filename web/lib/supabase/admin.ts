import { createClient } from '@supabase/supabase-js'

/**
 * adminClient — usa service_role key, bypassa RLS.
 * NUNCA expor no client-side. Usar apenas em Server Actions e Route Handlers.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.')

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}
