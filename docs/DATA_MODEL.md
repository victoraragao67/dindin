# Modelo de Dados — DinDin

## Princípio

Schema mínimo e normalizado. Tudo que não é essencial para a V1 fica fora. Adicionar é fácil; remover é caro.

## Tabelas

### `users`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | `auth.users.id` do Supabase |
| nome | text | "Victor", "Letícia" |
| whatsapp | text UNIQUE | E.164: `+5532999999999` |
| email | text UNIQUE | Para magic link |
| created_at | timestamptz | default now() |

### `categories`
| Coluna | Tipo | Notas |
|---|---|---|
| id | serial PK | |
| nome | text UNIQUE | "mercado", "restaurante", "fixo", "lazer", "saúde", "transporte", "viagem", "outros" |
| emoji | text | Para o painel |
| aliases | text[] | ["super", "mercadinho", "feira"] — para o parser |

Lista inicial de categorias decidida em conjunto com Letícia (ver KANBAN, tarefa de UX).

### `expenses`
| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| pagador_id | uuid FK → users | Quem pagou |
| categoria_id | int FK → categories | |
| valor_centavos | int | Sempre em centavos para evitar float |
| descricao | text | Opcional, livre |
| data | date | default current_date |
| divisao | text | enum: `50_50`, `so_pagador`, `customizada` |
| split_pagador_pct | numeric | Para `customizada`; senão null |
| origem | text | enum: `whatsapp`, `web`, `import` |
| raw_message | text | Mensagem original do WhatsApp (para debug do parser) |
| created_at | timestamptz | default now() |

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

### `insights` (camada de inteligência — V1.5)
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
Quanto cada um deve ao outro **agora**.

```sql
-- Conceito (a refinar na implementação):
-- Para cada despesa, calcula a parte que cada um deveria ter pago vs. quem pagou.
-- Soma tudo, descontando transfers já realizados.
-- Retorna 1 linha: { devedor_id, credor_id, valor_centavos }
```

### `v_gastos_por_categoria_mes`
Agregação para o painel.

### `v_gastos_mensais`
Série temporal para o gráfico de tendência.

## Regras de divisão (defaults)

- **50/50** → divisão padrão de tudo que afeta os dois (mercado, fixo, lazer compartilhado)
- **só pagador** → gastos pessoais (ex: presente individual, hobby de um só)
- **customizada** → percentual livre (ex: 70/30 quando a renda muda muito)

A regra deve ser **fácil de sobrescrever** na mensagem do WhatsApp:

```
120 mercado          → 50/50 (default)
80 livro só          → 100% do pagador
200 viagem 70/30     → split customizado
```

## Migrações

- Migrations versionadas em `db/migrations/` (formato Supabase CLI: `001_initial.sql`, `002_categories_seed.sql`, etc.)
- Nunca alterar migration já aplicada — sempre criar nova
- Rollback documentado para cada migration que altera dados

## Decisões pendentes (a discutir com Letícia)

- [ ] Lista final de categorias e emojis
- [ ] Default de divisão (50/50 confirmado? ou proporcional à renda?)
- [ ] Como tratar parcelamento (cartão em 6x): registra tudo na compra ou mês a mês?
- [ ] Recorrentes (aluguel, streaming): cadastrar como template para auto-registrar?
