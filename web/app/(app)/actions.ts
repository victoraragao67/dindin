'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCasal } from '@/lib/supabase/get-casal'
import { todayBRTStr } from '@/lib/date'

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
  return { data: { id: data.id } }
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

// ── Casal ────────────────────────────────────────────────────

export async function renomearCasal(nome: string): Promise<{ error?: string }> {
  const nomeTrimmed = nome.trim().slice(0, 50)

  const casal = await getCasal()
  if (!casal.casalId || casal.status !== 'active') return { error: 'Nenhum casal ativo.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('casais')
    .update({ nome: nomeTrimmed || null })
    .eq('id', casal.casalId)

  if (error) return { error: 'Erro ao salvar. Tente novamente.' }

  revalidatePath('/config/casal')
  return {}
}

// ── Categorias do casal ──────────────────────────────────────
// O casal é dono das próprias linhas de categoria (RLS: is_casal_member).
// Desativar preserva o histórico; some apenas dos formulários de entrada.

const CategoriaCasalSchema = z.object({
  nome:  z.string().trim().min(1, 'Nome obrigatório').max(30, 'Nome muito longo (máx. 30).'),
  emoji: z.string().trim().min(1, 'Emoji obrigatório').max(8),
})

/** Revalida todas as telas que listam categorias. */
function revalidarCategorias() {
  revalidatePath('/config/categorias')
  revalidatePath('/')
  revalidatePath('/metas')
  revalidatePath('/gastos')
  revalidatePath('/recorrentes')
  revalidatePath('/resumo')
}

export async function criarCategoria(nome: string, emoji: string): Promise<{ error?: string }> {
  const parsed = CategoriaCasalSchema.safeParse({ nome, emoji })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }

  const casal = await getCasal()
  if (!casal.casalId || casal.status !== 'active') return { error: 'Nenhum casal ativo.' }

  const supabase = createClient()

  // Próxima ordem = maior ordem do casal + 1
  const { data: last } = await supabase
    .from('categories')
    .select('ordem')
    .eq('casal_id', casal.casalId)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const proximaOrdem = ((last as { ordem: number } | null)?.ordem ?? 0) + 1

  const { error } = await supabase
    .from('categories')
    .insert({
      nome:     parsed.data.nome,
      emoji:    parsed.data.emoji,
      aliases:  [],
      ordem:    proximaOrdem,
      ativo:    true,
      casal_id: casal.casalId,
      padrao:   false,   // categoria do casal — nome e ícone editáveis
    })

  if (error) {
    if (error.code === '23505') return { error: 'Já existe uma categoria com esse nome.' }
    console.error('[criarCategoria]', error.message)
    return { error: 'Erro ao criar categoria. Tente novamente.' }
  }

  revalidarCategorias()
  return {}
}

export async function toggleCategoria(id: number, ativo: boolean): Promise<{ error?: string }> {
  const casal = await getCasal()
  if (!casal.casalId || casal.status !== 'active') return { error: 'Nenhum casal ativo.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('categories')
    .update({ ativo })
    .eq('id', id)
    .eq('casal_id', casal.casalId)

  if (error) {
    console.error('[toggleCategoria]', error.message)
    return { error: 'Erro ao atualizar categoria.' }
  }

  revalidarCategorias()
  return {}
}

export async function editarCategoria(id: number, nome: string, emoji: string): Promise<{ error?: string }> {
  const parsed = CategoriaCasalSchema.safeParse({ nome, emoji })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }

  const casal = await getCasal()
  if (!casal.casalId || casal.status !== 'active') return { error: 'Nenhum casal ativo.' }

  const supabase = createClient()
  // Só categorias do casal (padrao=false) podem ser editadas.
  // As padrão têm ícone imutável.
  const { data: updated, error } = await supabase
    .from('categories')
    .update({ nome: parsed.data.nome, emoji: parsed.data.emoji })
    .eq('id', id)
    .eq('casal_id', casal.casalId)
    .eq('padrao', false)
    .select('id')

  if (error) {
    if (error.code === '23505') return { error: 'Já existe uma categoria com esse nome.' }
    console.error('[editarCategoria]', error.message)
    return { error: 'Erro ao salvar categoria.' }
  }
  if (!updated || updated.length === 0) {
    return { error: 'Categoria padrão não pode ser editada.' }
  }

  revalidarCategorias()
  return {}
}

// ── Lançamentos de um mês passado (drill-down do gráfico) ────

export type GastoMesItem = {
  installment_valor: number
  data_competencia:  string
  expense_id:        string
  descricao:         string | null
  pagador_apelido:   string
  categoria_id:      number
  categoria_nome:    string
  categoria_emoji:   string
}

/** Lançamentos individuais (variável + recorrente) de um mês.
 *  Usado pelo modal do gráfico "Últimos 6 meses" para meses que não
 *  estão carregados na página (só o mês corrente vem no ResumoData). */
export async function getGastosDoMes(
  mesStr: string,
): Promise<{ data?: GastoMesItem[]; error?: string }> {
  const casal = await getCasal()
  if (!casal.casalId || casal.status !== 'active') return { error: 'Nenhum casal ativo.' }

  if (!/^\d{4}-\d{2}-01$/.test(mesStr)) return { error: 'Mês inválido.' }
  const [ano, mes] = mesStr.split('-').map(Number)
  const start   = `${ano}-${String(mes).padStart(2, '0')}-01`
  const lastDay = new Date(ano, mes, 0).getDate()
  const end     = `${ano}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const supabase = createClient()
  // RLS filtra por casal via expenses. Mesma fonte do gráfico (var + recorrente).
  const { data, error } = await supabase
    .from('expense_installments')
    .select('valor_centavos, data_competencia, expenses!inner(id, descricao, cancelado, origem, pagador:users!expenses_pagador_id_fkey(apelido), categoria:categories(id, nome, emoji))')
    .gte('data_competencia', start)
    .lte('data_competencia', end)
    .eq('expenses.cancelado', false)
    .in('expenses.origem', ['pwa', 'recorrente'])
    .order('data_competencia', { ascending: false })

  if (error) {
    console.error('[getGastosDoMes]', error.message)
    return { error: 'Erro ao carregar os gastos do mês.' }
  }

  const items: GastoMesItem[] = ((data ?? []) as any[]).flatMap(row => {
    const exp = row.expenses
    if (!exp) return []
    const pag = Array.isArray(exp.pagador)   ? exp.pagador[0]   : exp.pagador
    const cat = Array.isArray(exp.categoria) ? exp.categoria[0] : exp.categoria
    if (!cat) return []
    return [{
      installment_valor: row.valor_centavos,
      data_competencia:  row.data_competencia,
      expense_id:        exp.id,
      descricao:         exp.descricao ?? null,
      pagador_apelido:   pag?.apelido ?? '?',
      categoria_id:      cat.id,
      categoria_nome:    cat.nome,
      categoria_emoji:   cat.emoji,
    }]
  })

  return { data: items }
}
