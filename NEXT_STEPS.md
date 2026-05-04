# Próximos Passos — Vitim (CEO)

> **Boa notícia:** com o pivot pra PWA, sua lista encurtou drasticamente. Sem Meta, sem MEI, sem verificação. Tudo que falta são 3 coisas operacionais.

## Ordem recomendada

### 1️⃣ Subir os docs pro GitHub (2 min)

Da pasta do projeto:

```bash
cd "C:\Users\victo\OneDrive\Documentos\Claude\Projects\DinDin"
git init
git add .
git commit -m "docs: project foundation (PWA-first)"
git branch -M main
git remote add origin https://github.com/<seu-user>/dindin.git
git push -u origin main
```

Antes do commit, opcionalmente apagar os docs deprecados (estão marcados):

```bash
git rm docs/META_SETUP.md docs/BOT_SPEC.md
```

---

### 2️⃣ Soltar o Claude Code (1 min)

Abre o repo `dindin` no Claude Code e manda **uma única instrução**:

> *"Leia HANDOFF.md por inteiro e comece pelo card F1-01 do docs/KANBAN.md. Faça o primeiro PR pequeno, exatamente o escopo descrito no HANDOFF."*

O Claude Code vai:
- Inicializar a estrutura de pastas
- Criar o Next.js
- Conectar com Vercel
- Abrir um PR pequeno e mergeável

---

### 3️⃣ Quando o primeiro PR chegar (5 min)

- Me avise (eu reviso como PM antes do merge)
- Você aprova/merge
- Configura no Vercel as env vars que o PR pedir (Supabase URL/keys)
- Claude Code segue pro F1-02

---

## O que **não** está mais na sua lista

- ❌ ~~Verificação de empresa na Meta~~
- ❌ ~~CCMEI, CNAE, documentos~~
- ❌ ~~Comprar chip ou número virtual~~
- ❌ ~~Configurar webhook do WhatsApp~~
- ❌ ~~Sessão técnica com a Gaia sobre comandos do bot~~

---

## Riscos a monitorar (para os próximos 30 dias)

| Risco | Mitigação |
|---|---|
| Gaia não instalar o PWA na tela inicial | Onboarding (F1-13) tem tela dedicada com instruções iOS+Android. Eu valido o copy antes do merge. |
| Push notification não chegar em iOS | iOS Safari só suporta Web Push se PWA estiver instalado. Reforçamos no onboarding. |
| Latência do "salvar" >300ms | Métrica monitorada desde o dia 1; bloqueia merge se passar. |
| Gaia achar a UX confusa | Validação F1-14 antes do piloto. Refazemos o que precisar. |

---

## Coisas que você **continua não precisando** fazer

- Configurar servidor (não temos, é tudo serverless)
- Comprar domínio (Vercel dá `.vercel.app` grátis; só comprar quando quisermos um nome bonito)
- Pagar nada (Vercel + Supabase no free tier indefinidamente)
- Decidir nada de Fase 2+ ainda (foco é MVP)

---

## Custo total atualizado

**R$ 0/mês** — definitivamente, sem asterisco.
