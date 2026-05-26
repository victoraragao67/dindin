-- ============================================================
-- 023_invite_system.sql
-- Função SECURITY DEFINER que valida e aceita um convite.
-- RPC: supabase.rpc('accept_invite', { p_token: 'XK39PL' })
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_convite    public.casal_convites%ROWTYPE;
  v_user_email text;
  v_user_id    uuid := auth.uid();
BEGIN
  -- 1. Busca o convite válido
  SELECT * INTO v_convite
  FROM public.casal_convites
  WHERE token = upper(p_token)
    AND usado_em IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Código inválido ou expirado.');
  END IF;

  -- 2. Não pode aceitar convite próprio
  IF v_convite.criado_por = v_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Você criou este convite.');
  END IF;

  -- 3. Valida e-mail do convidado
  SELECT email INTO v_user_email FROM public.users WHERE id = v_user_id;
  IF lower(v_user_email) <> lower(v_convite.email_convidado) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Este convite não é para o seu e-mail.');
  END IF;

  -- 4. Verifica se já está em casal ativo/pending
  IF EXISTS (
    SELECT 1 FROM public.casal_membros cm
    JOIN public.casais c ON c.id = cm.casal_id
    WHERE cm.user_id = v_user_id AND c.status IN ('active', 'pending')
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Você já faz parte de um casal.');
  END IF;

  -- 5. Vincula ao casal
  INSERT INTO public.casal_membros (casal_id, user_id, role)
  VALUES (v_convite.casal_id, v_user_id, 'member');

  -- 6. Ativa o casal
  UPDATE public.casais SET status = 'active' WHERE id = v_convite.casal_id;

  -- 7. Marca convite como usado
  UPDATE public.casal_convites
  SET usado_em = now(), usado_por = v_user_id
  WHERE id = v_convite.id;

  RETURN jsonb_build_object('ok', true, 'casal_id', v_convite.casal_id);
END;
$$;
