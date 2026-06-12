/**
 * Edge Function: daily-push
 *
 * Roda às 22:00 BRT (01:00 UTC) todos os dias.
 * Para cada usuário com push subscription ativa que NÃO registrou
 * nenhum gasto hoje, envia um lembrete inteligente — variado por
 * quantos dias a pessoa está sem registrar, dia da semana e fase do mês.
 *
 * Backoff sumiço: se diasSemRegistrar >= 7 e o número for par, pula
 * para não saturar o usuário.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push'

type PushSub = {
  user_id: string
  endpoint: string
  p256dh:   string
  auth:     string
}

// ── Fallback (usado quando o banco não responde) ─────────────────
const DEFAULT_BALDES: Record<string, string[]> = {
  'falta_uso.7d': [
    '7 dias sem registrar nada 👀 Sua conta vai estourar e depois não vem dizer que não avisei, hein 😏',
    'Tá namorando o esquecimento? Uma semana sem lançar. Bora antes que vire bagunça 🙃',
    'O DinDin sumiu do radar ou foi você? Bora retomar antes de perder o fio 🧵',
  ],
  'falta_uso.14d': [
    '2 semanas sem registrar… tudo bem? Um lançamento rápido já ajuda a manter o controle 🙏',
    'Quinze dias sem abrir o app. O dinheiro não para, mas a gente pode parar de perder o rastro 📊',
    'Ei, sumiço de 2 semanas. Não precisa registrar tudo — começa pelo de hoje 💪',
  ],
  'falta_uso.21d': [
    'Três semanas por aí… que tal uma reconstrução rápida? O DinDin não julga, só ajuda 💚',
    'Olha, 21 dias. Que tal começar de novo hoje? Esquece o passado, registra o presente 🌱',
    'Último empurrão: bora retomar de onde parou? Três toques e o gasto entra 🚀',
  ],
  'diario.fechamento': [
    'Reta final do mês! Bora fechar tudo registrado pra não ter surpresa? 🏁',
    'Últimos dias do mês — bora não deixar nada pra trás antes do acerto?',
    'Faltam poucos dias pro fechamento. Tem gasto esquecido aí?',
  ],
  'diario.recomeco': [
    'Semana nova! Bora começar registrando certinho? 💪',
    'Segunda-feira, cabeça nova. Mantém o DinDin atualizado essa semana?',
    'Novo começo de semana. Que tal começar com os lançamentos em dia?',
  ],
  'diario.fim_de_semana': [
    'Sextou! Os rolês de hoje já entraram no DinDin? 👀',
    'Sábado é fácil o dinheiro sumir sem ninguém ver. Registrou?',
    'Final de semana chegou — e os gastos também. Não esquece de anotar 😉',
  ],
  'diario.balanco': [
    'Domingo de fechar a conta: a semana toda entrou no app?',
    'Último dia da semana — confere lá se está tudo registrado antes de dormir.',
  ],
  'diario.neutro': [
    'Psiu… cadê os gastos de hoje? 👀',
    'Dia sem gastos ou alguém esqueceu de anotar? 😏',
    'Bora lançar os perrengues de hoje antes de dormir?',
    'O DinDin tá de olho 👀 Registrou os gastos de hoje?',
    'Tudo quieto por aqui… foi day off da carteira ou esquecimento?',
  ],
}

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function carregarBaldes(
  supabase: ReturnType<typeof createClient>
): Promise<Record<string, string[]>> {
  const chaves = Object.keys(DEFAULT_BALDES)
  try {
    const { data } = await supabase
      .from('message_templates')
      .select('chave, variacoes')
      .in('chave', chaves)
      .eq('ativo', true)
    const result: Record<string, string[]> = {}
    for (const row of (data ?? []) as { chave: string; variacoes: string[] }[]) {
      if (row.variacoes?.length > 0) result[row.chave] = row.variacoes
    }
    return result
  } catch {
    return {}
  }
}

function selecionarLembrete(
  diasSemRegistrar: number,
  diaSemana: number,
  diasRestantes: number,
  baldes: Record<string, string[]>,
): string {
  const get = (chave: string) => {
    const arr = baldes[chave] ?? DEFAULT_BALDES[chave] ?? ['Não esqueça de registrar seus gastos!']
    return pick(arr)
  }

  if (diasSemRegistrar >= 21) return get('falta_uso.21d')
  if (diasSemRegistrar >= 14) return get('falta_uso.14d')
  if (diasSemRegistrar >= 7)  return get('falta_uso.7d')
  if (diasRestantes   <= 3)   return get('diario.fechamento')
  if (diaSemana       === 1)  return get('diario.recomeco')
  if (diaSemana === 5 || diaSemana === 6) return get('diario.fim_de_semana')
  if (diaSemana       === 0)  return get('diario.balanco')
  return get('diario.neutro')
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

  // ── Carrega templates (fallback silencioso) ───────────────────
  const baldes = await carregarBaldes(supabase)
  console.log('[daily-push] templates carregados do banco:', Object.keys(baldes).length, 'chaves')

  // ── Data atual em BRT (UTC-3) ─────────────────────────────────
  const agora = new Date()
  const brt   = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  const year  = brt.getUTCFullYear()
  const month = String(brt.getUTCMonth() + 1).padStart(2, '0')
  const day   = String(brt.getUTCDate()).padStart(2, '0')
  const hoje  = `${year}-${month}-${day}`

  const diaSemana     = brt.getUTCDay()
  const diasNoMes     = new Date(Date.UTC(year, brt.getUTCMonth() + 1, 0)).getUTCDate()
  const diasRestantes = diasNoMes - brt.getUTCDate()

  console.log(`[daily-push] iniciando — data BRT: ${hoje} (dia semana ${diaSemana}, restam ${diasRestantes} dias)`)

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

    // Busca o gasto mais recente até hoje (checa registro de hoje + diasSemRegistrar)
    const { data: recentExp, error: expError } = await supabase
      .from('expenses')
      .select('data_compra')
      .eq('pagador_id', userId)
      .lte('data_compra', hoje)
      .order('data_compra', { ascending: false })
      .limit(1)

    if (expError) {
      console.error(`[daily-push] erro ao verificar expenses (${userId}):`, expError.message)
      erros++
      continue
    }

    const lastDate = recentExp?.[0]?.data_compra ?? null

    // Já registrou hoje → pula
    if (lastDate === hoje) {
      console.log(`[daily-push] usuário ${userId} já tem gasto hoje — pulado`)
      pulados++
      continue
    }

    // Calcula há quantos dias está sem registrar
    const diasSemRegistrar = lastDate
      ? Math.round((new Date(hoje).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
      : 999

    // Cadência estrita: envia apenas nos dias 1,2,3,4,7,14,21 de silêncio; dorme após 21.
    const DIAS_ENVIO = new Set([1, 2, 3, 4, 7, 14, 21])
    const diasCheck  = Math.min(diasSemRegistrar, 999)  // 999 = nunca registrou → > 21 → dorme
    if (diasCheck > 21 || !DIAS_ENVIO.has(diasCheck)) {
      console.log(`[daily-push] usuário ${userId} em silêncio (${diasSemRegistrar}d) — pulado`)
      pulados++
      continue
    }

    const body     = selecionarLembrete(diasSemRegistrar, diaSemana, diasRestantes, baldes)
    const userSubs = byUser.get(userId)!

    for (const sub of userSubs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: '💚 Nosso DinDin',
            body,
            url:   '/?modal=novo-gasto',
          })
        )
        enviados++
        console.log(`[daily-push] ✓ push enviado — usuário ${userId} (${diasSemRegistrar}d sem registrar)`)
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
