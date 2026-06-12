import { createAdminClient } from '../supabase/admin'
import { sendPushToSubs } from '../push/send-server'
import { calcularPreditiva } from '../preditiva'

function hojeBRT() {
  const s = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const [y, m, d] = s.split('-').map(Number)
  return { ano: y, mes: m, diaAtual: d, diasNoMes: new Date(y, m, 0).getDate() }
}

function horaHojeBRT(): number {
  return parseInt(
    new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }),
    10,
  )
}

const ALERTA_VAI_ESTOURAR = [
  '{emoji} Eita, {cat} tá voando 😅 No ritmo fecha em {projecao}, uns {diff} acima da meta. Bora maneirar?',
  '{emoji} Psiu… {cat} acelerou. Projeção do mês: {projecao} ({diff} acima). Segura essa? 👀',
  '{emoji} {cat} tá empolgada esse mês, hein. Do jeito que vai, {projecao} — {diff} além da meta.',
]
const ALERTA_ESTOUROU = [
  '{emoji} Ó… {cat} passou da meta de {meta} (já em {gasto}). Faltam {dias} dias — bora compensar no resto? 😬',
  '{emoji} {cat} estourou a meta, mas relaxa: ainda dá pra equilibrar o mês. Tá em {gasto} de {meta}.',
  '{emoji} A meta de {cat} foi de base 🙈 {gasto} de {meta}. Resto do mês a gente segura?',
]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fmt(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

function montarTexto(
  nivel: 'vai_estourar' | 'estourou',
  emoji: string, cat: string,
  projecao: number, meta: number, gasto: number, diasRestantes: number,
): string {
  const diff = projecao - meta
  const template = pick(nivel === 'vai_estourar' ? ALERTA_VAI_ESTOURAR : ALERTA_ESTOUROU)
  return template
    .replace('{emoji}', emoji)
    .replace('{cat}',   cat)
    .replace('{projecao}', fmt(projecao))
    .replace('{diff}',     fmt(diff))
    .replace('{meta}',     fmt(meta))
    .replace('{gasto}',    fmt(gasto))
    .replace('{dias}',     String(diasRestantes))
}

export async function dispararAlertaSeCruzou(
  casalId:     string,
  categoriaId: number,
): Promise<void> {
  const { ano, mes, diaAtual, diasNoMes } = hojeBRT()

  // Quiet hours: só envia entre 08:00 e 22:00 BRT
  const hora = horaHojeBRT()
  if (hora < 8 || hora >= 22) return

  const mesStr  = `${ano}-${String(mes).padStart(2, '0')}-01`
  const admin   = createAdminClient()

  // Busca gastos acumulados da categoria no mês corrente
  const { data: gastosData } = await admin
    .from('v_gastos_por_categoria_mes')
    .select('total_centavos')
    .eq('casal_id', casalId)
    .eq('categoria_id', categoriaId)
    .eq('mes', mesStr)
    .maybeSingle()

  const gastoAcumulado = (gastosData as { total_centavos: number } | null)?.total_centavos ?? 0

  // Busca meta da categoria no mês corrente
  const { data: metaData } = await admin
    .from('spending_goals')
    .select('valor_centavos, categories!inner(nome, emoji)')
    .eq('casal_id', casalId)
    .eq('categoria_id', categoriaId)
    .eq('mes', mes)
    .eq('ano', ano)
    .maybeSingle()

  if (!metaData) return  // sem meta → sem alerta

  const metaRaw = metaData as unknown as {
    valor_centavos: number
    categories: { nome: string; emoji: string }[] | { nome: string; emoji: string }
  }
  const catInfo = Array.isArray(metaRaw.categories) ? metaRaw.categories[0] : metaRaw.categories
  if (!catInfo) return
  const meta  = metaRaw.valor_centavos
  const nome  = catInfo.nome
  const emoji = catInfo.emoji

  // Calcula status atual
  const [pred] = calcularPreditiva({
    diaAtual, diasNoMes,
    categorias: [{ categoriaId, nome, emoji, gastoAcumulado, meta, historico: [] }],
  })

  const nivel = pred.status === 'estourou'     ? 'estourou'
              : pred.status === 'vai_estourar' ? 'vai_estourar'
              : null

  if (!nivel) return

  // Dedup: verifica se este nível já foi enviado este mês
  const { data: jaEnviado } = await admin
    .from('category_alerts_sent')
    .select('id')
    .eq('casal_id', casalId)
    .eq('categoria_id', categoriaId)
    .eq('mes', mes)
    .eq('ano', ano)
    .eq('nivel', nivel)
    .maybeSingle()

  if (jaEnviado) return

  // Monta texto e busca subscriptions do casal
  const diasRestantes = diasNoMes - diaAtual
  const body = montarTexto(nivel, emoji, nome, pred.projecao, meta, gastoAcumulado, diasRestantes)

  const { data: membros } = await admin
    .from('casal_membros')
    .select('user_id')
    .eq('casal_id', casalId)

  const userIds = ((membros ?? []) as { user_id: string }[]).map(m => m.user_id)
  if (userIds.length === 0) return

  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('user_id', userIds)
    .eq('ativo', true)

  if (subs && subs.length > 0) {
    await sendPushToSubs(subs as { endpoint: string; p256dh: string; auth: string }[], {
      title: '💚 Nosso DinDin',
      body,
      url: '/resumo',
    })
  }

  // Registra para dedup (ignora conflito de UNIQUE — pode ter sido inserido em paralelo)
  try {
    await admin
      .from('category_alerts_sent')
      .insert({ casal_id: casalId, categoria_id: categoriaId, mes, ano, nivel })
  } catch {
    // conflito de UNIQUE esperado em caso de race condition — ok
  }
}
