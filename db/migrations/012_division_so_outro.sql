-- Migration 012: adiciona divisao 'so_outro' + view de detalhamento do saldo
--
-- so_outro: pagador paga, mas o gasto e 100% do outro
-- Ex.: Victor paga consulta da Gaia -> divisao = 'so_outro'
-- Neste caso: credito do pagador = 100% (parte_pagador_centavos = 0)

-- ── 1. Adiciona valor ao enum ────────────────────────────────
ALTER TYPE public.divisao_tipo ADD VALUE IF NOT EXISTS 'so_outro';

-- ── 2. Atualiza v_saldo_atual para tratar so_outro ──────────
CREATE OR REPLACE VIEW public.v_saldo_atual AS
WITH
membros AS (
  SELECT id FROM public.users
),
installment_splits AS (
  SELECT
    e.pagador_id,
    ei.valor_centavos,
    CASE
      WHEN e.divisao = 'so_pagador'
        THEN ei.valor_centavos
      WHEN e.divisao = 'so_outro'
        THEN 0
      WHEN e.divisao = 'customizada'
        THEN (ei.valor_centavos * e.split_pagador_pct / 100)::int
      ELSE
        (ei.valor_centavos / 2)
    END AS parte_pagador_centavos
  FROM public.expense_installments ei
  JOIN public.expenses e ON e.id = ei.expense_id
  WHERE e.cancelado = false
    AND ei.data_competencia <= current_date
),
creditos AS (
  SELECT
    pagador_id   AS user_id,
    SUM(valor_centavos - parte_pagador_centavos) AS credito
  FROM installment_splits
  GROUP BY pagador_id
),
creditos_completos AS (
  SELECT
    m.id                      AS user_id,
    COALESCE(c.credito, 0)    AS credito
  FROM membros m
  LEFT JOIN creditos c ON c.user_id = m.id
),
par AS (
  SELECT
    a.user_id                    AS usuario_a,
    b.user_id                    AS usuario_b,
    a.credito - b.credito        AS saldo_a_minus_b
  FROM creditos_completos a
  CROSS JOIN creditos_completos b
  WHERE a.user_id < b.user_id
),
net_transfers AS (
  SELECT
    LEAST(de_id, para_id)    AS usuario_a,
    GREATEST(de_id, para_id) AS usuario_b,
    SUM(
      CASE WHEN de_id < para_id
        THEN -valor_centavos
        ELSE  valor_centavos
      END
    ) AS transfer_a_minus_b
  FROM public.transfers
  GROUP BY 1, 2
),
saldo_final AS (
  SELECT
    p.usuario_a,
    p.usuario_b,
    p.saldo_a_minus_b - COALESCE(nt.transfer_a_minus_b, 0) AS saldo_net
  FROM par p
  LEFT JOIN net_transfers nt
    ON nt.usuario_a = p.usuario_a AND nt.usuario_b = p.usuario_b
)
SELECT
  CASE WHEN saldo_net > 0 THEN usuario_b ELSE usuario_a END AS devedor_id,
  CASE WHEN saldo_net > 0 THEN usuario_a ELSE usuario_b END AS credor_id,
  ABS(saldo_net)                                             AS valor_centavos
FROM saldo_final
WHERE ABS(saldo_net) > 0;


-- ── 3. View v_saldo_detalhado (para modal de explicacao BUG-13) ──
-- Expoe os valores intermediarios para explicar o calculo do saldo:
--   pagou_a/b     = total desembolsado por cada pessoa
--   credito_a/b   = credito acumulado (pagamentos acima da parte justa)
--   acertos_net   = transferencias liquidas (positivo = a pagou para b)
CREATE OR REPLACE VIEW public.v_saldo_detalhado AS
WITH
membros AS (SELECT id, apelido FROM public.users),
par AS (
  SELECT a.id AS ua, a.apelido AS apelido_a, b.id AS ub, b.apelido AS apelido_b
  FROM membros a CROSS JOIN membros b WHERE a.id < b.id
),
pagamentos AS (
  SELECT e.pagador_id, SUM(ei.valor_centavos) AS total_pago
  FROM public.expense_installments ei
  JOIN public.expenses e ON e.id = ei.expense_id
  WHERE e.cancelado = false AND ei.data_competencia <= current_date
  GROUP BY e.pagador_id
),
creditos AS (
  SELECT e.pagador_id, SUM(
    ei.valor_centavos - CASE
      WHEN e.divisao = 'so_pagador'  THEN ei.valor_centavos
      WHEN e.divisao = 'so_outro'    THEN 0
      WHEN e.divisao = 'customizada' THEN (ei.valor_centavos * e.split_pagador_pct / 100)::int
      ELSE (ei.valor_centavos / 2)
    END
  ) AS credito
  FROM public.expense_installments ei
  JOIN public.expenses e ON e.id = ei.expense_id
  WHERE e.cancelado = false AND ei.data_competencia <= current_date
  GROUP BY e.pagador_id
),
net_transfers AS (
  SELECT
    LEAST(de_id, para_id)    AS ua,
    GREATEST(de_id, para_id) AS ub,
    SUM(CASE WHEN de_id < para_id THEN valor_centavos ELSE -valor_centavos END) AS net_de_a_para_b
  FROM public.transfers
  GROUP BY 1, 2
)
SELECT
  p.ua, p.ub, p.apelido_a, p.apelido_b,
  COALESCE(pa.total_pago, 0)  AS pagou_a,
  COALESCE(pb.total_pago, 0)  AS pagou_b,
  COALESCE(ca.credito, 0)     AS credito_a,
  COALESCE(cb.credito, 0)     AS credito_b,
  COALESCE(nt.net_de_a_para_b, 0) AS acertos_net
FROM par p
LEFT JOIN pagamentos pa ON pa.pagador_id = p.ua
LEFT JOIN pagamentos pb ON pb.pagador_id = p.ub
LEFT JOIN creditos   ca ON ca.pagador_id = p.ua
LEFT JOIN creditos   cb ON cb.pagador_id = p.ub
LEFT JOIN net_transfers nt ON nt.ua = p.ua AND nt.ub = p.ub;
