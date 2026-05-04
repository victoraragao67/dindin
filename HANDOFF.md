# Handoff para o Claude Code (CTO/Dev)

> **Para o Claude Code:** este é o ponto de entrada. Leia este documento por inteiro antes de tocar em qualquer código. Se tiver dúvida em qualquer ponto, pergunte ao Vitim (CEO) **antes** de implementar.

---

## Quem é quem

- **Vitim (Victor)** — CEO. Decide produto, prioridades, prazos. Responde dúvidas de regra de negócio.
- **Gaia (Letícia)** — usuária principal. Validação de UX, feedback de uso real. Não conversa direto com você — feedback chega via Vitim.
- **Claude.ai** — gestor de projetos. Mantém docs, kanban, decisões arquiteturais.
- **Você (Claude Code)** — CTO/Dev. Implementa, faz code review, cuida do deploy.

---

## Contexto importante: pivot recente

Em 04/mai/2026, o projeto pivotou do canal **WhatsApp** para **PWA puro**. Motivo: Meta exigia verificação de empresa (CNPJ) e a fricção de setup ameaçava o MVP. PWA com Web Push entrega UX equivalente sem dependência externa.

Se você ler menção a "WhatsApp", "bot", "parser de mensagem" em qualquer lugar do código ou histórico, **assume que está obsoleto**. A fonte da verdade é este HANDOFF + os docs em `docs/`.

---

## Leitura obrigatória (nesta ordem)

1. `README.md` — contexto e visão do produto
2. `docs/ARCHITECTURE.md` — stack e ADRs (versão pós-pivot)
3. `docs/DATA_MODEL.md` — schema completo (congelado para Fase 1)
4. `docs/INPUT_UX.md` — fluxo do PWA (substitui o antigo BOT_SPEC)
5. `docs/ROADMAP.md` — visão de fases
6. `docs/KANBAN.md` — backlog priorizado da Fase 1

---

## Stack

- **Linguagem:** TypeScript estrito (nada de `any` solto)
- **Framework:** Next.js 14 (App Router)
- **Estilo:** Tailwind CSS
- **Banco:** Supabase Postgres
- **Auth:** Supabase Auth (magic link)
- **Hosting:** Vercel
- **PWA:** `next-pwa` (manifest + service worker)
- **Push:** Web Push API + lib `web-push` no servidor; VAPID keys
- **Cron:** Supabase Edge Functions com `pg_cron` ou agendamento Vercel Cron
- **Package manager:** `pnpm`
- **Validação:** Zod em toda fronteira
- **Testes:** Vitest (unit) + Playwright (e2e do fluxo principal)

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
│   ├── INPUT_UX.md
│   ├── ROADMAP.md
│   └── KANBAN.md
├── web/                    ← Next.js app (front + API routes)
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (app)/          ← área autenticada (layout PWA)
│   │   │   ├── page.tsx           ← home (saldo + lista + FAB)
│   │   │   ├── recorrentes/
│   │   │   ├── acerto/
│   │   │   └── config/
│   │   ├── api/
│   │   │   ├── push/
│   │   │   │   ├── subscribe/route.ts
│   │   │   │   └── send-test/route.ts
│   │   │   └── health/route.ts
│   │   ├── manifest.ts            ← PWA manifest
│   │   └── layout.tsx
│   ├── components/
│   │   ├── novo-gasto-modal.tsx
│   │   ├── saldo-header.tsx
│   │   ├── lista-gastos.tsx
│   │   ├── fab.tsx
│   │   └── ui/             ← componentes base
│   ├── lib/
│   │   ├── money.ts        ← helpers de centavos
│   │   ├── date.ts         ← helpers BRT/UTC
│   │   ├── supabase/       ← clients (server, browser)
│   │   ├── push/           ← VAPID + subscription mgmt
│   │   ├── saldo/          ← cálculo
│   │   ├── log.ts
│   │   └── zod-schemas/
│   ├── public/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   └── apple-touch-icon.png
│   ├── package.json
│   └── tsconfig.json
├── db/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_categories_seed.sql
│   │   ├── 003_installments.sql
│   │   ├── 004_recurring_templates.sql
│   │   ├── 005_push_subscriptions.sql
│   │   ├── 006_views.sql
│   │   └── 007_rls.sql
│   └── seeds/
│       └── users.sql       ← Vitim e Gaia (com placeholders de email)
├── supabase/
│   └── functions/
│       ├── recurring-cron/   ← cria expenses dos templates ativos diariamente
│       └── daily-push/       ← envia push 22h se não houve registro no dia
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

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:victor.aragao@umode.com.br

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Os valores reais ficam só no Vercel (production) e no `.env.local` do Vitim. Nunca peça por eles via chat — peça para o Vitim configurar diretamente.

Geração das VAPID keys: rode `npx web-push generate-vapid-keys` no setup inicial.

---

## Ordem de execução sugerida (alinhada ao KANBAN)

### Sprint 1 — Fundação (F1-01, F1-02, F1-03)
1. Inicializar repo, monorepo `pnpm` com workspace `web/`
2. Criar Next.js em `web/` com Tailwind, ESLint, Prettier
3. Configurar `next-pwa` (manifest, service worker, ícones)
4. Configurar Supabase CLI local; rodar migrations 001-007
5. Habilitar RLS e validar com testes manuais
6. Deploy "Hello DinDin" no Vercel para confirmar pipeline

### Sprint 2 — Auth + tela principal (F1-04, F1-05)
1. Magic link via Supabase Auth
2. Layout do PWA (mobile-first, dark mode automático)
3. Home: saldo no topo, lista do mês, FAB inerte
4. View `v_saldo_atual` consumida via Supabase client

### Sprint 3 — Modal de gasto (F1-06, F1-07)
1. Modal full-screen com keypad em foco
2. Chips de categoria (9 chips com emoji e cor)
3. Toggle Vitim/Gaia (default = logged in)
4. Seção "+ avançado" colapsada com parcelas, divisão, data, descrição
5. Validação Zod
6. Persistência + animação de update

### Sprint 4 — Recorrentes + cron (F1-08, F1-09)
1. CRUD de templates
2. Edge Function de geração mensal

### Sprint 5 — Push (F1-10, F1-11)
1. VAPID keys + lib `web-push`
2. Banner de permissão amigável
3. Edge Function de envio diário

### Sprint 6 — Acerto + Onboarding (F1-12, F1-13)
1. Tela de acerto (PIX)
2. Onboarding 4 telas

### Sprint 7 — Validação (F1-14)
- Sessão com Gaia. Vitim conduz. Você acompanha logs em tempo real.

---

## Definition of Done (geral)

Para qualquer card ser considerado completo:
1. Código no `main` (via PR mergeado)
2. Testes passando no CI
3. Build do Vercel verde
4. Smoke test manual documentado no PR (3-5 passos)
5. Lighthouse PWA passando (após F1-03)
6. KANBAN atualizado pelo PM (Claude.ai) — você só precisa avisar no PR

---

## Regras de engenharia (não negociáveis)

- **Centavos como integer.** Nunca `number` decimal para dinheiro. Helper: `lib/money.ts`.
- **Datas em UTC no banco**, BRT na apresentação. Helper: `lib/date.ts`.
- **Validação de input com Zod** em toda fronteira (form, API routes).
- **Logs estruturados** (JSON) — Vercel mostra prettify; facilita filtro depois.
- **Sem `console.log` em produção** — usar wrapper `lib/log.ts`.
- **Nada de secrets em commit.** `.env` no `.gitignore` desde o commit 1.
- **Migrations não se editam.** Erro → nova migration.
- **Pull requests pequenos.** 1 card = 1 PR (no máximo 2-3 PRs por card complexo).
- **Mobile-first sempre.** Desktop é secundário (deve funcionar, mas não é prioridade).
- **Acessibilidade básica:** WCAG AA contraste, áreas de toque ≥ 44px.

---

## Como pedir ajuda

Se travou em decisão de produto: pergunta ao Vitim (CEO).
Se travou em decisão técnica que afeta o resto: pergunta ao Claude.ai (PM) — ele decide ou eleva ao CEO.
Se travou em algo que precisa da Gaia (UX, copy, fluxo): pergunta ao Vitim e ele leva pra ela.

---

## Primeiro PR esperado

Card **F1-01**. Deliverable mínimo do primeiro PR:
- Estrutura de pastas conforme acima
- Next.js rodando local com Tailwind
- `.env.example` populado (sem valores reais)
- README do `web/` explicando como rodar
- Pipeline Vercel conectado, deploy preview gerado mostrando "Hello DinDin"

Não fazer nada além disso no primeiro PR. **Pequeno e mergeável.**

---

## Avisos finais

1. **Lean acima de tudo.** Se você se pegar implementando algo "porque pode ser útil depois", para. Não está no escopo da Fase 1.
2. **Latência <300ms ao salvar é compromisso de produto**, não meta de stretch. Se uma decisão técnica ameaça isso, escalona.
3. **A Gaia é a usuária mais crítica.** Tudo que você implementar passa pelos olhos dela na F1-14. Pense nela ao escrever cada label, cada microcopy, cada animação.
4. **PWA-first.** Em qualquer dúvida de arquitetura, escolha o caminho que melhor sirva ao mobile instalado na tela inicial.

Boa execução. 🚀
