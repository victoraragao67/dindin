export type PreditivaStatus = 'estourou' | 'vai_estourar' | 'no_limite' | 'ok' | 'sem_meta'

export type PreditivaCategoria = {
  categoriaId:         number
  nome:                string
  emoji:               string
  gastoVariavel:       number   // variável já lançado no mês
  recorrentePrevisto:  number   // recorrente previsto (fixo, não projetado)
  gastoAcumulado:      number   // = gastoVariavel + recorrentePrevisto
  meta:                number | null
  projecao:            number   // = projeção do variável + recorrentePrevisto
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
    historico:          number[]
  }>
}): PreditivaCategoria[] {
  const { diaAtual, diasNoMes, categorias } = input
  const diaSeguro = Math.max(diaAtual, 1)

  return categorias.map(cat => {
    // Só o variável é projetado linearmente; o recorrente entra cheio (fixo e conhecido)
    const projecaoVariavel = Math.round((cat.gastoVariavel / diaSeguro) * diasNoMes)
    const projecao         = projecaoVariavel + cat.recorrentePrevisto
    const gastoAcumulado   = cat.gastoVariavel + cat.recorrentePrevisto

    const mediaHistorica = cat.historico.length > 0
      ? Math.round(cat.historico.reduce((s, v) => s + v, 0) / cat.historico.length)
      : null

    const ritmoVsMedia = mediaHistorica !== null && mediaHistorica > 0
      ? (projecao - mediaHistorica) / mediaHistorica
      : null

    let status: PreditivaStatus

    if (cat.meta === null || cat.meta === 0) {
      status = 'sem_meta'
    } else if (gastoAcumulado >= cat.meta) {
      status = 'estourou'
    } else if (diaAtual < 5) {
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
