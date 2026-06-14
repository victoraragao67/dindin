-- ============================================================
-- 042_parceiro_notificado.sql
-- Controle de notificação agrupada ao parceiro.
-- NULL = pendente de notificação; data = já notificado.
-- A varredura (parceiro-batch) agrupa gastos >= 1h sem notificação
-- e envia 1 push ao parceiro, marcando parceiro_notificado_em.
-- ============================================================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS parceiro_notificado_em timestamptz NULL;
