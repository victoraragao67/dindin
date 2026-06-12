export type PreditivaStatus = 'estourou' | 'vai_estourar' | 'no_limite' | 'ok' | 'sem_meta'

export type PreditivaCategoria = {
  categoriaId:         number
  nome:                string
  emoji:               string
  gastoVariavel:       number    // variável já lançado no mês
  recorrentePrevisto:  number    // recorrente previsto (fixo, não projetado)
  gastoAcumulado:      number    // = gastoVariavel + recorrentePrevisto
  meta:                number | null
  projecao:            number | null  // null em cold start sem âncora (sem hist e sem meta)
  status:              PreditivaStatus
  ritmoVsMedia:        number | null
}

export function calcularPreditiva(input: {
  diaAtual:   number
  diasNoMes:  number
  categorias: Array<{
    categoriaId:        number
    nome:               string
    emoji:              string
    gastoVariavel:      number
    recorrentePrevisto: number
    meta:               number | null
    histVariavel:       number[]  // variável (pwa) dos últimos N meses — âncora do blend
    histTotal:          number[]  // total (pwa+recorrente) dos últimos N meses — ritmoVsMedia
  }>
}): PreditivaCategoria[] {
  const { diaAtual, diasNoMes, categorias } = input
  const diaSeguro = Math.max(diaAtual, 1)
  const peso = Math.min(diaAtual / diasNoMes, 1)  // [0,1]: cresce ao longo do mês

  return categorias.map(cat => {
    const gastoAcumulado = cat.gastoVariavel + cat.recorrentePrevisto

    // ── Projeção variável com blend ─────────────────────────────
    // Cedo (peso~0) confia na história; tarde (peso~1) confia no ritmo real.
    const linear = (cat.gastoVariavel / diaSeguro) * diasNoMes
    const mediaVariavelHist = cat.histVariavel.length > 0
      ? cat.histVariavel.reduce((s, v) => s + v, 0) / cat.histVariavel.length
      : null
    // Ancora: histórico variável > fallback na meta > null (cold start total)
    const ancora = mediaVariavelHist ?? (cat.meta != null ? cat.meta - cat.recorrentePrevisto : null)

    // Categoria só-recorrente (gastoVariavel=0, sem âncora): projecaoVariavel=0
    const projecaoVariavel: number | null = ancora === null
      ? (cat.gastoVariavel === 0 ? 0 : null)
      : Math.round(peso * linear + (1 - peso) * Math.max(ancora, 0))

    const projecao: number | null = projecaoVariavel !== null
      ? projecaoVariavel + cat.recorrentePrevisto
      : null

    // ── ritmoVsMedia usa histTotal (inclui recorrente — comparável ao projecao) ─
    const mediaHistorica = cat.histTotal.length > 0
      ? Math.round(cat.histTotal.reduce((s, v) => s + v, 0) / cat.histTotal.length)
      : null
    const ritmoVsMedia = mediaHistorica != null && mediaHistorica > 0 && projecao !== null
      ? (projecao - mediaHistorica) / mediaHistorica
      : null

    // ── Status ─────────────────────────────────────────────────
    // Guard alargado no cold start: sem histórico, espera até dia 10 antes de alertar
    const semHistorico = cat.histVariavel.length === 0
    const antiRuidoDia = semHistorico ? 10 : 5

    let status: PreditivaStatus
    if (cat.meta === null || cat.meta === 0) {
      status = 'sem_meta'
    } else if (gastoAcumulado >= cat.meta) {
      status = 'estourou'
    } else if (projecao === null || diaAtual < antiRuidoDia) {
      status = 'ok'
    } else if (projecao > cat.meta * 1.05) {
      status = 'vai_estourar'
    } else if (projecao >= cat.meta * 0.90) {
      status = 'no_limite'
    } else {
      status = 'ok'
    }

    return {
      categoriaId:        cat.categoriaId,
      nome:               cat.nome,
      emoji:              cat.emoji,
      gastoVariavel:      cat.gastoVariavel,
      recorrentePrevisto: cat.recorrentePrevisto,
      gastoAcumulado,
      meta:               cat.meta,
      projecao,
      status,
      ritmoVsMedia,
    }
  })
}
