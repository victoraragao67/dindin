/**
 * Guardrail pós-geração: valida textos LLM antes de exibir/enviar.
 * Rejeita mensagens que violam as regras de tom do DinDin.
 * Em caso de rejeição, o chamador deve usar o fallback determinístico.
 */

export type GuardrailContexto = {
  /** Se true, a categoria referência está em risco (estourou/vai_estourar). */
  temRisco: boolean
  /** Apelidos dos dois membros do casal — para detectar culpa individual. */
  apelidos: [string, string]
  /** Valores numéricos que podem aparecer no texto (em centavos).
   *  Qualquer "R$ X,XX" no texto deve corresponder a um valor desta lista. */
  valoresPermitidos?: number[]
}

export type GuardrailResultado =
  | { ok: true }
  | { ok: false; motivo: string }

const BLOCKLIST_ALARME = [
  'preocupante', 'descontrolado', 'perderam o controle', 'exageraram',
  'vergonha', 'irresponsáv', 'catástrofe', 'terrível', 'horrível',
]

const BLOCKLIST_COMEMORACAO_ESTOURO = [
  'parabéns', 'mandaram ver', 'arrasaram', 'tá tudo bem ter passado',
  'tá tudo certo', 'foi planejado', 'tudo bem ter', 'não tem problema ter passado',
]

const EMOJIS_FESTA_ESTOURO = ['🎉', '🥳', '🎊', '🏆', '🙌']

/** Extrai valores monetários "R$ X.XXX,XX" do texto → centavos. */
function extrairValores(texto: string): number[] {
  const matches = texto.matchAll(/R\$\s*([\d.]+),(\d{2})/g)
  return Array.from(matches).map(m => {
    const inteiro = parseInt(m[1].replace(/\./g, ''), 10)
    const cents   = parseInt(m[2], 10)
    return inteiro * 100 + cents
  })
}

export function validarMensagem(
  texto: string,
  ctx: GuardrailContexto,
): GuardrailResultado {
  const lower = texto.toLowerCase()

  // 1. Culpa individual: apelido + verbo de gasto/problema
  const verbos = ['gastou', 'estourou', 'esqueceu', 'não registrou', 'ignorou', 'excedeu', 'passou']
  for (const apelido of ctx.apelidos) {
    const a = apelido.toLowerCase()
    if (lower.includes(a)) {
      for (const v of verbos) {
        if (lower.includes(v)) {
          return { ok: false, motivo: `culpa_individual: "${apelido}" + "${v}"` }
        }
      }
    }
  }

  // 2. Alarme / vergonha
  for (const termo of BLOCKLIST_ALARME) {
    if (lower.includes(termo)) {
      return { ok: false, motivo: `alarme: "${termo}"` }
    }
  }

  // 3. Comemoração de estouro (só rejeitado quando há risco)
  if (ctx.temRisco) {
    for (const termo of BLOCKLIST_COMEMORACAO_ESTOURO) {
      if (lower.includes(termo)) {
        return { ok: false, motivo: `comemoracao_estouro: "${termo}"` }
      }
    }
    for (const emoji of EMOJIS_FESTA_ESTOURO) {
      if (texto.includes(emoji)) {
        return { ok: false, motivo: `emoji_festa_em_estouro: "${emoji}"` }
      }
    }
  }

  // 4. Números inventados (só valida se valoresPermitidos fornecido)
  if (ctx.valoresPermitidos && ctx.valoresPermitidos.length > 0) {
    const noTexto = extrairValores(texto)
    for (const v of noTexto) {
      const tolerancia = 200 // ±R$2 de arredondamento
      const encontrado = ctx.valoresPermitidos.some(p => Math.abs(p - v) <= tolerancia)
      if (!encontrado) {
        return { ok: false, motivo: `numero_inventado: R$ ${(v / 100).toFixed(2)}` }
      }
    }
  }

  return { ok: true }
}
