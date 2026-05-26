-- ============================================================
-- 016_rename_fixo_to_casa.sql
-- Renomeia categoria 'fixo' para 'casa'
-- "Fixo" e "recorrente" soavam redundantes para o usuário
-- ============================================================

UPDATE public.categories
SET nome = 'casa'
WHERE nome = 'fixo';
