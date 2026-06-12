import { describe, it, expect } from 'vitest'
import { calcularPreditiva } from './preditiva'

function mkCat(overrides: {
  categoriaId?:    number
  nome?:           string
  emoji?:          string
  gastoAcumulado:  number
  meta?:           number | null
  historico?:      number[]
}) {
  return {
    categoriaId:    overrides.categoriaId ?? 1,
    nome:           overrides.nome        ?? 'Teste',
    emoji:          overrides.emoji       ?? '🧪',
    gastoAcumulado: overrides.gastoAcumulado,
    meta:           overrides.meta        ?? null,
    historico:      overrides.historico   ?? [],
  }
}

describe('calcularPreditiva', () => {
  it('1. projeção linear correta', () => {
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoAcumulado: 10000 })],
    })
    expect(r.projecao).toBe(30000)
  })

  it('2. vai_estourar: projecao > meta * 1.05', () => {
    // projecao = 30000, meta * 1.05 = 26250 → vai_estourar
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoAcumulado: 10000, meta: 25000 })],
    })
    expect(r.status).toBe('vai_estourar')
  })

  it('3. estourou: gastoAcumulado >= meta, independente da projeção', () => {
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoAcumulado: 26000, meta: 25000 })],
    })
    expect(r.status).toBe('estourou')
  })

  it('4. no_limite: projecao entre 90% e 105% da meta', () => {
    // projecao = round(9100 / 10 * 30) = 27300; 90% = 27000, 105% = 31500 → no_limite
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoAcumulado: 9100, meta: 30000 })],
    })
    expect(r.status).toBe('no_limite')
  })

  it('5. ok: projecao abaixo de 90% da meta', () => {
    // projecao = round(7000 / 10 * 30) = 21000; 90% de 30000 = 27000 → ok
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoAcumulado: 7000, meta: 30000 })],
    })
    expect(r.status).toBe('ok')
  })

  it('6. guarda anti-ruído: diaAtual < 5 → nunca retorna vai_estourar ou no_limite', () => {
    const [r] = calcularPreditiva({
      diaAtual: 3, diasNoMes: 30,
      categorias: [mkCat({ gastoAcumulado: 10000, meta: 25000 })],
    })
    expect(r.status).not.toBe('vai_estourar')
    expect(r.status).not.toBe('no_limite')
  })

  it('7. sem_meta: meta null → status sem_meta', () => {
    const [r] = calcularPreditiva({
      diaAtual: 15, diasNoMes: 30,
      categorias: [mkCat({ gastoAcumulado: 5000, meta: null })],
    })
    expect(r.status).toBe('sem_meta')
  })

  it('8. ritmoVsMedia: projecao 30% acima da média histórica', () => {
    // diaAtual=1, diasNoMes=1 → projecao = gastoAcumulado = 26000
    // historico=[20000] → ritmoVsMedia = (26000-20000)/20000 = 0.30
    const [r] = calcularPreditiva({
      diaAtual: 1, diasNoMes: 1,
      categorias: [mkCat({ gastoAcumulado: 26000, meta: null, historico: [20000] })],
    })
    expect(r.ritmoVsMedia).not.toBeNull()
    expect(Math.abs(r.ritmoVsMedia! - 0.30)).toBeLessThan(0.001)
  })

  it('9. historico vazio → ritmoVsMedia null, sem crash', () => {
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoAcumulado: 10000, meta: null, historico: [] })],
    })
    expect(r.ritmoVsMedia).toBeNull()
  })

  it('10. projecao sempre inteiro (Math.round)', () => {
    const [r] = calcularPreditiva({
      diaAtual: 7, diasNoMes: 31,
      categorias: [mkCat({ gastoAcumulado: 12345, meta: 50000 })],
    })
    expect(Number.isInteger(r.projecao)).toBe(true)
  })
})
