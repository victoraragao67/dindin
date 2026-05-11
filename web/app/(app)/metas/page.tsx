import { createClient } from '@/lib/supabase/server'
import { MetasClient } from '@/components/metas-client'

export const metadata = { title: 'Metas · DinDin' }

function currentMesAno(): { mes: number; ano: number } {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  )
  return { mes: now.getMonth() + 1, ano: now.getFullYear() }
}

export default async function MetasPage({
  searchParams,
}: {
  searchParams: { mes?: string; ano?: string }
}) {
  const { mes: mesPadrao, ano: anoPadrao } = currentMesAno()
  const mes = Number(searchParams.mes ?? mesPadrao)
  const ano = Number(searchParams.ano ?? anoPadrao)

  const supabase = createClient()

  const [categoriasRes, metasRes] = await Promise.all([
    supabase
      .from('categories')
      .select('id, nome, emoji')
      .order('ordem', { ascending: true }),

    supabase
      .from('spending_goals')
      .select('categoria_id, valor_centavos')
      .eq('mes', mes)
      .eq('ano', ano),
  ])

  const categorias = (categoriasRes.data ?? []) as { id: number; nome: string; emoji: string }[]
  const metas = (metasRes.data ?? []) as { categoria_id: number; valor_centavos: number }[]

  const metasPorCategoria: Record<number, number> = {}
  for (const m of metas) {
    metasPorCategoria[m.categoria_id] = m.valor_centavos
  }

  return (
    <MetasClient
      categorias={categorias}
      metasPorCategoria={metasPorCategoria}
      mes={mes}
      ano={ano}
    />
  )
}
