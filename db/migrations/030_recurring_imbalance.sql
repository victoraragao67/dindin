-- ============================================================
-- 030_recurring_imbalance.sql
-- Feature A — Dívida estrutural de recorrentes acumulada.
--
-- Tabela: recurring_balance_adjustments
--   Registra acertos específicos do imbalance de recorrentes
--   (separados de transfers, que cobrem dívida variável).
--
-- View: v_recurring_imbalance
--   Para cada usuário, acumula (pago - ideal) em recorrentes
--   em todos os meses com installments não acertados.
--   saldo_acumulado_centavos > 0 → usuário pagou mais que o ideal.
-- ============================================================

-- ── Tabela de acertos de imbalance ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.recurring_balance_adjustments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  casal_id        uuid        NOT NULL REFERENCES public.casais(id) ON DELETE CASCADE,
  de_id           uuid        NOT NULL REFERENCES public.users(id),
  para_id         uuid        NOT NULL REFERENCES public.users(id),
  valor_centavos  int         NOT NULL CHECK (valor_centavos > 0),
  mes_referencia  date        NOT NULL,   -- primeiro dia do mês acertado
  nota            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rba_different_users CHECK (de_id <> para_id)
);

-- RLS (mesmo padrão de transfers)
ALTER TABLE public.recurring_balance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY rba_select ON public.recurring_balance_adjustments
  FOR SELECT USING (public.is_casal_member_any(casal_id));

CREATE POLICY rba_insert ON public.recurring_balance_adjustments
  FOR INSERT WITH CHECK (public.is_casal_member_any(casal_id));


-- ── View: imbalance acumulado por usuário ───────────────────────
CREATE OR REPLACE VIEW public.v_recurring_imbalance AS
WITH

-- Para cada mês e usuário, calcula pago vs ideal em recorrentes
mes_saldo AS (
  SELECT
    date_trunc('month', ei.data_competencia)::date AS mes,
    u.id    AS user_id,
    u.apelido,

    -- Quanto este usuário desembolsou em recorrentes neste mês
    COALESCE(SUM(
      CASE WHEN e.pagador_id = u.id THEN ei.valor_centavos ELSE 0 END
    ), 0) AS pago_centavos,

    -- Quanto deveria ter pago (sua parcela ideal em cada recorrente)
    COALESCE(SUM(
      CASE
        -- u é o pagador deste gasto
        WHEN e.pagador_id = u.id THEN
          CASE
            WHEN e.divisao = 'so_pagador'  THEN ei.valor_centavos
            WHEN e.divisao = 'so_outro'    THEN 0
            WHEN e.divisao = 'customizada' THEN (ei.valor_centavos * e.split_pagador_pct / 100)::int
            ELSE (ei.valor_centavos / 2)
          END
        -- u NÃO é o pagador mas o custo recai sobre ele
        ELSE
          CASE
            WHEN e.divisao = 'so_pagador'  THEN 0
            WHEN e.divisao = 'so_outro'    THEN ei.valor_centavos
            WHEN e.divisao = 'customizada' THEN ei.valor_centavos - (ei.valor_centavos * e.split_pagador_pct / 100)::int
            ELSE (ei.valor_centavos / 2)
          END
      END
    ), 0) AS ideal_centavos

  FROM public.users u
  CROSS JOIN public.expense_installments ei
  JOIN public.expenses e ON e.id = ei.expense_id
  WHERE e.cancelado = false
    AND e.origem = 'recorrente'
    AND ei.data_competencia <= current_date
  GROUP BY date_trunc('month', ei.data_competencia)::date, u.id, u.apelido
),

-- Acertos de imbalance já registrados (todos os tempos)
acertos AS (
  SELECT
    LEAST(de_id, para_id)    AS ua,
    GREATEST(de_id, para_id) AS ub,
    SUM(
      CASE WHEN de_id < para_id THEN valor_centavos ELSE -valor_centavos END
    ) AS net_de_a_para_b
  FROM public.recurring_balance_adjustments
  GROUP BY 1, 2
),

-- Saldo acumulado por usuário antes de acertos
saldo_bruto AS (
  SELECT
    user_id,
    apelido,
    SUM(pago_centavos - ideal_centavos) AS saldo_centavos,
    SUM(pago_centavos)                  AS total_pago_centavos,
    COUNT(DISTINCT mes)                 AS meses_count
  FROM mes_saldo
  GROUP BY user_id, apelido
)

SELECT
  sb.user_id,
  sb.apelido,
  sb.saldo_centavos                           AS saldo_bruto_centavos,
  sb.total_pago_centavos,
  sb.meses_count,
  -- Aplica acertos: par normalizado (menor uuid = ua)
  -- saldo_liquido > 0 → usuário ainda tem crédito após acertos
  CASE
    WHEN sb.user_id = a.ua THEN sb.saldo_centavos - COALESCE(a.net_de_a_para_b, 0)
    WHEN sb.user_id = a.ub THEN sb.saldo_centavos + COALESCE(a.net_de_a_para_b, 0)
    ELSE sb.saldo_centavos
  END AS saldo_liquido_centavos
FROM saldo_bruto sb
LEFT JOIN acertos a ON (a.ua = sb.user_id OR a.ub = sb.user_id);
