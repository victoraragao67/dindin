/**
 * Guardrail pós-geração: valida textos LLM antes de exibir/enviar.
 * Rejeita mensagens que violam as regras de tom do DinDin.
 * Em caso de rejeição, o chamador deve usar o fallback determinístico.
 *
 * Princípio central: a intensidade do alerta é PROPORCIONAL ao tamanho do
 * estouro. Palavras fortes ("preocupante", "perderam o controle") são
 * legítimas num estouro grande e rejeitadas num estouro pequeno.
 */

// Limiares de proporção (excesso = (gasto|projeção − meta) / meta). Tunáveis.
export const ESTOURO_GRANDE       = 0.30 // ≥30% acima → tom forte permitido
export const ESTOURO_MUITO_GRANDE = 0.80 // ≥80% acima → tom enfático/urgente permitido

export type GuardrailContexto = {
  /** Há alguma categoria em risco (estourou/vai_estourar). */
  temRisco: boolean
  /** Apelidos dos dois membros do casal — para detectar culpa individual. */
  apelidos: [string, string]
  /** Maior excesso proporcional entre as categorias em risco.
   *  0 quando não há estouro. Define qual nível de alarme é proporcional. */
  excessoMax?: number
  /** Valores monetários (centavos) que podem aparecer no texto. */
  valoresPermitidos?: number[]
  /** Valores de "X dias" que podem aparecer (dias restantes, dias sem registrar).
   *  A IA é proibida de contar datas — qualquer "X dias" deve estar nesta lista. */
  diasPermitidos?: number[]
  /** Limite de caracteres (push ~120-180, resumo ~280). */
  maxLen?: number
}

export type GuardrailResultado =
  | { ok: true }
  | { ok: false; motivo: string }

// Ataque à PESSOA (não ao gasto) — sempre proibido, independe de proporção.
const ATAQUE_PESSOAL = [
  'irresponsáv', 'relapso', 'preguiçoso', 'que vergonha',
  'vocês são uns', 'sem noção', 'irresponsabilidade', 'incompeten',
]

// Alarme forte — só proibido quando o estouro NÃO é grande (desproporcional).
const ALARME_DESPROPORCIONAL = [
  'cuidado!!', 'preocupante', 'perderam o controle', 'perdendo o controle',
  'saiu do controle', 'fora de controle', 'descontrolad', 'catástrofe',
  'terrível', 'horrível', 'desastre',
]

// Minimizar estouro — proibido sempre que há risco (estouro tem que ser levado a sério).
const MINIMIZACAO_ESTOURO = [
  'sem drama', 'tá tudo bem', 'tudo bem ter', 'não tem problema',
  'relaxa', 'de boa', 'sem stress', 'sem estresse', 'tá tudo certo',
  'foi planejado', 'numa boa',
]

const COMEMORACAO_ESTOURO = [
  'parabéns', 'mandaram ver', 'arrasaram', 'mandaram bem no',
]

const EMOJIS_FESTA = ['🎉', '🥳', '🎊', '🍾', '🙌', '🏆']

/** Extrai valores monetários "R$ X.XXX,XX" do texto → centavos. */
function extrairValores(texto: string): number[] {
  const matches = texto.matchAll(/R\$\s*([\d.]+),(\d{2})/g)
  return Array.from(matches).map(m => {
    const inteiro = parseInt(m[1].replace(/\./g, ''), 10)
    const cents   = parseInt(m[2], 10)
    return inteiro * 100 + cents
  })
}

/** Extrai ocorrências de "X dia(s)" do texto. */
function extrairDias(texto: string): number[] {
  const matches = texto.toLowerCase().matchAll(/(\d+)\s*dias?\b/g)
  return Array.from(matches).map(m => parseInt(m[1], 10))
}

export function validarMensagem(
  texto: string,
  ctx: GuardrailContexto,
): GuardrailResultado {
  const lower = texto.toLowerCase()

  // 1. Ataque pessoal — sempre rejeita
  for (const termo of ATAQUE_PESSOAL) {
    if (lower.includes(termo)) return { ok: false, motivo: `ataque_pessoal: "${termo}"` }
  }

  // 2. Culpa individual: apelido + verbo de gasto/problema
  const verbos = ['gastou', 'estourou', 'esqueceu', 'não registrou', 'ignorou', 'excedeu', 'passou']
  for (const apelido of ctx.apelidos) {
    const a = apelido.toLowerCase()
    if (a && lower.includes(a)) {
      for (const v of verbos) {
        if (lower.includes(v)) return { ok: false, motivo: `culpa_individual: "${apelido}" + "${v}"` }
      }
    }
  }

  // 3-5. Checagens que só valem quando há estouro
  if (ctx.temRisco) {
    for (const termo of COMEMORACAO_ESTOURO) {
      if (lower.includes(termo)) return { ok: false, motivo: `comemoracao_estouro: "${termo}"` }
    }
    for (const emoji of EMOJIS_FESTA) {
      if (texto.includes(emoji)) return { ok: false, motivo: `emoji_festa_em_estouro: "${emoji}"` }
    }
    for (const termo of MINIMIZACAO_ESTOURO) {
      if (lower.includes(termo)) return { ok: false, motivo: `minimiza_estouro: "${termo}"` }
    }

    // Alarme forte só é rejeitado se DESPROPORCIONAL (estouro abaixo de "muito grande")
    const excesso = ctx.excessoMax ?? 0
    if (excesso < ESTOURO_MUITO_GRANDE) {
      for (const termo of ALARME_DESPROPORCIONAL) {
        if (lower.includes(termo)) {
          return { ok: false, motivo: `alarme_desproporcional: "${termo}" (excesso ${(excesso * 100).toFixed(0)}%)` }
        }
      }
    }
  }

  // 6. Dias inventados (a IA não pode contar datas)
  if (ctx.diasPermitidos && ctx.diasPermitidos.length > 0) {
    for (const d of extrairDias(texto)) {
      if (!ctx.diasPermitidos.includes(d)) {
        return { ok: false, motivo: `dias_inventados: "${d} dias"` }
      }
    }
  }

  // 7. Números inventados (tolerância ±R$2 de arredondamento)
  if (ctx.valoresPermitidos && ctx.valoresPermitidos.length > 0) {
    const tolerancia = 200
    for (const v of extrairValores(texto)) {
      const encontrado = ctx.valoresPermitidos.some(p => Math.abs(p - v) <= tolerancia)
      if (!encontrado) {
        return { ok: false, motivo: `numero_inventado: R$ ${(v / 100).toFixed(2)}` }
      }
    }
  }

  // 8. Tamanho
  if (ctx.maxLen && texto.length > ctx.maxLen) {
    return { ok: false, motivo: `excede_tamanho: ${texto.length} > ${ctx.maxLen}` }
  }

  return { ok: true }
}

/** Excesso proporcional de uma categoria: (base − meta) / meta. 0 se sem meta/risco. */
export function calcExcesso(
  status: string,
  gastoAcumulado: number,
  projecao: number | null,
  meta: number | null,
): number {
  if (!meta || meta <= 0) return 0
  if (status !== 'estourou' && status !== 'vai_estourar') return 0
  const base = status === 'estourou' ? gastoAcumulado : (projecao ?? gastoAcumulado)
  return Math.max(0, (base - meta) / meta)
}
