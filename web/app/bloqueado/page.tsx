import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'

export default async function BloqueadoPage() {
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'var(--bg, #fff)',
      textAlign: 'center',
    }}>
      <span style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🔒</span>

      <h1 style={{
        fontSize: '1.5rem',
        fontWeight: 700,
        color: 'var(--ink, #111)',
        marginBottom: '0.75rem',
      }}>
        Conta suspensa
      </h1>

      <p style={{
        fontSize: '0.9375rem',
        color: 'var(--muted, #666)',
        lineHeight: 1.6,
        maxWidth: 320,
        marginBottom: '2rem',
      }}>
        Este casal foi suspenso. Em caso de dúvidas, entre em contato com o suporte.
      </p>

      <LogoutButton />
    </div>
  )
}

function LogoutButton() {
  async function logout() {
    'use server'
    const supabase = createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <form action={logout}>
      <button
        type="submit"
        style={{
          padding: '0.75rem 2rem',
          borderRadius: '0.75rem',
          border: '1px solid var(--border, #e5e7eb)',
          background: 'transparent',
          color: 'var(--muted, #666)',
          fontSize: '0.875rem',
          cursor: 'pointer',
        }}
      >
        Sair da conta
      </button>
    </form>
  )
}
