-- ============================================================
-- 009_spending_goals.sql
-- Metas de gasto mensais por categoria (F1-18)
-- ============================================================

CREATE TABLE public.spending_goals (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id   int         NOT NULL REFERENCES public.categories(id),
  valor_centavos int         NOT NULL CHECK (valor_centavos > 0),
  mes            int         NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano            int         NOT NULL,
  created_by     uuid        REFERENCES public.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (categoria_id, mes, ano)
);

CREATE INDEX idx_spending_goals_mes_ano ON public.spending_goals(ano, mes);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.spending_goals ENABLE ROW LEVEL SECURITY;

-- Qualquer membro autenticado lê todas as metas (meta é do casal)
CREATE POLICY goals_select ON public.spending_goals
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Qualquer membro autenticado cria/edita metas
CREATE POLICY goals_insert ON public.spending_goals
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY goals_update ON public.spending_goals
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY goals_delete ON public.spending_goals
  FOR DELETE
  USING (auth.uid() IS NOT NULL);
