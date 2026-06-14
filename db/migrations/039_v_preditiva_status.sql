-- ============================================================
-- 039_v_preditiva_status.sql
-- View de status preditivo por casal + categoria para o mês corrente.
-- Reproduz a fórmula de web/lib/preditiva.ts (blend ritmo × histórico).
-- Usada pelo cron daily-push para decidir se há risco sem duplicar a lógica.
-- ============================================================

CREATE OR REPLACE VIEW public.v_preditiva_status AS
WITH

  dt AS (
    SELECT
      EXTRACT(YEAR  FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))::int AS ano,
      EXTRACT(MONTH FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))::int AS mes,
      EXTRACT(DAY   FROM (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))::int AS dia_atual,
      DATE_PART(
        'days',
        DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')
          + INTERVAL '1 month'
          - INTERVAL '1 day'
      )::int AS dias_no_mes,
      DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))::date AS mes_inicio
  ),

  -- Metas do mês corrente (âncora das categorias monitoradas)
  metas AS (
    SELECT sg.casal_id, sg.categoria_id, sg.valor_centavos AS meta
    FROM public.spending_goals sg
    CROSS JOIN dt
    WHERE sg.mes = dt.mes AND sg.ano = dt.ano
  ),

  -- Gasto variável (pwa) do mês corrente por casal/categoria
  gv AS (
    SELECT
      e.casal_id,
      e.categoria_id,
      COALESCE(SUM(ei.valor_centavos), 0) AS gasto_variavel
    FROM public.expense_installments ei
    JOIN public.expenses e ON e.id = ei.expense_id
    CROSS JOIN dt
    WHERE e.cancelado = false
      AND e.origem = 'pwa'
      AND ei.data_competencia >= dt.mes_inicio
      AND ei.data_competencia <  dt.mes_inicio + INTERVAL '1 month'
    GROUP BY e.casal_id, e.categoria_id
  ),

  -- Recorrente previsto (templates ativos, soma fixa)
  rp AS (
    SELECT casal_id, categoria_id, COALESCE(SUM(valor_centavos), 0) AS recorrente_previsto
    FROM public.recurring_templates
    WHERE ativo = true
    GROUP BY casal_id, categoria_id
  ),

  -- Histórico variável (pwa) dos últimos 3 meses — âncora do blend
  hist_v AS (
    SELECT
      mensais.casal_id,
      mensais.categoria_id,
      ARRAY_AGG(mensais.total ORDER BY mensais.mes DESC) AS hist_arr
    FROM (
      SELECT
        e2.casal_id,
        e2.categoria_id,
        DATE_TRUNC('month', ei2.data_competencia)::date AS mes,
        SUM(ei2.valor_centavos) AS total
      FROM public.expense_installments ei2
      JOIN public.expenses e2 ON e2.id = ei2.expense_id
      CROSS JOIN dt
      WHERE e2.cancelado = false
        AND e2.origem = 'pwa'
        AND ei2.data_competencia >= dt.mes_inicio - INTERVAL '3 months'
        AND ei2.data_competencia <  dt.mes_inicio
      GROUP BY e2.casal_id, e2.categoria_id,
               DATE_TRUNC('month', ei2.data_competencia)::date
    ) mensais
    GROUP BY mensais.casal_id, mensais.categoria_id
  ),

  -- Junta tudo e calcula média histórica variável
  calc AS (
    SELECT
      m.casal_id,
      m.categoria_id,
      dt.dia_atual,
      dt.dias_no_mes,
      COALESCE(gv.gasto_variavel, 0)        AS gasto_variavel,
      COALESCE(rp.recorrente_previsto, 0)   AS recorrente_previsto,
      m.meta,
      hv.hist_arr,
      -- Média histórica variável: NULL quando sem histórico (cold start)
      CASE
        WHEN hv.hist_arr IS NOT NULL AND ARRAY_LENGTH(hv.hist_arr, 1) > 0
          THEN (SELECT AVG(x) FROM UNNEST(hv.hist_arr) AS x)
        ELSE NULL
      END AS media_variavel_hist
    FROM metas m
    CROSS JOIN dt
    LEFT JOIN gv  ON gv.casal_id  = m.casal_id  AND gv.categoria_id  = m.categoria_id
    LEFT JOIN rp  ON rp.casal_id  = m.casal_id  AND rp.categoria_id  = m.categoria_id
    LEFT JOIN hist_v hv ON hv.casal_id = m.casal_id AND hv.categoria_id = m.categoria_id
  ),

  -- Componentes do blend (idêntico ao preditiva.ts)
  blend AS (
    SELECT
      c.*,
      LEAST(c.dia_atual::float / GREATEST(c.dias_no_mes, 1)::float, 1.0) AS peso,
      (c.gasto_variavel::float / GREATEST(c.dia_atual, 1)::float) * c.dias_no_mes::float AS linear,
      -- ancora = média variável hist ?? (meta - recorrente_previsto) ?? null
      COALESCE(
        c.media_variavel_hist,
        CASE WHEN c.meta IS NOT NULL
          THEN (c.meta - c.recorrente_previsto)::float
          ELSE NULL
        END
      ) AS ancora
    FROM calc c
  ),

  -- Projeção variável e projeção total
  proj AS (
    SELECT
      b.*,
      b.gasto_variavel + b.recorrente_previsto AS gasto_acumulado,
      CASE
        -- Âncora nula + sem gasto variável = categoria só-recorrente → projeção 0
        WHEN b.ancora IS NULL AND b.gasto_variavel = 0 THEN 0
        -- Âncora nula + há gasto variável = cold start total → sem projeção
        WHEN b.ancora IS NULL                           THEN NULL
        ELSE ROUND(b.peso * b.linear + (1 - b.peso) * GREATEST(b.ancora, 0))::int
      END AS projecao_variavel
    FROM blend b
  )

SELECT
  p.casal_id,
  p.categoria_id,
  p.dia_atual,
  p.dias_no_mes,
  p.gasto_variavel,
  p.recorrente_previsto,
  p.gasto_acumulado,
  p.meta,
  -- projecao total = projecao_variavel + recorrente_previsto
  CASE WHEN p.projecao_variavel IS NOT NULL
    THEN p.projecao_variavel + p.recorrente_previsto
    ELSE NULL
  END AS projecao,
  -- Anti-ruído: sem histórico → aguarda dia 10; com histórico → dia 5
  CASE WHEN p.media_variavel_hist IS NULL THEN 10 ELSE 5 END AS anti_ruido_dia,
  -- Status (mesma lógica de calcularPreditiva em preditiva.ts)
  CASE
    WHEN p.meta IS NULL OR p.meta = 0
      THEN 'sem_meta'
    WHEN (p.gasto_variavel + p.recorrente_previsto) >= p.meta
      THEN 'estourou'
    WHEN (
      CASE WHEN p.projecao_variavel IS NOT NULL
        THEN p.projecao_variavel + p.recorrente_previsto
        ELSE NULL
      END
    ) IS NULL
      OR p.dia_atual < (CASE WHEN p.media_variavel_hist IS NULL THEN 10 ELSE 5 END)
      THEN 'ok'
    WHEN (p.projecao_variavel + p.recorrente_previsto) > p.meta * 1.05
      THEN 'vai_estourar'
    WHEN (p.projecao_variavel + p.recorrente_previsto) >= p.meta * 0.90
      THEN 'no_limite'
    ELSE 'ok'
  END AS status
FROM proj p;
