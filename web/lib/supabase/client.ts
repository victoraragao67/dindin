import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Supabase para Client Components (browser).
 * Singleton — cria uma instância por chamada (o @supabase/ssr gerencia o cache).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
