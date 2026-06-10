'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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

  // Admin client: getUser() já verificou a identidade, upsert seguro por user.id
  const supabase = createAdminClient()
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

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Informe um e-mail válido.' }
  }

  const user = await getUser()
  if (!user) return { ok: false, error: 'Usuário não autenticado.' }

  if (user.email?.toLowerCase() === email) {
    return { ok: false, error: 'Você não pode se convidar.' }
  }

  const supabase = createClient()
  const supabaseAdmin = createAdminClient()

  // Trava 0: se já tem casal pending com convite válido → redireciona sem criar outro
  const casalAtual = await getCasal()
  if (casalAtual.casalId && casalAtual.status === 'pending') {
    const { data: conviteAtivo } = await supabase
      .from('casal_convites')
      .select('id')
      .eq('casal_id', casalAtual.casalId)
      .is('usado_em', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (conviteAtivo) redirect('/onboarding/aguardando')
  }

  // Trava A: máximo 3 convites pendentes por usuário
  const { count: convitesPendentes } = await supabase
    .from('casal_convites')
    .select('id', { count: 'exact', head: true })
    .eq('criado_por', user.id)
    .is('usado_em', null)
    .gt('expires_at', new Date().toISOString())

  if ((convitesPendentes ?? 0) >= 3) {
    return { ok: false, error: 'Você já tem 3 convites pendentes. Aguarde um ser aceito ou os convites expirarem.' }
  }

  // Trava B: cooldown de 10 min para o mesmo e-mail
  const dezMinAtras = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: conviteRecente } = await supabase
    .from('casal_convites')
    .select('id')
    .eq('criado_por', user.id)
    .eq('email_convidado', email)
    .gt('created_at', dezMinAtras)
    .maybeSingle()

  if (conviteRecente) {
    return { ok: false, error: 'Você já enviou um convite para este e-mail recentemente. Aguarde 10 minutos.' }
  }

  // Verifica se o convidado já está em casal ativo/pending (só se já tiver conta)
  const { data: convidado } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (convidado) {
    const { data: membroExistente } = await supabase
      .from('casal_membros')
      .select('casal_id, casais!inner(status)')
      .eq('user_id', convidado.id)
      .in('casais.status', ['active', 'pending'])
      .maybeSingle()

    if (membroExistente) {
      return { ok: false, error: 'Este usuário já faz parte de outro casal.' }
    }
  }

  // Cria o casal e vincula o owner via admin client (sem policy INSERT em casais)
  const { data: casal, error: errCasal } = await supabaseAdmin
    .from('casais')
    .insert({ nome: null, status: 'pending' })
    .select('id')
    .single()

  if (errCasal || !casal) return { ok: false, error: `Erro ao criar casal: ${errCasal?.message}` }

  const { error: errMembro } = await supabaseAdmin
    .from('casal_membros')
    .insert({ casal_id: casal.id, user_id: user.id, role: 'owner' })

  if (errMembro) return { ok: false, error: `Erro ao vincular membro: ${errMembro.message}` }

  // Gera token único
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

  if (errConvite) return { ok: false, error: 'Erro ao criar convite.' }

  // Envia e-mail personalizado com nome/email do remetente
  const nomeRemetente = (user.user_metadata?.apelido as string | undefined) || user.email || 'Seu parceiro'
  await supabase.auth.signInWithOtp({
    email,
    options: {
      data: {
        nome_remetente:  nomeRemetente,
        email_remetente: user.email ?? '',
      },
    },
  })

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
