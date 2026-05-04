# Kanban — DinDin

> Board vivo do projeto. Atualizado pelo PM (Claude.ai) a cada interação relevante.
> Formato: cada cartão tem **dono**, **fase**, **estimativa** e **definition of done**.

---

## 📋 Backlog (priorizado, topo = próximo)

### Fase 1 — MVP

#### [F1-04] Setup Next.js + estrutura de monorepo
- **Dono:** Claude Code
- **Estimativa:** 2h
- **DoD:** `web/`, `db/migrations/`, `api/whatsapp/` criados; `pnpm install` funciona; deploy inicial no Vercel ok (página em branco)

#### [F1-05] Migrations iniciais do Supabase
- **Dono:** Claude Code
- **Estimativa:** 4h
- **DoD:** Tabelas `users`, `categories`, `expenses`, `expense_installments`, `recurring_templates`, `transfers` criadas; trigger de geração de parcelas testado; seed das 9 categorias rodado; RLS habilitado e testado

#### [F1-06] Webhook do WhatsApp (recebe e ecoa)
- **Dono:** Claude Code
- **Estimativa:** 4h
- **Depende:** F1-04
- **DoD:** Mensagem enviada no WhatsApp aparece nos logs do Vercel; bot responde "recebi: <texto>"; validação HMAC da Meta implementada

#### [F1-07] Parser V1 (regex + heurísticas)
- **Dono:** Claude Code
- **Estimativa:** 8h
- **Depende:** F1-06
- **DoD:** Todos os comandos da `BOT_SPEC.md` (V1) parseados corretamente, incluindo apelidos Vitim/Gaia e parcelas (`280 em 3x`); cobertura de testes >80%

#### [F1-08] Persistência + cálculo de saldo
- **Dono:** Claude Code
- **Estimativa:** 4h
- **Depende:** F1-05, F1-07
- **DoD:** Mensagem `120 mercado` cria linha em `expenses` + 1 em `expense_installments`; `280 mercado em 3x` cria 1+3; comando `saldo` retorna valor correto (validado com 5 cenários manuais documentados)

#### [F1-09] Comandos auxiliares (saldo, mês, apagar, recorrentes)
- **Dono:** Claude Code
- **Estimativa:** 5h
- **Depende:** F1-08
- **DoD:** Todos os comandos da `BOT_SPEC.md` (V1) funcionando, incluindo cadastro/listagem/pausa de recorrentes

#### [F1-09b] Cron de recorrentes
- **Dono:** Claude Code
- **Estimativa:** 2h
- **Depende:** F1-09
- **DoD:** Edge Function rodando diariamente 08:00 BRT, gera `expenses` para templates ativos; idempotente (não duplica se rodar 2x); testado avançando data manualmente

#### [F1-10] Web app — login + lista de gastos
- **Dono:** Claude Code
- **Estimativa:** 6h
- **Depende:** F1-05
- **DoD:** Magic link funciona, lista do mês paginada, saldo no topo, mobile-first, instalável como PWA, mostra ícone de parcela (1/3) quando aplicável

#### [F1-11] Validação UX com Gaia
- **Dono:** Gaia + Vitim
- **Estimativa:** 30min de sessão
- **Depende:** F1-09, F1-10
- **DoD:** Gaia consegue registrar 3 gastos diferentes (1 simples, 1 parcelado, 1 recorrente) sem ajuda; feedback colhido em ata

#### [F1-13] Piloto de 30 dias
- **Dono:** Vitim + Gaia
- **Estimativa:** 30 dias corridos
- **Depende:** F1-11
- **DoD:** Casal usa o sistema diariamente; abandono = falha da Fase 1, retrospectiva e replanejamento

---

### Fase 2 — Inteligência (não detalhar até F1 fechar)
- Edge Function de geração de insights
- Comando `/insights`
- Painel com gráficos (Recharts)
- Detecção de anomalias
- Export CSV

---

## 🚧 Em andamento
*(vazio — aguardando handoff para Claude Code)*

---

## 👀 Em revisão
*(vazio)*

---

## ✅ Concluído

### Fase 0 — Planejamento
- [F0-01] Definição de stack e arquitetura — Claude.ai
- [F0-02] README, ARCHITECTURE, DATA_MODEL, BOT_SPEC, ROADMAP, KANBAN, NEXT_STEPS — Claude.ai
- [F0-03] Definição de papéis do time — Vitim
- [F0-04] HANDOFF.md preparado para Claude Code — Claude.ai

### Fase 1 — pré-trabalho do CEO
- [F1-01] ✅ Conta Meta Business + WhatsApp Cloud API criada — Vitim
- [F1-02] ✅ Projeto Supabase provisionado — Vitim
- [F1-03] ✅ Repositório GitHub privado `dindin` criado — Vitim
- [F1-12] ✅ Decisões com Gaia (categorias, divisão, parcelas, recorrentes, apelidos) — Vitim + Gaia
  - Categorias: mercado, restaurante, fixo, lazer, saúde, transporte, viagem, presente, outros
  - Divisão default: 50/50
  - Parcelas: registrar valor cheio + N parcelas; sistema gera lançamentos mensais
  - Recorrentes: template automático
  - Apelidos: Vitim e Gaia

---

## Indicadores do projeto

| Indicador | Meta | Atual |
|---|---|---|
| Cards F1 concluídos | 13 | 4 (31%) |
| Lead time médio (Backlog → Concluído) | <5 dias | n/a |
| WIP | ≤2 simultâneos | 0 |
| Bloqueios ativos | 0 | **0 — Fase 1 destravada para Claude Code** ✅ |

---

## Convenções

- **WIP máximo:** 2 cartões em "Em andamento" simultaneamente (foco Lean)
- **Cartão sem DoD não entra no board**
- **Bloqueios** marcados explicitamente em "Notas" com link para o cartão bloqueador
- **Retrospectiva** a cada fase concluída — documentar o que funcionou e o que mudar
