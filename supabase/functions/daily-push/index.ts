/**
 * Edge Function: daily-push (v2 — notificação unificada)
 *
 * Roda de hora em hora (0 * * * *).
 * A cada execução filtra os casais cujo notificacao_hora == hora BRT atual.
 *
 * Para cada usuário com push ativo (1 push/dia — idempotente):
 *   1. temRisco       = alguma categoria do casal em risco (vai_estourar/estourou)
 *                       não alertada nos últimos 7 dias
 *   2. faltaRegistro  = usuário não registrou hoje E está na escada 1/2/3/4/7/14/21
 *
 *   risco + falta → mensagem COMBINADA (LLM)
 *   só risco      → mensagem de RISCO (LLM)
 *   só falta      → mensagem de FALTA DE USO (LLM)
 *   nenhum        → não envia
 *
 * LLM: Gemini 2.5 Flash-Lite (free tier). Fallback determinístico se falhar.
 * Anti-repetição: ultimo_lembrete salvo por subscription.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

// ── Tipos ───────────────────────────────────────────────────

type PushSub = {
  id:             string
  user_id:        string
  endpoint:       string
  p256dh:         string
  auth:           string
  ultimo_lembrete: string | null
  notificado_em:  string | null
}

type PreditivaRow = {
  casal_id:     string
  categoria_id: number
  status:       string
  projecao:     number | null
  meta:         number | null
  gasto_acumulado: number
}

type Baldes = Record<string, string[]>

// ── Guardrail inline (espelha web/lib/llm/guardrail.ts) ──────

const REGRAS_TOM_BASE = `
REGRAS ABSOLUTAS (nunca viole):
1. Fale SEMPRE com o casal junto ("vocês", "o casal"). PROIBIDO citar ou culpar um parceiro individualmente.
2. Proporção: estouro é AVISO CONSTRUTIVO calmo ("vale segurar"), nunca tragédia e NUNCA motivo de festa.
3. PROIBIDO comemorar ou validar estouro. Nada de "parabéns", "mandaram ver", "arrasaram", "🎉", "tá tudo bem ter passado", "foi planejado". Estouro = heads-up.
4. Elogio SÓ para o que é positivo de verdade. Nunca aplicado a estouro.
5. Sem culpa/vergonha: nada de "descontrolado", "exageraram", "perderam o controle".
6. Use EXATAMENTE os números fornecidos. NUNCA invente ou recalcule valor.`.trim()

const _BLOCKLIST_ALARME     = ['preocupante', 'descontrolado', 'perderam o controle', 'exageraram', 'vergonha', 'irresponsáv', 'catástrofe', 'terrível', 'horrível']
const _BLOCKLIST_COMEMORACAO = ['parabéns', 'mandaram ver', 'arrasaram', 'tá tudo bem ter passado', 'tá tudo certo', 'foi planejado', 'tudo bem ter', 'não tem problema ter passado']
const _EMOJIS_FESTA          = ['🎉', '🥳', '🎊', '🏆', '🙌']

function validarPushTexto(
  texto: string,
  temRisco: boolean,
  apelidos: string[],
): { ok: true } | { ok: false; motivo: string } {
  const lower = texto.toLowerCase()
  const verbos = ['gastou', 'estourou', 'esqueceu', 'não registrou', 'excedeu', 'passou']
  for (const a of apelidos) {
    if (lower.includes(a.toLowerCase())) {
      for (const v of verbos) {
        if (lower.includes(v)) return { ok: false, motivo: `culpa_individual: "${a}" + "${v}"` }
      }
    }
  }
  for (const t of _BLOCKLIST_ALARME) {
    if (lower.includes(t)) return { ok: false, motivo: `alarme: "${t}"` }
  }
  if (temRisco) {
    for (const t of _BLOCKLIST_COMEMORACAO) {
      if (lower.includes(t)) return { ok: false, motivo: `comemoracao_estouro: "${t}"` }
    }
    for (const e of _EMOJIS_FESTA) {
      if (texto.includes(e)) return { ok: false, motivo: `emoji_festa_em_estouro: "${e}"` }
    }
  }
  return { ok: true }
}

// ── Helpers ──────────────────────────────────────────────────

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fmt(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

function brtHoje(): { ano: number; mes: number; dia: number; hora: number; hojeStr: string; diaSemana: number; diasNoMes: number; diasRestantes: number } {
  const ts     = new Date()
  const brt    = new Date(ts.getTime() - 3 * 60 * 60 * 1000)
  const ano    = brt.getUTCFullYear()
  const mes    = brt.getUTCMonth() + 1
  const dia    = brt.getUTCDate()
  const hora   = brt.getUTCHours()
  const hojeStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  const diasNoMes     = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  const diasRestantes = diasNoMes - dia
  const diaSemana     = brt.getUTCDay() // 0=dom
  return { ano, mes, dia, hora, hojeStr, diaSemana, diasNoMes, diasRestantes }
}

async function carregarBaldes(supabase: ReturnType<typeof createClient>): Promise<Baldes> {
  try {
    const { data } = await supabase
      .from('message_templates')
      .select('chave, variacoes')
      .in('chave', [
        'falta_uso.7d', 'falta_uso.14d', 'falta_uso.21d',
        'diario.neutro', 'diario.recomeco', 'diario.fim_de_semana',
        'diario.balanco', 'diario.fechamento',
        'risco.vai_estourar', 'risco.estourou',
        'risco.tom_llm', 'falta_uso.tom_llm', 'risco_falta.tom_llm',
      ])
      .eq('ativo', true)
    const result: Baldes = {}
    for (const row of (data ?? []) as { chave: string; variacoes: string[] }[]) {
      if (row.variacoes?.length > 0) result[row.chave] = row.variacoes
    }
    return result
  } catch {
    return {}
  }
}

// ── LLM (Gemini 2.5 Flash-Lite) ───────────────────────────────

const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''

async function gerarTextoLLM(prompt: string, ultimoLembrete: string | null): Promise<string | null> {
  if (!GEMINI_KEY) return null
  try {
    const fullPrompt = ultimoLembrete
      ? `${prompt}\n\nNão repita (ou seja muito parecido com): "${ultimoLembrete}"`
      : prompt
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { maxOutputTokens: 80, temperature: 0.9 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return null
    const json = await res.json()
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined
    return text?.trim() || null
  } catch {
    return null
  }
}

// ── Geração de texto por tipo ──────────────────────────────────

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

async function textoFaltaUso(
  diasSem: number,
  diaSemana: number,
  diasRestantes: number,
  baldes: Baldes,
  ultimoLembrete: string | null,
  apelidos: string[],
): Promise<string> {
  const nomeDia  = DIAS_SEMANA[diaSemana]
  const tom      = baldes['falta_uso.tom_llm']?.[0] ?? ''
  const contexto = `Hoje é ${nomeDia}. O casal está há ${diasSem} dia${diasSem > 1 ? 's' : ''} sem registrar gastos no app. Faltam ${diasRestantes} dias para o fim do mês.`
  const prompt   = `${REGRAS_TOM_BASE}\n\n${tom}\n\nContexto: ${contexto}`

  const llmRaw = await gerarTextoLLM(prompt, ultimoLembrete)
  if (llmRaw) {
    const check = validarPushTexto(llmRaw, false, apelidos)
    if (check.ok) return llmRaw
    console.warn('[daily-push] guardrail rejeitou falta_uso:', check.motivo)
  }

  // Fallback determinístico
  const get = (k: string) => pick(baldes[k] ?? DEFAULT_BALDES[k] ?? ['Não esqueça de registrar seus gastos!'])
  if (diasSem >= 21) return get('falta_uso.21d')
  if (diasSem >= 14) return get('falta_uso.14d')
  if (diasSem >= 7)  return get('falta_uso.7d')
  if (diasRestantes <= 3)  return get('diario.fechamento')
  if (diaSemana === 1)     return get('diario.recomeco')
  if (diaSemana === 5 || diaSemana === 6) return get('diario.fim_de_semana')
  if (diaSemana === 0)     return get('diario.balanco')
  return get('diario.neutro')
}

async function textoRisco(
  row: PreditivaRow,
  diaSemana: number,
  baldes: Baldes,
  ultimoLembrete: string | null,
  apelidos: string[],
): Promise<string> {
  const nomeDia  = DIAS_SEMANA[diaSemana]
  const tom      = baldes['risco.tom_llm']?.[0] ?? ''
  const diff     = row.projecao != null && row.meta != null ? row.projecao - row.meta : null
  const contexto = [
    `Hoje é ${nomeDia}.`,
    `Categoria: categoria_id=${row.categoria_id}.`,
    row.status === 'estourou'
      ? `A meta de ${fmt(row.meta ?? 0)} já foi estourada (gasto acumulado: ${fmt(row.gasto_acumulado)}).`
      : `Projeção: ${fmt(row.projecao ?? 0)} vs meta ${fmt(row.meta ?? 0)}${diff != null ? ` (${fmt(diff)} acima)` : ''}.`,
  ].join(' ')
  const prompt = `${REGRAS_TOM_BASE}\n\n${tom}\n\nContexto: ${contexto}`

  const llmRaw = await gerarTextoLLM(prompt, ultimoLembrete)
  if (llmRaw) {
    const check = validarPushTexto(llmRaw, true, apelidos)
    if (check.ok) return llmRaw
    console.warn('[daily-push] guardrail rejeitou risco:', check.motivo)
  }

  // Fallback
  if (row.status === 'estourou') {
    const tpl = pick(baldes['risco.estourou'] ?? DEFAULT_BALDES_RISCO.estourou)
    return tpl
      .replace('{emoji}', '⚠️')
      .replace('{cat}',   `cat#${row.categoria_id}`)
      .replace('{meta}',  fmt(row.meta ?? 0))
      .replace('{gasto}', fmt(row.gasto_acumulado))
      .replace('{dias}',  '?')
  }
  const tpl = pick(baldes['risco.vai_estourar'] ?? DEFAULT_BALDES_RISCO.vai_estourar)
  return tpl
    .replace('{emoji}',    '⚠️')
    .replace('{cat}',      `cat#${row.categoria_id}`)
    .replace('{projecao}', fmt(row.projecao ?? 0))
    .replace('{diff}',     fmt(diff ?? 0))
    .replace('{meta}',     fmt(row.meta ?? 0))
}

async function textoRiscoFalta(
  row: PreditivaRow,
  diasSem: number,
  diaSemana: number,
  baldes: Baldes,
  ultimoLembrete: string | null,
  apelidos: string[],
): Promise<string> {
  const nomeDia  = DIAS_SEMANA[diaSemana]
  const tom      = baldes['risco_falta.tom_llm']?.[0] ?? ''
  const diff     = row.projecao != null && row.meta != null ? row.projecao - row.meta : null
  const contexto = [
    `Hoje é ${nomeDia}. O casal está há ${diasSem} dia${diasSem > 1 ? 's' : ''} sem registrar gastos.`,
    row.status === 'estourou'
      ? `Além disso, a meta de ${fmt(row.meta ?? 0)} já foi estourada (gasto acumulado: ${fmt(row.gasto_acumulado)}).`
      : `Além disso, a projeção de ${fmt(row.projecao ?? 0)} está ${fmt(diff ?? 0)} acima da meta de ${fmt(row.meta ?? 0)}.`,
  ].join(' ')
  const prompt = `${REGRAS_TOM_BASE}\n\n${tom}\n\nContexto: ${contexto}`

  const llmRaw = await gerarTextoLLM(prompt, ultimoLembrete)
  if (llmRaw) {
    const check = validarPushTexto(llmRaw, true, apelidos)
    if (check.ok) return llmRaw
    console.warn('[daily-push] guardrail rejeitou risco_falta:', check.motivo)
  }

  // Fallback combinado
  return await textoRisco(row, diaSemana, baldes, null, apelidos)
}

// ── Fallbacks fixos ───────────────────────────────────────────

const DEFAULT_BALDES: Record<string, string[]> = {
  'falta_uso.7d':  ['7 dias sem registrar nada 👀 Bora antes que vire bagunça?'],
  'falta_uso.14d': ['2 semanas sem registrar… começa pelo de hoje 💪'],
  'falta_uso.21d': ['Último empurrão: bora retomar? Três toques e o gasto entra 🚀'],
  'diario.fechamento': ['Reta final do mês! Bora fechar tudo registrado? 🏁'],
  'diario.recomeco':   ['Semana nova! Bora começar registrando certinho? 💪'],
  'diario.fim_de_semana': ['Sextou! Os rolês de hoje já entraram no DinDin? 👀'],
  'diario.balanco':    ['Domingo de fechar a conta: a semana toda entrou no app?'],
  'diario.neutro':     ['Psiu… cadê os gastos de hoje? 👀'],
}

const DEFAULT_BALDES_RISCO = {
  vai_estourar: ['{emoji} Psiu… {cat} acelerou. Projeção: {projecao} ({diff} acima da meta).'],
  estourou:     ['{emoji} {cat} passou da meta de {meta} (já em {gasto}). Bora compensar?'],
}

// ── Envio ─────────────────────────────────────────────────────

async function enviarPush(
  subs: { endpoint: string; p256dh: string; auth: string }[],
  body: string,
  url: string,
  supabase: ReturnType<typeof createClient>,
) {
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title: '💚 Nosso DinDin', body, url }),
      )
    } catch (err: unknown) {
      const status = (err as { statusCode?: number }).statusCode
      if (status === 410) {
        await supabase.from('push_subscriptions').update({ ativo: false }).eq('endpoint', sub.endpoint)
        console.log(`[daily-push] subscription revogada (410): ${sub.endpoint}`)
      } else {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[daily-push] erro ao enviar push:`, msg)
      }
    }
  }
}

// ── Handler principal ─────────────────────────────────────────

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

  const { ano, mes, dia, hora, hojeStr, diaSemana, diasRestantes } = brtHoje()
  console.log(`[daily-push] executando — ${hojeStr} hora BRT: ${hora}h`)

  // Carrega templates (fallback silencioso)
  const baldes = await carregarBaldes(supabase)

  // Busca casais que disparam nesta hora
  const { data: casaisData, error: casaisErr } = await supabase
    .from('casais')
    .select('id, notificacao_hora')
    .eq('notificacao_hora', hora)
    .eq('status', 'active')

  if (casaisErr) {
    console.error('[daily-push] erro ao buscar casais:', casaisErr.message)
    return new Response(JSON.stringify({ error: casaisErr.message }), { status: 500 })
  }

  const casais = (casaisData ?? []) as { id: string; notificacao_hora: number }[]
  if (casais.length === 0) {
    console.log('[daily-push] nenhum casal agendado para esta hora')
    return new Response(JSON.stringify({ enviados: 0, pulados: 0, hora }))
  }

  console.log(`[daily-push] ${casais.length} casal(is) para hora ${hora}h`)

  let enviados = 0
  let pulados  = 0

  for (const casal of casais) {
    // Membros + apelidos do casal (para guardrail de culpa individual)
    const { data: membrosData } = await supabase
      .from('casal_membros')
      .select('user_id, users(apelido)')
      .eq('casal_id', casal.id)

    const membroIds = (membrosData ?? []).map((m: { user_id: string }) => m.user_id)
    const apelidos  = (membrosData ?? [])
      .map((m: { users?: { apelido?: string } }) => m.users?.apelido ?? '')
      .filter(Boolean) as string[]

    // Status preditivo deste casal
    const { data: predData } = await supabase
      .from('v_preditiva_status')
      .select('casal_id, categoria_id, status, projecao, meta, gasto_acumulado')
      .eq('casal_id', casal.id)
      .in('status', ['vai_estourar', 'estourou'])

    const predRisco = (predData ?? []) as PreditivaRow[]

    // Membro(s) do casal com push ativo
    const { data: subsData } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth, ultimo_lembrete, notificado_em')
      .in('user_id', membroIds)
      .eq('ativo', true)

    const allSubs = (subsData ?? []) as PushSub[]

    // Agrupa por user_id
    const byUser = new Map<string, PushSub[]>()
    for (const s of allSubs) {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, [])
      byUser.get(s.user_id)!.push(s)
    }

    for (const [userId, userSubs] of byUser) {
      // Idempotência: 1 push/dia por usuário
      const jaEnviado = userSubs.some(s => s.notificado_em === hojeStr)
      if (jaEnviado) {
        console.log(`[daily-push] usuário ${userId} já notificado hoje — pulado`)
        pulados++
        continue
      }

      // Verifica se usuário registrou hoje
      const { data: expHoje } = await supabase
        .from('expenses')
        .select('data_compra')
        .eq('pagador_id', userId)
        .eq('data_compra', hojeStr)
        .limit(1)

      const registrouHoje = (expHoje ?? []).length > 0

      // Calcula diasSemRegistrar para faltaRegistro
      let diasSem = 0
      if (!registrouHoje) {
        const { data: ultimoExp } = await supabase
          .from('expenses')
          .select('data_compra')
          .eq('pagador_id', userId)
          .lte('data_compra', hojeStr)
          .order('data_compra', { ascending: false })
          .limit(1)

        const lastDate = (ultimoExp ?? [])[0]?.data_compra ?? null
        diasSem = lastDate
          ? Math.round((new Date(hojeStr).getTime() - new Date(lastDate).getTime()) / 86400000)
          : 999
      }

      const DIAS_ENVIO = new Set([1, 2, 3, 4, 7, 14, 21])
      const faltaRegistro = !registrouHoje && diasSem <= 21 && DIAS_ENVIO.has(diasSem)

      // Verifica risco desta categoria não alertada nos últimos 7 dias
      let riscoCategoria: PreditivaRow | null = null
      if (predRisco.length > 0) {
        for (const row of predRisco) {
          const { data: alertRecente } = await supabase
            .from('category_alerts_sent')
            .select('id')
            .eq('casal_id', casal.id)
            .eq('categoria_id', row.categoria_id)
            .gte('sent_at', new Date(Date.now() - 7 * 86400 * 1000).toISOString())
            .limit(1)

          if ((alertRecente ?? []).length === 0) {
            // Escolhe a de maior risco (maior projecao - meta)
            if (!riscoCategoria) {
              riscoCategoria = row
            } else {
              const diffAtual  = (riscoCategoria.projecao ?? 0) - (riscoCategoria.meta ?? 0)
              const diffNovo   = (row.projecao ?? 0) - (row.meta ?? 0)
              if (diffNovo > diffAtual) riscoCategoria = row
            }
          }
        }
      }

      const temRisco = riscoCategoria !== null

      if (!temRisco && !faltaRegistro) {
        console.log(`[daily-push] usuário ${userId} — sem sinal (registrou hoje: ${registrouHoje}) — pulado`)
        pulados++
        continue
      }

      // Gera texto
      const ultimoLembrete = userSubs[0]?.ultimo_lembrete ?? null
      let body: string
      let tipoLog: string

      if (temRisco && faltaRegistro) {
        body    = await textoRiscoFalta(riscoCategoria!, diasSem, diaSemana, baldes, ultimoLembrete, apelidos)
        tipoLog = 'risco+falta'
      } else if (temRisco) {
        body    = await textoRisco(riscoCategoria!, diaSemana, baldes, ultimoLembrete, apelidos)
        tipoLog = 'risco'
      } else {
        body    = await textoFaltaUso(diasSem, diaSemana, diasRestantes, baldes, ultimoLembrete, apelidos)
        tipoLog = 'falta_uso'
      }

      // Envia push para todos os devices do usuário
      await enviarPush(
        userSubs.map(s => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
        body,
        temRisco ? '/resumo' : '/?modal=novo-gasto',
        supabase,
      )

      // Marca idempotência + anti-repetição
      for (const sub of userSubs) {
        await supabase
          .from('push_subscriptions')
          .update({ notificado_em: hojeStr, ultimo_lembrete: body })
          .eq('id', sub.id)
      }

      // Registra alerta de risco no dedup
      if (temRisco && riscoCategoria) {
        try {
          await supabase
            .from('category_alerts_sent')
            .insert({
              casal_id:     casal.id,
              categoria_id: riscoCategoria.categoria_id,
              mes,
              ano,
              nivel: riscoCategoria.status,
            })
        } catch {
          // ignorado — race condition aceitável
        }
      }

      enviados++
      console.log(`[daily-push] ✓ ${userId} — tipo: ${tipoLog}`)
    }
  }

  const resumo = { enviados, pulados, hora, hojeStr }
  console.log('[daily-push] concluído —', JSON.stringify(resumo))
  return new Response(JSON.stringify(resumo), { headers: { 'Content-Type': 'application/json' } })
})
