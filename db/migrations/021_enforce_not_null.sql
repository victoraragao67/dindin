-- ============================================================
-- 021_enforce_not_null.sql
-- Torna casal_id obrigatório em todas as tabelas financeiras.
-- Só rodar após confirmar backfill 100% completo (020).
-- ============================================================

ALTER TABLE public.expenses            ALTER COLUMN casal_id SET NOT NULL;
ALTER TABLE public.transfers           ALTER COLUMN casal_id SET NOT NULL;
ALTER TABLE public.recurring_templates ALTER COLUMN casal_id SET NOT NULL;
ALTER TABLE public.spending_goals      ALTER COLUMN casal_id SET NOT NULL;
