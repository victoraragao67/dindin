# DinDin — Web

Next.js 14 app: front-end (painel) + API routes (webhook WhatsApp).

## Pré-requisitos

- Node.js 20+
- pnpm 9+

## Como rodar localmente

1. Copie `.env.example` para `web/.env.local` e preencha os valores reais (peça ao Vitim):
   ```bash
   cp ../.env.example .env.local
   ```

2. Instale dependências a partir da **raiz** do monorepo:
   ```bash
   pnpm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   pnpm dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000).

## Estrutura

```
web/
├── app/
│   ├── (painel)/               # área autenticada — F1-10
│   ├── login/                  # magic link — F1-10
│   └── api/
│       └── whatsapp/
│           ├── webhook/route.ts  # recebe mensagens da Meta — F1-06
│           └── send/route.ts     # envia respostas — F1-06
├── lib/
│   ├── parser/                 # regex + heurísticas — F1-07
│   ├── supabase/               # client server e browser — F1-05
│   ├── whatsapp/               # wrapper Meta Cloud API — F1-06
│   └── saldo/                  # cálculo de saldo — F1-08
├── components/                 # componentes React — F1-10
└── public/
```

## Deploy

Vercel — configurado com root directory `web/`. Push em `main` dispara deploy automático.

Para configurar no Vercel:
1. Importe o repositório
2. Defina **Root Directory** como `web`
3. Adicione as variáveis de ambiente do `.env.example`
