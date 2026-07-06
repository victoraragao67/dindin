import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/bottom-nav'
import { CategoriasCasalClient } from './categorias-casal-client'

export const metadata = { title: 'Categorias · Nosso DinDin' }

type CatRow = {
  id:     number
  nome:   string
  emoji:  string
  ordem:  number
  ativo:  boolean
  padrao: boolean
}

export default async function CategoriasPage() {
  const supabase = createClient()

  // RLS scopa por casal — só vêm as categorias do casal logado (ativas e inativas).
  const { data } = await supabase
    .from('categories')
    .select('id, nome, emoji, ordem, ativo, padrao')
    .order('ordem', { ascending: true })

  const categorias = (data as CatRow[] | null) ?? []

  return (
    <>
      <div
        className="flex flex-col min-h-[100dvh] pb-24"
        style={{ background: 'var(--bg)' }}
      >
        <header
          className="flex items-center gap-3 px-4 py-4 border-b shrink-0"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <Link
            href="/config"
            className="p-1 -ml-1 transition-colors"
            style={{ color: 'var(--muted)' }}
            aria-label="Voltar"
          >
            ←
          </Link>
          <h1 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>
            Categorias
          </h1>
        </header>

        <div className="px-4 py-6">
          <p
            className="text-xs px-1 mb-4"
            style={{ color: 'var(--muted)', lineHeight: 1.6 }}
          >
            Ative, desative ou crie categorias para o jeito de vocês gastarem.
            Desativar não apaga nada — os gastos antigos continuam no histórico.
          </p>

          <CategoriasCasalClient categorias={categorias} />
        </div>
      </div>

      <BottomNav />
    </>
  )
}
