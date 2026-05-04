# Arquitetura — DinDin

> **Pivot 04/mai/2026:** WhatsApp/Meta removidos do escopo. Stack PWA-first.

## Diagrama lógico

```
┌──────────────────────┐         ┌────────────────────┐         ┌──────────────┐
│   PWA no celular     │ ──────→ │  Next.js no Vercel │ ──────→ │   Supabase   │
│  (Vitim e Gaia)      │         │  (front + APIs)    │         │ (Postgres +  │
│                      │ ←────── │                    │ ←────── │   Auth)      │
└──────────────────────┘         └────────────────────┘         └──────────────┘
        ↑                                  ↑                            ↑
        │                                  │                            │
        │ Web Push notification            │ Edge Function (cron)       │
        └──────────────────────────────────┴────────────────────────────┘
                              "Registrou os gastos de hoje?"
```

## Princípio reafirmado

**Cada segundo entre "gastei" e "registrado" é desperdício.** No PWA, traduz pra: 3 toques pra registrar um gasto comum, contados a partir do ícone na tela inicial.

## Stack escolhida

| Camada | Tecnologia | Motivo |
|---|---|---|
| Front + back | Next.js 14 (App Router) + Tailwind CSS | Stack única, deploy 1-clique no Vercel |
| Hosting | Vercel | Gratuito; PWA serve perfeitamente |
| Banco | Supabase (Postgres) | Free tier generoso, SQL real, RLS |
| Auth | Supabase Auth (magic link) | Sem senha, simples pra Gaia |
| PWA | Web App Manifest + Service Worker (`next-pwa`) | Instala como app na tela inicial; offline-first |
| Notificações | Web Push API + VAPID | Push diário "registrou os gastos de hoje?" |
| Cron | Supabase Edge Functions com `pg_cron` | Geração mensal de recorrentes + disparo do push diário |
| Observabilidade | Vercel Analytics + Supabase logs | Built-in, sem custo |
| Linguagem | TypeScript estrito | Padrão de mercado, manutenção fácil |
| Validação | Zod | Em toda fronteira (forms, APIs) |
| Testes | Vitest (unit) + Playwright (e2e) | Cobertura do fluxo principal |

## Decisões arquiteturais (ADRs)

### ADR-001 (revisada): PWA como canal único de input
**Decisão:** O DinDin é um PWA instalado na tela inicial. Não há canal de mensagens.
**Motivo:** A primeira versão considerou WhatsApp como canal por estar onde o casal já vive. Na prática, a Meta exige verificação de empresa (CNPJ + documentos + 1-2 semanas de espera) e mantém o controle da regra futura. PWA elimina dependência externa, custo e burocracia, e permite UX guiada (interface visual reduz erro de input).
**Trade-off aceito:** vocês precisam abrir o app em vez de mandar mensagem. Mitigação: ícone na tela inicial, FAB grande "+ Gasto", autofocus no campo de valor, push diário.

### ADR-002: Supabase em vez de Firebase
**Decisão:** Postgres no Supabase.
**Motivo:** SQL é melhor para análises de padrões (camada de inteligência da Fase 2); Row Level Security mantém dados isolados por casal; export simples se quisermos migrar.

### ADR-003: Monorepo único
**Decisão:** Front, APIs e migrations no mesmo repo.
**Motivo:** Time de 1 dev (Claude Code), 2 usuários. Polirepo é overhead desnecessário.

### ADR-004: Tudo serverless
**Decisão:** Vercel + Supabase, zero servidor próprio.
**Motivo:** Custo zero, zero manutenção de infra. Escala suficiente pra 2 usuários por anos.

### ADR-005: PWA com `next-pwa`
**Decisão:** Usar a biblioteca `next-pwa` para gerar manifest e service worker.
**Motivo:** Cobre 95% dos casos com configuração mínima; integra bem com Next 14 App Router; permite offline básico (cache de shell e dados recentes) sem complexidade.

### ADR-006: Push diário como mecanismo principal de lembrete
**Decisão:** Web Push API às 22h BRT pergunta "Registrou os gastos de hoje?".
**Motivo:** O problema-raiz declarado pelo CEO é "esquecemos de registrar". Notificação proativa ataca a causa diretamente. Web Push funciona em Android Chrome nativo e em iOS Safari (16.4+) **quando o PWA está instalado** — instalar é parte do onboarding obrigatório.

### ADR-007: Sem parser de linguagem natural na V1
**Decisão:** Input via formulário guiado, não texto livre.
**Motivo:** Reduz erro de input a quase zero; categoria sempre selecionada; sem ambiguidade de "ifood" vs "delivery". Texto livre / áudio / OCR ficam pra Fase 2/3 como aceleradores opcionais.

## Fluxos principais

### Registrar gasto
1. Usuária toca no ícone do DinDin na tela inicial → PWA abre
2. Tela principal: saldo no topo, lista do mês abaixo, FAB "+ Gasto" no canto inferior direito
3. Toca no FAB → modal full-screen sobe com keypad numérico em foco
4. Digita valor → toca uma das 9 chips de categoria → toca "Salvar"
5. Modal fecha, toast de confirmação ("✅ R$ 120 — 🛒 Mercado · 50/50"), saldo e lista atualizam

Total: 3 toques + digitação do valor.

### Consultar saldo
Aparece **sempre no topo da tela principal**. Não é uma ação — é informação ambiente.

### Gasto parcelado
No modal de novo gasto, expandir a seção "+ avançado" → campo "parcelas" (default 1). Sistema calcula e mostra preview ("3x de R$ 93,33"). Persistência gera 1 `expense` + N `expense_installments`.

### Recorrentes
Acesso via menu lateral → "Recorrentes" → tela de listagem com botão "+ Novo". Edge Function diária às 08:00 BRT cria os lançamentos do dia.

### Push diário
Edge Function às 22:00 BRT consulta quem tem `push_subscription` ativa, dispara push. Ao tocar na notificação, abre o PWA já no modal de novo gasto.

### Acerto entre o casal (PIX)
Botão "Acerto" no menu → modal simples (de quem, pra quem, valor, data, nota). Persiste em `transfers`.

## Segurança

- **Row Level Security** no Supabase: cada casal isolado (preparação pra Fase 4)
- **Magic link** com expiração curta (10 min) e single-use
- **CSP estrito** no Next.js
- **Validação Zod** em todo input (form e API)
- **VAPID keys** em env var; chave privada nunca no client
- **HTTPS-only** (forçado pelo Vercel)
- **Backup:** export semanal do Postgres pra Google Drive (configurar Fase 2)

## Performance

- Tempo de carregamento da tela principal **<1.5s** em 4G
- Tempo entre toque no FAB e modal aberto **<100ms**
- Persistência de gasto **<300ms** p95
- PWA funciona offline para visualização (mostra dados em cache); registro offline entra na fila de sync
