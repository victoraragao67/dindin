-- ============================================================
-- 019_seed_casal_vitim_gaia.sql
-- Cria o casal existente e vincula Vitim & Gaia como membros.
-- Busca os usuários pelos apelidos — falha com STRICT se não encontrar.
-- ============================================================

DO $$
DECLARE
  v_casal_id  uuid;
  v_vitim_id  uuid;
  v_gaia_id   uuid;
BEGIN
  SELECT id INTO STRICT v_vitim_id FROM public.users WHERE apelido = 'Vitim';
  SELECT id INTO STRICT v_gaia_id  FROM public.users WHERE apelido = 'Gaia';

  INSERT INTO public.casais (nome, status)
  VALUES ('Vitim & Gaia', 'active')
  RETURNING id INTO v_casal_id;

  INSERT INTO public.casal_membros (casal_id, user_id, role) VALUES
    (v_casal_id, v_vitim_id, 'owner'),
    (v_casal_id, v_gaia_id,  'member');

  RAISE NOTICE 'Casal criado: % (id: %)', 'Vitim & Gaia', v_casal_id;
END $$;
