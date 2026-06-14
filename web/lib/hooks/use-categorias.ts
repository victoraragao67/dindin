'use client'

import { useEffect, useState } from 'react'
import { createClient }        from '@/lib/supabase/client'

export type Categoria = {
  id:    number
  nome:  string
  emoji: string
  ordem: number
}

// Cache em módulo: categorias raramente mudam.
// Evita re-fetch a cada abertura do modal na mesma sessão.
let _cache: Categoria[] | null = null

export function useCategorias(initialCategorias?: Categoria[]) {
  // Pre-warm the cache with server-provided categories (SSR props)
  // so no client-side fetch is needed when the server already sent them
  if (initialCategorias && initialCategorias.length > 0 && _cache === null) {
    _cache = initialCategorias
  }

  const [categorias, setCategorias] = useState<Categoria[]>(_cache ?? [])
  const [loading,    setLoading]    = useState(_cache === null)

  useEffect(() => {
    if (_cache !== null) {
      setCategorias(_cache)
      setLoading(false)
      return
    }

    const supabase = createClient()

    supabase
      .from('categories')
      .select('id, nome, emoji, ordem')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .then(({ data, error }: { data: Categoria[] | null; error: { message: string } | null }) => {
        if (data && !error) {
          _cache = data as Categoria[]
          setCategorias(_cache)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return { categorias, loading }
}

/**
 * Invalida o cache. Chamar após o admin criar/editar categorias
 * para que a próxima abertura do modal busque dados frescos.
 */
export function invalidarCacheCategoria() {
  _cache = null
}
