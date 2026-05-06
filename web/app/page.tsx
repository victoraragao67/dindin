import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/logout-button'

/**
 * Home autenticada (placeholder).
 * F1-05 vai substituir pelo painel de saldo + lista do mês.
 */
export default async function HomePage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 px-6">
      <span className="text-5xl" role="img" aria-label="dinheiro">💰</span>
      <h1 className="text-3xl font-bold tracking-tight text-white">DinDin</h1>
      {user && (
        <p className="text-slate-400 text-sm">{user.email}</p>
      )}
      <div className="mt-4">
        <LogoutButton />
      </div>
    </main>
  )
}
