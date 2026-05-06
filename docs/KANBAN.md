# Kanban — DinDin

> Board vivo do projeto. Atualizado pelo PM (Claude.ai) a cada interação relevante.
> Formato: cada cartão tem **dono**, **fase**, **estimativa** e **definition of done**.

---

## 📋 Backlog (priorizado, topo = próximo)

### Fase 1 — MVP PWA

#### [F1-01] Setup Next.js + monorepo + Vercel
- **Dono:** Claude Code
- **Estimativa:** 2h
- **DoD:** `web/` e `db/` criados; `pnpm install` funciona; deploy preview no Vercel ok (página em branco com "Hello DinDin"); `.env.example` populado

#### [F1-02] Migrations Supabase + seeds
- **Dono:** Claude Code
- **Estimativa:** 4h
- **DoD:** Migrations 001-007 aplicadas; tabelas `users`, `categories`, `expenses`, `expense_installments`, `recurring_templates`, `transfers`, `push_subscriptions` criadas; trigger de geração de parcelas testado; seed das 9 categorias rodado; RLS habilitado

#### [F1-03] Configuração PWA (manifest + service worker)
- **Dono:** Claude Code
- **Estimativa:** 3h
- **Depende:** F1-01
- **DoD:** PWA instalável em iOS e Android; ícone customizado; splash screen; manifest com nome/cores; passa Lighthouse PWA

#### [F1-04] Auth (magic link)
- **Dono:** Claude Code
- **Estimativa:** 3h
- **Depende:** F1-02
- **DoD:** Login funciona em iOS Safari e Android Chrome; magic link expira em 10 min; redirect pós-login pra home; logout disponível

#### [F1-05] Tela principal (saldo + lista do mês)
- **Dono:** Claude Code
- **Estimativa:** 5h
- **Depende:** F1-04
- **DoD:** Saldo no topo (calculado da view `v_saldo_atual`); lista do mês agrupada por dia; total mensal + categoria dominante; mostra indicador de parcela (1/3); FAB visível mas ainda inerte

#### [F1-06] Modal de novo gasto + persistência
- **Dono:** Claude Code
- **Estimativa:** 8h
- **Depende:** F1-05
- **DoD:** Toque no FAB abre modal; teclado numérico em foco; chips de categoria funcionam; toggle de pagador; salvar persiste em `expenses` + `expense_installments`; toast de confirmação; saldo e lista atualizam em <300ms; validação Zod completa

#### [F1-07] Avançado: parcelas e divisão custom
- **Dono:** Claude Code
- **Estimativa:** 4h
- **Depende:** F1-06
- **DoD:** Expandir "+ avançado" mostra parcelas, divisão, data, descrição; parcelas >1 cria N installments com fórmula correta de centavos; preview "3x de R$ 93,33"

#### [F1-08] Tela de recorrentes (CRUD)
- **Dono:** Claude Code
- **Estimativa:** 4h
- **Depende:** F1-06
- **DoD:** Listagem; novo; editar; pausar; remover; modal reusa o mesmo componente do gasto

#### [F1-09] Edge Function: cron de recorrentes
- **Dono:** Claude Code
- **Estimativa:** 2h
- **Depende:** F1-08
- **DoD:** Edge Function rodando diariamente 08:00 BRT, gera `expenses` para templates ativos com `dia_do_mes = today`; idempotente (não duplica se rodar 2x); testado avançando data manualmente

#### [F1-10] Web Push (subscription + permissão)
- **Dono:** Claude Code
- **Estimativa:** 4h
- **Depende:** F1-04
- **DoD:** VAPID keys configuradas; banner de permissão com copy amigável; subscription persiste em `push_subscriptions`; teste manual de envio funciona

#### [F1-11] Edge Function: push diário às 22h
- **Dono:** Claude Code
- **Estimativa:** 2h
- **Depende:** F1-10
- **DoD:** Cron 22:00 BRT verifica usuários sem registro no dia; envia push "registrou os gastos de hoje?"; toque na notificação abre PWA no modal de novo gasto

#### [F1-12] Tela de acerto (PIX)
- **Dono:** Claude Code
- **Estimativa:** 3h
- **Depende:** F1-04
- **DoD:** Form simples (de/para/valor/data/nota); persiste em `transfers`; saldo recalcula corretamente

#### [F1-13] Onboarding (4 telas)
- **Dono:** Claude Code
- **Estimativa:** 4h
- **Depende:** F1-10
- **DoD:** Bem-vindo → Instalar como app → Permitir push → Pronto; instruções claras de install em iOS e Android

#### [F1-14] Validação UX com Gaia
- **Dono:** Gaia + Vitim
- **Estimativa:** 30min de sessão
- **Depende:** F1-09, F1-11, F1-12, F1-13
- **DoD:** Gaia consegue: instalar PWA, registrar 3 gastos diferentes (1 simples, 1 parcelado, 1 com divisão custom), cadastrar 1 recorrente, registrar 1 acerto — tudo sem ajuda; feedback em ata

#### [F1-15] Piloto de 30 dias
- **Dono:** Vitim + Gaia
- **Estimativa:** 30 dias corridos
- **Depende:** F1-14
- **DoD:** Casal usa o sistema diariamente; abandono = falha da Fase 1, retrospectiva e replanejamento

---

### Fase 2 — Inteligência (não detalhar até F1 fechar)
- Tela de insights
- Edge Function de geração semanal
- Detecção de anomalias e desequilíbrio
- Gráficos com Recharts
- Export CSV

---

## 🚧 Em andamento

#### [F1-04] Auth (magic link)
- **Dono:** Claude Code
- **Estimativa:** 3h
- **Depende:** F1-02 ✅

---

## 👀 Em revisão
*(vazio)*

---

## ✅ Concluído

### Fase 1 — MVP PWA

#### [F1-03] Configuração PWA — Claude Code ✅ *06/mai/2026*
- next-pwa configurado; manifest gerado; ícones criados; PWA instalado na tela inicial ✅

#### [F1-02] Migrations Supabase + seeds — Claude Code ✅ *06/mai/2026*
- 7 migrations aplicadas; todas as tabelas criadas; trigger de parcelas funcional (R$280 em 3x → 9333/9333/9334 ✅); seed das 9 categorias + Victor e Letícia ✅; v_saldo_atual ok ✅; RLS habilitado

#### [F1-01] Setup Next.js + monorepo + Vercel — Claude Code ✅ *06/mai/2026*
- Monorepo pnpm com workspace `web/`; Next.js 14 + Tailwind + ESLint + Prettier
- `.env.example` populado; `web/README.md` completo
- Deploy no Vercel (`dindin-web-virid.vercel.app`) mostrando "Hello DinDin" ✅

### Fase 0 — Planejamento
- [F0-01] Definição de stack e arquitetura — Claude.ai
- [F0-02] README, ARCHITECTURE, DATA_MODEL, ROADMAP, KANBAN, NEXT_STEPS, INPUT_UX — Claude.ai
- [F0-03] Definição de papéis do time — Vitim
- [F0-04] Decisões com Gaia (categorias, divisão, parcelas, recorrentes, apelidos) — Vitim + Gaia
- [F0-05] **Pivot pra PWA** — análise de fricção da Meta + decisão estratégica do CEO — Vitim + Claude.ai
- [F0-06] HANDOFF.md preparado para Claude Code (versão PWA) — Claude.ai

### Pré-requisitos do CEO
- ✅ Conta Supabase criada
- ✅ Repositório GitHub privado `dindin` criado
- ✅ Conta Vercel criada
- ❌ ~~Meta WhatsApp Cloud API~~ — fora de escopo
- ❌ ~~Verificação MEI na Meta~~ — fora de escopo

---

## Indicadores do projeto

| Indicador | Meta | Atual |
|---|---|---|
| Cards F1 concluídos | 15 | 3 (20%) — F1-01, F1-02, F1-03 ✅ |
| Lead time médio (Backlog → Concluído) | <5 dias | n/a |
| WIP | ≤2 simultâneos | 2 |
| Bloqueios ativos | 0 | 0 ✅ |

---

## Convenções

- **WIP máximo:** 2 cartões em "Em andamento" simultaneamente (foco Lean)
- **Cartão sem DoD não entra no board**
- **Bloqueios** marcados explicitamente em "Notas" com link para o cartão bloqueador
- **Retrospectiva** a cada fase concluída — documentar o que funcionou e o que mudar

## Histórico de pivots

- **04/mai/2026** — Pivot do canal de input: WhatsApp → PWA puro. Motivo: Meta exigiu verificação de empresa mesmo em modo dev; análise mostrou que PWA tem UX comparável e elimina dependência externa permanente. Cards F1-01 (Meta), F1-06 (Webhook), F1-07 (Parser) da versão antiga foram removidos. ~22h de dev e 1-2 semanas de calendar economizados.
