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
-- Lógica: compara total_pago de cada um com a média global.
-- Isso detecta desequilíbrio independentemente da divisão de cada gasto.
-- (Ex: se um paga R$800 e outro R$200 em recorrentes, um tem saldo +300 e outro -300.)
DROP VIEW IF EXISTS public.v_recurring_imbalance;

CREATE OR REPLACE VIEW public.v_recurring_imbalance AS
WITH
pagamentos AS (
  SELECT
    e.pagador_id AS user_id,
    SUM(ei.valor_centavos) AS total_pago_centavos,
    COUNT(DISTINCT date_trunc('month', ei.data_competencia)) AS meses_count
  FROM public.expense_installments ei
  JOIN public.expenses e ON e.id = ei.expense_id
  WHERE e.cancelado = false
    AND e.origem = 'recorrente'
    AND ei.data_competencia <= current_date
  GROUP BY e.pagador_id
),
media AS (
  -- Divide pelo total de usuários do casal (não só quem pagou),
  -- para que saldo = 0 quando todos pagaram igual, mesmo que só 1 tenha pago.
  SELECT
    SUM(total_pago_centavos)::numeric
      / NULLIF((SELECT COUNT(*) FROM public.users), 0) AS media_centavos
  FROM pagamentos
),
acertos AS (
  SELECT
    LEAST(de_id, para_id)    AS ua,
    GREATEST(de_id, para_id) AS ub,
    SUM(
      CASE WHEN de_id < para_id THEN valor_centavos ELSE -valor_centavos END
    ) AS net_de_a_para_b
  FROM public.recurring_balance_adjustments
  GROUP BY 1, 2
)
SELECT
  u.id                                                        AS user_id,
  u.apelido,
  COALESCE(p.total_pago_centavos, 0)                          AS total_pago_centavos,
  COALESCE(p.meses_count, 0)                                  AS meses_count,
  ROUND(COALESCE(p.total_pago_centavos, 0)
        - COALESCE(m.media_centavos, 0))::int                 AS saldo_bruto_centavos,
  ROUND(
    COALESCE(p.total_pago_centavos, 0)
    - COALESCE(m.media_centavos, 0)
    - COALESCE(CASE
        WHEN u.id = a.ua THEN  a.net_de_a_para_b
        WHEN u.id = a.ub THEN -a.net_de_a_para_b
        ELSE 0
      END, 0)
  )::int                                                       AS saldo_liquido_centavos
FROM public.users u
CROSS JOIN media m
LEFT JOIN pagamentos p ON p.user_id = u.id
LEFT JOIN acertos a ON (a.ua = u.id OR a.ub = u.id);
