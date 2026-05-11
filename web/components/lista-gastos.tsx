import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/money'
import { formatDate, currentMonthLabel, currentMonthRange } from '@/lib/date'

type Installment = {
  id: string
  numero: number
  valor_centavos: number
  data_competencia: string
  expenses: {
    id: string
    descricao: string | null
    parcelas: number
    created_at: string
    pagador: { id: string; apelido: string } | null
    categoria: { nome: string; emoji: string } | null
  }
}

export async function ListaGastos() {
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
        created_at,
        pagador:users!expenses_pagador_id_fkey ( id, apelido ),
        categoria:categories!expenses_categoria_id_fkey ( nome, emoji )
      )
    `)
    .gte('data_competencia', start)
    .lte('data_competencia', end)
    .order('data_competencia', { ascending: false })

  if (error) {
    console.error('[ListaGastos]', error.message)
  }

  const installments = (data as unknown as Installment[]) ?? []

  // Total do mês
  const totalMes = installments.reduce((acc, i) => acc + i.valor_centavos, 0)

  // Ordenar por data_competencia DESC, depois created_at DESC dentro do mesmo dia
  const sorted = [...installments].sort((a, b) => {
    if (b.data_competencia !== a.data_competencia) {
      return b.data_competencia.localeCompare(a.data_competencia)
    }
    return b.expenses.created_at.localeCompare(a.expenses.created_at)
  })

  // Agrupar por dia
  const grupos = new Map<string, Installment[]>()
  for (const item of sorted) {
    const key = item.data_competencia
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(item)
  }

  const mesLabel = currentMonthLabel()

  return (
    <section className="flex-1 overflow-y-auto pb-24 px-4">
      {/* Resumo do mês */}
      <div className="py-4">
        <p className="text-slate-400 text-sm capitalize">
          {mesLabel} · <span className="text-white font-medium">{formatCurrency(totalMes)} gasto</span>
        </p>
        <div className="mt-2 h-px bg-slate-700" />
      </div>

      {/* Lista vazia */}
      {sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <span className="text-5xl">🪹</span>
          <p className="text-slate-400 text-sm leading-relaxed">
            Nenhum gasto registrado este mês.
            <br />
            Toque em <strong className="text-white">+</strong> para começar!
          </p>
        </div>
      )}

      {/* Grupos por dia */}
      {Array.from(grupos.entries()).map(([dateStr, items]) => {
        const label = formatDate(new Date(dateStr + 'T12:00:00'))
        return (
          <div key={dateStr} className="mb-5">
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-2">
              {label}
            </p>
            <div className="space-y-1">
              {items.map((item) => {
                const { expenses: exp } = item
                const emoji = exp.categoria?.emoji ?? '📦'
                const nome  = exp.categoria?.nome ?? 'Outros'
                const apelido = exp.pagador?.apelido ?? '?'
                const isParcelado = exp.parcelas > 1

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg bg-slate-800 px-4 py-3"
                  >
                    {/* Esquerda: emoji + nome + parcela */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl shrink-0">{emoji}</span>
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">
                          {exp.descricao || nome}
                          {isParcelado && (
                            <span className="text-slate-400 text-xs ml-1">
                              · {item.numero}/{exp.parcelas}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {/* Direita: valor + apelido */}
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-white text-sm font-medium">
                        {formatCurrency(item.valor_centavos)}
                      </span>
                      <span className="text-slate-400 text-xs">{apelido}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}

export function ListaGastosSkeleton() {
  return (
    <section className="flex-1 px-4 pt-4 space-y-3">
      <div className="h-4 w-40 rounded bg-slate-700 animate-pulse" />
      <div className="h-px bg-slate-700" />
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex justify-between items-center bg-slate-800 rounded-lg px-4 py-3">
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded bg-slate-700 animate-pulse" />
            <div className="h-4 w-28 rounded bg-slate-700 animate-pulse" />
          </div>
          <div className="h-4 w-16 rounded bg-slate-700 animate-pulse" />
        </div>
      ))}
    </section>
  )
}
