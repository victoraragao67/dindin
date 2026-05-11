'use client'

import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'
import { Fab } from '@/components/fab'
import { formatCurrency } from '@/lib/money'
import type { ResumoData } from '@/app/(app)/resumo/page'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

/* ── Helpers ─────────────────────────────────────────────────── */

function mesAnterior(mesStr: string): string {
  const [y, m] = mesStr.split('-').map(Number)
  const d = new Date(y, m - 2, 1) // m-1 = índice 0, então m-2 = mês anterior
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function mesPosterior(mesStr: string): string {
  const [y, m] = mesStr.split('-').map(Number)
  const d = new Date(y, m, 1) // m = índice 0 do próximo mês
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function currentMesStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }).slice(0, 7) + '-01'
}

function mesLabel(mesStr: string): string {
  const [y, m] = mesStr.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

function formatDataCompra(d: string): string {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

/* ── Componente principal ────────────────────────────────────── */

export function ResumoClient({ data, mesAtual }: { data: ResumoData; mesAtual: string }) {
  const router = useRouter()
  const isMesAtual = mesAtual === currentMesStr()

  function navMes(mes: string) {
    router.push(`/resumo?mes=${mes}`)
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-24 px-4 space-y-5 pt-4">

        {/* Seletor de mês */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navMes(mesAnterior(mesAtual))}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            ←
          </button>
          <div className="text-center">
            <p className="text-white font-semibold capitalize">{data.mesLabel}</p>
            <p className="text-emerald-400 font-bold text-lg">{formatCurrency(data.totalMes)}</p>
          </div>
          <button
            onClick={() => navMes(mesPosterior(mesAtual))}
            disabled={isMesAtual}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            →
          </button>
        </div>

        {/* ── Bloco: Por categoria ── */}
        <section className="space-y-3">
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Por categoria</h2>
          {data.categorias.length === 0 ? (
            <p className="text-slate-600 text-sm">Nenhum gasto neste mês.</p>
          ) : (
            <div className="space-y-2">
              {data.categorias.map(cat => {
                const pct = data.totalMes > 0
                  ? Math.round((cat.total_centavos / data.totalMes) * 100)
                  : 0
                return (
                  <div key={cat.categoria_id} className="rounded-xl bg-slate-800 px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cat.categoria_emoji}</span>
                        <span className="text-white text-sm">{cat.categoria_nome}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white text-sm font-medium">{formatCurrency(cat.total_centavos)}</span>
                        <span className="text-slate-500 text-xs ml-2">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Bloco: Divisão ── */}
        <section className="space-y-3">
          <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Divisão do mês</h2>
          <div className="rounded-xl bg-slate-800 px-4 py-4 space-y-3">
            {data.divisao.map(d => (
              <div key={d.apelido} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm">{d.apelido} pagou</span>
                  <div className="text-right">
                    <span className="text-white text-sm font-medium">{formatCurrency(d.total)}</span>
                    <span className="text-slate-500 text-xs ml-2">{d.pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bloco: Recorrentes por pessoa ── */}
        {data.recorrentes.length > 0 && (() => {
          // Agrupa por apelido
          const grupos = data.recorrentes.reduce<Record<string, typeof data.recorrentes>>((acc, r) => {
            if (!acc[r.apelido]) acc[r.apelido] = []
            acc[r.apelido].push(r)
            return acc
          }, {})
          const apelidos = Object.keys(grupos).sort()
          return (
            <section className="space-y-3">
              <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Recorrentes</h2>
              <div className="grid grid-cols-2 gap-3">
                {apelidos.map(apelido => {
                  const items = grupos[apelido]
                  const total = items.reduce((s, i) => s + i.valor_centavos, 0)
                  return (
                    <div key={apelido} className="rounded-xl bg-slate-800 px-3 py-3 space-y-2">
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">{apelido}</p>
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between gap-1">
                          <span className="text-sm truncate text-slate-300">
                            {item.categoria_emoji} {item.descricao}
                          </span>
                          <span className="text-white text-xs font-medium shrink-0">{formatCurrency(item.valor_centavos)}</span>
                        </div>
                      ))}
                      <div className="pt-1 border-t border-slate-700 flex justify-between">
                        <span className="text-slate-500 text-xs">Total</span>
                        <span className="text-emerald-400 text-xs font-semibold">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })()}

        {/* ── Bloco: Top gastos ── */}
        {data.topGastos.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Top gastos</h2>
            <div className="rounded-xl bg-slate-800 overflow-hidden divide-y divide-slate-700">
              {data.topGastos.map(g => (
                <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl shrink-0">{g.categoria_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">
                      {g.descricao || g.categoria_nome}
                    </p>
                    <p className="text-slate-500 text-xs">
                      {g.pagador_apelido} · {formatDataCompra(g.data_compra)}
                    </p>
                  </div>
                  <span className="text-white text-sm font-medium shrink-0">
                    {formatCurrency(g.valor_total_centavos)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Bloco: Últimos 6 meses ── */}
        {data.gastosMensais.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Últimos 6 meses</h2>
            <div className="rounded-xl bg-slate-800 px-2 py-4">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={data.gastosMensais.map(r => ({
                    mes:   mesLabel(r.mes),
                    valor: r.total_centavos / 100,
                  }))}
                  margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
                >
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => {
                      const n = Number(v)
                      return [`R$ ${n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`, 'Total']
                    }}
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {data.gastosMensais.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === data.gastosMensais.length - 1 ? '#10b981' : '#334155'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

      </div>

      {/* FAB → abre modal de novo gasto na home */}
      <Fab onClick={() => router.push('/?modal=novo-gasto')} />

      <BottomNav />
    </>
  )
}
