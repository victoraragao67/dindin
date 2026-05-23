import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/get-user'
import { createClient } from '@/lib/supabase/server'
import { ThemeProvider } from '@/components/theme-provider'
import { HamburgerMenu } from '@/components/hamburger-menu'

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
        {/* TopBar global — logo + hamburger */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px 10px',
            paddingTop: 'calc(14px + env(safe-area-inset-top))',
            background: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: -1,
          }}>
            Din<span style={{ color: 'var(--coral)' }}>Din</span>
          </span>
          <HamburgerMenu />
        </div>

        {children}
      </div>
    </ThemeProvider>
  )
}
