import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import { PushToggle } from '@/components/push-toggle'
import { LogoutButton } from '@/components/logout-button'

export default async function ConfigPage() {
  const user = await getUser()  // deduplica com layout (React cache)
  const supabase = createClient()

  // Uma única query com join: users + push_subscriptions em paralelo
  let pushAtivo = false
  if (user?.email) {
    const { data: userRow } = await supabase
      .from('users')
      .select('id, push_subscriptions(ativo)')
      .eq('email', user.email)
      .maybeSingle()

    const subs = userRow?.push_subscriptions as { ativo: boolean }[] | undefined
    pushAtivo = subs?.some(s => s.ativo) ?? false
  }

  return (
    <div className="flex flex-col min-h-[100dvh] bg-slate-900">
      <header className="flex items-center gap-3 px-4 py-4 bg-slate-800 border-b border-slate-700 shrink-0">
        <Link href="/" className="text-slate-400 hover:text-white transition-colors p-1 -ml-1" aria-label="Voltar">←</Link>
        <h1 className="text-white font-semibold text-base">Configurações</h1>
      </header>

      <div className="px-4 py-6 space-y-2">
        {/* Notificações */}
        <div className="rounded-xl bg-slate-800 px-4 py-4">
          <PushToggle pushAtivo={pushAtivo} />
        </div>

        {/* Acerto */}
        <Link
          href="/acerto"
          className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🤝</span>
            <span className="text-white text-sm">Registrar acerto</span>
          </div>
          <span className="text-slate-500 text-sm">›</span>
        </Link>

        {/* Recorrentes */}
        <Link
          href="/recorrentes"
          className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🔁</span>
            <span className="text-white text-sm">Gastos recorrentes</span>
          </div>
          <span className="text-slate-500 text-sm">›</span>
        </Link>

        {/* Metas */}
        <Link
          href="/metas"
          className="flex items-center justify-between rounded-xl bg-slate-800 px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🎯</span>
            <span className="text-white text-sm">Metas do mês</span>
          </div>
          <span className="text-slate-500 text-sm">›</span>
        </Link>

        {/* Conta */}
        <div className="pt-2">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide px-1 mb-2">Conta</p>
          <LogoutButton />
        </div>
      </div>
    </div>
  )
}
