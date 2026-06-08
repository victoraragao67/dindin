import { createClient } from '@/lib/supabase/server'
import { sendPushNotification } from '@/lib/push/send'

/**
 * POST /api/push/send-test
 * Envia uma notificação de teste para todas as subscriptions ativas do usuário logado.
 * Requer sessão válida — não expor publicamente.
 */
export async function POST() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('id, apelido')
    .eq('email', user.email!)
    .maybeSingle()

  if (!userRow) {
    return Response.json({ error: 'Usuário não encontrado em public.users' }, { status: 404 })
  }

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userRow.id)
    .eq('ativo', true)

  if (!subscriptions?.length) {
    return Response.json({ error: 'Nenhuma subscription ativa encontrada' }, { status: 404 })
  }

  let enviados = 0
  let erros    = 0

  for (const sub of subscriptions) {
    try {
      await sendPushNotification(sub, {
        title: '💚 Nosso DinDin',
        body:  `Oi ${userRow.apelido}! Este é um push de teste. Tudo certo!`,
        url:   '/',
      })
      enviados++
    } catch (err: unknown) {
      erros++
      // Se 410 Gone, marcar subscription como inativa
      const status = (err as { statusCode?: number })?.statusCode
      if (status === 410) {
        await supabase
          .from('push_subscriptions')
          .update({ ativo: false })
          .eq('endpoint', sub.endpoint)
      }
      console.error('[push/send-test] erro:', err)
    }
  }

  return Response.json({ enviados, erros })
}
