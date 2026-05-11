import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/push/unsubscribe
 * Marca a subscription como inativa no banco.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 })

  const { endpoint } = await request.json()
  if (!endpoint) return Response.json({ error: 'endpoint obrigatório' }, { status: 400 })

  await supabase
    .from('push_subscriptions')
    .update({ ativo: false })
    .eq('endpoint', endpoint)

  return Response.json({ ok: true })
}
