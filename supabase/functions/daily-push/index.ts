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

// ── Baldes de mensagens ──────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const BALDES = {
  sumico: [
    '7 dias sem registrar nada 👀 Sua conta vai estourar e depois não vem dizer que não avisei, hein 😏',
    'Tá namorando o esquecimento? Uma semana sem lançar. Bora antes que vire bagunça 🙃',
    'O DinDin sumiu do radar ou foi você? Bora retomar antes de perder o fio 🧵',
  ],
  fechamento: [
    'Reta final do mês! Bora fechar tudo registrado pra não ter surpresa? 🏁',
    'Últimos dias do mês — bora não deixar nada pra trás antes do acerto?',
    'Faltam poucos dias pro fechamento. Tem gasto esquecido aí?',
  ],
  recomeco: [
    'Semana nova! Bora começar registrando certinho? 💪',
    'Segunda-feira, cabeça nova. Mantém o DinDin atualizado essa semana?',
    'Novo começo de semana. Que tal começar com os lançamentos em dia?',
  ],
  fimDeSemana: [
    'Sextou! Os rolês de hoje já entraram no DinDin? 👀',
    'Sábado é fácil o dinheiro sumir sem ninguém ver. Registrou?',
    'Final de semana chegou — e os gastos também. Não esquece de anotar 😉',
  ],
  balanco: [
    'Domingo de fechar a conta: a semana toda entrou no app?',
    'Último dia da semana — confere lá se está tudo registrado antes de dormir.',
  ],
  neutro: [
    'Psiu… cadê os gastos de hoje? 👀',
    'Dia sem gastos ou alguém esqueceu de anotar? 😏',
    'Bora lançar os perrengues de hoje antes de dormir?',
    'O DinDin tá de olho 👀 Registrou os gastos de hoje?',
    'Tudo quieto por aqui… foi day off da carteira ou esquecimento?',
  ],
}

function selecionarLembrete(diasSemRegistrar: number, diaSemana: number, diasRestantes: number): string {
  if (diasSemRegistrar >= 7)               return pick(BALDES.sumico)
  if (diasRestantes   <= 3)                return pick(BALDES.fechamento)
  if (diaSemana       === 1)               return pick(BALDES.recomeco)
  if (diaSemana === 5 || diaSemana === 6)  return pick(BALDES.fimDeSemana)
  if (diaSemana       === 0)               return pick(BALDES.balanco)
  return pick(BALDES.neutro)
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

    // Backoff sumiço: >= 7 dias sem registrar, só envia nos dias ímpares
    if (diasSemRegistrar >= 7 && diasSemRegistrar % 2 === 0) {
      console.log(`[daily-push] usuário ${userId} em sumiço (${diasSemRegistrar}d) — backoff par, pulado`)
      pulados++
      continue
    }

    const body     = selecionarLembrete(diasSemRegistrar, diaSemana, diasRestantes)
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
