-- ============================================================
-- 005_push_subscriptions.sql
-- Subscriptions de Web Push por dispositivo/navegador
-- ============================================================

CREATE TABLE public.push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- URL única do push service do navegador (Chrome, Safari, Firefox)
  endpoint    text        NOT NULL UNIQUE,
  -- Chave pública e secret retornados pela Web Push API
  p256dh      text        NOT NULL,
  auth        text        NOT NULL,
  -- Identificação do dispositivo para debug
  user_agent  text,
  -- false quando o endpoint retorna 410 Gone (subscription expirada)
  ativo       bool        NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_user_ativo ON public.push_subscriptions(user_id, ativo);
