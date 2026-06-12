'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BottomNav } from '@/components/bottom-nav'
import { formatCurrency } from '@/lib/money'
import { InfoTooltip } from '@/components/info-tooltip'
import type { ResumoData, CompraItem, ParcelaEmAberto, CustoRealRow } from '@/app/(app)/resumo/page'
import { RitmoCard } from '@/components/ritmo-card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'


/* ── Helpers ─────────────────────────────────────────────────── */

function mesAnterior(mesStr: string): string {
  const [y, m] = mesStr.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function mesPosterior(mesStr: string): string {
  const [y, m] = mesStr.split('-').map(Number)
  const d = new Date(y, m, 1)
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

type CategoriaRow = ResumoData['categorias'][number]
type DivisaoItem  = ResumoData['divisao'][number]

export function ResumoClient({ data, mesAtual }: { data: ResumoData; mesAtual: string }) {
  const router = useRouter()
  const isMesAtual = mesAtual === currentMesStr()

  const [catAberta, setCatAberta]             = useState<CategoriaRow | null>(null)
  const [pessoaAberta, setPessoaAberta]       = useState<DivisaoItem | null>(null)
  const [modoDivisao, setModoDivisao]         = useState<'custo_total' | 'pagou'>('custo_total')
  const [pessoaExpandida, setPessoaExpandida] = useState<string | null>(null)

  function navMes(mes: string) {
    router.push(`/resumo?mes=${mes}`)
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 space-y-5 pt-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

        {/* Seletor de mês */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navMes(mesAnterior(mesAtual))}
            className="p-2 transition-opacity active:opacity-60"
            style={{ color: 'var(--muted)' }}
          >
            ←
          </button>
          <div className="text-center">
            <p className="font-semibold capitalize" style={{ color: 'var(--ink)' }}>{data.mesLabel}</p>
            <p className="font-bold text-lg" style={{ color: 'var(--sage)' }}>{formatCurrency(data.totalMes)}</p>
          </div>
          <button
            onClick={() => navMes(mesPosterior(mesAtual))}
            disabled={isMesAtual}
            className="p-2 transition-opacity active:opacity-60 disabled:opacity-30"
            style={{ color: 'var(--muted)' }}
          >
            →
          </button>
        </div>

        {/* ── Bloco: Por categoria ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Por categoria</h2>
          {data.categorias.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhum gasto neste mês.</p>
          ) : (
            <div className="space-y-2">
              {data.categorias.map(cat => {
                const pct = data.totalMes > 0
                  ? Math.round((cat.total_centavos / data.totalMes) * 100)
                  : 0
                const meta = data.metasPorCategoria?.[cat.categoria_id]
                const metaPct = meta ? Math.round((cat.total_centavos / meta) * 100) : null
                const barColor = metaPct === null
                  ? 'var(--sage)'
                  : metaPct > 90 ? 'var(--coral)' : metaPct > 70 ? '#f59e0b' : 'var(--sage)'

                const semGasto = cat.total_centavos === 0
                return (
                  <button
                    key={cat.categoria_id}
                    onClick={() => !semGasto && setCatAberta(cat)}
                    className="w-full rounded-xl px-4 py-3 space-y-1.5 text-left border transition-opacity active:opacity-70"
                    style={{
                      background: 'var(--card)',
                      borderColor: 'var(--border)',
                      opacity: semGasto ? 0.45 : 1,
                      cursor: semGasto ? 'default' : 'pointer',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cat.categoria_emoji}</span>
                        <span className="text-sm capitalize" style={{ color: 'var(--ink)' }}>{cat.categoria_nome}</span>
                      </div>
                      <div className="text-right">
                        {meta ? (
                          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                            {formatCurrency(cat.total_centavos)}
                            <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>/ {formatCurrency(meta)}</span>
                          </span>
                        ) : (
                          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(cat.total_centavos)}</span>
                        )}
                        {!semGasto && (
                          <span className="text-xs ml-2" style={{ color: metaPct !== null && metaPct > 90 ? 'var(--coral)' : 'var(--muted)' }}>
                            {metaPct !== null ? `${metaPct}%` : `${pct}%`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(metaPct ?? pct, 100)}%`, background: barColor }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Bloco: Ritmo do mês (preditiva) ── */}
        {data.preditiva.length > 0 && (
          <RitmoCard preditiva={data.preditiva} insightResumo={data.insightResumo} />
        )}

        {/* ── Bloco: Divisão ── */}
        <section className="space-y-3">
          {/* Header com toggle 2 modos e tooltip */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Divisão do mês</h2>
              <InfoTooltip
                titulo={
                  modoDivisao === 'custo_total' ? 'Custo por pessoa' : 'Quanto pagou'
                }
                explicacao={
                  modoDivisao === 'custo_total'
                    ? 'O que foi destinado para cada um, independente de quem pagou. Soma variável + recorrente, já aplicando as regras de divisão de cada gasto. Se tudo foi 50/50, o custo será igual para os dois.'
                    : 'Quanto cada um desembolsou fisicamente no mês — variável e recorrente somados. Independe da divisão combinada: se Gaia pagou o jantar do casal, aparece tudo no dela.'
                }
              />
            </div>
            {/* Toggle 2 modos */}
            <div className="flex rounded-lg overflow-hidden border text-xs shrink-0" style={{ borderColor: 'var(--border)' }}>
              {(['custo_total', 'pagou'] as const).map(modo => (
                <button
                  key={modo}
                  type="button"
                  onClick={() => { setModoDivisao(modo); setPessoaExpandida(null) }}
                  style={{
                    padding:    '4px 8px',
                    background: modoDivisao === modo ? 'var(--ink)' : 'var(--bg-2)',
                    color:      modoDivisao === modo ? 'var(--bg)' : 'var(--muted)',
                    fontWeight: modoDivisao === modo ? 600 : 400,
                    border:     'none',
                    cursor:     'pointer',
                    transition: 'background 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {modo === 'custo_total' ? 'Custo por pessoa' : 'Quanto pagou'}
                </button>
              ))}
            </div>
          </div>

          {/* Aba "Quanto pagou" — desembolso físico (variável + recorrente) */}
          {modoDivisao === 'pagou' && (
            <div className="rounded-xl px-4 py-4 space-y-3 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              {data.divisao.length === 0 ? (
                <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>Sem gastos neste mês.</p>
              ) : data.divisao.map(d => (
                <button
                  key={d.apelido}
                  onClick={() => setPessoaAberta(d)}
                  className="w-full text-left space-y-1 transition-opacity active:opacity-70"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--muted)' }}>
                      {d.apelido} pagou
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(d.total)}</span>
                      <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>{d.pct}%</span>
                      <span className="text-xs ml-1" style={{ color: 'var(--muted)' }}>›</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${d.pct}%`, background: 'var(--coral)' }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Aba "Custo por pessoa" — custo real (variável + recorrente, splits aplicados) */}
          {modoDivisao === 'custo_total' && (
            <div className="rounded-xl px-4 py-4 space-y-3 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              {data.custoRealCompleto.length === 0 ? (
                <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>Sem dados para este mês.</p>
              ) : data.custoRealCompleto.map(d => {
                const expandido = pessoaExpandida === d.apelido
                return (
                  <div key={d.apelido} className="space-y-1.5">
                    <button
                      onClick={() => setPessoaExpandida(expandido ? null : d.apelido)}
                      className="w-full text-left space-y-1 transition-opacity active:opacity-70"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: 'var(--muted)' }}>
                          {d.apelido}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(d.custo_total)}</span>
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>{d.pct}%</span>
                          <span className="text-xs" style={{ color: 'var(--muted)', transform: expandido ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>›</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${d.pct}%`, background: 'color-mix(in srgb, var(--sage) 70%, var(--coral))' }}
                        />
                      </div>
                    </button>

                    {/* Breakdown expansível: variável vs. recorrente */}
                    {expandido && (
                      <div
                        className="rounded-lg px-3 py-2.5 space-y-1.5 ml-0"
                        style={{ background: 'var(--bg-2)' }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>↳ variável</span>
                          <span className="text-xs font-medium" style={{ color: 'var(--coral)' }}>
                            {formatCurrency(d.custo_variavel)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs" style={{ color: 'var(--muted)' }}>↳ recorrente</span>
                          <span className="text-xs font-medium" style={{ color: 'var(--sage)' }}>
                            {formatCurrency(d.custo_recorrente)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Bloco: Recorrentes por pessoa ── */}
        {data.recorrentes.length > 0 && (() => {
          const grupos = data.recorrentes.reduce<Record<string, typeof data.recorrentes>>((acc, r) => {
            if (!acc[r.apelido]) acc[r.apelido] = []
            acc[r.apelido].push(r)
            return acc
          }, {})
          const apelidos = Object.keys(grupos).sort()
          return (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Recorrentes</h2>
                <a href="/recorrentes" className="text-xs transition-opacity active:opacity-60" style={{ color: 'var(--muted)' }}>
                  Ver todos →
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {apelidos.map(apelido => {
                  const items = grupos[apelido]
                  const total = items.reduce((s, i) => s + i.valor_centavos, 0)
                  return (
                    <div key={apelido} className="rounded-xl px-3 py-3 space-y-2 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>{apelido}</p>
                      {items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between gap-1">
                          <span className="text-sm truncate" style={{ color: 'var(--muted)' }}>
                            {item.categoria_emoji} {item.descricao}
                          </span>
                          <span className="text-xs font-medium shrink-0" style={{ color: 'var(--ink)' }}>{formatCurrency(item.valor_centavos)}</span>
                        </div>
                      ))}
                      <div className="pt-1 border-t flex justify-between" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>Total</span>
                        <span className="text-xs font-semibold" style={{ color: 'var(--sage)' }}>{formatCurrency(total)}</span>
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
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Top gastos</h2>
            <div className="rounded-xl overflow-hidden border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              {data.topGastos.map((g, i) => (
                <div
                  key={g.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderTop: i > 0 ? `1px solid var(--border)` : undefined }}
                >
                  <span className="text-xl shrink-0">{g.categoria_emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>
                      {g.descricao || g.categoria_nome}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                      {g.pagador_apelido} · {formatDataCompra(g.data_compra)}
                    </p>
                  </div>
                  <span className="text-sm font-medium shrink-0" style={{ color: 'var(--ink)' }}>
                    {formatCurrency(g.valor_total_centavos)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Bloco: Parcelas em aberto ── */}
        {data.parcelasEmAberto.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
              Parcelas em aberto
            </h2>
            <div className="rounded-xl overflow-hidden border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              {data.parcelasEmAberto.map((p, i) => {
                const totalRestante = p.parcelas_restantes * p.valor_parcela
                const progressPct   = p.num_parcelas > 0
                  ? Math.round((p.parcela_atual / p.num_parcelas) * 100)
                  : 0
                const labelParcela  = p.num_parcelas > 0
                  ? `${p.parcela_atual}/${p.num_parcelas}`
                  : `${p.parcelas_restantes} restante${p.parcelas_restantes !== 1 ? 's' : ''}`

                return (
                  <div
                    key={p.expense_id}
                    className="px-4 py-3 space-y-2"
                    style={{ borderTop: i > 0 ? `1px solid var(--border)` : undefined }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">{p.categoria_emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                          {p.descricao || p.categoria_nome}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {p.pagador_apelido} · {p.parcelas_restantes} parcela{p.parcelas_restantes !== 1 ? 's' : ''} restante{p.parcelas_restantes !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                          {formatCurrency(p.valor_parcela)}
                          <span className="text-xs font-normal" style={{ color: 'var(--muted)' }}>/mês</span>
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>
                          {labelParcela} · {formatCurrency(totalRestante)} total
                        </p>
                      </div>
                    </div>
                    {/* barra de progresso das parcelas */}
                    {p.num_parcelas > 0 && (
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%`, background: 'var(--sage)' }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Bloco: Últimos 6 meses ── */}
        {data.gastosMensais.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Últimos 6 meses</h2>
            <div className="rounded-xl px-2 py-4 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={data.gastosMensais.map(r => ({
                    mes:     mesLabel(r.mes),
                    mesStr:  r.mes,
                    valor:   r.total_centavos / 100,
                  }))}
                  margin={{ top: 16, right: 8, left: 8, bottom: 0 }}
                  onClick={(e: any) => {
                    const mesStr = e?.activePayload?.[0]?.payload?.mesStr
                    if (mesStr) router.push(`/resumo?mes=${mesStr}`)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: '#8A8078', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => {
                      const n = Number(v)
                      return [`R$ ${n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`, 'Total']
                    }}
                    contentStyle={{ background: '#FFFDF7', border: '1px solid #E2DAD0', borderRadius: 8, color: '#1A1612', fontSize: 12 }}
                    cursor={{ fill: 'rgba(0,0,0,0.08)' }}
                  />
                  <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {data.gastosMensais.map((r, i) => (
                      <Cell
                        key={i}
                        fill={r.mes === mesAtual ? '#7A9E7E' : '#E2DAD0'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

      </div>

      <BottomNav />

      {/* ── Drawer de detalhes da categoria ── */}
      {catAberta && (() => {
        const itens = data.compras.filter(c => c.categoria_id === catAberta.categoria_id)
        const porPagador: Record<string, number> = {}
        for (const c of itens) porPagador[c.pagador_apelido] = (porPagador[c.pagador_apelido] ?? 0) + c.installment_valor
        const totalCat = itens.reduce((s, c) => s + c.installment_valor, 0)
        return (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setCatAberta(null)} aria-hidden="true" />
            <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl max-h-[80dvh] flex flex-col" style={{ background: 'var(--card)' }}>
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{catAberta.categoria_emoji}</span>
                  <h2 className="font-semibold capitalize" style={{ color: 'var(--ink)' }}>{catAberta.categoria_nome}</h2>
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>· {data.mesLabel}</span>
                </div>
                <button onClick={() => setCatAberta(null)} className="p-1" style={{ color: 'var(--muted)' }}>✕</button>
              </div>
              {/* Resumo por pagador */}
              {Object.keys(porPagador).length > 0 && (
                <div className="px-5 py-3 border-b flex gap-6 shrink-0" style={{ borderColor: 'var(--border)' }}>
                  {Object.entries(porPagador).map(([apelido, total]) => (
                    <div key={apelido}>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{apelido} pagou</p>
                      <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{formatCurrency(total)}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{totalCat > 0 ? Math.round(total / totalCat * 100) : 0}%</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Lista de compras */}
              <div className="overflow-y-auto flex-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {itens.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>Sem compras nesta categoria.</p>
                ) : (
                  itens.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-5 py-3 gap-3"
                      style={{ borderTop: i > 0 ? `1px solid var(--border)` : undefined }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>{c.descricao || catAberta.categoria_nome}</p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{c.pagador_apelido} · {formatDataCompra(c.data_competencia)}</p>
                      </div>
                      <span className="text-sm font-medium shrink-0" style={{ color: 'var(--ink)' }}>{formatCurrency(c.installment_valor)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )
      })()}

      {/* ── Drawer de breakdown por categoria de uma pessoa ── */}
      {pessoaAberta && (() => {
        const itens = data.compras.filter(c => c.pagador_apelido === pessoaAberta.apelido)
        const porCat: Record<number, { nome: string; emoji: string; total: number }> = {}
        for (const c of itens) {
          if (!porCat[c.categoria_id]) porCat[c.categoria_id] = { nome: c.categoria_nome, emoji: c.categoria_emoji, total: 0 }
          porCat[c.categoria_id].total += c.installment_valor
        }
        const cats = Object.values(porCat).sort((a, b) => b.total - a.total)
        const totalPessoa = itens.reduce((s, c) => s + c.installment_valor, 0)
        return (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setPessoaAberta(null)} aria-hidden="true" />
            <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl max-h-[80dvh] flex flex-col" style={{ background: 'var(--card)' }}>
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-2 pb-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
                <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>
                  {pessoaAberta.apelido} · {formatCurrency(totalPessoa)}
                  <span className="text-sm font-normal ml-2" style={{ color: 'var(--muted)' }}>em {data.mesLabel}</span>
                </h2>
                <button onClick={() => setPessoaAberta(null)} className="p-1" style={{ color: 'var(--muted)' }}>✕</button>
              </div>
              {/* Lista por categoria com barra */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                {cats.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>Sem gastos registrados.</p>
                ) : (
                  cats.map(cat => {
                    const pct = totalPessoa > 0 ? Math.round(cat.total / totalPessoa * 100) : 0
                    return (
                      <div key={cat.nome} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{cat.emoji}</span>
                            <span className="text-sm capitalize" style={{ color: 'var(--ink)' }}>{cat.nome}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{formatCurrency(cat.total)}</span>
                            <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>{pct}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-2)' }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--sage)' }} />
                        </div>
                      </div>
                    )
                  })
                )}
                {/* Total */}
                <div className="pt-2 border-t flex justify-between" style={{ borderColor: 'var(--border)' }}>
                  <span className="text-sm" style={{ color: 'var(--muted)' }}>Total</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>{formatCurrency(totalPessoa)}</span>
                </div>
              </div>
            </div>
          </>
        )
      })()}
    </>
  )
}
