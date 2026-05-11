-- ============================================================
-- 008_fix_user_ids.sql
-- Sincroniza public.users.id com auth.users.id pelo e-mail.
--
-- Problema: a migration 002 criou os usuários com gen_random_uuid(),
-- então public.users.id ≠ auth.users.id. O join
--   expenses.pagador_id → public.users.id
-- retorna null, exibindo "?" em vez do apelido correto,
-- e a RLS de INSERT em expenses (pagador_id = auth.uid()) bloqueia
-- novos gastos.
--
-- Execute no SQL Editor do Supabase (requer privilégios de owner).
-- ============================================================

BEGIN;

-- ── 1. Remove as FKs que apontam para public.users(id) ──────
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_pagador_id_fkey;

ALTER TABLE public.recurring_templates
  DROP CONSTRAINT IF EXISTS recurring_templates_pagador_id_fkey;

ALTER TABLE public.transfers
  DROP CONSTRAINT IF EXISTS transfers_de_id_fkey,
  DROP CONSTRAINT IF EXISTS transfers_para_id_fkey;

ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;

-- ── 2. Atualiza as tabelas filhas antes de alterar o PK ─────

-- expenses.pagador_id
UPDATE public.expenses e
SET    pagador_id = a.id
FROM   public.users u
JOIN   auth.users   a ON a.email = u.email
WHERE  e.pagador_id = u.id
  AND  u.id <> a.id;     -- só atualiza se realmente diferente

-- recurring_templates.pagador_id
UPDATE public.recurring_templates rt
SET    pagador_id = a.id
FROM   public.users u
JOIN   auth.users   a ON a.email = u.email
WHERE  rt.pagador_id = u.id
  AND  u.id <> a.id;

-- transfers.de_id
UPDATE public.transfers t
SET    de_id = a.id
FROM   public.users u
JOIN   auth.users   a ON a.email = u.email
WHERE  t.de_id = u.id
  AND  u.id <> a.id;

-- transfers.para_id
UPDATE public.transfers t
SET    para_id = a.id
FROM   public.users u
JOIN   auth.users   a ON a.email = u.email
WHERE  t.para_id = u.id
  AND  u.id <> a.id;

-- push_subscriptions.user_id
UPDATE public.push_subscriptions ps
SET    user_id = a.id
FROM   public.users u
JOIN   auth.users   a ON a.email = u.email
WHERE  ps.user_id = u.id
  AND  u.id <> a.id;

-- ── 3. Atualiza o PK na tabela users ────────────────────────
UPDATE public.users u
SET    id = a.id
FROM   auth.users a
WHERE  a.email = u.email
  AND  u.id <> a.id;

-- ── 4. Recria as FKs ────────────────────────────────────────
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_pagador_id_fkey
    FOREIGN KEY (pagador_id) REFERENCES public.users(id);

ALTER TABLE public.recurring_templates
  ADD CONSTRAINT recurring_templates_pagador_id_fkey
    FOREIGN KEY (pagador_id) REFERENCES public.users(id);

ALTER TABLE public.transfers
  ADD CONSTRAINT transfers_de_id_fkey
    FOREIGN KEY (de_id)   REFERENCES public.users(id),
  ADD CONSTRAINT transfers_para_id_fkey
    FOREIGN KEY (para_id) REFERENCES public.users(id);

ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ── 5. Verificação final ─────────────────────────────────────
-- Após executar, rode isso para confirmar que os IDs batem:
--
--   SELECT u.id AS public_id, a.id AS auth_id, u.apelido, u.email,
--          (u.id = a.id) AS ok
--   FROM public.users u
--   JOIN auth.users   a ON a.email = u.email;
--
-- Todos os registros devem ter ok = true.

COMMIT;
