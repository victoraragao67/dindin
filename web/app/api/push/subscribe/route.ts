import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToSubs } from '@/lib/push/send-server'
import { getTemplate } from '@/lib/copy/get-template'

/**
 * POST /api/push/subscribe
 * Persiste (ou atualiza) a subscription de push do dispositivo atual.
 * Requer sessão Supabase válida.
 */
export async function POST(request: NextRequest) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  let body: { endpoint: string; p256dh: string; auth: string; userAgent?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { endpoint, p256dh, auth, userAgent } = body

  if (!endpoint || !p256dh || !auth) {
    return Response.json({ error: 'Campos obrigatórios: endpoint, p256dh, auth' }, { status: 400 })
  }

  // Resolve user_id via public.users
  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email!)
    .maybeSingle()

  if (!userRow) {
    return Response.json({ error: 'Usuário não encontrado em public.users' }, { status: 404 })
  }

  // Upsert — mesmo endpoint pode ser atualizado (chaves podem rodar)
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id:    userRow.id,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent ?? null,
        ativo:      true,
      },
      { onConflict: 'endpoint' }
    )

  if (error) {
    console.error('[push/subscribe]', error.message)
    return Response.json({ error: 'Erro ao salvar subscription' }, { status: 500 })
  }

  // Boas-vindas (fire-and-forget — não bloqueia a resposta)
  void (async () => {
    try {
      const body = await getTemplate('boas_vindas')
      if (!body) return
      await sendPushToSubs([{ endpoint, p256dh, auth }], {
        title: '💚 Nosso DinDin',
        body,
        url: '/',
      })
    } catch { /* ignora falhas de push */ }
  })()

  return Response.json({ ok: true })
}
