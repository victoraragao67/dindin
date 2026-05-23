'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/money'
import { salvarMeta, removerMeta } from '@/app/(app)/actions'

type Categoria = { id: number; nome: string; emoji: string }

type MetaItem = {
  categoria: Categoria
  gasto: number      // centavos gastos no mês
  meta: number       // centavos de meta definida (0 = sem meta)
}

type Props = {
  itens: MetaItem[]          // com meta ou com gasto
  semMeta: Categoria[]       // têm gasto mas sem meta
  mes: number
  ano: number
}

export function MetasVariaveisClient({ itens, semMeta, mes, ano }: Props) {
  const router = useRouter()
  const [editando, setEditando] = useState<number | null>(null)
  const [rawInput, setRawInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  // override local para refletir mudanças otimisticamente
  const [overrides, setOverrides] = useState<Record<number, number>>({})

  function abrirEdicao(catId: number, metaAtual: number) {
    setRawInput(metaAtual > 0 ? String(metaAtual) : '')
    setEditando(catId)
    setErro('')
  }

  function fechar() {
    setEditando(null)
    setRawInput('')
    setErro('')
  }

  async function handleSalvar(catId: number) {
    const centavos = parseInt(rawInput, 10)
    if (!centavos || centavos <= 0) { setErro('Informe um valor válido.'); return }
    if (centavos > 50_000_00) { setErro('Máximo R$ 50.000.'); return }
    setLoading(true)
    const res = await salvarMeta(catId, centavos, mes, ano)
    setLoading(false)
    if (res.error) { setErro(res.error); return }
    setOverrides(prev => ({ ...prev, [catId]: centavos }))
    fechar()
    router.refresh()
  }

  async function handleRemover(catId: number) {
    setLoading(true)
    const res = await removerMeta(catId, mes, ano)
    setLoading(false)
    if (res.error) { setErro(res.error); return }
    setOverrides(prev => ({ ...prev, [catId]: 0 }))
    fechar()
    router.refresh()
  }

  // Merge overrides
  const resolved = itens.map(item => ({
    ...item,
    meta: overrides[item.categoria.id] !== undefined ? overrides[item.categoria.id] : item.meta,
  }))

  // Também incluir semMeta que foram adicionadas via override
  const semMetaResolved = semMeta.filter(cat => !overrides[cat.id])

  return (
    <div>
      {/* Cards de meta por categoria */}
      {resolved.map(item => {
        const { categoria, gasto, meta } = item
        const pct = meta > 0 ? Math.min((gasto / meta) * 100, 100) : 0
        const realPct = meta > 0 ? (gasto / meta) * 100 : 0
        const status = realPct > 100 ? 'estourou' : realPct > 80 ? 'atencao' : 'ok'
        const barColor = status === 'estourou' ? 'var(--coral)' : status === 'atencao' ? 'var(--blush)' : 'var(--sage)'
        const statusLabel = status === 'estourou' ? '⚠ Estourou' : status === 'atencao' ? '⚡ Atenção' : '✓ ok'
        const isEdit = editando === categoria.id

        return (
          <div key={categoria.id} style={{ margin: '0 16px 10px' }}>
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              overflow: 'hidden',
            }}>
              {/* Linha principal */}
              <div style={{ padding: '14px 16px' }}>
                {/* Topo: nome + botão editar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                    {categoria.emoji} {categoria.nome}
                  </span>
                  <button
                    onClick={() => isEdit ? fechar() : abrirEdicao(categoria.id, meta)}
                    style={{ fontSize: 11, color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {isEdit ? 'Fechar' : meta > 0 ? 'Editar' : '+ Definir meta'}
                  </button>
                </div>

                {meta > 0 ? (
                  <>
                    {/* Valores */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{
                        fontFamily: 'var(--font-fraunces), Georgia, serif',
                        fontSize: 18, fontWeight: 700, color: 'var(--ink)',
                      }}>
                        {formatCurrency(gasto)}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>meta: {formatCurrency(meta)}</span>
                    </div>
                    {/* Barra de progresso */}
                    <div style={{ height: 7, background: 'var(--bg-2)', borderRadius: 100, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: barColor,
                        borderRadius: 100,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                    {/* Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: barColor, fontWeight: 600 }}>{statusLabel}</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>{Math.round(realPct)}%</span>
                    </div>
                  </>
                ) : (
                  /* Sem meta mas com gasto */
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontFamily: 'var(--font-fraunces), Georgia, serif',
                      fontSize: 16, fontWeight: 600, color: 'var(--ink)',
                    }}>
                      {formatCurrency(gasto)} gastos
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>sem meta</span>
                  </div>
                )}
              </div>

              {/* Painel de edição inline */}
              {isEdit && (
                <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-2)' }}>
                  <div style={{ position: 'relative', marginBottom: 10 }}>
                    <span style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 13, color: 'var(--muted)', pointerEvents: 'none',
                    }}>R$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoFocus
                      value={rawInput
                        ? formatCurrency(parseInt(rawInput, 10)).replace('R$ ', '').replace('R$ ', '').trim()
                        : ''}
                      onChange={e => {
                        const d = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(-7)
                        setRawInput(d)
                        setErro('')
                      }}
                      placeholder="0,00"
                      style={{
                        width: '100%',
                        paddingLeft: 36, paddingRight: 12,
                        paddingTop: 10, paddingBottom: 10,
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        fontSize: 15, color: 'var(--ink)',
                        outline: 'none',
                      }}
                    />
                  </div>
                  {erro && <p style={{ fontSize: 12, color: 'var(--coral)', marginBottom: 8 }}>{erro}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {meta > 0 && (
                      <button
                        onClick={() => handleRemover(categoria.id)}
                        disabled={loading}
                        style={{
                          padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: 'color-mix(in srgb, var(--coral) 12%, transparent)',
                          color: 'var(--coral)', fontSize: 12,
                          opacity: loading ? 0.5 : 1,
                        }}
                      >Remover</button>
                    )}
                    <button
                      onClick={fechar}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                        background: 'var(--card)', border: '1px solid var(--border)',
                        color: 'var(--muted)', fontSize: 13,
                      }}
                    >Cancelar</button>
                    <button
                      onClick={() => handleSalvar(categoria.id)}
                      disabled={loading || !rawInput}
                      style={{
                        flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: 'var(--sage)', color: '#fff', fontSize: 13, fontWeight: 600,
                        opacity: loading || !rawInput ? 0.5 : 1,
                      }}
                    >{loading ? 'Salvando…' : 'Salvar'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Categorias com gasto mas sem meta */}
      {semMetaResolved.length > 0 && (
        <div style={{
          margin: '4px 16px 0',
          padding: '12px 16px',
          background: 'var(--bg-2)',
          borderRadius: 12,
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Com gasto, sem meta definida:</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {semMetaResolved.map(cat => (
              <button
                key={cat.id}
                onClick={() => abrirEdicao(cat.id, 0)}
                style={{
                  fontSize: 12, padding: '5px 14px',
                  background: 'var(--card)',
                  border: editando === cat.id ? '1.5px solid var(--coral)' : '1px solid var(--border)',
                  borderRadius: 100, color: 'var(--ink)', cursor: 'pointer',
                }}
              >
                {cat.emoji} {cat.nome} +
              </button>
            ))}
          </div>
          {/* Painel de edição para categorias sem meta */}
          {semMetaResolved.some(c => editando === c.id) && (() => {
            const cat = semMetaResolved.find(c => c.id === editando)!
            return (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                  Meta para {cat.emoji} {cat.nome}:
                </p>
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, color: 'var(--muted)', pointerEvents: 'none',
                  }}>R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoFocus
                    value={rawInput
                      ? formatCurrency(parseInt(rawInput, 10)).replace('R$ ', '').replace('R$ ', '').trim()
                      : ''}
                    onChange={e => {
                      const d = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '').slice(-7)
                      setRawInput(d)
                      setErro('')
                    }}
                    placeholder="0,00"
                    style={{
                      width: '100%',
                      paddingLeft: 36, paddingRight: 12,
                      paddingTop: 10, paddingBottom: 10,
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 15, color: 'var(--ink)',
                      outline: 'none',
                    }}
                  />
                </div>
                {erro && <p style={{ fontSize: 12, color: 'var(--coral)', marginBottom: 8 }}>{erro}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={fechar}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                      background: 'var(--card)', border: '1px solid var(--border)',
                      color: 'var(--muted)', fontSize: 13,
                    }}
                  >Cancelar</button>
                  <button
                    onClick={() => handleSalvar(cat.id)}
                    disabled={loading || !rawInput}
                    style={{
                      flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'var(--sage)', color: '#fff', fontSize: 13, fontWeight: 600,
                      opacity: loading || !rawInput ? 0.5 : 1,
                    }}
                  >{loading ? 'Salvando…' : 'Salvar'}</button>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
