-- ============================================================
-- 014_add_streaming_category.sql
-- Adiciona categoria Streaming (📺) entre Lazer e Saúde.
-- Reordena categorias subsequentes para manter sequência limpa.
-- ============================================================

BEGIN;

-- Insere Streaming com id explícito para manter hardcoded maps
-- nos componentes em sincronia sem depender da sequence do Supabase.
INSERT INTO categories (id, nome, emoji, aliases, ordem) VALUES
  (10, 'streaming', '📺',
   ARRAY[
     'assinatura', 'assinaturas',
     'netflix', 'spotify', 'prime', 'amazon prime',
     'max', 'hbo', 'hbo max',
     'globoplay', 'disney', 'disney+',
     'youtube premium', 'apple music', 'deezer',
     'apple tv', 'apple tv+', 'paramount', 'paramount+'
   ],
   5);

-- Reordena as categorias seguintes (ids não mudam, só ordem visual)
UPDATE categories SET ordem = 6  WHERE nome = 'saúde';
UPDATE categories SET ordem = 7  WHERE nome = 'transporte';
UPDATE categories SET ordem = 8  WHERE nome = 'viagem';
UPDATE categories SET ordem = 9  WHERE nome = 'presente';
UPDATE categories SET ordem = 10 WHERE nome = 'outros';

COMMIT;
