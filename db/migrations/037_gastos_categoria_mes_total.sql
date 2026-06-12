-- ============================================================
-- 037_gastos_categoria_mes_total.sql
-- Série histórica por categoria/mês incluindo variável + recorrente.
-- Fonte para o gráfico "Últimos 6 meses por categoria" no Resumo.
-- security_invoker garante que RLS de expenses filtra por casal_id.
-- ============================================================

CREATE OR REPLACE VIEW public.v_gastos_categoria_mes_total
WITH (security_invoker = true)
AS
SELECT
  date_trunc('month', ei.data_competencia)::date AS mes,
  e.categoria_id                                  AS categoria_id,
  c.nome                                          AS categoria_nome,
  c.emoji                                         AS categoria_emoji,
  e.casal_id                                      AS casal_id,
  SUM(ei.valor_centavos)                          AS total_centavos
FROM public.expense_installments ei
JOIN public.expenses   e ON e.id  = ei.expense_id
JOIN public.categories c ON c.id  = e.categoria_id
WHERE e.cancelado = false
  AND e.origem IN ('pwa', 'recorrente')
GROUP BY 1, 2, 3, 4, 5;
