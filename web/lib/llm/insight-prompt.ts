import type { PreditivaCategoria } from '../preditiva'
import { calcExcesso } from './guardrail'

function fmt(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100)
}

// Regras de tom fixas — base imutável independente do template do banco.
// O template do banco (ritmo.tom_llm) ADICIONA instruções; estas nunca saem.
export const REGRAS_TOM_BASE = `
REGRAS ABSOLUTAS (nunca viole):
1. Fale SEMPRE com o casal junto ("vocês", "o casal"). PROIBIDO citar ou culpar um parceiro individualmente (ex.: "a Gaia gastou", "o Vitim esqueceu"). Apelidos só para saudação amistosa.
2. PROIBIDO ataque pessoal: nada de "irresponsáveis", "relapsos", "que vergonha", "vocês são...". Critique o GASTO, nunca as pessoas.
3. Intensidade PROPORCIONAL ao tamanho do estouro (excesso = quanto a projeção/gasto passou da meta):
   • até ~30% acima → firme e CALMO: "passou da meta, vale segurar". Alarme aqui é ruído.
   • ~30% a 80% acima → tom FORTE ok: "atenção", "cuidado", "precisa frear", "saiu da linha".
   • ~80% ou mais acima → ENFÁTICO ok: "cuidado!!", "preocupante", "passou bem do limite". A situação é séria — seja honesto.
4. PROIBIDO comemorar ou validar estouro: nada de "parabéns", "mandaram ver", "arrasaram", nem emojis de festa (🎉🥳🎊🍾🙌🏆).
5. PROIBIDO minimizar estouro: nada de "sem drama", "tá tudo bem", "relaxa", "de boa", "foi planejado". Sempre nomeie que passou da meta e que dá pra ajustar.
6. Elogio e emoji de festa SÓ para o que é positivo de verdade (categoria dentro da meta, ritmo bom). NUNCA para estouro. Podem coexistir: "mercado e transporte no controle 👏; já o lazer saiu da linha — atenção nesse".
7. Use EXATAMENTE os números e dias fornecidos. NUNCA invente, conte datas nem recalcule.

EXEMPLOS BONS (o tom escala com o tamanho do estouro):
- Pequeno (~10%): "Restaurante passou um pouco da meta. Vale segurar daqui pra frente pra fechar no azul."
- Grande (~50%): "Atenção: o lazer já passou bem da meta. Precisa frear pra não comprometer o resto do mês."
- Muito grande (~150%): "Cuidado!! Lazer passou da meta em mais de 100% — situação séria, bora puxar o freio agora."
- Equilíbrio: "Mercado e transporte no controle 👏 já o lazer saiu da linha — esse é o que precisa de atenção."

EXEMPLOS RUINS (NUNCA faça):
- "A Gaia gastou demais em restaurante."              ← culpa/singulariza um parceiro
- "Vocês são irresponsáveis com o lazer."             ← ataque pessoal
- "🎉 Vocês mandaram ver no lazer!"                    ← comemora/emoji de festa em estouro
- "Passou da meta, mas sem drama, tá tudo bem!"       ← minimiza o estouro
- "Cuidado!! Perderam o controle!" (estouro de ~5%)   ← alarme desproporcional
`.trim()

const DEFAULT_TOM =
  'Tom LEVE e DESCONTRAÍDO — como um parceiro que cutuca de leve. Pode usar humor suave. Máx. 1 emoji. Foque nas 1-2 categorias mais críticas ou no panorama geral se tudo estiver bem.'

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
    ? `Panorama: ${ok.length} em dia, ${noLimite.length} no limite, ${emRisco.length} em risco — de ${comMeta.length} categorias com meta. Faltam exatamente ${diasRestam} dias corridos (não conte datas, use este número).`
    : `Nenhuma categoria com meta definida este mês. Faltam exatamente ${diasRestam} dias corridos.`

  // Dados por categoria — SEM dados por pessoa (não induz singularização).
  // Inclui o excesso% para a IA calibrar a intensidade do alerta.
  const linhas = comMeta
    .map(c => {
      const partes = [
        `- ${c.emoji} ${c.nome}: gasto ${fmt(c.gastoAcumulado)}, meta ${fmt(c.meta ?? 0)}`,
        c.projecao != null ? `projeção ${fmt(c.projecao)}` : 'projeção indefinida',
        `status ${c.status}`,
      ]
      const excesso = calcExcesso(c.status, c.gastoAcumulado, c.projecao, c.meta)
      if (excesso > 0) partes.push(`excede ${(excesso * 100).toFixed(0)}% da meta`)
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

/** Fallback determinístico quando o LLM falha ou é rejeitado pelo guardrail.
 *  Respeita a proporção: estouro grande recebe tom mais firme. */
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
    const excesso = calcExcesso(c.status, c.gastoAcumulado, c.projecao, c.meta)
    const forte = excesso >= 0.80
    const medio = excesso >= 0.30

    if (c.status === 'estourou') {
      const abertura = forte ? `${c.emoji} Atenção: ${c.nome} passou bem da meta`
                     : medio ? `${c.emoji} ${c.nome} passou da meta`
                     :         `${c.emoji} ${c.nome} passou um pouco da meta`
      return `${abertura} de ${fmt(c.meta ?? 0)} (em ${fmt(c.gastoAcumulado)}). Vale segurar nos ${diasRestantes} dias que faltam.`
    }
    const projecao = c.projecao ?? 0
    const diff = projecao - (c.meta ?? 0)
    const abertura = forte ? `${c.emoji} Cuidado com ${c.nome}` : `${c.emoji} ${c.nome}`
    return `${abertura}: no ritmo atual fecha em ${fmt(projecao)}, ${fmt(diff)} acima da meta.`
  }).join(' ')
}
