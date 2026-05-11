import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Callback do Supabase Auth (magic link — fallback para desktop/Android).
 *
 * No iOS PWA o magic link abre no Safari (storage isolado do PWA),
 * por isso o fluxo principal de login usa OTP — o usuário digita o código
 * direto no app sem precisar sair dele.
 *
 * Este callback continua existindo como fallback: quando o usuário clica
 * no link pelo browser (desktop ou Android), a sessão é trocada aqui e
 * os cookies são explicitamente incluídos no Set-Cookie do redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = cookies()

    // Captura os cookies que o exchangeCodeForSession vai querer definir
    const pendingCookies: Array<{ name: string; value: string; options: Parameters<typeof cookieStore.set>[2] }> = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            // Guarda para aplicar na resposta de redirect (cookies() não
            // persiste em NextResponse.redirect sem passar explicitamente)
            pendingCookies.push(...cookiesToSet)
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Cria o redirect e aplica os cookies de sessão explicitamente
      const response = NextResponse.redirect(`${origin}/`)
      pendingCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options ?? {})
      })
      return response
    }
  }

  // Fallback: código ausente ou inválido → volta ao login com erro
  return NextResponse.redirect(`${origin}/login?error=auth`)
}
