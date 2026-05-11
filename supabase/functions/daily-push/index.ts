/**
 * Edge Function: daily-push
 *
 * Roda às 22:00 BRT (01:00 UTC) todos os dias.
 * Para cada usuário com push subscription ativa que NÃO registrou
 * nenhum gasto hoje, envia uma notificação: "Nenhum gasto registrado hoje."
 *
 * Idempotência: a lógica é baseada em estado atual (expenses de hoje),
 * então rodar 2x no mesmo dia envia no máximo 1 push por usuário
 * que não registrou gasto — comportamento aceitável para um lembrete.
 *
 * Agendamento: 0 1 * * *  (01:00 UTC = 22:00 BRT)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

type PushSub = {
  user_id: string
  endpoint: string
  p256dh:   string
  auth:     string
}

Deno.serve(async (_req: Request) => {
  // ── VAPID (lazy — não pode ser top-level em Edge Functions) ──
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!
  )

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── Data atual em BRT (UTC-3) ─────────────────────────────────
  const agora = new Date()
  const brt   = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  const year  = brt.getUTCFullYear()
  const month = String(brt.getUTCMonth() + 1).padStart(2, '0')
  const day   = String(brt.getUTCDate()).padStart(2, '0')
  const hoje  = `${year}-${month}-${day}`

  console.log(`[daily-push] iniciando — data BRT: ${hoje}`)

  // ── Buscar todas as subscriptions ativas ─────────────────────
  const { data: subsData, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .eq('ativo', true)

  if (subsError) {
    console.error('[daily-push] erro ao buscar subscriptions:', subsError.message)
    return new Response(
      JSON.stringify({ error: subsError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const allSubs: PushSub[] = subsData ?? []

  // Agrupa subscriptions por user_id
  const byUser = new Map<string, PushSub[]>()
  for (const sub of allSubs) {
    if (!byUser.has(sub.user_id)) byUser.set(sub.user_id, [])
    byUser.get(sub.user_id)!.push(sub)
  }

  const userIds = [...byUser.keys()]
  console.log(`[daily-push] ${userIds.length} usuário(s) com subscriptions ativas`)

  let enviados = 0
  let pulados  = 0
  let erros    = 0

  // ── Para cada usuário ─────────────────────────────────────────
  for (const userId of userIds) {

    // Verifica se já registrou algum gasto hoje
    const { data: expenses, error: expError } = await supabase
      .from('expenses')
      .select('id')
      .eq('pagador_id', userId)
      .eq('data_compra', hoje)
      .limit(1)

    if (expError) {
      console.error(`[daily-push] erro ao verificar expenses (${userId}):`, expError.message)
      erros++
      continue
    }

    if (expenses && expenses.length > 0) {
      console.log(`[daily-push] usuário ${userId} já tem gasto hoje — pulado`)
      pulados++
      continue
    }

    // Nenhum gasto hoje → envia push para cada subscription do usuário
    const userSubs = byUser.get(userId)!

    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: 'DinDin 💰',
            body:  'Nenhum gasto registrado hoje. Tudo certo?',
            url:   '/?modal=novo-gasto',
          })
        )
        enviados++
        console.log(`[daily-push] ✓ push enviado — usuário ${userId}`)
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode

        if (status === 410) {
          // Subscription revogada pelo usuário → desativa no banco
          const { error: deactivateErr } = await supabase
            .from('push_subscriptions')
            .update({ ativo: false })
            .eq('endpoint', sub.endpoint)

          if (deactivateErr) {
            console.error('[daily-push] erro ao desativar subscription:', deactivateErr.message)
          } else {
            console.log(`[daily-push] subscription desativada (410): ${sub.endpoint}`)
          }
        } else {
          erros++
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[daily-push] erro ao enviar push (${userId}):`, msg)
        }
      }
    }
  }

  const resumo = { enviados, pulados, erros, hoje }
  console.log('[daily-push] concluído —', JSON.stringify(resumo))

  return new Response(
    JSON.stringify(resumo),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
