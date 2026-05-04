# DinDin

Sistema financeiro do casal Vitim e Gaia. Foco em **fricção zero** para registrar gastos no dia a dia e clareza total sobre quem deve para quem.

## Visão

Evolução do Splitwise/Tricount com inteligência: além de registrar e dividir, o DinDin identifica padrões, sugere melhorias e aponta desequilíbrios.

## Princípio fundamental

**Cada segundo entre "gastei" e "registrado" é desperdício.** Toda decisão de produto deve ser avaliada por esse filtro Lean.

## Arquitetura em 1 minuto

```
[PWA no celular]  ←──→  [Next.js no Vercel]  ←──→  [Supabase (Postgres)]
   instalado na          front + APIs +              fonte única
   tela inicial          Edge Functions              de verdade
        ↑                       ↓
        └──── Web Push ─────────┘
        "Registrou os gastos de hoje?"
```

- **Canal único:** PWA instalável (manifest + service worker), aberto direto da tela inicial
- **Backend:** Supabase (Postgres + Auth, free tier)
- **Lembrete:** Web Push diária às 22h, pra atacar a causa-raiz ("esquecemos")
- **Custo:** R$ 0/mês permanente (todos os tiers gratuitos cobrem o uso de 2 pessoas)

## Time

| Papel | Responsável | Função |
|---|---|---|
| CEO / Orquestrador | Vitim (Victor) | Direção, decisões de produto, prioridades |
| Usuária principal | Gaia (Letícia) | Validação de UX, feedback de uso real |
| Gestor de Projetos | Claude.ai | Documentação, planejamento, kanban, decisões de arquitetura |
| CTO / Desenvolvedor | Claude Code | Implementação, code review, deploy |

## Estrutura do repositório

```
DinDin/
├── README.md              ← você está aqui
├── HANDOFF.md             ← brief de entrada para o Claude Code (Dev)
├── NEXT_STEPS.md          ← checklist do CEO (3 passos)
├── docs/
│   ├── ARCHITECTURE.md    ← stack, decisões técnicas, ADRs
│   ├── DATA_MODEL.md      ← schema do banco (congelado para Fase 1)
│   ├── INPUT_UX.md        ← fluxo do PWA (telas, modal, push)
│   ├── ROADMAP.md         ← fases do projeto
│   └── KANBAN.md          ← board de tarefas
├── web/                   ← (a criar pelo Claude Code) Next.js app
├── db/                    ← (a criar pelo Claude Code) migrations Supabase
└── supabase/              ← (a criar pelo Claude Code) Edge Functions
```

## Status atual

**Fase 0 concluída ✅. Pivot pra PWA cravado. Fase 1 destravada para o Claude Code.**

Pronto:
- Stack final: Next.js + Vercel + Supabase + Web Push
- Schema do banco congelado
- UX do PWA desenhada (`docs/INPUT_UX.md`)
- Decisões da Gaia incorporadas (categorias, divisão, parcelas, recorrentes, apelidos)
- Conta Supabase, GitHub e Vercel já existentes

Próximo passo: o Claude Code lê `HANDOFF.md` e começa pelo card **F1-01** do `docs/KANBAN.md`.

## Histórico de pivots

- **04/mai/2026** — Canal de input mudou de WhatsApp pra PWA puro. Motivo: Meta passou a exigir verificação de empresa mesmo para uso restrito; análise mostrou que PWA tem UX comparável e elimina dependência externa permanente.
