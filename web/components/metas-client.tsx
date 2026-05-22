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
  const [editando, setEditando] = useState<number | null>(null)
  const [rawInput, setRawInput] = useState('')
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
      <div className="flex-1 overflow-y-auto px-4 space-y-5 pt-4" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navMes(prev.mes, prev.ano)}
            className="p-2 transition-opacity active:opacity-60"
            style={{ color: 'var(--muted)' }}
          >
            ←
          </button>
          <div className="text-center">
            <p className="font-semibold capitalize" style={{ color: 'var(--ink)' }}>{mesLabel}</p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Metas de gasto</p>
          </div>
          <button
            onClick={() => navMes(next.mes, next.ano)}
            disabled={isFuturo}
            className="p-2 transition-opacity active:opacity-60 disabled:opacity-30"
            style={{ color: 'var(--muted)' }}
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
              <div
                key={cat.id}
                className="rounded-xl overflow-hidden border"
                style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
              >
                {/* Linha principal */}
                <button
                  onClick={() => isEdit ? fecharEdicao() : abrirEdicao(cat.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-opacity active:opacity-70"
                >
                  <span className="text-xl shrink-0">{cat.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm capitalize" style={{ color: 'var(--ink)' }}>{cat.nome}</p>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-1">
                    {meta ? (
                      <span className="text-sm font-medium" style={{ color: 'var(--sage)' }}>{formatCurrency(meta)}</span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>sem meta</span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>{isEdit ? '▴' : '▾'}</span>
                  </div>
                </button>

                {/* Painel de edição inline */}
                {isEdit && (
                  <div className="px-4 pb-4 pt-1 border-t space-y-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="relative">
                      <span
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
                        style={{ color: 'var(--muted)' }}
                      >
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        autoFocus
                        value={rawInput
                          ? formatCurrency(parseInt(rawInput, 10)).replace('R$ ', '').trim()
                          : ''}
                        onChange={e => {
                          const d = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(-7)
                          setRawInput(d)
                          setErro('')
                        }}
                        placeholder="0,00"
                        className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 border"
                        style={{
                          background: 'var(--bg-2)',
                          borderColor: 'var(--border)',
                          color: 'var(--ink)',
                        }}
                      />
                    </div>
                    {erro && <p className="text-xs" style={{ color: 'var(--coral)' }}>{erro}</p>}
                    <div className="flex gap-2">
                      {meta && (
                        <button
                          onClick={() => handleRemover(cat.id)}
                          disabled={loading}
                          className="px-3 py-2 rounded-lg text-xs transition-opacity disabled:opacity-50"
                          style={{ background: 'color-mix(in srgb, var(--coral) 12%, transparent)', color: 'var(--coral)' }}
                        >
                          Remover
                        </button>
                      )}
                      <button
                        onClick={fecharEdicao}
                        className="flex-1 py-2 rounded-lg text-sm"
                        style={{ background: 'var(--bg-2)', color: 'var(--muted)' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSalvar(cat.id)}
                        disabled={loading || !rawInput}
                        className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
                        style={{ background: 'var(--sage)' }}
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

        <p className="text-xs text-center pb-2" style={{ color: 'var(--muted)' }}>
          Toque em uma categoria para definir ou editar a meta do mês.
        </p>
      </div>

      <BottomNav />
    </>
  )
}
