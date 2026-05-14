-- ============================================================
-- 015_previsibilidade_views.sql
-- Views para o bloco de previsibilidade mensal de recorrentes.
-- ============================================================

BEGIN;

-- View 1: Previsibilidade agregada por categoria
-- Retorna apenas categorias que têm ao menos 1 template ativo.
CREATE OR REPLACE VIEW v_previsibilidade_recorrentes AS
WITH ativas AS (
  SELECT rt.id, rt.categoria_id, rt.valor_centavos
  FROM recurring_templates rt
  WHERE rt.ativo = true
),
total AS (
  SELECT COALESCE(SUM(valor_centavos), 0) AS total_centavos FROM ativas
)
SELECT
  c.id            AS categoria_id,
  c.nome          AS categoria_nome,
  c.emoji         AS categoria_emoji,
  COUNT(a.id)::int AS qtd_templates,
  COALESCE(SUM(a.valor_centavos), 0) AS total_categoria_centavos,
  CASE
    WHEN (SELECT total_centavos FROM total) = 0 THEN 0
    ELSE ROUND(
      (COALESCE(SUM(a.valor_centavos), 0)::numeric
       / (SELECT total_centavos FROM total))
      * 100, 1
    )
  END AS percentual
FROM categories c
LEFT JOIN ativas a ON a.categoria_id = c.id
GROUP BY c.id, c.nome, c.emoji
HAVING COUNT(a.id) > 0
ORDER BY total_categoria_centavos DESC;

-- View 2: Total desembolsado por pagador (valor bruto, antes do acerto)
-- Representa quanto cada pessoa paga do bolso em recorrentes ativos.
CREATE OR REPLACE VIEW v_previsibilidade_por_pagador AS
SELECT
  u.id      AS pagador_id,
  u.apelido AS pagador_apelido,
  COALESCE(SUM(rt.valor_centavos), 0) AS total_centavos
FROM users u
LEFT JOIN recurring_templates rt ON rt.pagador_id = u.id AND rt.ativo = true
GROUP BY u.id, u.apelido
ORDER BY total_centavos DESC;

COMMIT;
