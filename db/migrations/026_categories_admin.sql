-- ============================================================
-- 026_categories_admin.sql
-- Adiciona campo 'ativo' a categories.
-- Policies de INSERT/UPDATE apenas para service role (admin).
-- ============================================================

-- Campo ativo: soft-deactivate sem perder referências em expenses
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- Garante que categorias existentes ficam ativas
UPDATE public.categories SET ativo = true WHERE ativo IS NULL;

-- Policy de escrita: apenas service role (admin) pode criar/editar categorias.
-- O app usa anon key + RLS — não terá acesso a INSERT/UPDATE.
-- O admin usa createAdminClient() que bypassa RLS — policies abaixo
-- ficam como documentação de intenção, mas o service role bypassa mesmo.

-- Bloqueia INSERT/UPDATE para usuários autenticados comuns
CREATE POLICY categories_insert ON public.categories
  FOR INSERT WITH CHECK (false);   -- ninguém via anon/authenticated key

CREATE POLICY categories_update ON public.categories
  FOR UPDATE USING (false);        -- idem
