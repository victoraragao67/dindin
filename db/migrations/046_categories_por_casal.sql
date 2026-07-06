-- ============================================================
-- 046_categories_por_casal.sql
-- Torna categorias por casal (multi-tenant), no mesmo padrão de
-- expenses/spending_goals (casal_id + RLS via is_casal_member).
--
-- Antes: categories era GLOBAL e COMPARTILHADA por todos os casais
-- (nome UNIQUE global, sem casal_id). Os gastos/metas/recorrentes de
-- TODOS os casais apontavam para as mesmas linhas (ids 1..N).
--
-- Depois: CADA casal recebe a SUA cópia das categorias padrão (todas
-- ativas, ícone imutável) e os FKs de cada casal são re-apontados para
-- as cópias dele. As linhas globais originais viram o TEMPLATE
-- (casal_id NULL) usado para semear casais novos.
--
-- IMPORTANTE: nenhum casal perde categorias nem histórico — cada um
-- passa a ter o conjunto padrão completo, ativo, e independente.
-- ============================================================

-- ── 1. Colunas casal_id + padrao + coluna temporária de rastreio ─
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS casal_id uuid REFERENCES public.casais(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_casal ON public.categories(casal_id);

-- Flag `padrao`: categorias do conjunto padrão têm ícone IMUTÁVEL
-- (o casal só ativa/desativa). Categorias criadas pelo casal (padrao=false,
-- marcado pelo app) podem ter nome e ícone editados. DEFAULT true cobre
-- as linhas existentes (template) e as cópias geradas abaixo.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS padrao boolean NOT NULL DEFAULT true;

-- Coluna temporária: guarda o id da categoria-template de origem, para
-- re-apontar os FKs. Removida ao final da migration.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS _src_id int;

-- ── 2. Remove unicidade GLOBAL de nome ───────────────────────
-- Precisa sair ANTES de criar as cópias (que repetem os nomes por casal).
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_nome_key;

-- ── 3. Cópia por casal + re-map dos FKs ──────────────────────
DO $$
DECLARE
  v_casal uuid;
BEGIN
  -- As linhas atuais (casal_id NULL, _src_id NULL) SÃO o template.
  FOR v_casal IN SELECT id FROM public.casais LOOP
    -- Só semeia se o casal ainda não tiver categorias (idempotência).
    IF NOT EXISTS (SELECT 1 FROM public.categories WHERE casal_id = v_casal) THEN
      INSERT INTO public.categories (nome, emoji, aliases, ordem, ativo, padrao, casal_id, _src_id)
      SELECT nome, emoji, aliases, ordem, true, true, v_casal, id
      FROM public.categories
      WHERE casal_id IS NULL AND _src_id IS NULL;   -- apenas os originais (template)
    END IF;
  END LOOP;

  -- Re-aponta os FKs de cada casal para a cópia própria (match por _src_id).
  UPDATE public.expenses e
  SET categoria_id = c.id
  FROM public.categories c
  WHERE c.casal_id = e.casal_id AND c._src_id = e.categoria_id;

  UPDATE public.spending_goals g
  SET categoria_id = c.id
  FROM public.categories c
  WHERE c.casal_id = g.casal_id AND c._src_id = g.categoria_id;

  UPDATE public.recurring_templates r
  SET categoria_id = c.id
  FROM public.categories c
  WHERE c.casal_id = r.casal_id AND c._src_id = r.categoria_id;
END $$;

-- Após o re-map, as linhas template (casal_id NULL) não são mais
-- referenciadas por nenhum casal — ficam só como blueprint.
ALTER TABLE public.categories DROP COLUMN _src_id;

-- ── 4. Unicidade por casal ───────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS categories_casal_nome_key
  ON public.categories (casal_id, lower(nome));

-- Garante um único conjunto template (casal_id IS NULL).
CREATE UNIQUE INDEX IF NOT EXISTS categories_template_nome_key
  ON public.categories (lower(nome))
  WHERE casal_id IS NULL;

-- ── 5. RLS scopada por casal (substitui 010 + 026) ───────────
DROP POLICY IF EXISTS categories_select ON public.categories;
DROP POLICY IF EXISTS categories_insert ON public.categories;
DROP POLICY IF EXISTS categories_update ON public.categories;

-- Cada casal só enxerga/edita as próprias categorias. Templates
-- (casal_id NULL) ficam invisíveis para o app; lidos só pelo service
-- role e pela função de seed (SECURITY DEFINER). is_casal_member(NULL)=false.
CREATE POLICY categories_select ON public.categories
  FOR SELECT USING (public.is_casal_member(casal_id));

CREATE POLICY categories_insert ON public.categories
  FOR INSERT WITH CHECK (public.is_casal_member(casal_id));

CREATE POLICY categories_update ON public.categories
  FOR UPDATE USING (public.is_casal_member(casal_id));

-- ── 6. Seed automático de categorias em casal novo ───────────
CREATE OR REPLACE FUNCTION public.fn_seed_casal_categories()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (nome, emoji, aliases, ordem, ativo, padrao, casal_id)
  SELECT nome, emoji, aliases, ordem, true, true, NEW.id
  FROM public.categories
  WHERE casal_id IS NULL
  ON CONFLICT DO NOTHING;   -- idempotente se o casal já tiver sido semeado
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_seed_casal_categories
  AFTER INSERT ON public.casais
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_seed_casal_categories();
