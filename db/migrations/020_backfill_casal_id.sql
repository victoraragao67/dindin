-- ============================================================
-- 020_backfill_casal_id.sql
-- Atribui o casal de Vitim & Gaia a todos os registros existentes.
-- Rodar APÓS 019 confirmar OK. Validar contagens antes e depois.
-- ============================================================

DO $$
DECLARE
  v_casal_id uuid;
BEGIN
  SELECT id INTO STRICT v_casal_id FROM public.casais WHERE nome = 'Vitim & Gaia';

  UPDATE public.expenses            SET casal_id = v_casal_id WHERE casal_id IS NULL;
  UPDATE public.transfers           SET casal_id = v_casal_id WHERE casal_id IS NULL;
  UPDATE public.recurring_templates SET casal_id = v_casal_id WHERE casal_id IS NULL;
  UPDATE public.spending_goals      SET casal_id = v_casal_id WHERE casal_id IS NULL;

  ASSERT (SELECT COUNT(*) FROM public.expenses            WHERE casal_id IS NULL) = 0,
    'expenses com casal_id NULL após backfill';
  ASSERT (SELECT COUNT(*) FROM public.transfers           WHERE casal_id IS NULL) = 0,
    'transfers com casal_id NULL após backfill';
  ASSERT (SELECT COUNT(*) FROM public.recurring_templates WHERE casal_id IS NULL) = 0,
    'recurring_templates com casal_id NULL após backfill';

  RAISE NOTICE 'Backfill OK para casal_id: %', v_casal_id;
END $$;
