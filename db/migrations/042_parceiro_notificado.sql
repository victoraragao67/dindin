-- ============================================================
-- 042_parceiro_notificado.sql
-- Controle de notificação agrupada ao parceiro.
-- NULL = pendente de notificação; data = já notificado.
-- A varredura (parceiro-batch) agrupa gastos >= 1h sem notificação
-- e envia 1 push ao parceiro, marcando parceiro_notificado_em.
-- ============================================================

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS parceiro_notificado_em timestamptz NULL;

-- Backfill: gastos históricos já existentes não precisam ser notificados.
-- Sem isso, o parceiro-batch enviaria todos os gastos antigos na 1ª execução.
UPDATE public.expenses
SET parceiro_notificado_em = NOW()
WHERE parceiro_notificado_em IS NULL
  AND cancelado = false
  AND origem = 'pwa';
