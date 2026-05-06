-- ============================================================
-- 003_installments.sql
-- Tabela expense_installments + trigger de geração automática
-- ============================================================

-- ── Tabela ───────────────────────────────────────────────────
CREATE TABLE public.expense_installments (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id       uuid        NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  numero           int         NOT NULL CHECK (numero >= 1),
  valor_centavos   int         NOT NULL CHECK (valor_centavos > 0),
  data_competencia date        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_installment UNIQUE (expense_id, numero)
);

CREATE INDEX idx_installments_expense      ON public.expense_installments(expense_id);
CREATE INDEX idx_installments_competencia  ON public.expense_installments(data_competencia);

-- ── Função do trigger ────────────────────────────────────────
-- SECURITY DEFINER: roda com privilégios do owner (bypassa RLS),
-- pois o app não tem política de INSERT em expense_installments —
-- apenas o trigger é autorizado a escrever nessa tabela.
-- SET search_path restringe o escopo para segurança.
CREATE OR REPLACE FUNCTION public.fn_gerar_parcelas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_parcelas       int  := NEW.parcelas;
  v_total          int  := NEW.valor_total_centavos;
  v_por_parcela    int;
  v_ultima         int;
  v_i              int;
  v_competencia    date;
BEGIN
  -- Fórmula sem perda de centavo (divisão inteira = floor)
  -- Ex.: R$ 280 em 3x → 9333 | 9333 | 9334 centavos
  v_por_parcela := v_total / v_parcelas;
  v_ultima      := v_total - (v_por_parcela * (v_parcelas - 1));

  FOR v_i IN 1..v_parcelas LOOP
    -- 1ª parcela = data_compra; 2ª = +1 mês; etc.
    v_competencia := (NEW.data_compra + ((v_i - 1) || ' months')::interval)::date;

    INSERT INTO public.expense_installments
      (expense_id, numero, valor_centavos, data_competencia)
    VALUES (
      NEW.id,
      v_i,
      CASE WHEN v_i = v_parcelas THEN v_ultima ELSE v_por_parcela END,
      v_competencia
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- ── Trigger ──────────────────────────────────────────────────
CREATE TRIGGER trg_gerar_parcelas
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_gerar_parcelas();
