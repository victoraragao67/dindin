import { describe, it, expect } from 'vitest'
import { calcularPreditiva } from './preditiva'

function mkCat(overrides: {
  categoriaId?:        number
  nome?:               string
  emoji?:              string
  gastoVariavel:       number
  recorrentePrevisto?: number
  meta?:               number | null
  histVariavel?:       number[]
  histTotal?:          number[]
}) {
  return {
    categoriaId:        overrides.categoriaId        ?? 1,
    nome:               overrides.nome               ?? 'Teste',
    emoji:              overrides.emoji              ?? '🧪',
    gastoVariavel:      overrides.gastoVariavel,
    recorrentePrevisto: overrides.recorrentePrevisto ?? 0,
    meta:               overrides.meta               ?? null,
    histVariavel:       overrides.histVariavel       ?? [],
    histTotal:          overrides.histTotal          ?? [],
  }
}

describe('calcularPreditiva', () => {
  // ── Testes 1-10: comportamentos base ─────────────────────────────────────

  it('1a. blend converge ao linear quando histórico = projecao linear', () => {
    // histVariavel=[30000] → ancora=30000=linear → blend=30000 qualquer que seja o peso
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 10000, histVariavel: [30000] })],
    })
    expect(r.projecao).toBe(30000)
  })

  it('1b. recorrente entra cheio — variável 0 sem história → projecao = recorrente', () => {
    // gastoVariavel=0, sem âncora → projecaoVariavel=0; projecao = 0 + 5000 = 5000
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 0, recorrentePrevisto: 5000 })],
    })
    expect(r.projecao).toBe(5000)
  })

  it('1c. total = projecaoVariavel + recorrente; gastoAcumulado correto', () => {
    // histVariavel=[18000] → ancora=18000=linear → projecaoVariavel=18000; recorrente=5000
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 6000, recorrentePrevisto: 5000, histVariavel: [18000] })],
    })
    expect(r.projecao).toBe(23000)
    expect(r.gastoAcumulado).toBe(11000)
  })

  it('2. vai_estourar: projecao > meta * 1.05', () => {
    // histVariavel=[30000] → projecao=30000; meta=25000, 1.05×25000=26250 → vai_estourar
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 10000, meta: 25000, histVariavel: [30000] })],
    })
    expect(r.status).toBe('vai_estourar')
  })

  it('3. estourou: gastoAcumulado >= meta, independente da projecao', () => {
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
    // histVariavel=[27300] → projecaoVariavel=27300; meta=30000; 90%=27000, 105%=31500
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 9100, meta: 30000, histVariavel: [27300] })],
    })
    expect(r.status).toBe('no_limite')
  })

  it('5. ok: projecao abaixo de 90% da meta', () => {
    // histVariavel=[21000] → projecaoVariavel=21000 < 27000 (90% de 30000)
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 7000, meta: 30000, histVariavel: [21000] })],
    })
    expect(r.status).toBe('ok')
  })

  it('6. guarda anti-ruído standard: com histórico, diaAtual < 5 → nunca vai_estourar/no_limite', () => {
    const [r] = calcularPreditiva({
      diaAtual: 3, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 10000, meta: 25000, histVariavel: [30000] })],
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

  it('8. ritmoVsMedia usa histTotal: projecao 30% acima da média', () => {
    // diaAtual=diasNoMes → peso=1 → projecaoVariavel=linear=gastoVariavel=26000
    // histTotal=[20000] → media=20000 → ritmoVsMedia=(26000-20000)/20000=0.30
    const [r] = calcularPreditiva({
      diaAtual: 1, diasNoMes: 1,
      categorias: [mkCat({ gastoVariavel: 26000, meta: null, histVariavel: [26000], histTotal: [20000] })],
    })
    expect(r.ritmoVsMedia).not.toBeNull()
    expect(Math.abs(r.ritmoVsMedia! - 0.30)).toBeLessThan(0.001)
  })

  it('9. cold start sem meta e sem histórico: projecao null, ritmoVsMedia null, sem crash', () => {
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 10000, meta: null })],
    })
    expect(r.projecao).toBeNull()
    expect(r.ritmoVsMedia).toBeNull()
  })

  it('10. projecao é null ou inteiro — nunca float', () => {
    const [r] = calcularPreditiva({
      diaAtual: 7, diasNoMes: 31,
      categorias: [mkCat({ gastoVariavel: 12345, meta: 50000, histVariavel: [50000] })],
    })
    expect(r.projecao === null || Number.isInteger(r.projecao)).toBe(true)
  })

  // ── Testes 11-17: blend e cold start ─────────────────────────────────────

  it('11. blend no início: âncora domina, atenua gasto pontual alto', () => {
    // dia=3/30, peso=0.1; linear=(15000/3)*30=150000; media=30000
    // blend = round(0.1*150000 + 0.9*30000) = round(15000+27000) = 42000
    const [r] = calcularPreditiva({
      diaAtual: 3, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 15000, histVariavel: [30000] })],
    })
    expect(r.projecao).toBe(42000)
    expect(r.projecao!).toBeLessThan(80000)  // bem abaixo do linear puro (150000)
  })

  it('12. blend no fim: ritmo real domina sobre histórico alto', () => {
    // dia=28/30, peso≈0.933; linear≈10714; media=30000
    // blend ≈ round(0.933*10714 + 0.067*30000) = round(10000+2000) = 12000
    const [r] = calcularPreditiva({
      diaAtual: 28, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 10000, histVariavel: [30000] })],
    })
    expect(r.projecao!).toBeLessThan(20000)  // muito menor que a média histórica (30000)
  })

  it('13. blend converge: fim do mês → projecao = gastoVariavel (peso=1)', () => {
    // dia=diasNoMes → peso=1 → blend = linear = gastoVariavel (âncora zerada)
    const [r] = calcularPreditiva({
      diaAtual: 30, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 20000, histVariavel: [50000] })],
    })
    expect(r.projecao).toBe(20000)
  })

  it('14. cold start sem meta: projecao null, status sem_meta', () => {
    // histVariavel=[], meta=null, gastoVariavel>0 → ancora=null → projecaoVariavel=null
    const [r] = calcularPreditiva({
      diaAtual: 12, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 5000, meta: null })],
    })
    expect(r.projecao).toBeNull()
    expect(r.status).toBe('sem_meta')
  })

  it('15. cold start com meta: âncora na meta → projecao não null', () => {
    // histVariavel=[] mas meta=30000 → ancora = meta - recorrente = 30000 → projecao ≠ null
    const [r] = calcularPreditiva({
      diaAtual: 12, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 12000, meta: 30000 })],
    })
    expect(r.projecao).not.toBeNull()
  })

  it('16. guarda anti-ruído alargado: sem histórico, diaAtual < 10 → sem vai_estourar/no_limite', () => {
    // histVariavel=[] → antiRuidoDia=10; dia=8 < 10 → status ok mesmo com projecao alta
    const [r] = calcularPreditiva({
      diaAtual: 8, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 10000, meta: 25000 })],
    })
    expect(r.status).not.toBe('vai_estourar')
    expect(r.status).not.toBe('no_limite')
  })

  it('17. categoria só-recorrente: gastoVariavel=0, recorrente=4000 → projecao=4000', () => {
    // gastoVariavel=0, sem âncora → projecaoVariavel=0; projecao = 0 + 4000 = 4000
    const [r] = calcularPreditiva({
      diaAtual: 10, diasNoMes: 30,
      categorias: [mkCat({ gastoVariavel: 0, recorrentePrevisto: 4000 })],
    })
    expect(r.projecao).toBe(4000)
  })
})
