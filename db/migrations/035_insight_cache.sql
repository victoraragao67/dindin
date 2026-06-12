-- ============================================================
-- 035_insight_cache.sql
-- Cache do texto gerado pelo LLM para a tela Resumo.
-- Máximo 1 geração por casal por dia (UNIQUE casal_id + data_brt).
-- Escrita feita via service role (write-through no server);
-- leitura via policy RLS para o membro do casal.
-- ============================================================

CREATE TABLE public.insight_cache (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  casal_id    uuid        NOT NULL REFERENCES public.casais(id) ON DELETE CASCADE,
  data_brt    date        NOT NULL,
  resumo_txt  text        NOT NULL,
  origem      text        NOT NULL DEFAULT 'llm' CHECK (origem IN ('llm','fallback')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (casal_id, data_brt)
);

ALTER TABLE public.insight_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY insight_cache_select ON public.insight_cache
  FOR SELECT USING (public.is_casal_member(casal_id));
