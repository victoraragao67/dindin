import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/get-user'
import { createClient } from '@/lib/supabase/server'
import { ThemeProvider } from '@/components/theme-provider'

type Tema = 'light' | 'dark'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  // Busca preferência de tema do usuário
  let tema: Tema = 'light'
  if (user?.email) {
    const supabase = createClient()
    const { data } = await supabase
      .from('users')
      .select('tema')
      .eq('email', user.email)
      .maybeSingle()
    if (data?.tema === 'dark') tema = 'dark'
  }

  return (
    <ThemeProvider initialTema={tema}>
      <div
        className="relative flex min-h-[100dvh] flex-col overflow-hidden"
        style={{ background: 'var(--bg)' }}
      >
        {children}
      </div>
    </ThemeProvider>
  )
}
