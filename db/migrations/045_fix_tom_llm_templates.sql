-- ============================================================
-- 045_fix_tom_llm_templates.sql
-- Atualiza instruções de tom nos templates de push para alinhar
-- com o guardrail (REGRAS_TOM_BASE) e a regra de PROPORÇÃO:
-- a intensidade do alerta escala com o tamanho do estouro.
-- ============================================================

-- risco.tom_llm — intensidade proporcional ao excesso
UPDATE public.message_templates
SET variacoes = ARRAY[
  'Escreva em português do Brasil, 1 frase (máx. 2). A intensidade deve ser PROPORCIONAL ao excesso fornecido: até ~30% acima da meta = firme e calmo ("passou da meta, vale segurar"); ~30-80% = tom forte ("atenção", "cuidado", "precisa frear"); ~80%+ = enfático ("cuidado!!", "preocupante"). Fale com o casal ("vocês"), nunca culpe um parceiro. Nunca comemore nem minimize o estouro. Inclua o número real da projeção/excesso. Máx. 1 emoji (nunca de festa em estouro).'
],
    updated_at = now()
WHERE chave = 'risco.tom_llm';

-- risco_falta.tom_llm — combina risco + sem registro, mantendo proporção
UPDATE public.message_templates
SET variacoes = ARRAY[
  'Escreva em português do Brasil, 1 frase (máx. 2), unindo os dois contextos (categoria em risco E sem registrar hoje). A intensidade do alerta de gasto deve ser PROPORCIONAL ao excesso: pequeno = firme e calmo; grande = forte; muito grande (~80%+) = enfático. Fale com o casal ("vocês"), nunca culpe um parceiro nem use ataque pessoal. Nunca comemore nem minimize o estouro. Use exatamente os dias e valores fornecidos. Máx. 1 emoji (nunca de festa).'
],
    updated_at = now()
WHERE chave = 'risco_falta.tom_llm';

-- falta_uso.tom_llm — reforça que NÃO deve inventar contagem de dias
UPDATE public.message_templates
SET variacoes = ARRAY[
  'Escreva em português do Brasil, 1 frase (máx. 2), tom LEVE e CÚMPLICE — lembra, não cobra. Use o dia da semana e quantos dias sem registrar (use EXATAMENTE o número fornecido, nunca conte datas): segunda = recomeço, fim de semana = rolês, domingo = balanço, 7d = levinho, 14d = mais firme, 21d = último empurrão. Fale com o casal ("vocês"), nunca culpe um parceiro. Máx. 1 emoji.'
],
    updated_at = now()
WHERE chave = 'falta_uso.tom_llm';
