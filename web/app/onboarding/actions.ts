'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import { getCasal } from '@/lib/supabase/get-casal'

// ── Token generator (sem O, I, 0, 1 para evitar confusão) ────────
function gerarToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let token = ''
  const array = new Uint8Array(6)
  crypto.getRandomValues(array)
  for (const byte of Array.from(array)) {
    token += chars[byte % chars.length]
  }
  return token
}

// ── Tipos ────────────────────────────────────────────────────────
export type OnboardingResult = { ok: true } | { ok: false; error: string }

// ── Salvar apelido ───────────────────────────────────────────────
export async function salvarApelido(apelido: string): Promise<OnboardingResult> {
  const trimmed = apelido.trim()
  if (!trimmed || trimmed.length < 2) {
    return { ok: false, error: 'Apelido deve ter pelo menos 2 caracteres.' }
  }
  if (trimmed.length > 30) {
    return { ok: false, error: 'Apelido muito longo (máx. 30 caracteres).' }
  }

  const user = await getUser()
  if (!user) return { ok: false, error: 'Usuário não autenticado.' }

  const supabase = createClient()
  const { error } = await supabase
    .from('users')
    .upsert(
      { id: user.id, email: user.email ?? '', nome: '', apelido: trimmed },
      { onConflict: 'id', ignoreDuplicates: false }
    )

  if (error) return { ok: false, error: 'Erro ao salvar apelido.' }

  return { ok: true }
}

// ── Criar casal + convite ────────────────────────────────────────
export async function criarCasal(emailParceiro: string): Promise<OnboardingResult> {
  const email = emailParceiro.trim().toLowerCase()

  // Validação básica de e-mail
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Informe um e-mail válido.' }
  }

  const user = await getUser()
  if (!user) return { ok: false, error: 'Usuário não autenticado.' }

  // Não pode convidar a si mesmo
  if (user.email?.toLowerCase() === email) {
    return { ok: false, error: 'Você não pode se convidar.' }
  }

  // Verifica se o email convidado existe no sistema
  const supabase = createClient()
  const { data: convidado } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (!convidado) {
    return { ok: false, error: 'Nenhum usuário com este e-mail encontrado. O parceiro precisa ter feito login pelo menos uma vez.' }
  }

  // Verifica se o convidado já está em casal ativo/pending
  const { data: membroExistente } = await supabase
    .from('casal_membros')
    .select('casal_id, casais!inner(status)')
    .eq('user_id', convidado.id)
    .in('casais.status', ['active', 'pending'])
    .maybeSingle()

  if (membroExistente) {
    return { ok: false, error: 'Este usuário já faz parte de outro casal.' }
  }

  // Cria o casal
  const { data: casal, error: errCasal } = await supabase
    .from('casais')
    .insert({ nome: null, status: 'pending' })
    .select('id')
    .single()

  if (errCasal || !casal) {
    return { ok: false, error: 'Erro ao criar casal.' }
  }

  // Vincula o criador como owner
  const { error: errMembro } = await supabase
    .from('casal_membros')
    .insert({ casal_id: casal.id, user_id: user.id, role: 'owner' })

  if (errMembro) {
    return { ok: false, error: 'Erro ao vincular membro.' }
  }

  // Gera token único (tenta até 3 vezes se colisão)
  let token = ''
  for (let i = 0; i < 3; i++) {
    const t = gerarToken()
    const { data: existente } = await supabase
      .from('casal_convites')
      .select('id')
      .eq('token', t)
      .is('usado_em', null)
      .maybeSingle()
    if (!existente) { token = t; break }
  }
  if (!token) return { ok: false, error: 'Erro ao gerar código. Tente novamente.' }

  // Cria convite
  const { error: errConvite } = await supabase
    .from('casal_convites')
    .insert({
      casal_id:        casal.id,
      token,
      email_convidado: email,
      criado_por:      user.id,
    })

  if (errConvite) {
    return { ok: false, error: 'Erro ao criar convite.' }
  }

  redirect('/onboarding/aguardando')
}

// ── Gerar novo convite (expire o anterior) ───────────────────────
export async function gerarNovoConvite(): Promise<OnboardingResult> {
  const user = await getUser()
  if (!user) return { ok: false, error: 'Usuário não autenticado.' }

  const casal = await getCasal()
  if (!casal.casalId) return { ok: false, error: 'Nenhum casal encontrado.' }

  const supabase = createClient()

  // Expira convites anteriores
  await supabase
    .from('casal_convites')
    .update({ expires_at: new Date().toISOString() })
    .eq('casal_id', casal.casalId)
    .is('usado_em', null)

  // Busca o email do convidado original (da última tentativa)
  const { data: ultimo } = await supabase
    .from('casal_convites')
    .select('email_convidado')
    .eq('casal_id', casal.casalId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!ultimo) return { ok: false, error: 'Nenhum convite anterior encontrado.' }

  // Gera novo token
  let token = ''
  for (let i = 0; i < 3; i++) {
    const t = gerarToken()
    const { data: existente } = await supabase
      .from('casal_convites')
      .select('id')
      .eq('token', t)
      .is('usado_em', null)
      .maybeSingle()
    if (!existente) { token = t; break }
  }
  if (!token) return { ok: false, error: 'Erro ao gerar código.' }

  const { error } = await supabase
    .from('casal_convites')
    .insert({
      casal_id:        casal.casalId,
      token,
      email_convidado: ultimo.email_convidado,
      criado_por:      user.id,
    })

  if (error) return { ok: false, error: 'Erro ao criar novo convite.' }

  return { ok: true }
}

// ── Aceitar convite ──────────────────────────────────────────────
export async function entrarCasal(token: string): Promise<OnboardingResult> {
  const t = token.trim().toUpperCase()
  if (t.length !== 6) {
    return { ok: false, error: 'Código deve ter 6 caracteres.' }
  }

  const supabase = createClient()
  const rpcResult = await supabase.rpc('accept_invite', { p_token: t } as never)
  const result = rpcResult.data as { ok: boolean; error?: string; casal_id?: string } | null

  if (rpcResult.error) return { ok: false, error: rpcResult.error.message }

  if (!result?.ok) {
    return { ok: false, error: result?.error ?? 'Código inválido.' }
  }

  redirect('/')
}
