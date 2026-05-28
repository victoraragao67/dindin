import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Supabase para Client Components (browser).
 *
 * Usa createBrowserClient do @supabase/ssr — o mesmo pacote do servidor.
 * Isso garante que os cookies de sessão sejam escritos no formato correto
 * (com chunking automático para tokens grandes), compatível com o middleware
 * e os Server Components que usam createServerClient.
 *
 * Singleton — uma única instância por contexto de browser.
 */
let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  return client
}
