-- ============================================================
-- 022_rls_multi_tenant.sql
-- Substitui as policies "qualquer autenticado" por isolamento
-- por casal. Função helper SECURITY DEFINER para evitar recursão.
-- ============================================================

-- ── Helper function ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_casal_member(p_casal_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.casal_membros cm
    JOIN public.casais c ON c.id = cm.casal_id
    WHERE cm.casal_id = p_casal_id
      AND cm.user_id  = auth.uid()
      AND c.status    = 'active'
  )
$$;

-- ── Drop policies antigas ─────────────────────────────────────
DROP POLICY IF EXISTS expenses_select   ON public.expenses;
DROP POLICY IF EXISTS expenses_insert   ON public.expenses;
DROP POLICY IF EXISTS expenses_update   ON public.expenses;

DROP POLICY IF EXISTS transfers_select  ON public.transfers;
DROP POLICY IF EXISTS transfers_insert  ON public.transfers;

DROP POLICY IF EXISTS recurring_select  ON public.recurring_templates;
DROP POLICY IF EXISTS recurring_insert  ON public.recurring_templates;
DROP POLICY IF EXISTS recurring_update  ON public.recurring_templates;
DROP POLICY IF EXISTS recurring_delete  ON public.recurring_templates;

DROP POLICY IF EXISTS installments_select ON public.expense_installments;

DROP POLICY IF EXISTS goals_select      ON public.spending_goals;
DROP POLICY IF EXISTS goals_insert      ON public.spending_goals;
DROP POLICY IF EXISTS goals_update      ON public.spending_goals;
DROP POLICY IF EXISTS goals_delete      ON public.spending_goals;

DROP POLICY IF EXISTS users_select      ON public.users;
DROP POLICY IF EXISTS users_update      ON public.users;

-- ── Policies novas ───────────────────────────────────────────

-- users: lê apenas si mesmo + membros do mesmo casal ativo
CREATE POLICY users_select ON public.users
  FOR SELECT USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.casal_membros cm
      JOIN public.casais c ON c.id = cm.casal_id
      JOIN public.casal_membros cm2 ON cm2.casal_id = c.id AND cm2.user_id = auth.uid()
      WHERE cm.user_id = users.id AND c.status = 'active'
    )
  );

CREATE POLICY users_update ON public.users
  FOR UPDATE USING (id = auth.uid());

-- expenses
CREATE POLICY expenses_select ON public.expenses
  FOR SELECT USING (public.is_casal_member(casal_id));

CREATE POLICY expenses_insert ON public.expenses
  FOR INSERT WITH CHECK (public.is_casal_member(casal_id));

CREATE POLICY expenses_update ON public.expenses
  FOR UPDATE USING (public.is_casal_member(casal_id));

-- expense_installments (herda segurança do expense pai)
CREATE POLICY installments_select ON public.expense_installments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.id = expense_installments.expense_id
        AND public.is_casal_member(e.casal_id)
    )
  );

-- transfers
CREATE POLICY transfers_select ON public.transfers
  FOR SELECT USING (public.is_casal_member(casal_id));

CREATE POLICY transfers_insert ON public.transfers
  FOR INSERT WITH CHECK (public.is_casal_member(casal_id));

-- recurring_templates
CREATE POLICY recurring_select ON public.recurring_templates
  FOR SELECT USING (public.is_casal_member(casal_id));

CREATE POLICY recurring_insert ON public.recurring_templates
  FOR INSERT WITH CHECK (public.is_casal_member(casal_id));

CREATE POLICY recurring_update ON public.recurring_templates
  FOR UPDATE USING (public.is_casal_member(casal_id));

CREATE POLICY recurring_delete ON public.recurring_templates
  FOR DELETE USING (public.is_casal_member(casal_id));

-- spending_goals
CREATE POLICY goals_select ON public.spending_goals
  FOR SELECT USING (public.is_casal_member(casal_id));

CREATE POLICY goals_insert ON public.spending_goals
  FOR INSERT WITH CHECK (public.is_casal_member(casal_id));

CREATE POLICY goals_update ON public.spending_goals
  FOR UPDATE USING (public.is_casal_member(casal_id));

CREATE POLICY goals_delete ON public.spending_goals
  FOR DELETE USING (public.is_casal_member(casal_id));

-- ── casais, casal_membros, casal_convites ────────────────────
ALTER TABLE public.casais         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casal_membros  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casal_convites ENABLE ROW LEVEL SECURITY;

CREATE POLICY casais_select ON public.casais
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.casal_membros
      WHERE casal_id = casais.id AND user_id = auth.uid()
    )
  );

CREATE POLICY casais_update ON public.casais
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.casal_membros
      WHERE casal_id = casais.id AND user_id = auth.uid()
    )
  );

CREATE POLICY membros_select ON public.casal_membros
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.casal_membros cm2
      WHERE cm2.casal_id = casal_membros.casal_id AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY convites_select ON public.casal_convites
  FOR SELECT USING (criado_por = auth.uid());

CREATE POLICY convites_insert ON public.casal_convites
  FOR INSERT WITH CHECK (criado_por = auth.uid());
