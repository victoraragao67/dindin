'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCasal } from '@/lib/supabase/get-casal'
import { todayBRTStr } from '@/lib/date'
import { sendPushToSubs } from '@/lib/push/send-server'

// ── Schemas ───────────────────────────────────────────────────

const NovoGastoSchema = z.object({
  valor_total_centavos: z
    .number()
    .int('Valor deve ser inteiro (centavos)')
    .positive('Valor deve ser maior que zero')
    .max(5_000_000, 'Valor muito alto (máximo R$ 50.000)'),
  categoria_id: z.number().int().positive('Categoria inválida'),
  pagador_apelido: z.string().min(1, 'Pagador obrigatório'),
  parcelas: z.number().int().min(1).max(24).default(1),
  divisao: z.enum(['50_50', 'so_pagador', 'so_outro', 'customizada']).default('50_50'),
  split_pagador_pct: z.number().min(0).max(100).nullable().default(null),
  data_compra: z.string().nullable().default(null),
  descricao: z.string().max(200).nullable().default(null),
})

const RecorrenteSchema = z.object({
  categoria_id: z.number().int().positive('Categoria inválida'),
  valor_centavos: z.number().int().positive().max(5_000_000),
  descricao: z.string().min(1, 'Descrição obrigatória para recorrentes').max(200),
  pagador_apelido: z.string().min(1, 'Pagador obrigatório'),
  divisao: z.enum(['50_50', 'so_pagador', 'so_outro', 'customizada']).default('50_50'),
  split_pagador_pct: z.number().min(0).max(100).nullable().default(null),
  dia_do_mes: z.number().int().min(1).max(28),
})

export type NovoGastoInput   = z.infer<typeof NovoGastoSchema>
export type RecorrenteInput  = z.infer<typeof RecorrenteSchema>
export type ActionResult     = { data: { id: string }; error?: never } | { error: string; data?: never }

// ── Helper ────────────────────────────────────────────────────

async function resolverPagadorId(apelido: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('apelido', apelido)
    .single()
  if (error || !data) return null
  return data.id as string
}

// ── Gastos ────────────────────────────────────────────────────

export async function criarGasto(input: NovoGastoInput): Promise<ActionResult> {
  const parsed = NovoGastoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { valor_total_centavos, categoria_id, pagador_apelido, parcelas, divisao, split_pagador_pct, data_compra, descricao } = parsed.data

  if (divisao === 'customizada' && split_pagador_pct === null) {
    return { error: 'Informe o percentual para divisão customizada' }
  }

  const casal = await getCasal()
  if (!casal.casalId || casal.status !== 'active') return { error: 'Nenhum casal ativo.' }

  const pagadorId = await resolverPagadorId(pagador_apelido)
  if (!pagadorId) return { error: 'Usuário não encontrado.' }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      pagador_id: pagadorId,
      categoria_id,
      valor_total_centavos,
      parcelas,
      divisao,
      split_pagador_pct: divisao === 'customizada' ? split_pagador_pct : null,
      data_compra: data_compra ?? todayBRTStr(),
      descricao: descricao || null,
      origem: 'pwa',
      casal_id: casal.casalId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[criarGasto]', error.message)
    return { error: 'Erro ao salvar gasto. Tente novamente.' }
  }

  revalidatePath('/')

  // Notifica o parceiro (fire-and-forget — não bloqueia a resposta)
  const parceiroId = casal.parceiro?.id
  if (parceiroId) {
    notifyParceiro(supabase, parceiroId, pagador_apelido, categoria_id).catch(
      err => console.error('[criarGasto] notifyParceiro falhou:', err)
    )
  }

  return { data: { id: data.id } }
}

/** Envia push ao parceiro: "[Apelido] registrou em 🍔 Alimentação" */
async function notifyParceiro(
  supabase: ReturnType<typeof createClient>,
  parceiroId: string,
  pagadorApelido: string,
  categoriaId: number,
) {
  // Busca categoria e subscriptions do parceiro em paralelo
  const [catRes, subsRes] = await Promise.all([
    supabase
      .from('categories')
      .select('nome, emoji')
      .eq('id', categoriaId)
      .single(),
    supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', parceiroId)
      .eq('ativo', true),
  ])

  const cat  = catRes.data  as { nome: string; emoji: string } | null
  const subs = subsRes.data as { endpoint: string; p256dh: string; auth: string }[] | null

  if (!cat || !subs || subs.length === 0) return

  await sendPushToSubs(subs, {
    title: '💸 Novo gasto registrado',
    body:  `${pagadorApelido} registrou em ${cat.emoji} ${cat.nome}`,
    url:   '/gastos',
  })
}

export async function atualizarGasto(id: string, input: NovoGastoInput): Promise<ActionResult> {
  const parsed = NovoGastoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { valor_total_centavos, categoria_id, pagador_apelido, parcelas, divisao, split_pagador_pct, data_compra, descricao } = parsed.data

  if (divisao === 'customizada' && split_pagador_pct === null) {
    return { error: 'Informe o percentual para divisão customizada' }
  }

  const casal = await getCasal()
  if (!casal.casalId || casal.status !== 'active') return { error: 'Nenhum casal ativo.' }

  const pagadorId = await resolverPagadorId(pagador_apelido)
  if (!pagadorId) return { error: 'Usuário não encontrado.' }

  const supabase = createClient()

  // Cancela o expense atual e cria um novo (recria as installments via trigger)
  const { error: cancelErr } = await supabase
    .from('expenses')
    .update({ cancelado: true })
    .eq('id', id)

  if (cancelErr) return { error: 'Erro ao cancelar gasto original.' }

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      pagador_id: pagadorId,
      categoria_id,
      valor_total_centavos,
      parcelas,
      divisao,
      split_pagador_pct: divisao === 'customizada' ? split_pagador_pct : null,
      data_compra: data_compra ?? todayBRTStr(),
      descricao: descricao || null,
      origem: 'pwa',
      casal_id: casal.casalId,
    })
    .select('id')
    .single()

  if (error) {
    // Reverte o cancelamento se a recriação falhou
    await supabase.from('expenses').update({ cancelado: false }).eq('id', id)
    console.error('[atualizarGasto]', error.message)
    return { error: 'Erro ao salvar alterações. Tente novamente.' }
  }

  revalidatePath('/')
  return { data: { id: data.id } }
}

export async function cancelarGasto(id: string): Promise<ActionResult> {
  const supabase = createClient()
  const { error } = await supabase
    .from('expenses')
    .update({ cancelado: true })
    .eq('id', id)

  if (error) {
    console.error('[cancelarGasto]', error.message)
    return { error: 'Erro ao excluir gasto.' }
  }

  revalidatePath('/')
  return { data: { id } }
}

// ── Recorrentes ───────────────────────────────────────────────

export async function criarRecorrente(input: RecorrenteInput): Promise<ActionResult> {
  const parsed = RecorrenteSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { categoria_id, valor_centavos, descricao, pagador_apelido, divisao, split_pagador_pct, dia_do_mes } = parsed.data

  if (divisao === 'customizada' && split_pagador_pct === null) {
    return { error: 'Informe o percentual para divisão customizada' }
  }

  const casal = await getCasal()
  if (!casal.casalId || casal.status !== 'active') return { error: 'Nenhum casal ativo.' }

  const pagadorId = await resolverPagadorId(pagador_apelido)
  if (!pagadorId) return { error: 'Usuário não encontrado.' }

  const supabase = createClient()
  const { data, error } = await supabase
    .from('recurring_templates')
    .insert({
      pagador_id: pagadorId,
      categoria_id,
      valor_centavos,
      descricao,
      divisao,
      split_pagador_pct: divisao === 'customizada' ? split_pagador_pct : null,
      dia_do_mes,
      casal_id: casal.casalId,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[criarRecorrente]', error.message)
    return { error: 'Erro ao salvar recorrente. Tente novamente.' }
  }

  revalidatePath('/recorrentes')
  return { data: { id: data.id } }
}

export async function editarRecorrente(id: string, input: RecorrenteInput): Promise<ActionResult> {
  const parsed = RecorrenteSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { categoria_id, valor_centavos, descricao, pagador_apelido, divisao, split_pagador_pct, dia_do_mes } = parsed.data

  const pagadorId = await resolverPagadorId(pagador_apelido)
  if (!pagadorId) return { error: 'Usuário não encontrado.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('recurring_templates')
    .update({
      pagador_id: pagadorId,
      categoria_id,
      valor_centavos,
      descricao,
      divisao,
      split_pagador_pct: divisao === 'customizada' ? split_pagador_pct : null,
      dia_do_mes,
    })
    .eq('id', id)

  if (error) {
    console.error('[editarRecorrente]', error.message)
    return { error: 'Erro ao editar recorrente.' }
  }

  revalidatePath('/recorrentes')
  return { data: { id } }
}

export async function toggleRecorrente(id: string, ativo: boolean): Promise<ActionResult> {
  const supabase = createClient()
  const { error } = await supabase
    .from('recurring_templates')
    .update({ ativo })
    .eq('id', id)

  if (error) return { error: 'Erro ao atualizar recorrente.' }

  revalidatePath('/recorrentes')
  return { data: { id } }
}

export async function removerRecorrente(id: string): Promise<ActionResult> {
  const supabase = createClient()
  const { error } = await supabase
    .from('recurring_templates')
    .delete()
    .eq('id', id)

  if (error) return { error: 'Erro ao remover recorrente.' }

  revalidatePath('/recorrentes')
  return { data: { id } }
}

// ── Acertos (transferências) ──────────────────────────────────

const AcertoSchema = z.object({
  de_apelido:     z.string().min(1, 'Pagador obrigatório'),
  para_apelido:   z.string().min(1, 'Recebedor obrigatório'),
  valor_centavos: z.number().int().positive().max(5_000_000),
  data:           z.string().date(),
  nota:           z.string().max(200).nullable().default(null),
}).refine(d => d.de_apelido !== d.para_apelido, {
  message: 'De e Para não podem ser a mesma pessoa',
})

export type AcertoInput = z.infer<typeof AcertoSchema>

// ── Metas de gasto ───────────────────────────────────────────

export async function salvarMeta(
  categoriaId: number,
  valorCentavos: number,
  mes: number,
  ano: number,
): Promise<ActionResult> {
  const casal = await getCasal()
  if (!casal.casalId || casal.status !== 'active') return { error: 'Nenhum casal ativo.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Upsert sem .single() — com RLS + update-on-conflict, PostgREST pode
  // não retornar a row, fazendo .single() lançar exceção. Usamos .select()
  // normal e pegamos o primeiro elemento (ou null se vazio).
  const { data, error } = await supabase
    .from('spending_goals')
    .upsert(
      { categoria_id: categoriaId, valor_centavos: valorCentavos, mes, ano, created_by: user?.id ?? null, casal_id: casal.casalId },
      { onConflict: 'categoria_id,mes,ano' },
    )
    .select('id')

  if (error) {
    console.error('[salvarMeta]', error.message)
    return { error: 'Erro ao salvar meta. Tente novamente.' }
  }

  revalidatePath('/metas')
  revalidatePath('/resumo')
  return { data: { id: data?.[0]?.id ?? null } }
}

// ── Tema ─────────────────────────────────────────────────────

export async function updateTema(tema: 'light' | 'dark'): Promise<ActionResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Usuário não autenticado.' }

  const { error } = await supabase
    .from('users')
    .update({ tema })
    .eq('email', user.email)

  if (error) {
    console.error('[updateTema]', error.message)
    return { error: 'Erro ao salvar preferência de tema.' }
  }

  revalidatePath('/', 'layout')
  return { data: { id: 'tema' } }
}

export async function removerMeta(categoriaId: number, mes: number, ano: number): Promise<ActionResult> {
  const supabase = createClient()
  const { error } = await supabase
    .from('spending_goals')
    .delete()
    .eq('categoria_id', categoriaId)
    .eq('mes', mes)
    .eq('ano', ano)

  if (error) {
    console.error('[removerMeta]', error.message)
    return { error: 'Erro ao remover meta.' }
  }

  revalidatePath('/metas')
  revalidatePath('/resumo')
  return { data: { id: `${categoriaId}-${mes}-${ano}` } }
}

export async function copiarMetasMesAnterior(mes: number, ano: number): Promise<ActionResult> {
  const casal = await getCasal()
  if (!casal.casalId || casal.status !== 'active') return { error: 'Nenhum casal ativo.' }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Calcular mês anterior
  const mesAnt = mes === 1 ? 12 : mes - 1
  const anoAnt = mes === 1 ? ano - 1 : ano

  // Buscar metas do mês anterior
  const { data: metasAnt, error: errBusca } = await supabase
    .from('spending_goals')
    .select('categoria_id, valor_centavos')
    .eq('mes', mesAnt)
    .eq('ano', anoAnt)

  if (errBusca) return { error: 'Erro ao buscar metas anteriores.' }
  if (!metasAnt || metasAnt.length === 0) return { error: 'Nenhuma meta no mês anterior.' }

  // Upsert todas no mês atual
  const rows = (metasAnt as { categoria_id: number; valor_centavos: number }[]).map(m => ({
    categoria_id: m.categoria_id,
    valor_centavos: m.valor_centavos,
    mes,
    ano,
    created_by: user?.id ?? null,
    casal_id: casal.casalId,
  }))

  const { error: errUpsert } = await supabase
    .from('spending_goals')
    .upsert(rows, { onConflict: 'categoria_id,mes,ano' })

  if (errUpsert) {
    console.error('[copiarMetasMesAnterior]', errUpsert.message)
    return { error: 'Erro ao copiar metas.' }
  }

  revalidatePath('/metas')
  revalidatePath('/resumo')
  return { data: { id: `copied-${mesAnt}-${anoAnt}` } }
}

// ── Acerto (transfer) ────────────────────────────────────────

export async function registrarAcerto(input: {
  de_apelido:     string
  para_apelido:   string
  valor_centavos: number
  data:           string
  nota:           string | null
}): Promise<ActionResult> {
  const { de_apelido, para_apelido, valor_centavos, data, nota } = input

  if (valor_centavos <= 0) return { error: 'Valor deve ser maior que zero.' }

  const [deId, paraId] = await Promise.all([
    resolverPagadorId(de_apelido),
    resolverPagadorId(para_apelido),
  ])

  if (!deId)   return { error: `Usuário "${de_apelido}" não encontrado.` }
  if (!paraId) return { error: `Usuário "${para_apelido}" não encontrado.` }

  const supabase = createClient()
  const { data: inserted, error } = await supabase
    .from('transfers')
    .insert({ de_id: deId, para_id: paraId, valor_centavos, data, nota: nota || null })
    .select('id')
    .single()

  if (error) {
    console.error('[registrarAcerto]', error.message)
    return { error: 'Erro ao registrar acerto.' }
  }

  revalidatePath('/')
  revalidatePath('/acerto')
  return { data: { id: inserted.id } }
}

// ── Rebalancear recorrentes ───────────────────────────────────

/**
 * Transfere os templates selecionados para o novo pagador.
 * "Transferir" = atualizar pagador_id nos recurring_templates indicados.
 */
export async function rebalancearRecorrentes(
  templateIds: string[],
  novoPagadorId: string,
): Promise<{ error?: string }> {
  if (templateIds.length === 0) return {}

  const casal = await getCasal()
  if (!casal.casalId || casal.status !== 'active') return { error: 'Nenhum casal ativo.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('recurring_templates')
    .update({ pagador_id: novoPagadorId })
    .in('id', templateIds)

  if (error) {
    console.error('[rebalancearRecorrentes]', error.message)
    return { error: 'Erro ao rebalancear recorrentes. Tente novamente.' }
  }

  revalidatePath('/recorrentes')
  revalidatePath('/')
  return {}
}

