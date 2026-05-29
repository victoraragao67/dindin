import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { RebalancearWizard } from '@/components/rebalancear-wizard'
import type { TemplateItem } from '@/components/rebalancear-wizard'

type RawTemplate = {
  id: string
  descricao: string
  valor_centavos: number
  pagador_id: string
  pagador: { id: string; apelido: string } | { id: string; apelido: string }[] | null
  categoria: { emoji: string } | { emoji: string }[] | null
}

export default async function RebalancearPage() {
  const supabase = createClient()

  const [{ data: templateRows }, { data: userRows }] = await Promise.all([
    supabase
      .from('recurring_templates')
      .select(`
        id,
        descricao,
        valor_centavos,
        pagador_id,
        pagador:users!recurring_templates_pagador_id_fkey ( id, apelido ),
        categoria:categories!recurring_templates_categoria_id_fkey ( emoji )
      `)
      .eq('ativo', true)
      .order('valor_centavos', { ascending: false }),
    supabase.from('users').select('id, apelido'),
  ])

  const users     = (userRows ?? []) as { id: string; apelido: string }[]
  const templates = (templateRows as unknown as RawTemplate[] ?? []).map(t => {
    const pagador = Array.isArray(t.pagador) ? t.pagador[0] : t.pagador
    const cat     = Array.isArray(t.categoria) ? t.categoria[0] : t.categoria
    return {
      id:              t.id,
      descricao:       t.descricao,
      valor_centavos:  t.valor_centavos,
      pagador_id:      t.pagador_id,
      pagador_apelido: pagador?.apelido ?? '?',
      categoria_emoji: cat?.emoji ?? '📦',
    } satisfies TemplateItem
  })

  // Compute who pays more by grouping templates by pagador
  const totalPorPagador: Record<string, number> = {}
  const apelidoPorId:    Record<string, string> = {}

  for (const t of templates) {
    totalPorPagador[t.pagador_id] = (totalPorPagador[t.pagador_id] ?? 0) + t.valor_centavos
  }
  for (const u of users) {
    apelidoPorId[u.id] = u.apelido
    if (!totalPorPagador[u.id]) totalPorPagador[u.id] = 0
  }

  const sorted = Object.entries(totalPorPagador).sort(([, a], [, b]) => b - a)
  if (sorted.length < 2) redirect('/recorrentes')

  const [pagaMaisId, totalPagaMais]     = sorted[0]
  const [pagaMenosId, totalPagaMenos]   = sorted[1]
  const imbalanceAtual                  = totalPagaMais - totalPagaMenos

  // Only show templates belonging to the "heavier" payer
  const templatesHeavy = templates.filter(t => t.pagador_id === pagaMaisId)

  const pagaMaisApelido  = apelidoPorId[pagaMaisId]  ?? '?'
  const pagaMenosApelido = apelidoPorId[pagaMenosId] ?? '?'

  return (
    <div className="flex flex-col min-h-[100dvh]" style={{ background: 'var(--bg)' }}>
      <header
        className="flex items-center gap-3 px-4 py-4 border-b shrink-0"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        <Link
          href="/recorrentes"
          className="p-1 -ml-1 transition-opacity active:opacity-70"
          style={{ color: 'var(--muted)' }}
          aria-label="Voltar"
        >
          ←
        </Link>
        <div>
          <h1 className="font-semibold text-base" style={{ color: 'var(--ink)' }}>Rebalancear recorrentes</h1>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Redistribuir quem paga o quê</p>
        </div>
      </header>

      <RebalancearWizard
        pagaMaisApelido={pagaMaisApelido}
        pagaMaisId={pagaMaisId}
        pagaMenosApelido={pagaMenosApelido}
        pagaMenosId={pagaMenosId}
        totalPagaMais={totalPagaMais}
        totalPagaMenos={totalPagaMenos}
        imbalanceAtual={imbalanceAtual}
        templates={templatesHeavy}
      />
    </div>
  )
}
