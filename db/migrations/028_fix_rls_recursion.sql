-- ============================================================
-- 028_fix_rls_recursion.sql
-- Corrige recursão infinita nas policies membros_select e
-- casais_select da migration 022.
--
-- Problema: membros_select consultava a própria tabela
-- casal_membros para decidir quem pode ler casal_membros —
-- recursão que o Postgres resolvia com erro silencioso.
-- getCasal() recebia data=null, redirecionava para /onboarding.
--
-- Fix: SECURITY DEFINER helper que bypassa RLS ao checar
-- membership, quebrando o ciclo.
-- ============================================================

-- ── Helper: checa membership sem filtro de status ────────────
-- Diferente de is_casal_member() (que exige status='active'),
-- esta função retorna true para pending E active.
-- Usada nas policies de navegação (casais, casal_membros)
-- para que getCasal() veja casals pending e redirecione para
-- /onboarding/aguardando corretamente.
CREATE OR REPLACE FUNCTION public.is_casal_member_any(p_casal_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.casal_membros
    WHERE casal_id = p_casal_id
      AND user_id  = auth.uid()
  )
$$;

-- ── Corrige casal_membros ─────────────────────────────────────
-- Antes: consultava casal_membros dentro de si mesma (recursão).
-- Depois: user_id = auth.uid() cobre o caso mais comum (ver a
-- própria linha) sem nenhuma subquery; is_casal_member_any()
-- usa SECURITY DEFINER e não dispara RLS novamente.
DROP POLICY IF EXISTS membros_select ON public.casal_membros;

CREATE POLICY membros_select ON public.casal_membros
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_casal_member_any(casal_membros.casal_id)
  );

-- ── Corrige casais ────────────────────────────────────────────
-- Antes: consultava casal_membros diretamente, que por sua vez
-- disparava membros_select com recursão.
-- Depois: is_casal_member_any() é SECURITY DEFINER — lê
-- casal_membros sem acionar nenhuma policy, sem recursão.
DROP POLICY IF EXISTS casais_select ON public.casais;

CREATE POLICY casais_select ON public.casais
  FOR SELECT USING (
    public.is_casal_member_any(casais.id)
  );

-- ── Corrige casais_update (mesmo padrão) ─────────────────────
DROP POLICY IF EXISTS casais_update ON public.casais;

CREATE POLICY casais_update ON public.casais
  FOR UPDATE USING (
    public.is_casal_member_any(casais.id)
  );
