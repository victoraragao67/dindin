-- Migration 011: relaxa RLS para app de casal (confianca mutua total)
-- Contexto: o DinDin e usado so por Victor e Gaia. As policies originais
-- bloqueavam registro de gastos/acertos em nome do outro usuario.
-- Solucao: qualquer membro autenticado pode inserir/editar qualquer registro.

-- expenses: qualquer membro autenticado pode inserir gasto de qualquer um
DROP POLICY IF EXISTS expenses_insert ON public.expenses;
CREATE POLICY expenses_insert ON public.expenses
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- expenses: qualquer membro pode editar/cancelar qualquer gasto
DROP POLICY IF EXISTS expenses_update ON public.expenses;
CREATE POLICY expenses_update ON public.expenses
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- transfers: qualquer membro pode registrar qualquer acerto
DROP POLICY IF EXISTS transfers_insert ON public.transfers;
CREATE POLICY transfers_insert ON public.transfers
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- recurring_templates: mesma logica
DROP POLICY IF EXISTS recurring_insert ON public.recurring_templates;
CREATE POLICY recurring_insert ON public.recurring_templates
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS recurring_update ON public.recurring_templates;
CREATE POLICY recurring_update ON public.recurring_templates
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS recurring_delete ON public.recurring_templates;
CREATE POLICY recurring_delete ON public.recurring_templates
  FOR DELETE
  USING (auth.uid() IS NOT NULL);
