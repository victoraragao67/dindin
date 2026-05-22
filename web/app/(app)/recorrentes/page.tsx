import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import { ListaRecorrentes } from '@/components/lista-recorrentes'
import { PrevisibilidadeRecorrentes } from '@/components/previsibilidade-recorrentes'
import { BottomNav } from '@/components/bottom-nav'

type Apelido = 'Vitim' | 'Gaia'

export default async function RecorrentesPage() {
  const supabase = createClient()

  const [
    user,
    { data: templates },
  ] = await Promise.all([
    getUser(),
    supabase
      .from('recurring_templates')
      .select(`
        id,
        categoria_id,
        valor_centavos,
        descricao,
        divisao,
        split_pagador_pct,
        dia_do_mes,
        ativo,
        pagador:users!recurring_templates_pagador_id_fkey ( apelido )
      `)
      .order('dia_do_mes', { ascending: true }),
  ])

  let currentApelido: Apelido = 'Vitim'
  if (user?.email) {
    const { data } = await supabase.from('users').select('apelido').eq('email', user.email).maybeSingle()
    if (data?.apelido === 'Gaia') currentApelido = 'Gaia'
  }

  type RawTemplate = {
    id: string
    categoria_id: number
    valor_centavos: number
    descricao: string
    divisao: '50_50' | 'so_pagador' | 'so_outro' | 'customizada'
    split_pagador_pct: number | null
    dia_do_mes: number
    ativo: boolean
    pagador: { apelido: string } | { apelido: string }[] | null
  }

  const normalized = (templates as unknown as RawTemplate[] ?? []).map(t => ({
    id: t.id,
    categoria_id: t.categoria_id,
    valor_centavos: t.valor_centavos,
    descricao: t.descricao,
    pagador_apelido: (
      Array.isArray(t.pagador) ? t.pagador[0]?.apelido : t.pagador?.apelido
    ?? 'Vitim') as Apelido,
    divisao: t.divisao,
    split_pagador_pct: t.split_pagador_pct,
    dia_do_mes: t.dia_do_mes,
    ativo: t.ativo,
  }))

  return (
    <>
      <div className="flex flex-col min-h-[100dvh]" style={{ background: 'var(--bg)' }}>
        {/* Header */}
        <header
          className="flex items-center gap-3 px-4 py-4 border-b shrink-0"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <Link
            href="/"
            className="p-1 -ml-1 transition-colors"
            style={{ color: 'var(--muted)' }}
            aria-label="Voltar"
          >
            ←
          </Link>
          <h1 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>Recorrentes</h1>
        </header>

        <div className="pt-4">
          <Suspense fallback={
            <div className="mx-4 mb-4 h-40 rounded-xl animate-pulse border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} />
          }>
            <PrevisibilidadeRecorrentes />
          </Suspense>

          <ListaRecorrentes templates={normalized} currentApelido={currentApelido} />
        </div>
      </div>

      <BottomNav />
    </>
  )
}
