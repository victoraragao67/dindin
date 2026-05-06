-- ============================================================
-- 001_initial_schema.sql
-- Tabelas base: users, categories, expenses, transfers
-- ============================================================

-- Garante extensão de UUID (disponível por padrão no Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── users ────────────────────────────────────────────────────
-- Espelha auth.users do Supabase; IDs vinculados em F1-04.
CREATE TABLE public.users (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       text        NOT NULL,
  apelido    text        NOT NULL,        -- "Vitim", "Gaia"
  email      text        NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── categories ───────────────────────────────────────────────
CREATE TABLE public.categories (
  id      serial PRIMARY KEY,
  nome    text   NOT NULL UNIQUE,
  emoji   text   NOT NULL,
  aliases text[] NOT NULL DEFAULT '{}',  -- variações aceitas pelo parser
  ordem   int    NOT NULL
);

-- ── ENUMs usados em expenses ──────────────────────────────────
CREATE TYPE public.divisao_tipo AS ENUM ('50_50', 'so_pagador', 'customizada');
CREATE TYPE public.origem_tipo  AS ENUM ('pwa', 'import', 'recorrente');

-- ── expenses ─────────────────────────────────────────────────
-- Representa UMA compra/registro lógico.
-- Parcelas são materializadas em expense_installments (migration 003).
CREATE TABLE public.expenses (
  id                    uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  pagador_id            uuid             NOT NULL REFERENCES public.users(id),
  categoria_id          int              NOT NULL REFERENCES public.categories(id),
  valor_total_centavos  int              NOT NULL CHECK (valor_total_centavos > 0),
  parcelas              int              NOT NULL DEFAULT 1 CHECK (parcelas BETWEEN 1 AND 120),
  descricao             text,
  data_compra           date             NOT NULL DEFAULT current_date,
  divisao               public.divisao_tipo NOT NULL DEFAULT '50_50',
  -- Percentual do pagador quando divisao = 'customizada'; NULL nos outros casos
  split_pagador_pct     numeric(5,2)     CHECK (
                          split_pagador_pct IS NULL
                          OR (split_pagador_pct > 0 AND split_pagador_pct < 100)
                        ),
  origem                public.origem_tipo NOT NULL DEFAULT 'pwa',
  -- FK para recurring_templates adicionada em 004
  recurring_template_id uuid,
  cancelado             bool             NOT NULL DEFAULT false,
  created_at            timestamptz      NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_pagador   ON public.expenses(pagador_id);
CREATE INDEX idx_expenses_data      ON public.expenses(data_compra);
CREATE INDEX idx_expenses_categoria ON public.expenses(categoria_id);
CREATE INDEX idx_expenses_recurrence ON public.expenses(recurring_template_id)
  WHERE recurring_template_id IS NOT NULL;

-- ── transfers (acertos entre o casal) ────────────────────────
CREATE TABLE public.transfers (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  de_id          uuid        NOT NULL REFERENCES public.users(id),
  para_id        uuid        NOT NULL REFERENCES public.users(id),
  valor_centavos int         NOT NULL CHECK (valor_centavos > 0),
  data           date        NOT NULL DEFAULT current_date,
  nota           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transfers_different_users CHECK (de_id <> para_id)
);

CREATE INDEX idx_transfers_de   ON public.transfers(de_id);
CREATE INDEX idx_transfers_data ON public.transfers(data);
