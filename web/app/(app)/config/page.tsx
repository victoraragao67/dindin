import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import { PushToggle } from '@/components/push-toggle'
import { LogoutButton } from '@/components/logout-button'
import { ThemeToggle } from '@/components/theme-toggle'
import { BottomNav } from '@/components/bottom-nav'

export const metadata = { title: 'Configurações' }

export default async function ConfigPage() {
  const user = await getUser()
  const supabase = createClient()

  let pushAtivo = false
  let temaAtual: 'light' | 'dark' = 'light'

  if (user?.email) {
    const { data: userRow } = await supabase
      .from('users')
      .select('id, tema, push_subscriptions(ativo)')
      .eq('email', user.email)
      .maybeSingle()

    const subs = userRow?.push_subscriptions as { ativo: boolean }[] | undefined
    pushAtivo = subs?.some(s => s.ativo) ?? false
    if (userRow?.tema === 'dark') temaAtual = 'dark'
  }

  return (
    <>
      <div
        className="flex flex-col min-h-[100dvh] pb-24"
        style={{ background: 'var(--bg)' }}
      >
        <header
          className="flex items-center gap-3 px-4 py-4 border-b shrink-0"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <Link
            href="/"
            className="p-1 -ml-1 transition-colors"
            style={{ color: 'var(--muted)' }}
            aria-label="Voltar"
          >
            ←
          </Link>
          <h1 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>
            Configurações
          </h1>
        </header>

        <div className="px-4 py-6 space-y-4">

          {/* Aparência */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wide px-1 mb-2"
              style={{ color: 'var(--muted)' }}
            >
              Aparência
            </p>
            <div
              className="rounded-xl px-4 py-4 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <ThemeToggle temaAtual={temaAtual} />
            </div>
          </div>

          {/* Notificações */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wide px-1 mb-2"
              style={{ color: 'var(--muted)' }}
            >
              Notificações
            </p>
            <div
              className="rounded-xl px-4 py-4 border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <PushToggle pushAtivo={pushAtivo} />
            </div>
          </div>

          {/* Links */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wide px-1 mb-2"
              style={{ color: 'var(--muted)' }}
            >
              Financeiro
            </p>
            <div className="space-y-2">
              <Link
                href="/acerto"
                className="flex items-center justify-between rounded-xl px-4 py-4 border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🤝</span>
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>Registrar acerto</span>
                </div>
                <span style={{ color: 'var(--muted)' }}>›</span>
              </Link>

              <Link
                href="/recorrentes"
                className="flex items-center justify-between rounded-xl px-4 py-4 border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔁</span>
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>Gastos recorrentes</span>
                </div>
                <span style={{ color: 'var(--muted)' }}>›</span>
              </Link>

              <Link
                href="/metas"
                className="flex items-center justify-between rounded-xl px-4 py-4 border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎯</span>
                  <span className="text-sm" style={{ color: 'var(--ink)' }}>Metas do mês</span>
                </div>
                <span style={{ color: 'var(--muted)' }}>›</span>
              </Link>
            </div>
          </div>

          {/* Conta */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wide px-1 mb-2"
              style={{ color: 'var(--muted)' }}
            >
              Conta
            </p>
            <LogoutButton />
          </div>

        </div>
      </div>

      <BottomNav />
    </>
  )
}
