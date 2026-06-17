-- ============================================================
-- 045_fix_tom_llm_templates.sql
-- Atualiza instruções de tom nos templates de push para alinhar
-- com o guardrail (REGRAS_TOM_BASE) implementado no código.
-- Corrige risco_falta.tom_llm que contradizia o blocklist.
-- ============================================================

UPDATE public.message_templates
SET variacoes = ARRAY[
  'Escreva em português do Brasil, 1 frase (máx. 2), tom pode ser um pouco mais firme que o normal (situação é pior), mas NUNCA culpando o casal nem com palavras de vergonha. Estouro = heads-up, não catástrofe. Junte os dois contextos em uma única mensagem. Máx. 1 emoji.'
],
    updated_at = now()
WHERE chave = 'risco_falta.tom_llm';

-- Também torna risco.tom_llm mais explícito sobre proporção
UPDATE public.message_templates
SET variacoes = ARRAY[
  'Escreva em português do Brasil, 1 frase (máx. 2), tom LEVE e DESCONTRAÍDO — cutuca sem culpar e sem alarmismo. Estouro = aviso construtivo calmo ("vale segurar"), nunca tragédia. Pode mencionar o dia da semana. Inclua o número real da projeção ou quanto falta. Máx. 1 emoji.'
],
    updated_at = now()
WHERE chave = 'risco.tom_llm';
