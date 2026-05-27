-- ============================================================
-- 018_multi_tenant_schema.sql
-- Cria entidade casal e adiciona casal_id (nullable) nas tabelas.
-- casal_id fica nullable nesta migration para permitir backfill
-- sem quebrar dados existentes. NOT NULL é adicionado em 021.
-- ============================================================

-- ── casais ───────────────────────────────────────────────────
CREATE TABLE public.casais (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text,
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'active', 'inactive')),
  inativado_em   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── casal_membros ────────────────────────────────────────────
CREATE TABLE public.casal_membros (
  casal_id   uuid NOT NULL REFERENCES public.casais(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'member')),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (casal_id, user_id)
);

-- Trigger: 1 usuário só pode estar em 1 casal ativo ou pending
CREATE OR REPLACE FUNCTION public.fn_check_user_single_casal()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.casal_membros cm
    JOIN public.casais c ON c.id = cm.casal_id
    WHERE cm.user_id = NEW.user_id
      AND c.status IN ('pending', 'active')
      AND cm.casal_id != NEW.casal_id
  ) THEN
    RAISE EXCEPTION 'Usuário já faz parte de um casal ativo ou pendente.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_user_single_casal
  BEFORE INSERT ON public.casal_membros
  FOR EACH ROW EXECUTE FUNCTION public.fn_check_user_single_casal();

-- Trigger: máx. 2 membros por casal
CREATE OR REPLACE FUNCTION public.fn_limit_casal_membros()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.casal_membros WHERE casal_id = NEW.casal_id) >= 2 THEN
    RAISE EXCEPTION 'Este casal já está completo (máx. 2 membros).';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_limit_casal_membros
  BEFORE INSERT ON public.casal_membros
  FOR EACH ROW EXECUTE FUNCTION public.fn_limit_casal_membros();

-- ── casal_convites ───────────────────────────────────────────
CREATE TABLE public.casal_convites (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  casal_id         uuid        NOT NULL REFERENCES public.casais(id) ON DELETE CASCADE,
  token            char(6)     NOT NULL UNIQUE,
  email_convidado  text        NOT NULL,
  criado_por       uuid        NOT NULL REFERENCES public.users(id),
  expires_at       timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  usado_em         timestamptz,
  usado_por        uuid        REFERENCES public.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_convites_token ON public.casal_convites(token) WHERE usado_em IS NULL;
CREATE INDEX idx_convites_casal ON public.casal_convites(casal_id);

-- ── casal_id nas tabelas existentes (nullable por enquanto) ──
ALTER TABLE public.expenses            ADD COLUMN casal_id uuid REFERENCES public.casais(id);
ALTER TABLE public.transfers           ADD COLUMN casal_id uuid REFERENCES public.casais(id);
ALTER TABLE public.recurring_templates ADD COLUMN casal_id uuid REFERENCES public.casais(id);
ALTER TABLE public.spending_goals      ADD COLUMN casal_id uuid REFERENCES public.casais(id);

CREATE INDEX idx_expenses_casal            ON public.expenses(casal_id);
CREATE INDEX idx_transfers_casal           ON public.transfers(casal_id);
CREATE INDEX idx_recurring_templates_casal ON public.recurring_templates(casal_id);
CREATE INDEX idx_spending_goals_casal      ON public.spending_goals(casal_id);
