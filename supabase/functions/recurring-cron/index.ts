/**
 * Edge Function: recurring-cron
 *
 * Gera expenses para todos os recurring_templates ativos cujo
 * dia_do_mes bate com o dia atual em BRT (UTC-3).
 *
 * Agendamento: 0 11 * * *  (11:00 UTC = 08:00 BRT)
 *
 * Idempotência: o índice uq_expense_recurring_mes no banco
 * impede duplicatas — inserções conflitantes retornam código 23505
 * e são contadas como "pulados".
 *
 * Multi-tenant: push é enviado separadamente por casal — cada casal
 * recebe apenas a contagem dos seus próprios recorrentes.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── Dia atual em BRT (UTC-3) ──────────────────────────────
  const agora = new Date()
  const brt   = new Date(agora.getTime() - 3 * 60 * 60 * 1000)

  const diaAtual = brt.getUTCDate()
  const year     = brt.getUTCFullYear()
  const month    = String(brt.getUTCMonth() + 1).padStart(2, '0')

  console.log(`[recurring-cron] iniciando — dia ${diaAtual}, mês ${year}-${month}`)

  // ── Buscar templates ativos cujo dia já chegou este mês ───
  // Usa lte (≤ diaAtual) para ser auto-recuperável:
  // se o cron falhar num dia, na próxima execução ele processa
  // os templates perdidos. O índice único uq_expense_recurring_mes
  // garante idempotência — duplicatas retornam código 23505.
  const { data: templates, error: fetchError } = await supabase
    .from('recurring_templates')
    .select('id, casal_id, pagador_id, categoria_id, valor_centavos, descricao, divisao, split_pagador_pct, dia_do_mes')
    .eq('ativo', true)
    .lte('dia_do_mes', diaAtual)

  if (fetchError) {
    console.error('[recurring-cron] erro ao buscar templates:', fetchError.message)
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const lista = templates ?? []
  console.log(`[recurring-cron] ${lista.length} template(s) para processar`)

  let gerados = 0
  let pulados = 0
  let erros   = 0

  // Rastreia quantos recorrentes foram gerados por casal (para push isolado)
  const geradosPorCasal = new Map<string, number>()

  // ── Processar cada template ───────────────────────────────
  for (const t of lista) {
    // data_compra = dia_do_mes correto no mês atual
    const dia        = String(t.dia_do_mes).padStart(2, '0')
    const dataCompra = `${year}-${month}-${dia}`

    const { error: insertError } = await supabase
      .from('expenses')
      .insert({
        casal_id:              t.casal_id,
        pagador_id:            t.pagador_id,
        categoria_id:          t.categoria_id,
        valor_total_centavos:  t.valor_centavos,
        parcelas:              1,
        divisao:               t.divisao,
        split_pagador_pct:     t.split_pagador_pct ?? null,
        data_compra:           dataCompra,
        descricao:             t.descricao,
        origem:                'recorrente',
        recurring_template_id: t.id,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        // Conflito no índice único — já foi gerado este mês
        pulados++
        console.log(`[recurring-cron] template ${t.id} já gerado este mês — pulado`)
      } else {
        erros++
        console.error(`[recurring-cron] erro ao gerar template ${t.id}:`, insertError.message)
      }
    } else {
      gerados++
      geradosPorCasal.set(t.casal_id, (geradosPorCasal.get(t.casal_id) ?? 0) + 1)
      console.log(`[recurring-cron] template ${t.id} → expense gerado (${dataCompra})`)
    }
  }

  const resumo = { gerados, pulados, erros, diaAtual }
  console.log('[recurring-cron] concluído —', JSON.stringify(resumo))

  // ── Notifica cada casal isoladamente ─────────────────────
  // Cada casal recebe push apenas com a contagem dos SEUS recorrentes.
  if (geradosPorCasal.size > 0) {
    try {
      webpush.setVapidDetails(
        Deno.env.get('VAPID_SUBJECT')!,
        Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!,
        Deno.env.get('VAPID_PRIVATE_KEY')!
      )

      for (const [casalId, count] of geradosPorCasal) {
        // Busca os user_ids que pertencem a este casal
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .eq('casal_id', casalId)

        if (!users || users.length === 0) continue

        const userIds = users.map((u: { id: string }) => u.id)

        // Busca push_subscriptions apenas dos usuários deste casal
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth')
          .in('user_id', userIds)
          .eq('ativo', true)

        if (!subs || subs.length === 0) continue

        const body = count === 1
          ? 'Venceu 1 gasto recorrente hoje. Confira os gastos do mês.'
          : `Venceram ${count} gastos recorrentes hoje. Confira os gastos do mês.`

        const payload = JSON.stringify({
          title: '🔁 Recorrentes do mês',
          body,
          url: '/recorrentes',
        })

        await Promise.allSettled(
          subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
            webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload
            ).catch((err: unknown) => {
              const status = (err as { statusCode?: number }).statusCode
              if (status === 410) {
                // Subscription revogada — desativa no banco
                supabase
                  .from('push_subscriptions')
                  .update({ ativo: false })
                  .eq('endpoint', sub.endpoint)
                  .then(() => console.log('[recurring-cron] subscription desativada (410)'))
              }
            })
          )
        )

        console.log(`[recurring-cron] push enviado para casal ${casalId} — ${count} recorrente(s), ${subs.length} subscription(s)`)
      }
    } catch (err) {
      console.error('[recurring-cron] erro ao enviar push:', err)
    }
  }

  return new Response(
    JSON.stringify(resumo),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
