-- ============================================================
-- 029_saldo_detalhado_mes.sql
-- BUG-01: v_saldo_detalhado não filtrava por mês nem origem.
--
-- Cria v_saldo_detalhado_mes:
--  - escopo: apenas mês atual (data_competencia)
--  - origem: apenas 'pwa' (exclui recorrentes)
--  - colunas extras: custo_a, custo_b (Feature B — custo real por pessoa)
--
-- custo_real = quanto coube a cada um independente de quem pagou.
--   Pagador com so_pagador: ele arca com 100%, outro com 0%.
--   Pagador com so_outro  : ele arca com 0%, outro com 100%.
--   50_50                 : cada um arca com 50%.
--   customizada           : pagador arca com split_pagador_pct%, outro com resto.
-- ============================================================

CREATE OR REPLACE VIEW public.v_saldo_detalhado_mes AS
WITH

mes_atual AS (
  SELECT
    date_trunc('month', current_date AT TIME ZONE 'America/Sao_Paulo')::date AS inicio,
    (date_trunc('month', current_date AT TIME ZONE 'America/Sao_Paulo')
      + interval '1 month - 1 day')::date AS fim
),

membros AS (SELECT id, apelido FROM public.users),

par AS (
  SELECT a.id AS ua, a.apelido AS apelido_a,
         b.id AS ub, b.apelido AS apelido_b
  FROM membros a
  CROSS JOIN membros b
  WHERE a.id < b.id
),

-- ── Quanto cada um desembolsou no mês ───────────────────────────
pagamentos AS (
  SELECT e.pagador_id, SUM(ei.valor_centavos) AS total_pago
  FROM public.expense_installments ei
  JOIN public.expenses e ON e.id = ei.expense_id
  CROSS JOIN mes_atual
  WHERE e.cancelado = false
    AND e.origem    = 'pwa'
    AND ei.data_competencia >= mes_atual.inicio
    AND ei.data_competencia <= mes_atual.fim
  GROUP BY e.pagador_id
),

-- ── Crédito acumulado no mês (pagou além da sua parte) ──────────
creditos AS (
  SELECT
    e.pagador_id,
    SUM(
      ei.valor_centavos - CASE
        WHEN e.divisao = 'so_pagador'  THEN ei.valor_centavos
        WHEN e.divisao = 'so_outro'    THEN 0
        WHEN e.divisao = 'customizada' THEN (ei.valor_centavos * e.split_pagador_pct / 100)::int
        ELSE (ei.valor_centavos / 2)
      END
    ) AS credito
  FROM public.expense_installments ei
  JOIN public.expenses e ON e.id = ei.expense_id
  CROSS JOIN mes_atual
  WHERE e.cancelado = false
    AND e.origem    = 'pwa'
    AND ei.data_competencia >= mes_atual.inicio
    AND ei.data_competencia <= mes_atual.fim
  GROUP BY e.pagador_id
),

-- ── Custo real: o que coube a cada um (independente de quem pagou) ─
-- CROSS JOIN users × installments: para cada par (usuario, gasto),
-- calcula a parcela que cabe àquele usuário.
custos AS (
  SELECT
    u.id AS user_id,
    COALESCE(SUM(
      CASE
        WHEN e.pagador_id = u.id THEN          -- u é o pagador
          CASE
            WHEN e.divisao = 'so_pagador'  THEN ei.valor_centavos
            WHEN e.divisao = 'so_outro'    THEN 0
            WHEN e.divisao = 'customizada' THEN (ei.valor_centavos * e.split_pagador_pct / 100)::int
            ELSE (ei.valor_centavos / 2)
          END
        ELSE                                    -- u NÃO é o pagador
          CASE
            WHEN e.divisao = 'so_pagador'  THEN 0
            WHEN e.divisao = 'so_outro'    THEN ei.valor_centavos
            WHEN e.divisao = 'customizada' THEN ei.valor_centavos - (ei.valor_centavos * e.split_pagador_pct / 100)::int
            ELSE (ei.valor_centavos / 2)
          END
      END
    ), 0) AS custo_centavos
  FROM public.users u
  CROSS JOIN public.expense_installments ei
  JOIN public.expenses e ON e.id = ei.expense_id
  CROSS JOIN mes_atual
  WHERE e.cancelado = false
    AND e.origem    = 'pwa'
    AND ei.data_competencia >= mes_atual.inicio
    AND ei.data_competencia <= mes_atual.fim
  GROUP BY u.id
),

-- ── Acertos já registrados (todos os tempos — saldo é acumulado) ─
net_transfers AS (
  SELECT
    LEAST(de_id, para_id)    AS ua,
    GREATEST(de_id, para_id) AS ub,
    SUM(
      CASE WHEN de_id < para_id
        THEN  valor_centavos
        ELSE -valor_centavos
      END
    ) AS net_de_a_para_b
  FROM public.transfers
  GROUP BY 1, 2
)

SELECT
  p.ua, p.ub, p.apelido_a, p.apelido_b,
  COALESCE(pa.total_pago,      0) AS pagou_a,
  COALESCE(pb.total_pago,      0) AS pagou_b,
  COALESCE(ca.credito,         0) AS credito_a,
  COALESCE(cb.credito,         0) AS credito_b,
  COALESCE(nt.net_de_a_para_b, 0) AS acertos_net,
  COALESCE(cua.custo_centavos, 0) AS custo_a,
  COALESCE(cub.custo_centavos, 0) AS custo_b
FROM par p
LEFT JOIN pagamentos  pa  ON pa.pagador_id = p.ua
LEFT JOIN pagamentos  pb  ON pb.pagador_id = p.ub
LEFT JOIN creditos    ca  ON ca.pagador_id = p.ua
LEFT JOIN creditos    cb  ON cb.pagador_id = p.ub
LEFT JOIN net_transfers nt ON nt.ua = p.ua AND nt.ub = p.ub
LEFT JOIN custos      cua ON cua.user_id   = p.ua
LEFT JOIN custos      cub ON cub.user_id   = p.ub;
