-- ============================================================
-- 006_views.sql
-- Views: v_saldo_atual | v_gastos_por_categoria_mes | v_gastos_mensais
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- v_saldo_atual
-- Calcula quem deve para quem, considerando:
--   1. Parcelas com data_competencia <= hoje (expenses não cancelados)
--   2. Regra de divisão de cada expense (50_50, so_pagador, customizada)
--   3. Acertos (transfers) já realizados
-- Retorna 1 linha se houver saldo pendente:
--   { devedor_id, credor_id, valor_centavos }
-- Retorna 0 linhas se o saldo for zero.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_saldo_atual AS
WITH

-- Todos os usuários do casal (base para garantir 1 linha mesmo sem gastos)
membros AS (
  SELECT id FROM public.users
),

-- Para cada parcela vencida, calcula a parte que CABE ao pagador (o que deveria ter pago)
-- A diferença (valor - parte_pagador) é o crédito que o pagador acumulou
installment_splits AS (
  SELECT
    e.pagador_id,
    ei.valor_centavos,
    CASE
      WHEN e.divisao = 'so_pagador'
        -- Pagador banca tudo sozinho; não gera crédito perante o outro
        THEN ei.valor_centavos
      WHEN e.divisao = 'customizada'
        -- Ex.: 70/30 → parte do pagador = 70% do valor da parcela
        THEN (ei.valor_centavos * e.split_pagador_pct / 100)::int
      ELSE
        -- 50_50: divisão inteira (floor). O centavo extra fica com o pagador.
        (ei.valor_centavos / 2)
    END AS parte_pagador_centavos
  FROM public.expense_installments ei
  JOIN public.expenses e ON e.id = ei.expense_id
  WHERE e.cancelado = false
    AND ei.data_competencia <= current_date
),

-- Crédito acumulado por usuário = soma do que o outro deveria ter pago mas não pagou
creditos AS (
  SELECT
    pagador_id   AS user_id,
    SUM(valor_centavos - parte_pagador_centavos) AS credito
  FROM installment_splits
  GROUP BY pagador_id
),

-- LEFT JOIN com membros para garantir que usuários sem gastos apareçam (credito = 0)
creditos_completos AS (
  SELECT
    m.id                      AS user_id,
    COALESCE(c.credito, 0)    AS credito
  FROM membros m
  LEFT JOIN creditos c ON c.user_id = m.id
),

-- Par único (casal): saldo_a_minus_b > 0 → usuario_a tem crédito → usuario_b deve
par AS (
  SELECT
    a.user_id                    AS usuario_a,
    b.user_id                    AS usuario_b,
    a.credito - b.credito        AS saldo_a_minus_b
  FROM creditos_completos a
  CROSS JOIN creditos_completos b
  WHERE a.user_id < b.user_id   -- garante 1 linha para 2 usuários
),

-- Acertos já realizados: normaliza para o mesmo par (menor UUID = usuario_a)
net_transfers AS (
  SELECT
    LEAST(de_id, para_id)    AS usuario_a,
    GREATEST(de_id, para_id) AS usuario_b,
    SUM(
      CASE WHEN de_id < para_id
        THEN -valor_centavos   -- de_id = usuario_a pagou → reduz crédito de a
        ELSE  valor_centavos   -- para_id = usuario_a recebeu → aumenta crédito de a
      END
    ) AS transfer_a_minus_b
  FROM public.transfers
  GROUP BY 1, 2
),

-- Saldo final = crédito bruto - acertos já feitos
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


-- ────────────────────────────────────────────────────────────
-- v_gastos_por_categoria_mes
-- Agrega installments por categoria + mês de competência.
-- Usado no painel para o breakdown visual por categoria.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_gastos_por_categoria_mes AS
SELECT
  date_trunc('month', ei.data_competencia)::date AS mes,
  c.id                                           AS categoria_id,
  c.nome                                         AS categoria_nome,
  c.emoji                                        AS categoria_emoji,
  COUNT(DISTINCT e.id)                           AS num_expenses,
  SUM(ei.valor_centavos)                         AS total_centavos
FROM public.expense_installments ei
JOIN public.expenses   e ON e.id = ei.expense_id
JOIN public.categories c ON c.id = e.categoria_id
WHERE e.cancelado = false
  AND e.origem = 'pwa'   -- apenas gastos variáveis; recorrentes têm seção própria
GROUP BY 1, 2, 3, 4;


-- ────────────────────────────────────────────────────────────
-- v_gastos_mensais
-- Série temporal dos últimos 12 meses para o gráfico de tendência.
-- Atenção: ORDER BY deve ser feito na query, não na view.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_gastos_mensais AS
SELECT
  date_trunc('month', ei.data_competencia)::date AS mes,
  SUM(ei.valor_centavos)                         AS total_centavos,
  COUNT(DISTINCT e.id)                           AS num_expenses
FROM public.expense_installments ei
JOIN public.expenses e ON e.id = ei.expense_id
WHERE e.cancelado = false
  AND ei.data_competencia >= date_trunc('month', current_date - interval '11 months')
GROUP BY 1;
