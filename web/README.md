# DinDin — Web

Next.js 14 PWA: painel financeiro do casal + API routes.

## Pré-requisitos

- Node.js 18+
- pnpm 9+

## Setup inicial

```bash
# 1. Na raiz do monorepo — instala todas as dependências
pnpm install

# 2. Copie as variáveis de ambiente (peça os valores reais ao Vitim)
cp ../.env.example .env.local

# 3. Gere os ícones PWA placeholder
pnpm gen-icons

# 4. Inicie o servidor de desenvolvimento
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Scripts disponíveis

| Comando | Descrição |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento |
| `pnpm build` | Build de produção |
| `pnpm start` | Serve o build de produção |
| `pnpm lint` | ESLint |
| `pnpm format` | Prettier |
| `pnpm gen-icons` | Gera ícones PWA placeholder em `public/` |

## Estrutura

```
web/
├── app/
│   ├── (auth)/login/          # magic link — F1-04
│   ├── (app)/                 # área autenticada (layout PWA)
│   │   ├── page.tsx           # home: saldo + lista + FAB — F1-05
│   │   ├── recorrentes/       # CRUD de templates — F1-08
│   │   ├── acerto/            # tela de acerto PIX — F1-12
│   │   └── config/            # configurações — F1-13
│   ├── api/
│   │   ├── health/route.ts    # healthcheck
│   │   └── push/              # Web Push (subscribe, send-test) — F1-10
│   ├── manifest.ts            # PWA manifest (Next.js nativo)
│   └── layout.tsx             # root layout
├── components/                # componentes React — F1-05+
├── lib/                       # utilitários (money, date, supabase, push, saldo) — F1-03+
├── scripts/
│   └── gen-icons.mjs          # gerador de ícones placeholder
└── public/
    ├── icon-192.png           # ícone PWA 192×192 (placeholder)
    ├── icon-512.png           # ícone PWA 512×512 (placeholder)
    └── apple-touch-icon.png   # ícone iOS 180×180 (placeholder)
```

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com os valores do Vercel.  
Para gerar VAPID keys: `npx web-push generate-vapid-keys`

## Deploy

Vercel — configurar **Root Directory = `web`** e adicionar as variáveis de `.env.example`.

Para configurar na primeira vez:
1. Importar repositório `victoraragao67/dindin` no Vercel
2. Framework: **Next.js**
3. Root Directory: **`web`**
4. Adicionar variáveis de ambiente
