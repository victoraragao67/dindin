-- ============================================================
-- 002_categories_seed.sql
-- 9 categorias (decisão da Letícia) + 2 usuários do casal
-- ============================================================

-- ── Categorias ───────────────────────────────────────────────
INSERT INTO public.categories (nome, emoji, aliases, ordem) VALUES
  ('mercado',     '🛒', ARRAY['super','supermercado','mercadinho','feira'],                    1),
  ('restaurante', '🍽️', ARRAY['rest','almoço','jantar','ifood','delivery'],                    2),
  ('fixo',        '🏠', ARRAY['aluguel','condomínio','luz','água','internet','assinatura'],    3),
  ('lazer',       '🎉', ARRAY['cinema','bar','show','passeio','rolê'],                         4),
  ('saúde',       '⚕️', ARRAY['saude','farmácia','farmacia','médico','medico','dentista','plano'], 5),
  ('transporte',  '🚗', ARRAY['uber','99','combustível','gasolina','metro','ônibus','onibus'], 6),
  ('viagem',      '✈️', ARRAY['hotel','passagem','airbnb','turismo'],                          7),
  ('presente',    '🎁', ARRAY['presentinho','aniversário','natal'],                             8),
  ('outros',      '📦', ARRAY['outro','diversos','etc'],                                        9);

-- ── Usuários do casal ────────────────────────────────────────
-- IDs são placeholders; serão substituídos em F1-04 quando
-- os usuários fizerem login via magic link (auth.users.id = public.users.id).
INSERT INTO public.users (nome, apelido, email) VALUES
  ('Victor',   'Vitim', 'victoraragao67@gmail.com'),
  ('Letícia',  'Gaia',  'leticiar.gaia@gmail.com');
