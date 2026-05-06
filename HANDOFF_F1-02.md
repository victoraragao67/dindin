# Handoff F1-02 — Migrations Supabase + Seeds

> **Para o Claude Code:** card F1-02 destravado após merge do F1-01. Leia tudo antes de tocar no banco.

---

## Contexto

O pipeline Vercel está verde (`dindin-web-virid.vercel.app`). O projeto Supabase já existe — as credenciais estão no `.env.example` e configuradas no Vercel. Agora é hora de criar toda a estrutura do banco.

O schema está **congelado** em `docs/DATA_MODEL.md`. Não improvise nada — se tiver dúvida, pergunta ao Vitim antes de implementar.

---

## O que entregar

7 migrations em `db/migrations/` + seed de categorias e usuários. Tudo aplicado no Supabase do projeto.

### Estrutura de arquivos esperada

```
db/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_categories_seed.sql
    ├── 003_installments.sql
    ├── 004_recurring_templates.sql
    ├── 005_push_subscriptions.sql
    ├── 006_views.sql
    └── 007_rls.sql
```

---

## Detalhamento das migrations

### 001 — Schema inicial
Criar tabelas: `users`, `categories`, `expenses`, `transfers`.

Pontos críticos:
- `expenses.valor_total_centavos` → `int` (nunca float/numeric para dinheiro)
- `expenses.divisao` → enum: `50_50` | `so_pagador` | `customizada` (default `50_50`)
- `expenses.origem` → enum: `pwa` | `import` | `recorrente` (default `pwa`)
- Datas em UTC no banco — apresentação em BRT fica na camada web
- Todas as PKs uuid com `gen_random_uuid()`

### 002 — Seed de categorias
Inserir as 9 categorias decididas com a Letícia:

```sql
INSERT INTO categories (nome, emoji, aliases, ordem) VALUES
  ('mercado',     '🛒', ARRAY['super','supermercado','mercadinho','feira'], 1),
  ('restaurante', '🍽️', ARRAY['rest','almoço','jantar','ifood','delivery'], 2),
  ('fixo',        '🏠', ARRAY['aluguel','condomínio','luz','água','internet','assinatura'], 3),
  ('lazer',       '🎉', ARRAY['cinema','bar','show','passeio','rolê'], 4),
  ('saúde',       '⚕️', ARRAY['saude','farmácia','farmacia','médico','medico','dentista','plano'], 5),
  ('transporte',  '🚗', ARRAY['uber','99','combustível','gasolina','metro','ônibus','onibus'], 6),
  ('viagem',      '✈️', ARRAY['hotel','passagem','airbnb','turismo'], 7),
  ('presente',    '🎁', ARRAY['presentinho','aniversário','natal'], 8),
  ('outros',      '📦', ARRAY['outro','diversos','etc'], 9);
```

Também inserir os 2 usuários (seeds — os IDs reais do Supabase Auth serão vinculados no F1-04):

```sql
INSERT INTO users (nome, apelido, email) VALUES
  ('Victor',  'Vitim', 'victor.aragao@umode.com.br'),
  ('Letícia', 'Gaia',  'leticiar.gaia@gmail.com');
```

**Atenção:** email da Letícia já preenchido. Não alterar.

### 003 — Tabela de parcelas + trigger
Criar tabela `expense_installments` e o trigger que gera automaticamente N parcelas ao inserir em `expenses`.

Fórmula de divisão de centavos (obrigatória, sem exceção):
```
valor_por_parcela = floor(valor_total / parcelas)
ajuste_ultima     = valor_total - (valor_por_parcela * (parcelas - 1))
```
Exemplo: R$ 280 em 3x → 9333, 9333, 9334 centavos.

### 004 — Templates recorrentes
Criar tabela `recurring_templates`. Campo `dia_do_mes` deve aceitar apenas 1-28 (constraint check) para evitar problemas em meses curtos.

Index único em `expenses(recurring_template_id, EXTRACT(YEAR FROM data_compra), EXTRACT(MONTH FROM data_compra))` para garantir idempotência do cron.

### 005 — Push subscriptions
Criar tabela `push_subscriptions`. Campo `endpoint` com UNIQUE constraint.

### 006 — Views
Criar as 3 views:

- **`v_saldo_atual`** — a mais crítica. Calcula quem deve para quem considerando:
  1. Parcelas com `data_competencia <= current_date` (expenses não cancelados)
  2. Divisão configurada por expense (50/50, só pagador, customizada)
  3. Subtrai transfers já realizados
  4. Retorna: `devedor_id`, `credor_id`, `valor_centavos`

- **`v_gastos_por_categoria_mes`** — agrega installments por categoria + mês de competência

- **`v_gastos_mensais`** — série temporal dos últimos 12 meses para gráfico de tendência

### 007 — RLS (Row Level Security)
Habilitar RLS em todas as tabelas. Política base:
- Usuário autenticado só lê/escreve seus próprios dados
- `expenses` e `transfers`: ambos os membros do casal podem ler (precisam ver os gastos um do outro para calcular saldo)
- `categories`: leitura pública (não tem dado sensível)
- `push_subscriptions`: só o próprio usuário

---

## Definition of Done

- [ ] Todas as migrations aplicadas no Supabase (via CLI ou SQL editor)
- [ ] `pnpm install` continua funcionando na raiz
- [ ] Trigger de parcelas testado: inserir 1 expense com 3 parcelas e verificar 3 linhas em `expense_installments` com centavos corretos
- [ ] View `v_saldo_atual` retorna resultado sem erro com dados de teste
- [ ] RLS habilitado e testado (usuário sem auth não consegue ler dados)
- [ ] Seed das 9 categorias confirmado via `SELECT * FROM categories`
- [ ] PR com smoke test documentado (5 passos: o que inseriu, o que consultou, o que verificou)

---

## Avisos

- **Migrations não se editam após aplicadas.** Erro → nova migration.
- O Supabase free tier tem limite de 500MB — sem preocupação por ora.
- Não commitar valores reais de credenciais em hipótese alguma.
- A tabela `insights` é Fase 2 — **não criar agora**.

---

## Próximo card após merge deste

F1-03 (PWA manifest) e F1-04 (Auth magic link) podem rodar em paralelo — F1-03 não depende do banco, F1-04 depende do F1-02.
