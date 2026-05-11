'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayBRTStr } from '@/lib/date'

// ── Schemas ───────────────────────────────────────────────────

const NovoGastoSchema = z.object({
  valor_total_centavos: z
    .number()
    .int('Valor deve ser inteiro (centavos)')
    .positive('Valor deve ser maior que zero')
    .max(5_000_000, 'Valor muito alto (máximo R$ 50.000)'),
  categoria_id: z.number().int().min(1).max(9),
  pagador_apelido: z.enum(['Vitim', 'Gaia']),
  parcelas: z.number().int().min(1).max(24).default(1),
  divisao: z.enum(['50_50', 'so_pagador', 'customizada']).default('50_50'),
  split_pagador_pct: z.number().min(0).max(100).nullable().default(null),
  data_compra: z.string().nullable().default(null),
  descricao: z.string().max(200).nullable().default(null),
})

const RecorrenteSchema = z.object({
  categoria_id: z.number().int().min(1).max(9),
  valor_centavos: z.number().int().positive().max(5_000_000),
  descricao: z.string().min(1, 'Descrição obrigatória para recorrentes').max(200),
  pagador_apelido: z.enum(['Vitim', 'Gaia']),
  divisao: z.enum(['50_50', 'so_pagador', 'customizada']).default('50_50'),
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

  const pagadorId = await resolverPagadorId(pagador_apelido)
  if (!pagadorId) return { error: 'Usuário não encontrado. Configure public.users com os IDs do auth.' }

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

// ── Recorrentes ───────────────────────────────────────────────

export async function criarRecorrente(input: RecorrenteInput): Promise<ActionResult> {
  const parsed = RecorrenteSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }

  const { categoria_id, valor_centavos, descricao, pagador_apelido, divisao, split_pagador_pct, dia_do_mes } = parsed.data

  if (divisao === 'customizada' && split_pagador_pct === null) {
    return { error: 'Informe o percentual para divisão customizada' }
  }

  const pagadorId = await resolverPagadorId(pagador_apelido)
  if (!pagadorId) return { error: 'Usuário não encontrado. Configure public.users com os IDs do auth.' }

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
