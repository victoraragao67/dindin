-- ============================================================
-- 033_views_security_invoker.sql
-- CRÍTICO: views precisam de security_invoker = true para que o
-- RLS das tabelas subjacentes seja respeitado.
--
-- Sem isso, views rodam como o owner (postgres) e ignoram RLS —
-- qualquer usuário vê dados de todos os casais.
-- ============================================================

ALTER VIEW public.v_saldo_atual              SET (security_invoker = true);
ALTER VIEW public.v_saldo_recorrentes        SET (security_invoker = true);
ALTER VIEW public.v_saldo_detalhado          SET (security_invoker = true);
ALTER VIEW public.v_saldo_detalhado_mes      SET (security_invoker = true);
ALTER VIEW public.v_gastos_por_categoria_mes SET (security_invoker = true);
ALTER VIEW public.v_gastos_mensais           SET (security_invoker = true);
ALTER VIEW public.v_previsibilidade_recorrentes  SET (security_invoker = true);
ALTER VIEW public.v_previsibilidade_por_pagador  SET (security_invoker = true);
ALTER VIEW public.v_recurring_imbalance      SET (security_invoker = true);
ALTER VIEW public.v_custo_real_mes           SET (security_invoker = true);
