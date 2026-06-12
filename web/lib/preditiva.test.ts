import { describe, it, expect } from 'vitest'
import { calcularPreditiva } from './preditiva'

function mkCat(overrides: {
  categoriaId?:        number
  nome?:               string
  emoji?:              string
  gastoVariavel:       number
  recorrentePrevisto?: number
  meta?:               number | null
  historico?:          number[]
}) {
  return {
    categoriaId:        overrides.categoriaId        ?? 1,
    nome:               overrides.nome               ?? 'Teste',
    emoji:              overrides.emoji              ?? '🧪',
    gastoVariavel:      overrides.gastoVariavel,
    recorrentePrevisto: overrides.recorrentePrevisto ?? 0,
    meta:               overrides.meta               ?? null,
    historico:          overrides.historico          ?? [],
  }
}

describe('calcularPreditiva', () => {
  it('1a. projeção linear correta (só variável, sem recorrente)', () => {
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 10000 })],
    })
    expect(r.projecao).toBe(30000)
  })

  it('1b. recorrente entra cheio — não é projetado', () => {
    // variável = 0, recorrente = 5000 → projeção deve ser 5000, não 15000
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 0, recorrentePrevisto: 5000 })],
    })
    expect(r.projecao).toBe(5000)
  })

  it('1c. total = variável projetado + recorrente flat', () => {
    // variável 6000 @ dia 10/30 → projecaoVariavel = 18000
    // recorrente 5000 → projecao = 23000; gastoAcumulado = 11000
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 6000, recorrentePrevisto: 5000 })],
    })
    expect(r.projecao).toBe(23000)
    expect(r.gastoAcumulado).toBe(11000)
  })

  it('2. vai_estourar: projecao > meta * 1.05', () => {
    // projecao = 30000 + 0, meta * 1.05 = 26250 → vai_estourar
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 10000, meta: 25000 })],
    })
    expect(r.status).toBe('vai_estourar')
  })

  it('3. estourou: gastoAcumulado >= meta, independente da projeção', () => {
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 26000, meta: 25000 })],
    })
    expect(r.status).toBe('estourou')
  })

  it('3b. estourou: recorrente sozinho já ultrapassa meta', () => {
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 0, recorrentePrevisto: 26000, meta: 25000 })],
    })
    expect(r.status).toBe('estourou')
  })

  it('4. no_limite: projecao entre 90% e 105% da meta', () => {
    // variável 9100 @ dia 10/30 → projecaoVariavel = 27300; 90% = 27000, 105% = 31500 → no_limite
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 9100, meta: 30000 })],
    })
    expect(r.status).toBe('no_limite')
  })

  it('5. ok: projecao abaixo de 90% da meta', () => {
    // projecaoVariavel = 21000; 90% de 30000 = 27000 → ok
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 7000, meta: 30000 })],
    })
    expect(r.status).toBe('ok')
  })

  it('6. guarda anti-ruído: diaAtual < 5 → nunca retorna vai_estourar ou no_limite', () => {
    const [r] = calcularPreditiva({
      diaAtual: 3, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 10000, meta: 25000 })],
    })
    expect(r.status).not.toBe('vai_estourar')
    expect(r.status).not.toBe('no_limite')
  })

  it('7. sem_meta: meta null → status sem_meta', () => {
    const [r] = calcularPreditiva({
      diaAtual: 15, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 5000, meta: null })],
    })
    expect(r.status).toBe('sem_meta')
  })

  it('8. ritmoVsMedia: projecao 30% acima da média histórica', () => {
    // diaAtual=1, diasNoMes=1 → projecaoVariavel = gastoVariavel = 26000; recorrente = 0
    // historico=[20000] → ritmoVsMedia = (26000-20000)/20000 = 0.30
    const [r] = calcularPreditiva({
      diaAtual: 1, diasNoMes: 1,
      categorias: [mkCat({ gastoVariavel: 26000, meta: null, historico: [20000] })],
    })
    expect(r.ritmoVsMedia).not.toBeNull()
    expect(Math.abs(r.ritmoVsMedia! - 0.30)).toBeLessThan(0.001)
  })

  it('9. historico vazio → ritmoVsMedia null, sem crash', () => {
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 10000, meta: null, historico: [] })],
    })
    expect(r.ritmoVsMedia).toBeNull()
  })

  it('10. projecao sempre inteiro (Math.round)', () => {
    const [r] = calcularPreditiva({
      diaAtual: 7, diasNoMes: 31,
      categorias: [mkCat({ gastoVariavel: 12345, meta: 50000 })],
    })
    expect(Number.isInteger(r.projecao)).toBe(true)
  })
})
