-- ============================================================
-- 004_recurring_templates.sql
-- Templates de gastos recorrentes + FK em expenses +
-- índice de idempotência do cron
-- ============================================================

-- ── Tabela ───────────────────────────────────────────────────
CREATE TABLE public.recurring_templates (
  id                uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  pagador_id        uuid             NOT NULL REFERENCES public.users(id),
  categoria_id      int              NOT NULL REFERENCES public.categories(id),
  valor_centavos    int              NOT NULL CHECK (valor_centavos > 0),
  descricao         text             NOT NULL,
  divisao           public.divisao_tipo NOT NULL DEFAULT '50_50',
  split_pagador_pct numeric(5,2)     CHECK (
                      split_pagador_pct IS NULL
                      OR (split_pagador_pct > 0 AND split_pagador_pct < 100)
                    ),
  -- 1–28: evita problemas em fevereiro e meses com 30 dias
  dia_do_mes        int              NOT NULL CHECK (dia_do_mes BETWEEN 1 AND 28),
  ativo             bool             NOT NULL DEFAULT true,
  created_at        timestamptz      NOT NULL DEFAULT now()
);

CREATE INDEX idx_recurring_ativo ON public.recurring_templates(ativo, dia_do_mes);

-- ── FK em expenses (pendente desde 001) ─────────────────────
ALTER TABLE public.expenses
  ADD CONSTRAINT fk_expenses_recurring
  FOREIGN KEY (recurring_template_id)
  REFERENCES public.recurring_templates(id)
  ON DELETE SET NULL;

-- ── Índice de idempotência do cron ───────────────────────────
-- Garante que o Edge Function de cron não gere 2 lançamentos
-- do mesmo template no mesmo mês, mesmo se rodar mais de uma vez.
-- Usa date_trunc('month', ...) em vez de EXTRACT()::int porque
-- expressões de índice não aceitam o operador :: no Postgres.
CREATE UNIQUE INDEX uq_expense_recurring_mes
  ON public.expenses (
    recurring_template_id,
    date_trunc('month', data_compra::timestamptz)
  )
  WHERE recurring_template_id IS NOT NULL;
