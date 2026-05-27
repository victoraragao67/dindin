-- ============================================================
-- 025_admin_panel.sql
-- Adiciona status 'blocked' ao enum de casais.
-- Cria funções SECURITY DEFINER para ações admin.
-- ============================================================

-- Adiciona 'blocked' ao CHECK constraint de casais.status
ALTER TABLE public.casais
  DROP CONSTRAINT IF EXISTS casais_status_check;

ALTER TABLE public.casais
  ADD CONSTRAINT casais_status_check
  CHECK (status IN ('pending', 'active', 'inactive', 'blocked'));

-- ── Função: admin bloqueia um casal ──────────────────────────
-- Chamada via service role — não exposta ao usuário comum.
-- Verificação de admin feita na camada da aplicação (middleware).
CREATE OR REPLACE FUNCTION public.admin_bloquear_casal(p_casal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.casais
  SET status = 'blocked'
  WHERE id = p_casal_id AND status IN ('pending', 'active');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Casal não encontrado ou já bloqueado/inativo.');
  END IF;

  -- Invalida convites pendentes do casal
  UPDATE public.casal_convites
  SET expires_at = now()
  WHERE casal_id = p_casal_id AND usado_em IS NULL;

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── Função: admin reativa um casal bloqueado ─────────────────
CREATE OR REPLACE FUNCTION public.admin_reativar_casal(p_casal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_membros int;
BEGIN
  SELECT COUNT(*) INTO v_membros
  FROM public.casal_membros
  WHERE casal_id = p_casal_id;

  -- Só reativa se tiver 2 membros (casal completo)
  IF v_membros < 2 THEN
    UPDATE public.casais SET status = 'pending' WHERE id = p_casal_id AND status = 'blocked';
  ELSE
    UPDATE public.casais SET status = 'active'  WHERE id = p_casal_id AND status = 'blocked';
  END IF;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Casal não encontrado ou não está bloqueado.');
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;
