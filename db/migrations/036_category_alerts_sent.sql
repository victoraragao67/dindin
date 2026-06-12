-- ============================================================
-- 036_category_alerts_sent.sql
-- Dedup de alertas de estouro por categoria/mês.
-- Garante no máximo 2 alertas por categoria por mês:
--   1x em 'vai_estourar'  1x em 'estourou'  (UNIQUE por nível).
-- ============================================================

CREATE TABLE public.category_alerts_sent (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  casal_id     uuid        NOT NULL REFERENCES public.casais(id) ON DELETE CASCADE,
  categoria_id int         NOT NULL REFERENCES public.categories(id),
  mes          int         NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano          int         NOT NULL,
  nivel        text        NOT NULL CHECK (nivel IN ('vai_estourar','estourou')),
  sent_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (casal_id, categoria_id, mes, ano, nivel)
);

ALTER TABLE public.category_alerts_sent ENABLE ROW LEVEL SECURITY;

CREATE POLICY alerts_select ON public.category_alerts_sent
  FOR SELECT USING (public.is_casal_member(casal_id));
