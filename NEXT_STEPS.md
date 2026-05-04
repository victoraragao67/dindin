# Próximos Passos — Victor (CEO)

> Tudo que **só você** pode fazer. O Claude Code não consegue avançar sem essas peças.

## Ordem recomendada

### 1️⃣ Criar repositório no GitHub (5 min)
- Nome sugerido: `dindin`
- Visibilidade: **privada**
- Não inicializar com README (já temos)
- Depois de criar, rodar localmente:
  ```bash
  cd "C:\Users\victo\OneDrive\Documentos\Claude\Projects\DinDin"
  git init
  git add .
  git commit -m "chore: project foundation (docs only)"
  git branch -M main
  git remote add origin https://github.com/<seu-user>/dindin.git
  git push -u origin main
  ```
- Convidar o Claude Code (ou seu próprio user dev) com permissão de write

---

### 2️⃣ Criar projeto no Supabase (15 min)
- Acessar supabase.com → "New Project"
- Region: **South America (São Paulo)** — menor latência
- Plano: **Free** (cobre o caso de uso)
- Salvar em local seguro (1Password, Bitwarden, .env local — NUNCA no Git):
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

---

### 3️⃣ Configurar WhatsApp Cloud API da Meta (1h, mais chato)
- Acessar [developers.facebook.com](https://developers.facebook.com/) e criar conta de desenvolvedor (se não tiver)
- Criar **App** → tipo "Business"
- Adicionar produto **WhatsApp** ao app
- Anotar:
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_BUSINESS_ACCOUNT_ID`
  - Token temporário (24h) para testar agora; gerar **token permanente** depois via System User
- Cadastrar **número de teste** que a Meta fornece — você vai testar com ele antes de migrar pro número real
- Cadastrar seu número e o da Letícia como **destinatários permitidos** (limitação do tier de dev)

📚 Tutorial oficial: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started

---

### 4️⃣ Criar conta no Vercel (5 min)
- Login com o GitHub (mais simples)
- Plano: **Hobby (free)**
- Não conectar o repo ainda — Claude Code faz isso quando o projeto Next.js estiver pronto

---

### 5️⃣ Sessão de 30 min com a Letícia
Decidir juntos:

- [ ] Lista final de **categorias** (sugestão inicial: mercado, restaurante, fixo, lazer, saúde, transporte, viagem, presente, outros)
- [ ] Regra de divisão **default** — 50/50 ou proporcional à renda?
- [ ] Como tratar **parcelamento** no cartão (registra valor cheio na compra ou parcela mês a mês)?
- [ ] Como tratar **gastos recorrentes** (aluguel, streaming) — registro manual mensal ou template automático?
- [ ] Apelido curto que ela quer no bot (`let`, `leti`, outro?)

📝 Anotar as decisões e me devolver — eu atualizo o `DATA_MODEL.md` e libero o Claude Code para subir o seed correto.

---

## Quando todos os 5 estiverem ✅

Me avise. Eu vou:
1. Atualizar o `DATA_MODEL.md` com as decisões da Letícia
2. Mover os cards F1-04 a F1-10 do KANBAN para "pronto pro Claude Code"
3. Preparar o **brief de handoff** para o Claude Code começar o desenvolvimento

---

## Coisas que você **não precisa** fazer

- Configurar servidor (não temos)
- Comprar domínio (Vercel dá `.vercel.app` grátis; só comprar quando quisermos um nome bonito)
- Pagar nada agora (todos os tiers cobrem)
- Decidir nada de Fase 2+ ainda (foco é MVP)

---

## Risco principal a monitorar

**Letícia precisa estar engajada desde o dia 1.** Se ela não opinar nas categorias, na divisão e no tom do bot, o produto será feito com cara de Victor — e ela é a usuária crítica. Se vocês não conseguirem agendar a sessão de 30 min nos próximos dias, me avisa que eu refaço o plano para destravar o que dá sem isso.
