-- ============================================================
-- 010_categories_rls.sql
-- Garante que categorias são legíveis por usuários autenticados.
--
-- A migration 007 comentou que categories não teria RLS,
-- mas o client-side usa anon key + sessão do usuário.
-- Para garantir leitura em todas as situações, habilitamos RLS
-- com policy permissiva de SELECT para authenticated.
-- ============================================================

-- Habilita RLS (idempotente se já estiver habilitado)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policy de leitura para qualquer usuário autenticado
-- (DROP IF EXISTS garante idempotência)
DROP POLICY IF EXISTS categories_select ON public.categories;
CREATE POLICY categories_select ON public.categories
  FOR SELECT
  USING (true);   -- leitura pública — categories não tem dados sensíveis
