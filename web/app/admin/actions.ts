'use server'

import { z }               from 'zod'
import { requireAdmin }      from '@/lib/admin/check-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath }    from 'next/cache'

// ── Casais ────────────────────────────────────────────────────

export async function deletarCasal(casalId: string) {
  await requireAdmin()

  const supabase = createAdminClient()

  // Busca os user_ids dos membros antes de deletar
  const { data: membros } = await supabase
    .from('casal_membros')
    .select('user_id')
    .eq('casal_id', casalId)

  const userIds = ((membros ?? []) as { user_id: string }[]).map(m => m.user_id)

  // Busca expense IDs para deletar installments primeiro
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id')
    .eq('casal_id', casalId)

  const expenseIds = ((expenses ?? []) as { id: string }[]).map(e => e.id)

  if (expenseIds.length > 0) {
    await supabase.from('expense_installments').delete().in('expense_id', expenseIds)
  }

  await supabase.from('expenses').delete().eq('casal_id', casalId)
  await supabase.from('transfers').delete().eq('casal_id', casalId)
  await supabase.from('recurring_templates').delete().eq('casal_id', casalId)
  await supabase.from('spending_goals').delete().eq('casal_id', casalId)
  await supabase.from('casal_convites').delete().eq('casal_id', casalId)

  if (userIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('user_id', userIds)
    await supabase.from('users').delete().in('id', userIds)
  }

  await supabase.from('casal_membros').delete().eq('casal_id', casalId)
  await supabase.from('casais').delete().eq('id', casalId)

  // Deleta das auth.users via admin API
  for (const uid of userIds) {
    await supabase.auth.admin.deleteUser(uid)
  }

  revalidatePath('/admin')
  return { ok: true }
}

export async function bloquearCasal(casalId: string) {
  await requireAdmin()

  const supabase = createAdminClient()
  const { data } = await supabase.rpc('admin_bloquear_casal', { p_casal_id: casalId })

  const result = data as { ok: boolean; error?: string } | null
  if (!result?.ok) {
    throw new Error(result?.error ?? 'Erro ao bloquear casal.')
  }

  revalidatePath('/admin')
}

export async function reativarCasal(casalId: string) {
  await requireAdmin()

  const supabase = createAdminClient()
  const { data } = await supabase.rpc('admin_reativar_casal', { p_casal_id: casalId })

  const result = data as { ok: boolean; error?: string } | null
  if (!result?.ok) {
    throw new Error(result?.error ?? 'Erro ao reativar casal.')
  }

  revalidatePath('/admin')
}

// ── Categorias ────────────────────────────────────────────────

const CategoriaSchema = z.object({
  nome:  z.string().min(1, 'Nome obrigatório').max(50).trim(),
  emoji: z.string().min(1, 'Emoji obrigatório').max(10).trim(),
})

export async function criarCategoria(formData: FormData) {
  await requireAdmin()

  const parsed = CategoriaSchema.safeParse({
    nome:  formData.get('nome'),
    emoji: formData.get('emoji'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  const supabase = createAdminClient()

  // Descobre a próxima ordem (maior + 1)
  const { data: last } = await supabase
    .from('categories')
    .select('ordem')
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const proximaOrdem = ((last as { ordem: number } | null)?.ordem ?? 0) + 1

  const { error } = await supabase
    .from('categories')
    .insert({
      nome:    parsed.data.nome.toLowerCase(),
      emoji:   parsed.data.emoji,
      aliases: [],
      ordem:   proximaOrdem,
      ativo:   true,
    })

  if (error) return { error: error.message }

  revalidatePath('/admin/categorias')
  return { ok: true }
}

export async function editarCategoria(id: number, formData: FormData) {
  await requireAdmin()

  const parsed = CategoriaSchema.safeParse({
    nome:  formData.get('nome'),
    emoji: formData.get('emoji'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('categories')
    .update({
      nome:  parsed.data.nome.toLowerCase(),
      emoji: parsed.data.emoji,
    })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/categorias')
  return { ok: true }
}

export async function toggleCategoriaAtivo(id: number, ativo: boolean) {
  await requireAdmin()

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('categories')
    .update({ ativo })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/categorias')
  return { ok: true }
}

export async function reordenarCategoria(id: number, novaOrdem: number) {
  await requireAdmin()

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('categories')
    .update({ ordem: novaOrdem })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/categorias')
  return { ok: true }
}
