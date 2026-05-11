import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Callback do Supabase Auth (magic link).
 * Troca o `code` pela sessão e redireciona para o session-handoff
 * com os tokens no hash — necessário para que o PWA (storage isolado no iOS)
 * consiga chamar setSession() dentro do seu próprio contexto.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Busca os tokens recém-criados para passá-los ao handoff
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const handoffUrl = new URL('/auth/session-handoff', origin)
        handoffUrl.hash =
          `access_token=${session.access_token}` +
          `&refresh_token=${session.refresh_token}` +
          `&type=magiclink`
        return NextResponse.redirect(handoffUrl.toString())
      }

      // Sessão não disponível após troca — redireciona home normalmente
      return NextResponse.redirect(`${origin}/`)
    }
  }

  // Fallback: código ausente ou inválido → volta ao login com erro
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
