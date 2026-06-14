-- ============================================================
-- 040_ultimo_lembrete.sql
-- Anti-repetição de push: último texto enviado (evitar repetição no LLM)
-- e data de idempotência (1 push/usuário/dia).
-- ============================================================

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS ultimo_lembrete text        NULL,
  ADD COLUMN IF NOT EXISTS notificado_em   date        NULL;
