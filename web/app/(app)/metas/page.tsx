import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/bottom-nav'
import { MetasV2Client } from '@/components/metas-v2-client'
import { MetasEmptyActions } from '@/components/metas-empty-actions'

export const metadata = { title: 'Metas · Nosso DinDin' }

function currentMesAno(): { mes: number; ano: number } {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  )
  return { mes: now.getMonth() + 1, ano: now.getFullYear() }
}

function mesLabel(mes: number, ano: number): string {
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function prevMesAno(mes: number, ano: number): { mes: number; ano: number } {
  if (mes === 1) return { mes: 12, ano: ano - 1 }
  return { mes: mes - 1, ano }
}

function nextMesAno(mes: number, ano: number): { mes: number; ano: number } {
  if (mes === 12) return { mes: 1, ano: ano + 1 }
  return { mes: mes + 1, ano }
}

export default async function MetasPage({
  searchParams,
}: {
  searchParams: { mes?: string; ano?: string }
}) {
  const { mes: mesPadrao, ano: anoPadrao } = currentMesAno()
  const mes = Number(searchParams.mes ?? mesPadrao)
  const ano = Number(searchParams.ano ?? anoPadrao)

  const mesStr   = `${ano}-${String(mes).padStart(2, '0')}-01`
  const supabase = createClient()

  const prevMes = prevMesAno(mes, ano)

  const [categoriasRes, metasRes, variaveisRes, recorrentesRes, metasAntRes] = await Promise.all([
    // 1. Todas as categorias
    supabase
      .from('categories')
      .select('id, nome, emoji')
      .order('ordem', { ascending: true }),

    // 2. Metas definidas para o mês
    supabase
      .from('spending_goals')
      .select('categoria_id, valor_centavos')
      .eq('mes', mes)
      .eq('ano', ano),

    // 3. Gasto variável real do mês por categoria
    supabase
      .from('v_gastos_por_categoria_mes')
      .select('categoria_id, total_centavos')
      .eq('mes', mesStr),

    // 4. Recorrentes ativos (previsão)
    supabase
      .from('recurring_templates')
      .select('categoria_id, valor_centavos')
      .eq('ativo', true),

    // 5. Metas do mês anterior (para botão "manter")
    supabase
      .from('spending_goals')
      .select('id')
      .eq('mes', prevMes.mes)
      .eq('ano', prevMes.ano)
      .limit(1),
  ])

  // ── Lookup maps ──────────────────────────────────────────────
  type CatRow = { id: number; nome: string; emoji: string }

  const categorias = (categoriasRes.data ?? []) as CatRow[]
  const temMetasAnteriores = (metasAntRes.data ?? []).length > 0

  const metasPorCat: Record<number, number> = {}
  for (const m of (metasRes.data ?? []) as { categoria_id: number; valor_centavos: number }[]) {
    metasPorCat[m.categoria_id] = m.valor_centavos
  }

  const gastoPorCat: Record<number, number> = {}
  for (const v of (variaveisRes.data ?? []) as { categoria_id: number; total_centavos: number }[]) {
    gastoPorCat[v.categoria_id] = v.total_centavos
  }

  const recorrentePorCat: Record<number, number> = {}
  for (const r of (recorrentesRes.data ?? []) as { categoria_id: number; valor_centavos: number }[]) {
    recorrentePorCat[r.categoria_id] = (recorrentePorCat[r.categoria_id] ?? 0) + r.valor_centavos
  }

  // ── Montar itens ─────────────────────────────────────────────
  const itens = categorias
    .filter(cat =>
      metasPorCat[cat.id] > 0 ||
      gastoPorCat[cat.id] > 0 ||
      recorrentePorCat[cat.id] > 0
    )
    .map(cat => ({
      categoria:  cat,
      gasto:      gastoPorCat[cat.id]      ?? 0,
      recorrente: recorrentePorCat[cat.id] ?? 0,
      meta:       metasPorCat[cat.id]      ?? 0,
    }))
    .sort((a, b) => (b.gasto + b.recorrente) - (a.gasto + a.recorrente))

  const comMeta = itens.filter(i => i.meta > 0)
  const semMeta = itens.filter(i => i.meta === 0).map(i => i.categoria)

  // ── Totais para o card de resumo ─────────────────────────────
  const totalMetas        = comMeta.reduce((s, i) => s + i.meta, 0)
  const totalComprometido = itens.reduce((s, i) => s + i.gasto + i.recorrente, 0)
  const sobraGeral        = totalMetas - comMeta.reduce((s, i) => s + i.gasto + i.recorrente, 0)

  // ── Navegação de meses ───────────────────────────────────────
  const prev = prevMesAno(mes, ano)
  const next = nextMesAno(mes, ano)
  const { mes: mesAtual, ano: anoAtual } = currentMesAno()
  const isCurrentMonth = mes === mesAtual && ano === anoAtual

  return (
    <>
      <div
        className="flex-1 overflow-y-auto"
        data-scroll-root
        style={{ paddingBottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)' }}
      >
        {/* ── Navegação de mês ──────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px 8px',
        }}>
          <Link
            href={`/metas?mes=${prev.mes}&ano=${prev.ano}`}
            style={{
              background: 'none', border: 'none',
              color: 'var(--muted)', textDecoration: 'none',
              fontSize: 16, padding: '4px 8px', cursor: 'pointer',
            }}
          >←</Link>

          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: 14, fontWeight: 600, color: 'var(--ink)',
              textTransform: 'capitalize',
            }}>
              {mesLabel(mes, ano)}
            </p>
            <p style={{ fontSize: 11, color: 'var(--muted)' }}>
              {isCurrentMonth ? 'Mês atual' : 'Metas de gasto'}
            </p>
          </div>

          <Link
            href={`/metas?mes=${next.mes}&ano=${next.ano}`}
            style={{
              background: 'none', border: 'none',
              color: 'var(--muted)', textDecoration: 'none',
              fontSize: 16, padding: '4px 8px', cursor: 'pointer',
            }}
          >→</Link>
        </div>

        {/* ── Estado vazio ──────────────────────────────────── */}
        {comMeta.length === 0 && semMeta.length === 0 && (
          <div style={{
            margin: '40px 24px 0',
            textAlign: 'center',
            color: 'var(--muted)',
          }}>
            <p style={{ fontSize: 36, marginBottom: 12 }}>🎯</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
              Nenhuma meta ainda
            </p>
            <p style={{ fontSize: 13, marginBottom: temMetasAnteriores ? 20 : 0 }}>
              Registre gastos ou adicione metas para acompanhar seu orçamento.
            </p>
            {temMetasAnteriores && (
              <MetasEmptyActions mes={mes} ano={ano} />
            )}
          </div>
        )}

        {/* ── Componente cliente (cards + edição) ───────────── */}
        {(comMeta.length > 0 || semMeta.length > 0) && (
          <MetasV2Client
            itens={comMeta}
            semMeta={semMeta}
            totalMetas={totalMetas}
            totalComprometido={totalComprometido}
            sobraGeral={sobraGeral}
            mes={mes}
            ano={ano}
          />
        )}
      </div>

      <BottomNav />
    </>
  )
}
