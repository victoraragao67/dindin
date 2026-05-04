# Modelo de Dados — DinDin

## Princípio

Schema mínimo e normalizado. Tudo que não é essencial para a V1 fica fora. Adicionar é fácil; remover é caro.

> **Status:** decisões da Letícia incorporadas + ajustes do pivot pra PWA (04/mai/2026). Schema congelado para implementação da Fase 1.

## Tabelas

### `users`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | `auth.users.id` do Supabase |
| nome | text | "Victor", "Letícia" |
| apelido | text | "Vitim", "Gaia" — usado em toda a UI |
| email | text UNIQUE | Para magic link |
| created_at | timestamptz | default now() |

**Seed inicial:**
```sql
INSERT INTO users (nome, apelido, email) VALUES
  ('Victor',  'Vitim', 'victor.aragao@umode.com.br'),
  ('Letícia', 'Gaia',  '<EMAIL_LETICIA>');
```

### `push_subscriptions`
Cada navegador/dispositivo onde o PWA foi instalado gera uma subscription. Usado para mandar o push diário.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | |
| endpoint | text UNIQUE | URL do push service do navegador |
| p256dh | text | chave pública do navegador |
| auth | text | secret de autenticação |
| user_agent | text | pra debug ("iPhone Safari", "Android Chrome") |
| ativo | bool | default true; vira false se push falhar |
| created_at | timestamptz | |

### `categories`
| Coluna | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nome | text UNIQUE | Decidido com Letícia (ver seed abaixo) |
| emoji | text | Para o painel e respostas do bot |
| aliases | text[] | Variações que o parser aceita |
| ordem | int | Ordem de exibição no painel |

**Seed final (decidido em sessão com Letícia):**
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

### `expenses`
Representa **uma compra/registro lógico**. Se for parcelado, gera N linhas em `expense_installments`.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| pagador_id | uuid FK → users | Quem pagou |
| categoria_id | int FK → categories | |
| valor_total_centavos | int | Valor cheio da compra (sempre em centavos) |
| parcelas | int | default 1; >1 quando parcelado |
| descricao | text | Opcional, livre |
| data_compra | date | default current_date |
| divisao | text | enum: `50_50` (default), `so_pagador`, `customizada` |
| split_pagador_pct | numeric | apenas para `customizada`; senão null |
| origem | text | enum: `pwa` (default), `import`, `recorrente` |
| recurring_template_id | uuid FK → recurring_templates | null para gastos avulsos |
| cancelado | bool | default false (soft delete) |
| created_at | timestamptz | default now() |

**Decisão da Letícia:** divisão padrão é **50/50** para tudo. Override na própria mensagem (`50 livro só`, `200 viagem 70/30`).

### `expense_installments`
Cada parcela vira uma linha. Materialização física (em vez de view derivada) facilita consulta de "gastos do mês" e cálculo de saldo.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| expense_id | uuid FK → expenses | ON DELETE CASCADE |
| numero | int | 1, 2, 3... (para "1/3", "2/3" no painel) |
| valor_centavos | int | valor_total / parcelas; ajuste de arredondamento na última |
| data_competencia | date | mês ao qual a parcela pertence (ex: 1ª = data_compra; 2ª = +1 mês; etc) |
| created_at | timestamptz | |

**Trigger:** ao inserir em `expenses`, gerar automaticamente N linhas em `expense_installments`. Implementação fica em `db/migrations/003_installments_trigger.sql`.

**Fórmula de divisão de centavos** (para evitar perda):
```
valor_por_parcela = floor(valor_total / parcelas)
ajuste_ultima     = valor_total - (valor_por_parcela * (parcelas - 1))
```
Exemplo: R$280 em 3x → 9333, 9333, 9334 centavos.

### `recurring_templates`
Decisão da Letícia: **cadastrar gastos recorrentes como template** que gera lançamento automático todo mês.

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| pagador_id | uuid FK → users | |
| categoria_id | int FK → categories | |
| valor_centavos | int | |
| descricao | text | "Aluguel", "Netflix", "Plano de saúde" |
| divisao | text | mesmo enum de `expenses` |
| split_pagador_pct | numeric | |
| dia_do_mes | int | 1-28 (evitar 29-31 por mêses curtos) |
| ativo | bool | default true |
| created_at | timestamptz | |

**Execução:** Edge Function (Supabase Cron) roda **diariamente às 08:00 BRT** e cria registros em `expenses` para todos os templates ativos com `dia_do_mes = current_date_day` que ainda não geraram lançamento neste mês.

Idempotência: index único em `(recurring_template_id, EXTRACT(YEAR FROM data_compra), EXTRACT(MONTH FROM data_compra))` em `expenses`.

### `transfers` (acertos entre o casal)
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| de_id | uuid FK → users | Quem pagou para o outro |
| para_id | uuid FK → users | |
| valor_centavos | int | |
| data | date | |
| nota | text | "PIX do mês", "acerto da viagem" |
| created_at | timestamptz | |

### `insights` (Fase 2)
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| tipo | text | `padrao_gasto`, `desequilibrio`, `sugestao` |
| titulo | text | "Gasto com delivery aumentou 40%" |
| corpo | text | Explicação curta |
| periodo_inicio | date | |
| periodo_fim | date | |
| dispensado | bool | default false |
| created_at | timestamptz | |

## Views

### `v_saldo_atual`
Saldo entre o casal **considerando apenas parcelas com `data_competencia <= current_date`**.

Lógica:
1. Para cada `expense_installment` ativo (expense não cancelado, competência <= hoje), calcula a parte que cada um deveria ter pago vs. quem pagou.
2. Soma as diferenças.
3. Subtrai `transfers` já realizados.
4. Retorna 1 linha: `{ devedor_id, credor_id, valor_centavos }` (ou saldo zerado).

### `v_gastos_por_categoria_mes`
Agrega `expense_installments` por categoria + mês de competência.

### `v_gastos_mensais`
Série temporal para o gráfico de tendência (12 meses corridos).

## Regras de divisão (defaults)

- **50/50** → padrão fixo (decisão da Letícia)
- **só pagador** → palavra-chave `só` ou `solo` na mensagem (gastos pessoais — presente individual, hobby de um só)
- **customizada** → percentual livre (ex: 70/30) só quando explicitado na mensagem

## Política de centavos

Todo valor monetário em **centavos como inteiro**. Nunca float, nunca decimal. Conversão para reais só na camada de apresentação.

## Migrations

- Migrations versionadas em `db/migrations/` (formato Supabase CLI):
  - `001_initial_schema.sql` (users, categories, expenses, transfers)
  - `002_categories_seed.sql`
  - `003_installments.sql` (tabela + trigger)
  - `004_recurring_templates.sql`
  - `005_push_subscriptions.sql`
  - `006_views.sql`
  - `007_rls.sql` (Row Level Security)
- Nunca alterar migration já aplicada — sempre criar nova
- Rollback documentado para cada migration que altera dados

## Decisões pendentes
*(nenhuma — schema congelado para Fase 1)*
