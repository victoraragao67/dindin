# Arquitetura — DinDin

## Diagrama lógico

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│   WhatsApp   │ ──────→ │  API / Webhook   │ ──────→ │   Supabase   │
│  (Cloud API) │         │   (Vercel        │         │ (Postgres +  │
│              │ ←────── │   serverless)    │ ←────── │   Auth)      │
└──────────────┘         └──────────────────┘         └──────────────┘
                                  ↑                           ↑
                                  │                           │
                                  ↓                           │
                         ┌──────────────────┐                 │
                         │   Web App PWA    │ ────────────────┘
                         │ (Next.js/Vercel) │
                         └──────────────────┘
```

## Stack escolhida

| Camada | Tecnologia | Motivo |
|---|---|---|
| Input principal | WhatsApp Cloud API (Meta) | Casal já vive no WhatsApp; zero fricção; gratuito até 1.000 conversas/mês |
| Webhook / API | Next.js API Routes em Vercel (serverless) | Mesmo deploy do front; sem servidor pra gerenciar |
| Banco de dados | Supabase (Postgres) | Free tier generoso; SQL real; RLS para segurança; auth pronta |
| Autenticação | Supabase Auth (magic link por e-mail) | Sem senha, simples para Letícia |
| Front-end | Next.js 14 (App Router) + Tailwind | Padrão de mercado, PWA fácil, deploy 1-clique no Vercel |
| Hosting | Vercel | Gratuito para uso pessoal, integração nativa com Next.js |
| Parser de mensagens | TypeScript + regex/heurísticas | Começar simples; evoluir para LLM se necessário |
| Observabilidade | Vercel Analytics + Supabase logs | Built-in, sem custo |

## Decisões arquiteturais (ADRs resumidos)

### ADR-001: WhatsApp como input principal, não app dedicado
**Decisão:** O canal primário de registro é o WhatsApp.
**Motivo:** O problema-raiz declarado pelo Victor é "esquecemos de registrar". A causa é fricção de abrir um app extra. Lean: eliminar o passo desnecessário (abrir app) acelera o fluxo.
**Trade-off:** Parser de linguagem natural exige cuidado. Mitigação: vocabulário restrito e feedback explícito do bot ("Registrei R$ 120 em Mercado, dividido 50/50").

### ADR-002: Supabase em vez de Firebase
**Decisão:** Postgres no Supabase.
**Motivo:** SQL é melhor para análises de padrões (camada de inteligência do DinDin); Row Level Security mantém dados isolados; export simples se quisermos migrar.

### ADR-003: Monorepo único
**Decisão:** Front, API e migrations no mesmo repo.
**Motivo:** Time de 1 dev (Claude Code), 2 usuários. Polirepo é overhead desnecessário. Vercel deploya o monorepo nativamente.

### ADR-004: Sem servidor próprio
**Decisão:** Tudo serverless (Vercel + Supabase).
**Motivo:** Custo zero, zero manutenção de infra. Escala suficiente pra 2 usuários por anos.

### ADR-005: Parser começa por regex, não LLM
**Decisão:** V1 do parser usa regras determinísticas.
**Motivo:** LLM tem latência (3-8s), custo por chamada e pode errar de forma imprevisível. Comandos curtos (`120 mercado vic`) são facilmente parseáveis com regex. LLM entra na V2 para mensagens livres ("paguei o jantar ontem").

## Fluxos principais

### Registrar gasto via WhatsApp
1. Usuário envia: `120 mercado`
2. Meta Cloud API → POST no webhook `/api/whatsapp/webhook`
3. Parser extrai: `{ valor: 120, categoria: 'mercado', pagador: <inferido pelo número>, divisao: '50/50' }`
4. Insert no Postgres (tabela `expenses`)
5. Bot responde: `✅ R$ 120 em Mercado. Saldo: você deve R$ 30 à Letícia.`

### Consultar saldo via WhatsApp
1. Usuário envia: `saldo`
2. Webhook chama view `v_saldo_atual`
3. Bot responde com 1 linha resumida

### Visualizar painel
1. Letícia/Victor acessa `dindin.vercel.app` no celular
2. Magic link via e-mail (Supabase Auth)
3. PWA carrega: saldo do mês, gastos por categoria, gráfico de tendência, insights gerados

## Segurança (resumo)

- **Row Level Security** no Supabase: cada usuário só lê dados do casal a que pertence
- **Webhook do WhatsApp** valida assinatura HMAC da Meta
- **Autenticação por número** no bot: só números cadastrados (Victor + Letícia) são aceitos
- **Variáveis de ambiente** apenas no Vercel; nada de secrets no repo
- **Backup:** export semanal do Postgres para Google Drive (configurar na Fase 2)
