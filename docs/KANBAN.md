# Kanban — DinDin

> Board vivo do projeto. Atualizado pelo PM (Claude.ai) a cada interação relevante.
> Formato: cada cartão tem **dono**, **fase**, **estimativa** e **definition of done**.

---

## 📋 Backlog (priorizado, topo = próximo)

### Fase 1 — MVP

#### [F1-01] Criar conta Meta Business + WhatsApp Cloud API
- **Dono:** Victor (CEO)
- **Estimativa:** 1h
- **Bloqueador para:** F1-04 (webhook)
- **DoD:** `phone_number_id` e `access_token` em mãos, número de teste enviando mensagem para o webhook fake (ngrok)
- **Notas:** Tutorial em developers.facebook.com/docs/whatsapp/cloud-api/get-started

#### [F1-02] Criar projeto no Supabase
- **Dono:** Victor (CEO)
- **Estimativa:** 15min
- **Bloqueador para:** F1-05 (migrations)
- **DoD:** Projeto criado, URL e `service_role_key` salvos em local seguro, compartilhados com Claude Code via secret manager (não por chat)

#### [F1-03] Criar repositório GitHub privado `dindin`
- **Dono:** Victor (CEO)
- **Estimativa:** 5min
- **Bloqueador para:** todos os F1-XX de código
- **DoD:** Repo criado, Claude Code com acesso de write, branch `main` protegida

#### [F1-04] Setup Next.js + estrutura de monorepo
- **Dono:** Claude Code
- **Estimativa:** 2h
- **DoD:** `web/`, `db/migrations/`, `api/whatsapp/` criados; `pnpm install` funciona; deploy inicial no Vercel ok (página em branco)

#### [F1-05] Migrations iniciais do Supabase
- **Dono:** Claude Code
- **Estimativa:** 3h
- **Depende:** F1-02
- **DoD:** Tabelas `users`, `categories`, `expenses`, `transfers` criadas; seed das categorias rodado; RLS habilitado e testado

#### [F1-06] Webhook do WhatsApp (recebe e ecoa)
- **Dono:** Claude Code
- **Estimativa:** 4h
- **Depende:** F1-01, F1-04
- **DoD:** Mensagem enviada no WhatsApp aparece nos logs do Vercel; bot responde "recebi: <texto>"

#### [F1-07] Parser V1 (regex + heurísticas)
- **Dono:** Claude Code
- **Estimativa:** 6h
- **Depende:** F1-06
- **DoD:** Mensagens da `BOT_SPEC.md` são parseadas corretamente; cobertura de testes >80%

#### [F1-08] Persistência + cálculo de saldo
- **Dono:** Claude Code
- **Estimativa:** 4h
- **Depende:** F1-05, F1-07
- **DoD:** Mensagem `120 mercado` cria linha em `expenses`; comando `saldo` retorna valor correto (validado com 5 cenários manuais)

#### [F1-09] Comandos auxiliares (saldo, mês, apagar)
- **Dono:** Claude Code
- **Estimativa:** 4h
- **Depende:** F1-08
- **DoD:** Todos os comandos da `BOT_SPEC.md` (V1) funcionando

#### [F1-10] Web app — login + lista de gastos
- **Dono:** Claude Code
- **Estimativa:** 6h
- **Depende:** F1-05
- **DoD:** Magic link funciona, lista do mês paginada, saldo no topo, mobile-first, instalável como PWA

#### [F1-11] Validação UX com Letícia
- **Dono:** Letícia + Victor
- **Estimativa:** 30min de sessão
- **Depende:** F1-09, F1-10
- **DoD:** Letícia consegue registrar 3 gastos diferentes sem ajuda; feedback colhido em ata

#### [F1-12] Decisões com Letícia (categorias, divisão, recorrentes)
- **Dono:** Victor + Letícia
- **Estimativa:** 30min
- **Bloqueador para:** F1-05 (seed final)
- **DoD:** Lista de categorias congelada, regra de divisão default decidida, decisão sobre parcelamento documentada em `DATA_MODEL.md`

#### [F1-13] Piloto de 30 dias
- **Dono:** Victor + Letícia
- **Estimativa:** 30 dias corridos
- **Depende:** F1-11
- **DoD:** Casal usa o sistema diariamente; abandono = falha da Fase 1

---

### Fase 2 — Inteligência (não detalhar até F1 fechar)
- Edge Function de geração de insights
- Comando `/insights`
- Painel com gráficos (Recharts)
- Detecção de anomalias
- Export CSV

---

## 🚧 Em andamento
*(vazio)*

---

## 👀 Em revisão
*(vazio)*

---

## ✅ Concluído

### Fase 0
- [F0-01] Definição de stack e arquitetura — Claude.ai
- [F0-02] README, ARCHITECTURE, DATA_MODEL, BOT_SPEC, ROADMAP, KANBAN — Claude.ai
- [F0-03] Definição de papéis do time — Victor

---

## Indicadores do projeto (atualizar semanalmente)

| Indicador | Meta | Atual |
|---|---|---|
| Cards F1 concluídos | 13 | 0 (0%) |
| Lead time médio (Backlog → Concluído) | <5 dias | n/a |
| WIP | ≤2 simultâneos | 0 |
| Bloqueios ativos | 0 | 3 (F1-04, F1-05, F1-06 dependem do CEO) |

---

## Convenções

- **WIP máximo:** 2 cartões em "Em andamento" simultaneamente (foco Lean)
- **Cartão sem DoD não entra no board**
- **Bloqueios** marcados explicitamente em "Notas" com link para o cartão bloqueador
- **Retrospectiva** a cada fase concluída — documentar o que funcionou e o que mudar
