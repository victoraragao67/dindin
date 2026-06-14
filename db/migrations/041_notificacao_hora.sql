-- ============================================================
-- 041_notificacao_hora.sql
-- Horário configurável de notificação por casal (default 20h BRT).
-- O pg_cron passa a rodar de hora em hora; a Edge Function filtra
-- apenas os casais cujo notificacao_hora == hora_brt_atual.
-- ============================================================

ALTER TABLE public.casais
  ADD COLUMN IF NOT EXISTS notificacao_hora int NOT NULL DEFAULT 20
    CHECK (notificacao_hora BETWEEN 0 AND 23);
