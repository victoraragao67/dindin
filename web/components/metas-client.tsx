'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/money'
import { salvarMeta, removerMeta } from '@/app/(app)/actions'
import { BottomNav } from '@/components/bottom-nav'

type Categoria = { id: number; nome: string; emoji: string }

type Props = {
  categorias:          Categoria[]
  metasPorCategoria:   Record<number, number>
  mes:                 number
  ano:                 number
}

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function mesAnterior(mes: number, ano: number) {
  return mes === 1 ? { mes: 12, ano: ano - 1 } : { mes: mes - 1, ano }
}
function mesPosterior(mes: number, ano: number) {
  return mes === 12 ? { mes: 1, ano: ano + 1 } : { mes: mes + 1, ano }
}

export function MetasClient({ categorias, metasPorCategoria, mes, ano }: Props) {
  const router = useRouter()
  const [metas, setMetas] = useState<Record<number, number>>(metasPorCategoria)
  const [editando, setEditando] = useState<number | null>(null)     // categoria_id
  const [rawInput, setRawInput] = useState('')                       // dígitos em centavos
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const mesLabel = `${MESES[mes - 1]}/${ano}`

  function navMes(m: number, a: number) {
    router.push(`/metas?mes=${m}&ano=${a}`)
  }

  function abrirEdicao(catId: number) {
    const atual = metas[catId]
    setRawInput(atual ? String(atual) : '')
    setEditando(catId)
    setErro('')
  }

  function fecharEdicao() {
    setEditando(null)
    setRawInput('')
    setErro('')
  }

  async function handleSalvar(catId: number) {
    const centavos = parseInt(rawInput, 10)
    if (!centavos || centavos <= 0) { setErro('Informe um valor válido.'); return }
    if (centavos > 50_000_00) { setErro('Valor máximo: R$ 50.000.'); return }

    setLoading(true)
    const res = await salvarMeta(catId, centavos, mes, ano)
    setLoading(false)

    if (res.error) { setErro(res.error); return }
    setMetas(prev => ({ ...prev, [catId]: centavos }))
    fecharEdicao()
  }

  async function handleRemover(catId: number) {
    setLoading(true)
    const res = await removerMeta(catId, mes, ano)
    setLoading(false)
    if (res.error) { setErro(res.error); return }
    setMetas(prev => {
      const next = { ...prev }
      delete next[catId]
      return next
    })
    fecharEdicao()
  }

  const prev = mesAnterior(mes, ano)
  const next = mesPosterior(mes, ano)
  const now  = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const isFuturo = ano > now.getFullYear() || (ano === now.getFullYear() && mes > now.getMonth() + 1)

  return (
    <>
      <div className="flex-1 overflow-y-auto pb-24 px-4 space-y-5 pt-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navMes(prev.mes, prev.ano)} className="p-2 text-slate-400 hover:text-white transition-colors">←</button>
          <div className="text-center">
            <p className="text-white font-semibold capitalize">{mesLabel}</p>
            <p className="text-slate-400 text-xs">Metas de gasto</p>
          </div>
          <button
            onClick={() => navMes(next.mes, next.ano)}
            disabled={isFuturo}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
          >
            →
          </button>
        </div>

        {/* Lista de categorias */}
        <section className="space-y-2">
          {categorias.map(cat => {
            const meta = metas[cat.id]
            const isEdit = editando === cat.id

            return (
              <div key={cat.id} className="rounded-xl bg-slate-800 overflow-hidden">
                {/* Linha principal */}
                <button
                  onClick={() => isEdit ? fecharEdicao() : abrirEdicao(cat.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700 transition-colors"
                >
                  <span className="text-xl shrink-0">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm capitalize">{cat.nome}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {meta ? (
                      <span className="text-emerald-400 text-sm font-medium">{formatCurrency(meta)}</span>
                    ) : (
                      <span className="text-slate-500 text-xs">sem meta</span>
                    )}
                    <span className="text-slate-500 text-xs ml-2">{isEdit ? '▴' : '▾'}</span>
                  </div>
                </button>

                {/* Painel de edição inline */}
                {isEdit && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-700 space-y-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">R$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        autoFocus
                        value={rawInput
                          ? formatCurrency(parseInt(rawInput, 10)).replace('R$ ', '').trim()
                          : ''}
                        onChange={e => {
                          const d = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(-7)
                          setRawInput(d)
                          setErro('')
                        }}
                        placeholder="0,00"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    {erro && <p className="text-red-400 text-xs">{erro}</p>}
                    <div className="flex gap-2">
                      {meta && (
                        <button
                          onClick={() => handleRemover(cat.id)}
                          disabled={loading}
                          className="px-3 py-2 rounded-lg bg-red-900/40 text-red-400 text-xs hover:bg-red-900/60 transition-colors"
                        >
                          Remover
                        </button>
                      )}
                      <button onClick={fecharEdicao} className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 text-sm">
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSalvar(cat.id)}
                        disabled={loading || !rawInput}
                        className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                      >
                        {loading ? 'Salvando…' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </section>

        <p className="text-slate-600 text-xs text-center pb-2">
          Toque em uma categoria para definir ou editar a meta do mês.
        </p>
      </div>

      <BottomNav />
    </>
  )
}
