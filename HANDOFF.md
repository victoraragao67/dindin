# Handoff para o Claude Code (CTO/Dev)

> **Para o Claude Code:** este é o ponto de entrada. Leia este documento por inteiro antes de tocar em qualquer código. Se tiver dúvida em qualquer ponto, pergunte ao Vitim (CEO) **antes** de implementar.

---

## Quem é quem

- **Vitim (Victor)** — CEO. Decide produto, prioridades, prazos. Responde dúvidas de regra de negócio.
- **Gaia (Letícia)** — usuária principal. Validação de UX, feedback de uso real. Não conversa direto com você — feedback chega via Vitim.
- **Claude.ai** — gestor de projetos. Mantém docs, kanban, decisões arquiteturais.
- **Você (Claude Code)** — CTO/Dev. Implementa, faz code review, cuida do deploy.

---

## Leitura obrigatória (nesta ordem)

1. `README.md` — contexto e visão do produto
2. `docs/ARCHITECTURE.md` — stack e ADRs
3. `docs/DATA_MODEL.md` — schema completo (congelado para Fase 1)
4. `docs/BOT_SPEC.md` — comandos do WhatsApp e regras do parser
5. `docs/ROADMAP.md` — visão de fases
6. `docs/KANBAN.md` — backlog priorizado da Fase 1

---

## Stack

- **Linguagem:** TypeScript (estrito; nada de `any` solto)
- **Framework:** Next.js 14 (App Router)
- **Estilo:** Tailwind CSS
- **Banco:** Supabase Postgres
- **Auth:** Supabase Auth (magic link)
- **Hosting:** Vercel
- **Package manager:** `pnpm`
- **Testes:** Vitest (unit) + Playwright (e2e do painel)

---

## Estrutura esperada do repo

```
dindin/
├── README.md
├── HANDOFF.md
├── NEXT_STEPS.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── BOT_SPEC.md
│   ├── ROADMAP.md
│   └── KANBAN.md
├── web/                    ← Next.js app (front + API routes)
│   ├── app/
│   │   ├── (painel)/       ← área autenticada
│   │   ├── login/
│   │   └── api/
│   │       └── whatsapp/
│   │           ├── webhook/route.ts   ← recebe mensagens
│   │           └── send/route.ts       ← envia respostas
│   ├── lib/
│   │   ├── parser/         ← regex + heurísticas (BOT_SPEC.md)
│   │   ├── supabase/       ← client server e browser
│   │   ├── whatsapp/       ← wrapper Meta Cloud API
│   │   └── saldo/          ← cálculo de saldo
│   ├── components/
│   ├── package.json
│   └── tsconfig.json
├── db/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_categories_seed.sql
│   │   ├── 003_installments.sql
│   │   ├── 004_recurring_templates.sql
│   │   ├── 005_views.sql
│   │   └── 006_rls.sql
│   └── seeds/
│       └── users.sql       ← Vitim e Gaia (com placeholders de número/email)
├── supabase/
│   └── functions/
│       └── recurring-cron/ ← Edge Function diária
├── .env.example
├── .gitignore
└── pnpm-workspace.yaml
```

---

## Variáveis de ambiente (criar `.env.example`, NUNCA commitar `.env`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WhatsApp Cloud API (Meta)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_VERIFY_TOKEN=          # criado por você, usado no setup do webhook
WHATSAPP_APP_SECRET=             # para validar HMAC

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Os valores reais ficam só no Vercel (production) e no `.env.local` do Vitim. Nunca peça por eles via chat — peça para o Vitim configurar diretamente.

---

## Ordem de execução sugerida (alinhada ao KANBAN)

### Sprint 1 — Fundação (F1-04, F1-05)
1. Inicializar repo, monorepo `pnpm` com workspace `web/`
2. Criar Next.js em `web/` com Tailwind, ESLint, Prettier
3. Configurar Supabase CLI local; rodar migrations 001-006
4. Habilitar RLS e validar com testes manuais (auth de um user não vê dados de outro casal — embora hoje só tenhamos um casal, a regra precisa estar pronta)
5. Deploy "página em branco" no Vercel para confirmar pipeline

### Sprint 2 — Bot funcional (F1-06, F1-07, F1-08, F1-09)
1. Webhook do WhatsApp: GET (verify) + POST (recebe mensagem) com validação HMAC
2. Parser V1 — implementar com TDD; cada caso da `BOT_SPEC.md` vira teste
3. Persistência: cada mensagem válida → `expenses` + `expense_installments`
4. Cálculo de saldo via view `v_saldo_atual`
5. Comandos auxiliares (saldo, mês, apagar, recorrentes)

### Sprint 3 — Painel + recorrentes (F1-09b, F1-10)
1. Edge Function de cron para recorrentes
2. Painel: login → lista do mês → saldo no topo → install PWA

### Sprint 4 — Validação (F1-11)
- Sessão com Gaia. Vitim conduz. Você acompanha logs em tempo real.

---

## Definition of Done (geral)

Para qualquer card ser considerado completo:
1. Código no `main` (via PR mergeado)
2. Testes passando no CI
3. Build do Vercel verde
4. Smoke test manual documentado no PR (3-5 passos)
5. KANBAN atualizado pelo PM (Claude.ai) — você só precisa avisar no PR

---

## Regras de engenharia (não negociáveis)

- **Centavos como integer.** Nunca `number` decimal para dinheiro. Helper: `lib/money.ts`.
- **Datas em UTC no banco**, BRT na apresentação. Helper: `lib/date.ts`.
- **Validação de input com Zod** em toda fronteira (webhook, API routes, formulários).
- **Logs estruturados** (JSON) — Vercel mostra prettify; facilita filtro depois.
- **Sem `console.log` em produção** — usar wrapper `lib/log.ts`.
- **Nada de secrets em commit.** `.env` no `.gitignore` desde o commit 1.
- **Migrations não se editam.** Erro → nova migration.
- **Pull requests pequenos.** 1 card = 1 PR (no máximo 2-3 PRs por card complexo).

---

## Como pedir ajuda

Se travou em decisão de produto: pergunta ao Vitim (CEO).
Se travou em decisão técnica que afeta o resto: pergunta ao Claude.ai (PM) — ele decide ou eleva ao CEO.
Se travou em algo que precisa da Gaia (UX, copy, fluxo): pergunta ao Vitim e ele leva pra ela.

---

## Primeiro PR esperado

Card **F1-04**. Deliverable mínimo do primeiro PR:
- Estrutura de pastas conforme acima
- Next.js rodando local com Tailwind
- `.env.example` populado (sem valores reais)
- README do `web/` explicando como rodar
- Pipeline Vercel conectado, deploy preview gerado

Não fazer nada além disso no primeiro PR. **Pequeno e mergeável.**

---

## Avisos finais

1. **Lean acima de tudo.** Se você se pegar implementando algo "porque pode ser útil depois", para. Não está no escopo da Fase 1.
2. **Latência <2s no bot é compromisso de produto**, não meta de stretch. Se uma decisão técnica ameaça isso, escalona.
3. **A Gaia é a usuária mais crítica.** Tudo que você implementar passa pelos olhos dela na F1-11. Pense nela ao escrever cada mensagem do bot.

Boa execução. 🚀
