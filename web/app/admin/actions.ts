'use server'

import { z }               from 'zod'
import { requireAdmin }      from '@/lib/admin/check-admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient }      from '@/lib/supabase/server'
import { revalidatePath }    from 'next/cache'
import { sendPushToSubs }    from '@/lib/push/send-server'
import { getTemplateRaw }    from '@/lib/copy/get-template'
import { gerarInsight }      from '@/lib/llm/gemini'
import { montarPromptInsight } from '@/lib/llm/insight-prompt'

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
  await supabase.from('categories').delete().eq('casal_id', casalId)
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

export async function atualizarNotificacaoHora(casalId: string, hora: number) {
  await requireAdmin()
  if (hora < 0 || hora > 23 || !Number.isInteger(hora)) throw new Error('Hora inválida (0-23).')

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('casais')
    .update({ notificacao_hora: hora })
    .eq('id', casalId)

  if (error) throw new Error(error.message)
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

  // Descobre a próxima ordem no TEMPLATE (maior + 1)
  const { data: last } = await supabase
    .from('categories')
    .select('ordem')
    .is('casal_id', null)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const proximaOrdem = ((last as { ordem: number } | null)?.ordem ?? 0) + 1

  const { error } = await supabase
    .from('categories')
    .insert({
      nome:     parsed.data.nome.toLowerCase(),
      emoji:    parsed.data.emoji,
      aliases:  [],
      ordem:    proximaOrdem,
      ativo:    true,
      casal_id: null,   // conjunto template (novos casais)
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

// ── Mensagens ─────────────────────────────────────────────────

const TemplateSchema = z.object({
  chave:     z.string().min(1),
  variacoes: z.array(z.string().min(1)).min(1, 'Precisa ter ao menos 1 variação.'),
  ativo:     z.boolean(),
})

export async function salvarTemplate(chave: string, variacoes: string[], ativo: boolean) {
  const adminUser = await requireAdmin()

  const parsed = TemplateSchema.safeParse({ chave, variacoes, ativo })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos.' }
  }

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('message_templates')
    .update({
      variacoes:  parsed.data.variacoes,
      ativo:      parsed.data.ativo,
      updated_by: adminUser.id,
      updated_at: new Date().toISOString(),
    })
    .eq('chave', parsed.data.chave)

  if (error) return { error: error.message }

  revalidatePath('/admin/mensagens')
  return { ok: true }
}

export async function enviarTestePush(chave: string) {
  await requireAdmin()

  // Descobre o user_id do admin logado via session
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const { data: userRow } = await supabase
    .from('users')
    .select('id')
    .eq('email', user.email!)
    .maybeSingle()

  if (!userRow) return { error: 'Usuário não encontrado.' }

  const admin = createAdminClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', (userRow as { id: string }).id)
    .eq('ativo', true)

  if (!subs || subs.length === 0) return { error: 'Nenhuma subscription ativa para seu usuário.' }

  const templates = await getTemplateRaw(chave)
  if (templates.length === 0) return { error: 'Template vazio ou inativo.' }

  const template = templates[Math.floor(Math.random() * templates.length)]
  const body = template
    .replace('{emoji}', '🍕')
    .replace('{cat}', 'Alimentação')
    .replace('{projecao}', 'R$ 520,00')
    .replace('{diff}', 'R$ 120,00')
    .replace('{meta}', 'R$ 400,00')
    .replace('{gasto}', 'R$ 430,00')
    .replace('{dias}', '8')

  await sendPushToSubs(subs as { endpoint: string; p256dh: string; auth: string }[], {
    title: '💚 [TESTE] Nosso DinDin',
    body,
    url: '/admin/mensagens',
  })

  return { ok: true, enviado: body }
}

export async function gerarExemploInsight(tomInstructions: string) {
  await requireAdmin()

  // Dados fictícios para pré-visualizar o efeito do tom
  const prompt = montarPromptInsight({
    apelidos:        ['Vitim', 'Gaia'],
    dia:             18,
    diasNoMes:       30,
    categorias: [
      {
        categoriaId:        1,
        nome:               'Alimentação',
        emoji:              '🍕',
        gastoVariavel:      38000,
        recorrentePrevisto: 0,
        gastoAcumulado:     38000,
        meta:               40000,
        projecao:           63000,
        status:             'vai_estourar',
        ritmoVsMedia:       1.4,
      },
      {
        categoriaId:        2,
        nome:               'Lazer',
        emoji:              '🎉',
        gastoVariavel:      12000,
        recorrentePrevisto: 0,
        gastoAcumulado:     12000,
        meta:               20000,
        projecao:           20000,
        status:             'ok',
        ritmoVsMedia:       0.95,
      },
    ],
    tomInstructions,
  })

  const result = await gerarInsight(prompt)
  if (!result) return { error: 'Gemini indisponível ou GEMINI_API_KEY não configurada.' }

  return { ok: true, resumo: result.resumo }
}
