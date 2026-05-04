# DinDin

Sistema financeiro do casal Victor e Letícia. Foco em **fricção zero** para registrar gastos no dia a dia e clareza total sobre quem deve para quem.

## Visão

Evolução do Splitwise/Tricount com inteligência: além de registrar e dividir, o DinDin identifica padrões, sugere melhorias e aponta desequilíbrios.

## Princípio fundamental

**Cada segundo entre "gastei" e "registrado" é desperdício.** Toda decisão de produto deve ser avaliada por esse filtro Lean.

## Arquitetura em 1 minuto

```
[WhatsApp]  ──→  [Webhook/API]  ──→  [Supabase (Postgres)]  ←──  [Web App / Vercel]
   input já          parser de             fonte única               painel,
   onde o casal      mensagem              de verdade                relatórios,
   está                                                              insights
```

- **Input principal:** mensagens curtas no WhatsApp (`120 mercado`, `saldo`, `mês`)
- **Backend:** Supabase (Postgres + Auth, free tier)
- **Front:** Next.js no Vercel, instalável como PWA no celular
- **Custo:** R$ 0/mês no início (todos os tiers gratuitos cobrem o uso de 2 pessoas)

## Time

| Papel | Responsável | Função |
|---|---|---|
| CEO / Orquestrador | Victor | Direção, decisões de produto, prioridades |
| Usuária principal | Letícia | Validação de UX, feedback de uso real |
| Gestor de Projetos | Claude.ai | Documentação, planejamento, kanban, decisões de arquitetura |
| CTO / Desenvolvedor | Claude Code | Implementação, code review, deploy |

## Estrutura do repositório

```
DinDin/
├── README.md              ← você está aqui
├── HANDOFF.md             ← brief de entrada para o Claude Code (Dev)
├── NEXT_STEPS.md          ← checklist de ações do CEO (concluído)
├── docs/
│   ├── ARCHITECTURE.md    ← stack, decisões técnicas
│   ├── DATA_MODEL.md      ← schema do banco (congelado para Fase 1)
│   ├── BOT_SPEC.md        ← comandos e parser do WhatsApp
│   ├── ROADMAP.md         ← fases do projeto
│   └── KANBAN.md          ← board de tarefas
├── web/                   ← (a criar pelo Claude Code) Next.js app
├── db/                    ← (a criar pelo Claude Code) migrations Supabase
└── supabase/              ← (a criar pelo Claude Code) Edge Functions
```

## Status atual

**Fase 0 concluída ✅. Fase 1 destravada para o Claude Code.**

Toda a fundação documental e os pré-requisitos do CEO estão prontos:
- Conta Meta + WhatsApp Cloud API ✅
- Projeto Supabase ✅
- Repositório GitHub ✅
- Conta Vercel ✅
- Decisões da Gaia (categorias, divisão, parcelas, recorrentes, apelidos) ✅

Próximo passo: o Claude Code lê `HANDOFF.md` e começa pelo card **F1-04** do `docs/KANBAN.md`.
