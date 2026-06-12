import { createAdminClient } from '../supabase/admin'
import { gerarInsight } from './gemini'
import { montarPromptInsight, gerarFallbackTemplate } from './insight-prompt'
import { getTemplate } from '../copy/get-template'
import type { PreditivaCategoria } from '../preditiva'

function hojeBRT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export async function getInsightDoDia(
  casalId:    string,
  preditiva:  PreditivaCategoria[],
  apelidos:   [string, string],
  diaAtual:   number,
  diasNoMes:  number,
): Promise<{ resumo: string }> {
  const admin = createAdminClient()
  const hoje  = hojeBRT()

  // 1. Tenta cache
  const { data: cached } = await admin
    .from('insight_cache')
    .select('resumo_txt')
    .eq('casal_id', casalId)
    .eq('data_brt', hoje)
    .single()

  if (cached?.resumo_txt) return { resumo: cached.resumo_txt }

  // 2. Gera redação (LLM → fallback; nunca propaga erro para a UI)
  const diasRestantes = diasNoMes - diaAtual
  const tomInstructions = await getTemplate('ritmo.tom_llm').catch(() => '')
  const prompt = montarPromptInsight({
    apelidos, dia: diaAtual, diasNoMes, categorias: preditiva,
    tomInstructions: tomInstructions || undefined,
  })
  let llm: { resumo: string } | null = null
  try { llm = await gerarInsight(prompt) } catch { llm = null }
  const resumo = (llm?.resumo ?? gerarFallbackTemplate(preditiva, diasRestantes)).slice(0, 280)
  const origem = llm ? 'llm' : 'fallback'

  // 3. Write-through (upsert idempotente — UNIQUE casal_id + data_brt)
  await admin
    .from('insight_cache')
    .upsert(
      { casal_id: casalId, data_brt: hoje, resumo_txt: resumo, origem },
      { onConflict: 'casal_id,data_brt' }
    )

  return { resumo }
}
