-- ============================================================
-- 024_dissolve_casal.sql
-- Função para dissolver um casal. Qualquer membro pode acionar.
-- Dados financeiros são preservados — nunca deletados.
-- ============================================================

CREATE OR REPLACE FUNCTION public.dissolver_casal(p_casal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.casal_membros
    WHERE casal_id = p_casal_id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissão.');
  END IF;

  UPDATE public.casais
  SET status = 'inactive', inativado_em = now()
  WHERE id = p_casal_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Casal não encontrado ou já inativo.');
  END IF;

  -- Invalida convites pendentes
  UPDATE public.casal_convites
  SET expires_at = now()
  WHERE casal_id = p_casal_id AND usado_em IS NULL;

  RETURN jsonb_build_object('ok', true);
END;
$$;
