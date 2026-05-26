-- ============================================================
-- 017_capitalize_categories.sql
-- Capitaliza a primeira letra de todas as categorias
-- ============================================================

UPDATE public.categories SET nome = 'Mercado'     WHERE nome = 'mercado';
UPDATE public.categories SET nome = 'Restaurante' WHERE nome = 'restaurante';
UPDATE public.categories SET nome = 'Casa'        WHERE nome IN ('casa', 'fixo');
UPDATE public.categories SET nome = 'Lazer'       WHERE nome = 'lazer';
UPDATE public.categories SET nome = 'Saúde'       WHERE nome = 'saúde';
UPDATE public.categories SET nome = 'Transporte'  WHERE nome = 'transporte';
UPDATE public.categories SET nome = 'Viagem'      WHERE nome = 'viagem';
UPDATE public.categories SET nome = 'Presente'    WHERE nome = 'presente';
UPDATE public.categories SET nome = 'Outros'      WHERE nome = 'outros';
UPDATE public.categories SET nome = 'Streaming'   WHERE nome = 'streaming';
