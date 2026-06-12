'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/money'
import { salvarMeta, removerMeta, copiarMetasMesAnterior } from '@/app/(app)/actions'
import type { PreditivaCategoria } from '@/lib/preditiva'

const PREDITIVA_COR: Record<string, string> = {
  estourou:     'var(--coral)',
  vai_estourar: '#e68a2e',
  no_limite:    '#c4803a',
  ok:           'var(--sage)',
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

type Categoria = { id: number; nome: string; emoji: string }

type MetaItem = {
  categoria:  Categoria
  gasto:      number   // centavos variáveis gastos no mês
  recorrente: number   // centavos de recorrentes previstos
  meta:       number   // centavos de meta (> 0)
}

type Props = {
  itens:             MetaItem[]
  semMeta:           Categoria[]
  totalMetas:        number
  totalComprometido: number
  sobraGeral:        number
  mes:               number
  ano:               number
  preditivaPorCat?:  Record<number, PreditivaCategoria>
}

export function MetasV2Client({
  itens,
  semMeta,
  totalMetas,
  totalComprometido,
  sobraGeral,
  mes,
  ano,
  preditivaPorCat,
}: Props) {
  const router = useRouter()
  const [editando, setEditando]     = useState<number | null>(null)
  const [rawInput, setRawInput]     = useState('')
  const [loading, setLoading]       = useState(false)
  const [loadingCopy, setLoadingCopy] = useState(false)
  const [erro, setErro]             = useState('')
  const [overrides, setOverrides]   = useState<Record<number, number>>({})

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
    if (centavos > 50_000_00)        { setErro('Máximo R$ 50.000.');       return }
    setLoading(true)
    const res = await salvarMeta(catId, centavos, mes, ano)
    setLoading(false)
    if (res.error) { setErro(res.error); return }
    setOverrides(prev => ({ ...prev, [catId]: centavos }))
    fechar()
    router.refresh()
  }

  async function handleCopiarMesAnterior() {
    setLoadingCopy(true)
    const res = await copiarMetasMesAnterior(mes, ano)
    setLoadingCopy(false)
    if (res.error) { setErro(res.error); return }
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

  // Aplica overrides optimistas
  const resolved = itens.map(item => ({
    ...item,
    meta: overrides[item.categoria.id] !== undefined ? overrides[item.categoria.id] : item.meta,
  })).filter(item => item.meta > 0)

  // semMeta com overrides aplicados
  const semMetaFinal = [
    ...semMeta.filter(cat => !overrides[cat.id]),
    // categorias que tinham meta e foram removidas via override
    ...itens
      .filter(i => overrides[i.categoria.id] === 0)
      .map(i => i.categoria),
  ]

  return (
    <div>
      {/* ── Card de resumo ─────────────────────────────────── */}
      <div style={{
        margin: '0 14px 12px',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <p style={{
            fontSize: 9, fontWeight: 700, letterSpacing: 1,
            textTransform: 'uppercase', color: 'var(--muted)',
          }}>
            Metas · {MESES[mes - 1]} {ano}
          </p>
          <button
            onClick={handleCopiarMesAnterior}
            disabled={loadingCopy}
            style={{
              fontSize: 10, fontWeight: 600,
              padding: '3px 10px', borderRadius: 100,
              background: 'color-mix(in srgb, var(--sage) 12%, transparent)',
              color: 'var(--sage)',
              border: '1px solid color-mix(in srgb, var(--sage) 30%, transparent)',
              cursor: loadingCopy ? 'not-allowed' : 'pointer',
              opacity: loadingCopy ? 0.6 : 1,
            }}
          >
            {loadingCopy ? '...' : '↩ Manter do mês anterior'}
          </button>
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <div style={{
            flex: 1,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '9px 10px',
          }}>
            <p style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>Total das metas</p>
            <p style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: -0.4,
            }}>
              {formatCurrency(totalMetas)}
            </p>
          </div>
          <div style={{
            flex: 1,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '9px 10px',
          }}>
            <p style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 3 }}>Total comprometido</p>
            <p style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: -0.4,
            }}>
              {formatCurrency(totalComprometido)}
            </p>
          </div>
        </div>

        {/* Sobra/Estouro geral */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderTop: '1px solid var(--border)', paddingTop: 10,
        }}>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
            {sobraGeral >= 0 ? 'Sobra geral das metas' : 'Estouro geral das metas'}
          </span>
          <span style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: 13, fontWeight: 700,
            color: sobraGeral >= 0 ? 'var(--sage)' : 'var(--coral)',
          }}>
            {sobraGeral >= 0 ? '+ ' : '− '}{formatCurrency(Math.abs(sobraGeral))}
          </span>
        </div>
      </div>

      {/* ── Cards de meta por categoria ────────────────────── */}
      {resolved.map(item => {
        const { categoria, gasto, recorrente, meta } = item
        const total    = gasto + recorrente
        const pct      = meta > 0 ? Math.min((total / meta) * 100, 100) : 0
        const realPct  = meta > 0 ? (total / meta) * 100 : 0
        const status   = realPct > 100 ? 'estourou' : realPct > 80 ? 'atencao' : 'ok'
        const barColor = status === 'estourou' ? 'var(--coral)' : status === 'atencao' ? '#C4803A' : 'var(--sage)'
        const delta    = meta - total
        const deltaLabel = delta >= 0
          ? `✓ ${formatCurrency(delta)} dentro da meta`
          : `⚠ ${formatCurrency(Math.abs(delta))} acima da meta`
        const deltaColor = delta >= 0
          ? (status === 'atencao' ? '#8B5A1F' : '#3d6b40')
          : '#a8432a'
        const isEdit   = editando === categoria.id
        const pred     = preditivaPorCat?.[categoria.id]

        return (
          <div key={categoria.id} style={{ margin: '0 14px 8px' }}>
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: 13,
              overflow: 'hidden',
            }}>
              {/* Cabeçalho: nome + meta + botão editar */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 8,
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                  {categoria.emoji} {categoria.nome}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                    meta: {formatCurrency(meta)}
                  </span>
                  <button
                    onClick={() => isEdit ? fechar() : abrirEdicao(categoria.id, meta)}
                    style={{
                      fontSize: 10, color: 'var(--coral)',
                      background: 'none', border: 'none',
                      cursor: 'pointer', fontWeight: 600,
                    }}
                  >
                    {isEdit ? 'Fechar' : 'Editar'}
                  </button>
                </div>
              </div>

              {/* Total + percentual */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'baseline', marginBottom: 5,
              }}>
                <span style={{
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: 19, fontWeight: 700, color: 'var(--ink)', letterSpacing: -0.5,
                }}>
                  {formatCurrency(total)}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: barColor }}>
                  {Math.round(realPct)}% · {status === 'estourou' ? 'Estourou' : status === 'atencao' ? 'Atenção' : 'ok'}
                </span>
              </div>

              {/* Barra de progresso */}
              <div style={{
                height: 6, background: 'var(--bg-2)',
                borderRadius: 100, overflow: 'hidden', marginBottom: 8,
              }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: barColor, borderRadius: 100,
                  transition: 'width 0.6s ease',
                }} />
              </div>

              {/* Detalhe: variável + recorrente → total */}
              <div style={{
                background: 'var(--bg)',
                borderRadius: 10,
                padding: '9px 11px',
                display: 'flex', flexDirection: 'column', gap: 4,
                marginBottom: 8,
              }}>
                {/* Linha variável */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: barColor,
                      display: 'inline-block', flexShrink: 0,
                    }} />
                    Variável (gastos do mês)
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--ink)',
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                  }}>
                    {formatCurrency(gasto)}
                  </span>
                </div>

                {/* Linha recorrente */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: recorrente > 0 ? 'var(--muted)' : 'var(--border)',
                      display: 'inline-block', flexShrink: 0,
                    }} />
                    Recorrente previsto
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: recorrente > 0 ? 'var(--ink)' : 'var(--muted)',
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                  }}>
                    {formatCurrency(recorrente)}
                  </span>
                </div>

                {/* Divisor + total */}
                <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink)' }}>Total</span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: 'var(--ink)',
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                  }}>
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Tag de status em reais */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  fontSize: 10, fontWeight: 600,
                  padding: '3px 9px', borderRadius: 100, display: 'inline-block',
                  background: delta >= 0
                    ? status === 'atencao'
                      ? 'rgba(196,128,58,.12)'
                      : 'rgba(122,158,126,.12)'
                    : 'rgba(212,115,90,.12)',
                  color: deltaColor,
                }}>
                  {deltaLabel}
                </span>

                {/* Chip de projeção (preditiva) */}
                {pred && pred.status !== 'sem_meta' && (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    padding: '3px 9px', borderRadius: 100, display: 'inline-block',
                    background: `color-mix(in srgb, ${PREDITIVA_COR[pred.status] ?? 'var(--muted)'} 12%, transparent)`,
                    color: PREDITIVA_COR[pred.status] ?? 'var(--muted)',
                  }}>
                    ↗ {formatCurrency(pred.projecao)} projetado
                  </span>
                )}
              </div>

              {/* Painel de edição inline */}
              {isEdit && (
                <div style={{
                  marginTop: 12, paddingTop: 12,
                  borderTop: '1px solid var(--border)',
                }}>
                  <div style={{ position: 'relative', marginBottom: 10 }}>
                    <span style={{
                      position: 'absolute', left: 12, top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 13, color: 'var(--muted)', pointerEvents: 'none',
                    }}>R$</span>
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
                      style={{
                        width: '100%',
                        paddingLeft: 36, paddingRight: 12,
                        paddingTop: 10, paddingBottom: 10,
                        background: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        fontSize: 15, color: 'var(--ink)',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  {erro && (
                    <p style={{ fontSize: 12, color: 'var(--coral)', marginBottom: 8 }}>{erro}</p>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
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

      {/* ── Categorias com gasto/recorrente mas sem meta ────── */}
      {semMetaFinal.length > 0 && (
        <div style={{
          margin: '4px 14px 8px',
          padding: '11px 13px',
          background: 'var(--bg-2)',
          borderRadius: 12,
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 8 }}>
            Com gasto, sem meta definida:
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {semMetaFinal.map(cat => (
              <button
                key={cat.id}
                onClick={() => abrirEdicao(cat.id, 0)}
                style={{
                  fontSize: 11, padding: '4px 12px',
                  background: 'var(--card)',
                  border: editando === cat.id
                    ? '1.5px solid var(--coral)'
                    : '1px solid var(--border)',
                  borderRadius: 100, color: 'var(--ink)', cursor: 'pointer',
                }}
              >
                {cat.emoji} {cat.nome} +
              </button>
            ))}
          </div>

          {/* Painel de edição para categoria sem meta */}
          {semMetaFinal.some(c => editando === c.id) && (() => {
            const cat = semMetaFinal.find(c => c.id === editando)!
            return (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                  Meta para {cat.emoji} {cat.nome}:
                </p>
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <span style={{
                    position: 'absolute', left: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 13, color: 'var(--muted)', pointerEvents: 'none',
                  }}>R$</span>
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
                    style={{
                      width: '100%',
                      paddingLeft: 36, paddingRight: 12,
                      paddingTop: 10, paddingBottom: 10,
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      fontSize: 15, color: 'var(--ink)',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                {erro && (
                  <p style={{ fontSize: 12, color: 'var(--coral)', marginBottom: 8 }}>{erro}</p>
                )}
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

      {/* Espaço para BottomNav */}
      <div style={{ height: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }} />
    </div>
  )
}
