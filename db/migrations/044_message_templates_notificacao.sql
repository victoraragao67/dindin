-- ============================================================
-- 044_message_templates_notificacao.sql
-- Novos templates para o sistema de notificação unificada:
--   risco.tom_llm       — instrução de tom para alertas de risco
--   falta_uso.tom_llm   — instrução de tom para falta de uso
--   risco_falta.tom_llm — instrução de tom para mensagem combinada
--   parceiro.registro   — texto ao parceiro: 1 gasto registrado
--   parceiro.agrupado   — texto ao parceiro: N gastos agrupados
-- ============================================================

INSERT INTO public.message_templates (chave, grupo, descricao, variacoes) VALUES

('risco.tom_llm', 'risco_metas',
 'Instrução de tom injetada no prompt Gemini para alertas de risco de meta. 1 variação = 1 parágrafo.',
 ARRAY[
   'Escreva em português do Brasil, 1 frase (máx. 2), tom LEVE e DESCONTRAÍDO — cutuca sem culpar. Pode mencionar o dia da semana para personalizar (ex.: sexta = perigo de delivery). Inclua o número real da projeção ou quanto falta. Máx. 1 emoji. Nunca soe como sermão ou cobrança pesada.'
 ]),

('falta_uso.tom_llm', 'falta_utilizacao',
 'Instrução de tom para lembretes de falta de uso no push das 20h. 1 variação = 1 parágrafo.',
 ARRAY[
   'Escreva em português do Brasil, 1 frase (máx. 2), tom LEVE e CÚMPLICE — lembra, não cobra. Use o dia da semana e quantos dias sem registrar para personalizar: segunda = recomeço, fim de semana = rolês caros, domingo = balanço, 7d = levinho, 14d = mais firme, 21d = último empurrão. Máx. 1 emoji. Nunca julgue a pessoa.'
 ]),

('risco_falta.tom_llm', 'risco_metas',
 'Instrução de tom para mensagem COMBINADA (risco + não registrou hoje). Pode ser um pouco mais firme, sem culpar.',
 ARRAY[
   'Escreva em português do Brasil, 1 frase (máx. 2), unindo os dois contextos: categoria em risco E sem registro hoje. Tom pode ser um pouco mais direto que o normal (situação é pior), mas nunca culpando a pessoa. Use "perder o controle" OK, "você é descontrolado" NÃO. Máx. 1 emoji.'
 ]),

('parceiro.registro', 'parceiro',
 'Push ao parceiro: 1 gasto registrado. Placeholders: {apelido} {emoji} {categoria} {valor}',
 ARRAY[
   '{apelido} registrou {emoji} {categoria} · {valor}'
 ]),

('parceiro.agrupado', 'parceiro',
 'Push ao parceiro: N gastos agrupados. Placeholders: {apelido} {n} {total} {lista}',
 ARRAY[
   '{apelido} registrou {n} gastos hoje · {total} ({lista})'
 ])

ON CONFLICT (chave) DO UPDATE
  SET grupo     = EXCLUDED.grupo,
      descricao = EXCLUDED.descricao,
      variacoes = EXCLUDED.variacoes,
      updated_at = now();
