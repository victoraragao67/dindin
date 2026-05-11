import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Client Supabase para Client Components (browser).
 *
 * Usa @supabase/supabase-js diretamente (não o SSR) com um storage adapter
 * que escreve em **localStorage** (para persistência confiável no PWA do iOS)
 * e também sincroniza com **document.cookie** (para que o middleware
 * server-side via @supabase/ssr consiga ler a sessão).
 *
 * Singleton — uma única instância por contexto de browser.
 */
let client: ReturnType<typeof createSupabaseClient> | null = null

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 dias em segundos

/**
 * Storage adapter que persiste em localStorage E em cookie.
 * localStorage: sobrevive a reinicializações do PWA no iOS.
 * cookie: acessível pelo middleware Next.js (server-side).
 */
function makeSyncStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined

  return {
    length: 0,
    clear() {
      window.localStorage.clear()
    },
    key(index: number) {
      return window.localStorage.key(index)
    },
    getItem(key: string): string | null {
      return window.localStorage.getItem(key)
    },
    setItem(key: string, value: string): void {
      window.localStorage.setItem(key, value)
      // Sincroniza com cookie para SSR/middleware
      try {
        document.cookie =
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}` +
          `;path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`
      } catch {
        // Cookie pode exceder limite de tamanho — localStorage ainda persiste
      }
    },
    removeItem(key: string): void {
      window.localStorage.removeItem(key)
      // Expira o cookie imediatamente
      document.cookie = `${encodeURIComponent(key)}=;path=/;max-age=0`
    },
  }
}

export function createClient() {
  if (client) return client

  client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        // storageKey não definido → usa padrão: sb-<project-ref>-auth-token
        // Essa chave é a mesma que @supabase/ssr lê nos cookies (middleware)
        storage: makeSyncStorage(),
      },
    }
  )

  return client
}
