import type { PreditivaCategoria } from '../preditiva'

function fmt(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

// Regras de tom fixas — base imutável independente do template do banco.
// O template do banco (ritmo.tom_llm) ADICIONA instruções; estas nunca saem.
export const REGRAS_TOM_BASE = `
REGRAS ABSOLUTAS (nunca viole):
1. Fale SEMPRE com o casal junto ("vocês", "o casal"). PROIBIDO citar ou culpar um parceiro individualmente. Apelidos só para saudação amistosa.
2. Proporção: estouro é AVISO CONSTRUTIVO calmo ("vale segurar"), nunca tragédia e NUNCA motivo de festa. Urgência forte só se projeção muito acima da meta E poucos dias restantes.
3. PROIBIDO comemorar ou validar estouro. Nada de "parabéns", "mandaram ver", "arrasaram", "🎉", "tá tudo bem ter passado", "foi planejado". Estouro = heads-up.
4. Elogio SÓ para o que é positivo de verdade: categorias dentro da meta, ritmo bom. Nunca aplicado a estouro. Coexistência ok: "no geral ótimo; só de olho no restaurante".
5. Sem culpa/vergonha: nada de "descontrolado", "exageraram", "perderam o controle".
6. Use EXATAMENTE os números fornecidos. NUNCA invente ou recalcule valor.

EXEMPLOS BONS:
- "No geral vocês estão bem esse mês 👏 Só o restaurante tá puxando — se segurarem os deliveries, fecha tranquilo."
- "Restaurante passou da meta. Sem drama, mas vale segurar o ritmo pra equilibrar no resto do mês 🙂"
- "Mercado e transporte dentro da meta, mandaram bem 👏 Só o restaurante que passou — dá pra ajustar."

EXEMPLOS RUINS (NUNCA faça):
- "A Gaia gastou demais em restaurante."              ← culpa/singulariza parceiro
- "Cuidado!! Vocês estouraram, preocupante!"          ← alarmista
- "Vocês perderam o controle dos gastos."             ← culpa/vergonha
- "Parabéns, mandaram ver no restaurante! 🎉"         ← comemora estouro (PROIBIDO)
- "Passou da meta, mas se foi planejado tá tudo bem!" ← valida estouro (PROIBIDO)
`.trim()

const DEFAULT_TOM =
  'Tom LEVE e DESCONTRAÍDO — como um parceiro que cutuca de leve, sem peso. Pode usar humor suave. Máx. 1 emoji. Foque nas 1-2 categorias mais críticas ou no panorama geral se tudo estiver bem.'

export function montarPromptInsight(input: {
  apelidos:         [string, string]
  dia:              number
  diasNoMes:        number
  categorias:       PreditivaCategoria[]
  tomInstructions?: string
}): string {
  const { apelidos, dia, diasNoMes, categorias } = input
  const tom = input.tomInstructions || DEFAULT_TOM

  // Panorama geral (proporcionalidade)
  const comMeta    = categorias.filter(c => c.status !== 'sem_meta')
  const emRisco    = comMeta.filter(c => c.status === 'estourou' || c.status === 'vai_estourar')
  const noLimite   = comMeta.filter(c => c.status === 'no_limite')
  const ok         = comMeta.filter(c => c.status === 'ok')
  const diasRestam = diasNoMes - dia

  const panorama = comMeta.length > 0
    ? `Panorama: ${ok.length} em dia, ${noLimite.length} no limite, ${emRisco.length} em risco — de ${comMeta.length} categorias com meta. Faltam ${diasRestam} dias.`
    : `Nenhuma categoria com meta definida este mês.`

  // Dados por categoria — SEM dados por pessoa (não induz singularização)
  const linhas = comMeta
    .map(c => {
      const partes = [
        `- ${c.emoji} ${c.nome}: gasto ${fmt(c.gastoAcumulado)}, meta ${fmt(c.meta ?? 0)}`,
        c.projecao != null ? `projeção ${fmt(c.projecao)}` : 'projeção indefinida',
        `status ${c.status}`,
      ]
      if (c.ritmoVsMedia != null) {
        partes.push(`ritmo ${(c.ritmoVsMedia * 100).toFixed(0)}% vs média histórica`)
      }
      return partes.join(', ')
    })
    .join('\n')

  return `Você é o DinDin, app financeiro do casal ${apelidos[0]} e ${apelidos[1]}.
Hoje é dia ${dia} de um mês de ${diasNoMes} dias. ${panorama}

${REGRAS_TOM_BASE}

TOM ADICIONAL: ${tom}

DADOS DO MÊS (use exatamente estes valores; nunca invente ou recalcule):
${linhas || '(sem dados)'}

Responda APENAS em JSON: {"resumo": "<2-3 frases para exibir na tela de resumo>"}`
}

/** Fallback determinístico quando o LLM falha ou é rejeitado pelo guardrail. */
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
      return `${ok[0].emoji} Tudo no ritmo — ${ok[0].nome} projeta ${ok[0].projecao != null ? fmt(ok[0].projecao) : 'valor ok'} dentro da meta de ${fmt(ok[0].meta!)}.`
    }
    return 'Acompanhe o ritmo de cada categoria neste mês.'
  }

  return criticas.map(c => {
    if (c.status === 'estourou') {
      return `${c.emoji} ${c.nome} passou da meta de ${fmt(c.meta ?? 0)} (em ${fmt(c.gastoAcumulado)}). Vale segurar nos ${diasRestantes} dias restantes.`
    }
    const projecao = c.projecao ?? 0
    const diff = projecao - (c.meta ?? 0)
    return `${c.emoji} ${c.nome}: no ritmo atual fecha em ${fmt(projecao)}, ${fmt(diff)} acima da meta.`
  }).join(' ')
}
