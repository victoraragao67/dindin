import { createAdminClient } from '../supabase/admin'
import { sendPushToSubs } from '../push/send-server'
import { calcularPreditiva } from '../preditiva'
import { getTemplateRaw } from '../copy/get-template'

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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fmt(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
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

  // Busca gastos variáveis acumulados + recorrente previsto da categoria no mês corrente
  const [{ data: gastosData }, { data: recorrentesData }, { data: metaData }] = await Promise.all([
    admin
      .from('v_gastos_por_categoria_mes')
      .select('total_centavos')
      .eq('casal_id', casalId)
      .eq('categoria_id', categoriaId)
      .eq('mes', mesStr)
      .maybeSingle(),
    admin
      .from('recurring_templates')
      .select('valor_centavos')
      .eq('casal_id', casalId)
      .eq('categoria_id', categoriaId)
      .eq('ativo', true),
    admin
      .from('spending_goals')
      .select('valor_centavos, categories!inner(nome, emoji)')
      .eq('casal_id', casalId)
      .eq('categoria_id', categoriaId)
      .eq('mes', mes)
      .eq('ano', ano)
      .maybeSingle(),
  ])

  if (!metaData) return  // sem meta → sem alerta

  const gastoVariavel      = (gastosData as { total_centavos: number } | null)?.total_centavos ?? 0
  const recorrentePrevisto = ((recorrentesData ?? []) as { valor_centavos: number }[])
    .reduce((s, r) => s + r.valor_centavos, 0)

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
    categorias: [{ categoriaId, nome, emoji, gastoVariavel, recorrentePrevisto, meta, histVariavel: [], histTotal: [] }],
  })

  const nivel = pred.status === 'estourou'     ? 'estourou'
              : pred.status === 'vai_estourar' ? 'vai_estourar'
              : null

  if (!nivel) return
  if (pred.projecao === null) return  // cold start sem âncora — não há projeção para o texto

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
  const chaveTemplate = nivel === 'vai_estourar' ? 'risco.vai_estourar' : 'risco.estourou'
  const templates = await getTemplateRaw(chaveTemplate)
  const template  = pick(templates)
  const body = template
    .replace('{emoji}',    emoji)
    .replace('{cat}',      nome)
    .replace('{projecao}', fmt(pred.projecao!))
    .replace('{diff}',     fmt(pred.projecao! - meta))
    .replace('{meta}',     fmt(meta))
    .replace('{gasto}',    fmt(pred.gastoAcumulado))
    .replace('{dias}',     String(diasRestantes))

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
