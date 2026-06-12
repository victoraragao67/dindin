import type { PreditivaCategoria } from '../preditiva'

function fmt(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

export function montarPromptInsight(input: {
  apelidos:   [string, string]
  dia:        number
  diasNoMes:  number
  categorias: PreditivaCategoria[]
}): string {
  const linhas = input.categorias
    .filter(c => c.status !== 'sem_meta')
    .map(c =>
      `- ${c.nome}: gasto ${fmt(c.gastoAcumulado)}, meta ${fmt(c.meta ?? 0)}, ` +
      `projeção fechamento ${fmt(c.projecao)}, status ${c.status}` +
      (c.ritmoVsMedia != null ? `, ritmo ${(c.ritmoVsMedia * 100).toFixed(0)}% vs média` : '')
    )
    .join('\n')

  return `Você é o DinDin, o app financeiro do casal ${input.apelidos[0]} e ${input.apelidos[1]}.
Hoje é dia ${input.dia} de um mês de ${input.diasNoMes} dias.

DADOS JÁ CALCULADOS (use exatamente estes valores; NUNCA invente ou recalcule número):
${linhas || '(sem categorias com meta definida este mês)'}

Escreva em português do Brasil com tom LEVE e DESCONTRAÍDO — como um parceiro que cobra brincando, cutuca de leve com humor, sem peso, sem culpa, sem sermão. Nunca soe como cobrança séria ou julgamento. Pode usar uma piadinha curta e, no máximo, 1 emoji.
Foque na 1 ou 2 categorias mais críticas. Pode cruzar categorias se fizer sentido.
Use exatamente os números fornecidos; nunca invente ou recalcule valor.
Responda APENAS em JSON: {"resumo": "<2-3 frases para a tela de resumo>"}.
Se nenhuma categoria estiver crítica, manda um elogio leve e curto.`
}

/** Fallback determinístico quando o LLM falha. */
export function gerarFallbackTemplate(
  categorias: PreditivaCategoria[],
  diasRestantes: number,
): string {
  const criticas = categorias.filter(
    c => c.status === 'estourou' || c.status === 'vai_estourar'
  ).slice(0, 2)

  if (criticas.length === 0) {
    const ok = categorias.filter(c => c.status === 'ok' && c.meta)
    if (ok.length > 0) {
      return `${ok[0].emoji} Tudo no ritmo certo — ${ok[0].nome} projeta ${fmt(ok[0].projecao)} de uma meta de ${fmt(ok[0].meta!)}.`
    }
    return 'Acompanhe o ritmo de cada categoria neste mês.'
  }

  return criticas.map(c => {
    if (c.status === 'estourou') {
      return `${c.emoji} ${c.nome} estourou a meta de ${fmt(c.meta ?? 0)} (já em ${fmt(c.gastoAcumulado)}). Faltam ${diasRestantes} dias.`
    }
    const diff = c.projecao - (c.meta ?? 0)
    const pctMeta = c.meta ? Math.round((c.gastoAcumulado / c.meta) * 100) : 0
    return `${c.emoji} ${c.nome}: já ${pctMeta}% da meta. No ritmo atual fecha em ${fmt(c.projecao)}, ${fmt(diff)} acima.`
  }).join(' ')
}
