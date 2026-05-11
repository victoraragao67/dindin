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
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // ── Dia atual em BRT (UTC-3) ──────────────────────────────
  const agora = new Date()
  const brt   = new Date(agora.getTime() - 3 * 60 * 60 * 1000)

  const diaAtual  = brt.getUTCDate()
  const year      = brt.getUTCFullYear()
  const month     = String(brt.getUTCMonth() + 1).padStart(2, '0')
  const day       = String(diaAtual).padStart(2, '0')
  const dataCompra = `${year}-${month}-${day}`   // YYYY-MM-DD em BRT

  console.log(`[recurring-cron] iniciando — dia ${diaAtual}, data ${dataCompra}`)

  // ── Buscar templates ativos para hoje ─────────────────────
  const { data: templates, error: fetchError } = await supabase
    .from('recurring_templates')
    .select('id, pagador_id, categoria_id, valor_centavos, descricao, divisao, split_pagador_pct')
    .eq('ativo', true)
    .eq('dia_do_mes', diaAtual)

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

  // ── Processar cada template ───────────────────────────────
  for (const t of lista) {
    const { error: insertError } = await supabase
      .from('expenses')
      .insert({
        pagador_id:           t.pagador_id,
        categoria_id:         t.categoria_id,
        valor_total_centavos: t.valor_centavos,   // recurring usa valor_centavos
        parcelas:             1,
        divisao:              t.divisao,
        split_pagador_pct:    t.split_pagador_pct ?? null,
        data_compra:          dataCompra,
        descricao:            t.descricao,
        origem:               'recorrente',
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
      console.log(`[recurring-cron] template ${t.id} → expense gerado (${dataCompra})`)
    }
  }

  const resumo = { gerados, pulados, erros, diaAtual, dataCompra }
  console.log('[recurring-cron] concluído —', JSON.stringify(resumo))

  return new Response(
    JSON.stringify(resumo),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
