-- ============================================================
-- 043_category_alerts_weekly.sql
-- Muda o dedup de alertas de categoria de "1x por nível/mês"
-- para "1x por semana por (casal, categoria)".
-- Remove a UNIQUE constraint e adiciona índice para a query de 7 dias.
-- ============================================================

-- Derruba o UNIQUE antigo (dedup por nível/mês)
ALTER TABLE public.category_alerts_sent
  DROP CONSTRAINT IF EXISTS category_alerts_sent_casal_id_categoria_id_mes_ano_nivel_key;

-- Índice composto para a query de dedup por semana:
-- WHERE casal_id = $1 AND categoria_id = $2 AND sent_at > now() - interval '7 days'
CREATE INDEX IF NOT EXISTS idx_category_alerts_recente
  ON public.category_alerts_sent (casal_id, categoria_id, sent_at DESC);
