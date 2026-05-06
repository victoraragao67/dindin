-- ============================================================
-- 007_rls.sql
-- Row Level Security para todas as tabelas sensíveis.
-- Princípio: usuário autenticado lê dados do casal;
--            só escreve o que é seu.
-- ============================================================

-- ── Habilita RLS ─────────────────────────────────────────────
ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions   ENABLE ROW LEVEL SECURITY;
-- categories: leitura pública, sem RLS (não contém dados sensíveis)

-- ── users ────────────────────────────────────────────────────
-- Qualquer membro autenticado lê todos os usuários
-- (necessário para o toggle Vitim/Gaia e exibir saldo)
CREATE POLICY users_select ON public.users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Cada usuário só atualiza o próprio perfil
CREATE POLICY users_update ON public.users
  FOR UPDATE
  USING (id = auth.uid());

-- ── expenses ─────────────────────────────────────────────────
-- Qualquer membro autenticado lê todos os gastos
-- (necessário para calcular saldo compartilhado)
CREATE POLICY expenses_select ON public.expenses
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Apenas o pagador insere o próprio gasto
CREATE POLICY expenses_insert ON public.expenses
  FOR INSERT
  WITH CHECK (pagador_id = auth.uid());

-- Apenas o pagador atualiza/cancela o próprio gasto
CREATE POLICY expenses_update ON public.expenses
  FOR UPDATE
  USING (pagador_id = auth.uid());

-- ── expense_installments ─────────────────────────────────────
-- Leitura para qualquer membro autenticado
-- INSERT/UPDATE/DELETE: feito exclusivamente pelo trigger fn_gerar_parcelas
-- (SECURITY DEFINER — não há política de escrita para o app)
CREATE POLICY installments_select ON public.expense_installments
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── recurring_templates ──────────────────────────────────────
-- Ambos leem todos os templates (visibilidade do casal)
CREATE POLICY recurring_select ON public.recurring_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- CRUD: apenas o dono do template
CREATE POLICY recurring_insert ON public.recurring_templates
  FOR INSERT
  WITH CHECK (pagador_id = auth.uid());

CREATE POLICY recurring_update ON public.recurring_templates
  FOR UPDATE
  USING (pagador_id = auth.uid());

CREATE POLICY recurring_delete ON public.recurring_templates
  FOR DELETE
  USING (pagador_id = auth.uid());

-- ── transfers ────────────────────────────────────────────────
-- Ambos leem os acertos (necessário para calcular saldo)
CREATE POLICY transfers_select ON public.transfers
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Apenas quem paga registra o acerto
CREATE POLICY transfers_insert ON public.transfers
  FOR INSERT
  WITH CHECK (de_id = auth.uid());

-- ── push_subscriptions ───────────────────────────────────────
-- Cada usuário gerencia apenas as próprias subscriptions
CREATE POLICY push_select ON public.push_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY push_insert ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY push_update ON public.push_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY push_delete ON public.push_subscriptions
  FOR DELETE
  USING (user_id = auth.uid());
