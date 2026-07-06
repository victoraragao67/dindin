import Link from 'next/link'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCasal } from '@/lib/supabase/get-casal'
import { ListaRecorrentes } from '@/components/lista-recorrentes'
import { PrevisibilidadeRecorrentes } from '@/components/previsibilidade-recorrentes'
import { HistoricoRecorrentes } from '@/components/historico-recorrentes'
import { BottomNav } from '@/components/bottom-nav'

export type HistoricoMes = {
  mes:       string   // "YYYY-MM"
  mesLabel:  string   // "Jun/26"
  pagamentos: { apelido: string; total: number }[]
  totalMes:  number
}

export default async function RecorrentesPage() {
  const supabase = createClient()
  const casal = await getCasal()

  // Histórico de recorrentes lançados (todos os meses)
  const { data: historicoRaw } = await supabase
    .from('expenses')
    .select('data_compra, valor_total_centavos, pagador:users!expenses_pagador_id_fkey(apelido)')
    .eq('origem', 'recorrente')
    .eq('cancelado', false)
    .order('data_compra', { ascending: false })

  // Agrupa por mês e pagador
  const mesMapa: Record<string, Record<string, number>> = {}
  for (const exp of (historicoRaw ?? []) as any[]) {
    const mes     = (exp.data_compra as string).slice(0, 7)
    const apelido = (Array.isArray(exp.pagador) ? exp.pagador[0] : exp.pagador)?.apelido ?? '?'
    if (!mesMapa[mes]) mesMapa[mes] = {}
    mesMapa[mes][apelido] = (mesMapa[mes][apelido] ?? 0) + (exp.valor_total_centavos as number)
  }

  const historico: HistoricoMes[] = Object.entries(mesMapa)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([mes, pags]) => {
      const [y, m] = mes.split('-').map(Number)
      const mesLabel = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      const pagamentos = Object.entries(pags)
        .map(([apelido, total]) => ({ apelido, total }))
        .sort((a, b) => b.total - a.total)
      return { mes, mesLabel, pagamentos, totalMes: pagamentos.reduce((s, p) => s + p.total, 0) }
    })

  const { data: categoriasData } = await supabase
    .from('categories')
    .select('id, nome, emoji, ordem')
    .eq('ativo', true)
    .order('ordem', { ascending: true })

  const categorias = (categoriasData ?? []) as { id: number; nome: string; emoji: string; ordem: number }[]

  const { data: templates } = await supabase
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
      pagador:users!recurring_templates_pagador_id_fkey ( apelido ),
      categoria:categories!recurring_templates_categoria_id_fkey ( nome, emoji )
    `)
    .order('dia_do_mes', { ascending: true })

  const currentApelido = casal.meuApelido ?? ''
  const apelidos = casal.apelidos ?? [currentApelido, currentApelido] as [string, string]

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
    categoria: { nome: string; emoji: string } | { nome: string; emoji: string }[] | null
  }

  const normalized = (templates as unknown as RawTemplate[] ?? []).map(t => {
    const cat = Array.isArray(t.categoria) ? t.categoria[0] : t.categoria
    return {
      id: t.id,
      categoria_id: t.categoria_id,
      categoria_nome: cat?.nome ?? 'Outros',
      categoria_emoji: cat?.emoji ?? '📦',
      valor_centavos: t.valor_centavos,
      descricao: t.descricao,
      pagador_apelido: (
        Array.isArray(t.pagador) ? t.pagador[0]?.apelido : t.pagador?.apelido
      ) ?? currentApelido,
      divisao: t.divisao,
      split_pagador_pct: t.split_pagador_pct,
      dia_do_mes: t.dia_do_mes,
      ativo: t.ativo,
    }
  })

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

        <div className="pt-4" style={{ paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
          <Suspense fallback={
            <div className="mx-4 mb-4 h-40 rounded-xl animate-pulse border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }} />
          }>
            <PrevisibilidadeRecorrentes />
          </Suspense>

          <ListaRecorrentes templates={normalized} currentApelido={currentApelido} apelidos={apelidos} categorias={categorias} />

          {historico.length > 0 && (
            <HistoricoRecorrentes historico={historico} />
          )}
        </div>
      </div>

      <BottomNav />
    </>
  )
}
