-- ============================================================
-- 031_custo_real_mes.sql
-- v_custo_real_mes: custo alocado por pessoa no mês corrente.
-- Inclui variáveis (origem = 'pwa') e recorrentes (origem = 'recorrente').
-- Aplica splits para calcular a parte que CABE a cada um,
-- independente de quem foi o pagador.
-- ============================================================

CREATE OR REPLACE VIEW public.v_custo_real_mes AS
WITH

mes_atual AS (
  SELECT
    date_trunc('month', current_date AT TIME ZONE 'America/Sao_Paulo')::date AS inicio,
    (date_trunc('month', current_date AT TIME ZONE 'America/Sao_Paulo')
      + interval '1 month - 1 day')::date AS fim
),

-- Todos os membros do casal
membros AS (
  SELECT id, apelido FROM public.users
),

-- Todas as parcelas do mês (variável + recorrente)
parcelas_mes AS (
  SELECT
    e.pagador_id,
    ei.valor_centavos,
    -- Parte que cabe ao PAGADOR
    CASE
      WHEN e.divisao = 'so_pagador'  THEN ei.valor_centavos
      WHEN e.divisao = 'so_outro'    THEN 0
      WHEN e.divisao = 'customizada' THEN (ei.valor_centavos * e.split_pagador_pct / 100)::int
      ELSE (ei.valor_centavos / 2)
    END AS parte_pagador,
    -- Parte que cabe ao OUTRO
    CASE
      WHEN e.divisao = 'so_pagador'  THEN 0
      WHEN e.divisao = 'so_outro'    THEN ei.valor_centavos
      WHEN e.divisao = 'customizada' THEN ei.valor_centavos - (ei.valor_centavos * e.split_pagador_pct / 100)::int
      ELSE ei.valor_centavos - (ei.valor_centavos / 2)  -- lida com centavo ímpar
    END AS parte_outro,
    e.origem
  FROM public.expense_installments ei
  JOIN public.expenses e ON e.id = ei.expense_id
  CROSS JOIN mes_atual
  WHERE e.cancelado = false
    AND ei.data_competencia >= mes_atual.inicio
    AND ei.data_competencia <= mes_atual.fim
),

-- Custo alocado por usuário:
-- soma do que cabe a ele quando É pagador
-- + soma do que cabe a ele quando NÃO É pagador
custo_por_usuario AS (
  SELECT
    m.id     AS user_id,
    m.apelido,

    -- Custo variável (pwa)
    COALESCE(SUM(CASE WHEN pm.pagador_id = m.id  AND pm.origem = 'pwa' THEN pm.parte_pagador END), 0)
    + COALESCE(SUM(CASE WHEN pm.pagador_id != m.id AND pm.origem = 'pwa' THEN pm.parte_outro END), 0)
      AS custo_variavel,

    -- Custo recorrente
    COALESCE(SUM(CASE WHEN pm.pagador_id = m.id  AND pm.origem = 'recorrente' THEN pm.parte_pagador END), 0)
    + COALESCE(SUM(CASE WHEN pm.pagador_id != m.id AND pm.origem = 'recorrente' THEN pm.parte_outro END), 0)
      AS custo_recorrente

  FROM membros m
  CROSS JOIN parcelas_mes pm
  GROUP BY m.id, m.apelido
)

SELECT
  user_id,
  apelido,
  custo_variavel,
  custo_recorrente,
  (custo_variavel + custo_recorrente) AS custo_total
FROM custo_por_usuario;
