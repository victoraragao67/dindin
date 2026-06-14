/**
 * Edge Function: parceiro-batch
 *
 * Varredura a cada ~15 minutos para notificar o parceiro sobre gastos registrados.
 * Agrupa gastos com parceiro_notificado_em = NULL cujo created_at >= 1h atrás.
 *
 * 1 gasto → "Vitim registrou 🍔 Restaurante · R$ 60"
 * N gastos → "Vitim registrou 3 gastos hoje · R$ 240 (Restaurante, Mercado, Lazer)"
 *
 * Canal independente do cap de 1 push/dia das 20h.
 * Texto editável via /admin/mensagens (parceiro.registro / parceiro.agrupado).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

type GastoPendente = {
  id:               string
  casal_id:         string
  pagador_id:       string
  categoria_id:     number
  valor_total_centavos: number
  created_at:       string
}

type TemplatesMap = Record<string, string>

function fmt(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

async function carregarTemplates(supabase: ReturnType<typeof createClient>): Promise<TemplatesMap> {
  try {
    const { data } = await supabase
      .from('message_templates')
      .select('chave, variacoes')
      .in('chave', ['parceiro.registro', 'parceiro.agrupado'])
      .eq('ativo', true)
    const map: TemplatesMap = {}
    for (const row of (data ?? []) as { chave: string; variacoes: string[] }[]) {
      if (row.variacoes?.length > 0) map[row.chave] = row.variacoes[0]
    }
    return map
  } catch {
    return {}
  }
}

Deno.serve(async (_req: Request) => {
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('NEXT_PUBLIC_VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const templates = await carregarTemplates(supabase)
  const TPL_1  = templates['parceiro.registro'] ?? '{apelido} registrou {emoji} {categoria} · {valor}'
  const TPL_N  = templates['parceiro.agrupado'] ?? '{apelido} registrou {n} gastos hoje · {total} ({lista})'

  // Gastos pendentes de notificação ao parceiro criados >= 1h atrás
  const umHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: pendentes, error } = await supabase
    .from('expenses')
    .select('id, casal_id, pagador_id, categoria_id, valor_total_centavos, created_at')
    .is('parceiro_notificado_em', null)
    .eq('cancelado', false)
    .eq('origem', 'pwa')
    .lte('created_at', umHoraAtras)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[parceiro-batch] erro ao buscar pendentes:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const gastos = (pendentes ?? []) as GastoPendente[]
  if (gastos.length === 0) {
    return new Response(JSON.stringify({ processados: 0 }))
  }

  console.log(`[parceiro-batch] ${gastos.length} gasto(s) pendente(s)`)

  // Agrupa por (casal_id, pagador_id)
  const grupos = new Map<string, GastoPendente[]>()
  for (const g of gastos) {
    const key = `${g.casal_id}|${g.pagador_id}`
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(g)
  }

  let processados = 0

  for (const [key, grupo] of grupos) {
    const { casal_id, pagador_id } = grupo[0]

    // Busca apelido do pagador
    const { data: pagadorData } = await supabase
      .from('users')
      .select('apelido')
      .eq('id', pagador_id)
      .single()
    const apelido = (pagadorData as { apelido: string } | null)?.apelido ?? '?'

    // Busca parceiro (outro membro do casal)
    const { data: membrosData } = await supabase
      .from('casal_membros')
      .select('user_id')
      .eq('casal_id', casal_id)
      .neq('user_id', pagador_id)
    const parceiroId = ((membrosData ?? []) as { user_id: string }[])[0]?.user_id ?? null

    if (!parceiroId) {
      // Casal sem parceiro (invite pendente) — marca como notificado mesmo assim
      const ids = grupo.map(g => g.id)
      await supabase
        .from('expenses')
        .update({ parceiro_notificado_em: new Date().toISOString() })
        .in('id', ids)
      continue
    }

    // Busca subscriptions ativas do parceiro
    const { data: subsData } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', parceiroId)
      .eq('ativo', true)
    const subs = (subsData ?? []) as { endpoint: string; p256dh: string; auth: string }[]

    if (subs.length > 0) {
      let body: string

      if (grupo.length === 1) {
        const g = grupo[0]
        // Busca nome e emoji da categoria
        const { data: catData } = await supabase
          .from('categories')
          .select('nome, emoji')
          .eq('id', g.categoria_id)
          .single()
        const cat = (catData as { nome: string; emoji: string } | null)
        body = TPL_1
          .replace('{apelido}',   apelido)
          .replace('{emoji}',     cat?.emoji    ?? '')
          .replace('{categoria}', cat?.nome     ?? `cat#${g.categoria_id}`)
          .replace('{valor}',     fmt(g.valor_total_centavos))
      } else {
        // Múltiplos gastos agrupados
        const total = grupo.reduce((s, g) => s + g.valor_total_centavos, 0)

        // Busca categorias únicas
        const catIds = [...new Set(grupo.map(g => g.categoria_id))]
        const { data: catsData } = await supabase
          .from('categories')
          .select('id, nome')
          .in('id', catIds)
        const catsMap: Record<number, string> = {}
        for (const c of (catsData ?? []) as { id: number; nome: string }[]) {
          catsMap[c.id] = c.nome
        }
        const lista = catIds.map(id => catsMap[id] ?? `cat#${id}`).join(', ')

        body = TPL_N
          .replace('{apelido}', apelido)
          .replace('{n}',       String(grupo.length))
          .replace('{total}',   fmt(total))
          .replace('{lista}',   lista)
      }

      // Envia push
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify({ title: '💸 Novo gasto registrado', body, url: '/gastos' }),
          )
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode
          if (status === 410) {
            await supabase.from('push_subscriptions').update({ ativo: false }).eq('endpoint', sub.endpoint)
          } else {
            console.error('[parceiro-batch] erro push:', err instanceof Error ? err.message : String(err))
          }
        }
      }

      console.log(`[parceiro-batch] ✓ ${key} — ${grupo.length} gasto(s) → parceiro ${parceiroId}`)
    }

    // Marca como notificado
    const ids = grupo.map(g => g.id)
    await supabase
      .from('expenses')
      .update({ parceiro_notificado_em: new Date().toISOString() })
      .in('id', ids)

    processados += grupo.length
  }

  const resumo = { processados, grupos: grupos.size }
  console.log('[parceiro-batch] concluído —', JSON.stringify(resumo))
  return new Response(JSON.stringify(resumo), { headers: { 'Content-Type': 'application/json' } })
})
