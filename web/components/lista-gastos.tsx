import { createClient } from '@/lib/supabase/server'
import { currentMonthRange } from '@/lib/date'
import { ListaGastosClient } from './lista-gastos-client'

type Installment = {
  id: string
  numero: number
  valor_centavos: number
  data_competencia: string
  expenses: {
    id: string
    descricao: string | null
    parcelas: number
    divisao: string
    split_pagador_pct: number | null
    data_compra: string
    valor_total_centavos: number
    created_at: string
    origem: string
    pagador: { id: string; apelido: string } | null
    categoria: { id: number; nome: string; emoji: string } | null
  }
}

export async function ListaGastos({ currentApelido = '', apelidos }: { currentApelido?: string; apelidos?: [string, string] } = {}) {
  const supabase = createClient()
  const { start, end } = currentMonthRange()

  const { data, error } = await supabase
    .from('expense_installments')
    .select(`
      id,
      numero,
      valor_centavos,
      data_competencia,
      expenses!inner (
        id,
        descricao,
        parcelas,
        divisao,
        split_pagador_pct,
        data_compra,
        valor_total_centavos,
        created_at,
        origem,
        pagador:users!expenses_pagador_id_fkey ( id, apelido ),
        categoria:categories!expenses_categoria_id_fkey ( id, nome, emoji )
      )
    `)
    .gte('data_competencia', start)
    .lte('data_competencia', end)
    .eq('expenses.cancelado', false)
    .order('data_competencia', { ascending: false })

  if (error) {
    console.error('[ListaGastos]', error.message)
  }

  const installments = (data as unknown as Installment[]) ?? []

  return <ListaGastosClient installments={installments} currentApelido={currentApelido} apelidos={apelidos} />
}

export function ListaGastosSkeleton() {
  return (
    <section className="flex-1 px-4 pt-4 space-y-3">
      <div className="h-4 w-40 rounded animate-pulse" style={{ background: 'var(--bg-2)' }} />
      <div className="h-px" style={{ background: 'var(--border)' }} />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex justify-between items-center rounded-xl px-4 py-3 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded animate-pulse" style={{ background: 'var(--bg-2)' }} />
            <div className="h-4 w-28 rounded animate-pulse" style={{ background: 'var(--bg-2)' }} />
          </div>
          <div className="h-4 w-16 rounded animate-pulse" style={{ background: 'var(--bg-2)' }} />
        </div>
      ))}
    </section>
  )
}
