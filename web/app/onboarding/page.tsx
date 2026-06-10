import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/get-user'
import { getCasal } from '@/lib/supabase/get-casal'
import { createClient } from '@/lib/supabase/server'
import { ApelidoForm } from './apelido-form'

export default async function OnboardingPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  // Se já tem casal ativo, não precisa de onboarding
  const casal = await getCasal()
  if (casal.casalId && casal.status === 'active') redirect('/')

  // Verifica se já tem apelido
  const supabase = createClient()
  const { data: userData } = await supabase
    .from('users')
    .select('apelido')
    .eq('id', user.id)
    .maybeSingle()

  const temApelido = Boolean(userData?.apelido)

  // Se já tem apelido, verifica se há convite pendente para este e-mail
  if (temApelido && user.email) {
    const { data: convitePendente } = await supabase
      .from('casal_convites')
      .select('token')
      .eq('email_convidado', user.email.toLowerCase())
      .is('usado_em', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (convitePendente?.token) {
      redirect(`/onboarding/entrar?token=${convitePendente.token}`)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center gap-8">
      {/* Logo */}
      <div>
        <p style={{
          fontFamily: 'var(--font-fraunces, Georgia, serif)',
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: -1,
          color: 'var(--ink, #111)',
        }}>
          Din<span style={{ color: 'var(--coral, #e57373)' }}>Din</span>
        </p>
      </div>

      {!temApelido ? (
        /* ── Step 1: definir apelido ── */
        <div className="w-full max-w-xs space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ink, #111)' }}>
              Como você quer ser chamado?
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted, #888)' }}>
              Este apelido aparece para o seu parceiro e nos relatórios.
            </p>
          </div>
          <ApelidoForm />
        </div>
      ) : (
        /* ── Step 2: entrar ou criar casal ── */
        <div className="w-full max-w-xs space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--ink, #111)' }}>
              Chame sua alma gêmea 💑
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--muted, #888)' }}>
              Olá, <strong>{userData?.apelido}</strong>! Crie um casal e convide seu parceiro, ou use um código que você recebeu.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/onboarding/criar"
              className="block w-full rounded-xl py-4 text-center font-semibold text-base transition-opacity active:opacity-70"
              style={{ background: 'var(--sage, #7aab87)', color: '#fff' }}
            >
              Criar meu casal
            </Link>
            <Link
              href="/onboarding/entrar"
              className="block w-full rounded-xl py-4 text-center font-semibold text-base border transition-opacity active:opacity-70"
              style={{
                background: 'var(--bg-2, #f5f5f5)',
                color: 'var(--ink, #111)',
                borderColor: 'var(--border, #ddd)',
              }}
            >
              Tenho um código
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
