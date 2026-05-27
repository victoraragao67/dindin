-- ============================================================
-- 027_auto_create_public_user.sql
-- Trigger: cria public.users automaticamente quando um novo
-- usuário se autentica via Supabase (auth.users INSERT).
--
-- Sem isso, novos usuários não têm linha em public.users e:
--   - onboarding não encontra o registro
--   - salvarApelido faz UPDATE em linha inexistente (silencioso)
--   - criarCasal não acha o parceiro pelo e-mail
-- ============================================================

-- Função chamada pelo trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, nome, apelido)
  VALUES (
    NEW.id,
    NEW.email,
    '',   -- placeholder; app não usa nome diretamente
    ''    -- placeholder; definido pelo usuário no onboarding
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotente: não falha se já existir

  RETURN NEW;
END;
$$;

-- Trigger: dispara após INSERT em auth.users
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
