# Auditoria de Fechamento — Fase 1 DinDin

> **Data:** 13/mai/2026  
> **Branch auditada:** `main` @ `bda6662`  
> **Auditor:** Claude Code  
> **Metodologia:** verificação técnica por arquivo, função e migration — sem suposição. Cada item tem evidência concreta ou gap documentado.

---

## 1. Tabela Executiva

| Card | Título | Status | Evidência / Gap |
|------|--------|--------|-----------------|
| F1-01 | Setup Next.js + monorepo + Vercel | ✅ | `web/` + `db/` presentes; Next.js 14.2; `.env.example` populado na raiz com todas as vars |
| F1-02 | Migrations Supabase + seeds | ✅ | 13 migrations (001–013); trigger `fn_gerar_parcelas` com fórmula floor + ajuste na última parcela; seed 9 categorias; RLS habilitado |
| F1-03 | Configuração PWA | ⚠️ | `manifest.ts`, 3 ícones, `viewport-fit=cover`, SW gerado — tudo OK em código; **Lighthouse PWA score não verificável sem runtime** |
| F1-04 | Auth (magic link / OTP) | ✅ | OTP 8 dígitos, label correto, `maxLength=8`; middleware redireciona corretamente; logout funcional |
| F1-05 | Tela principal (saldo + lista) | ⚠️ | Saldo, lista agrupada por dia, total mensal, indicador parcela `(1/3)`, FAB — todos OK; **categoria dominante do mês ausente** (DoD exige) |
| F1-06 | Modal de novo gasto + persistência | ✅ | FAB → modal, `inputMode="decimal"`, 9 chips, toggle pagador, `criarGasto` → trigger → installments, toast, `revalidatePath`; Zod completa |
| F1-07 | Avançado: parcelas e divisão custom | ✅ | Preview `"3x de R$ 93,33"` via `previewParcelas`; slider + input para custom split; data; descrição; seção expansível |
| F1-08 | Tela de recorrentes (CRUD) | ✅ | Listagem, novo, editar (`editarRecorrente`), pausar (`toggleRecorrente`), remover com confirmação; modal reutilizado com `modo="recorrente"` |
| F1-09 | Edge Function: cron de recorrentes | ✅ | `supabase/functions/recurring-cron/index.ts`; cron `0 11 * * *` (08:00 BRT); idempotente via `uq_expense_recurring_mes`; insere `origem='recorrente'` |
| F1-10 | Web Push (subscription + permissão) | ✅ | VAPID keys em `.env.example`; `PushBanner` com lógica standalone + recusas; `POST /api/push/subscribe` persiste em `push_subscriptions`; endpoint de teste `/api/push/send-test` |
| F1-11 | Edge Function: push diário 22h | ✅ | `supabase/functions/daily-push/index.ts`; cron `0 1 * * *` (22:00 BRT); verifica expenses do dia; `url: '/?modal=novo-gasto'`; `HomeClient` detecta e abre modal |
| F1-12 | Tela de acerto / PIX | ✅ | Form de/para/valor/data/nota; `registrarAcerto` insere em `transfers`; default inteligente com saldo; `revalidatePath('/')` reconstrói `v_saldo_atual` |
| F1-13 | Onboarding (4 telas) | ✅ | `StepWelcome → StepInstall → StepNotifications → StepDone`; instruções iOS Safari e Android Chrome; skip automático de telas irrelevantes; flag em localStorage |
| F1-14 | Validação UX com Gaia | 🟦 | Sessão realizada em 11/mai/2026; `HANDOFF_BUGFIX_V1.md` documenta 6 bugs identificados, todos corrigidos |
| F1-15 | Piloto de 30 dias | 🟦 | Em curso — não verificável em código |
| F1-19 | Saldo duplo: variável vs recorrente | ✅ | Migration 013 aplicada; `v_saldo_atual` filtra `origem='pwa'`; `v_saldo_recorrentes` filtra `origem='recorrente'` no mês corrente; dois cards na home; cron já inseria `origem='recorrente'` |
| BUG-01 | OTP "6 dígitos" → "8 dígitos" | ✅ | Label "8 dígitos", `maxLength={8}`, Zod `\d{6,8}` |
| BUG-02 | Deletados não somem da lista | ✅ | `.eq('expenses.cancelado', false)` em `lista-gastos.tsx` e em todas as 3 queries de `resumo/page.tsx` |
| BUG-03 | Categorias não aparecem em Metas | ✅ | Migration 010 cria RLS `USING (true)` em `categories`; `metas/page.tsx` busca categorias em `Promise.all` |
| BUG-04 | Push notification não funciona | ⚠️ | Infraestrutura completa (subscribe, Edge Function, send-test), mas DoD exige "notificação chegando em pelo menos 1 device" — **verificação só possível em runtime** |
| BUG-05 | Logout perto do ⚙️ | ✅ | `LogoutButton` apenas em `config/page.tsx` com confirmação; header da home não tem logout |
| BUG-06 | FAB moderno centralizado | ✅ | `absolute -top-5 w-14 h-14 rounded-full` entre as duas abas em `bottom-nav.tsx` |
| BUG-07 | FAB cortado iOS safe area | ✅ | `viewportFit: 'cover'` em `layout.tsx`; `paddingBottom: env(safe-area-inset-bottom)` na nav; `padding-top: env(safe-area-inset-top)` em `globals.css` |

---

## 2. Gaps a Fechar

### ⚠️ GAP-1 — F1-05: Categoria dominante ausente

**Arquivo:** `web/components/lista-gastos-client.tsx`  
**Problema:** O DoD de F1-05 exige "total mensal + categoria dominante". O header da lista exibe só o total (`R$ X gasto`). Nenhum cálculo de categoria dominante existe no código.  
**Ação:** Calcular a categoria com maior soma de `valor_centavos` no mês e exibi-la ao lado do total.

```tsx
// Exemplo de implementação:
const catTotais = installments.reduce((acc, i) => {
  const cat = i.expenses?.categoria?.nome ?? 'outros'
  acc[cat] = (acc[cat] ?? 0) + i.valor_centavos
  return acc
}, {} as Record<string, number>)
const catDominante = Object.entries(catTotais).sort((a, b) => b[1] - a[1])[0]?.[0]

// No JSX:
{mesLabel} · {formatCurrency(totalMes)} gasto · {catDominante && `top: ${catDominante}`}
```

---

### ⚠️ GAP-2 — F1-03: Lighthouse PWA não verificado

**Problema:** DoD exige score PWA ≥ 90 no Lighthouse. Não é possível verificar por análise estática.  
**Ação:** Rodar `lighthouse https://dindin-web-virid.vercel.app --output=json --only-categories=pwa` ou usar Chrome DevTools → Lighthouse no deploy de produção. Reportar score na ata de fechamento.

---

### ⚠️ GAP-3 — BUG-04: Push notification não confirmado em device real

**Problema:** DoD exige "notificação chegando em pelo menos 1 dispositivo". Infraestrutura está implementada, mas não há confirmação de recebimento real.  
**Ação:** 
1. Verificar `push_subscriptions` no Supabase: `SELECT * FROM push_subscriptions;`
2. Acessar Supabase → Edge Functions → `daily-push` → Logs — confirmar execução sem erros
3. Chamar `POST /api/push/send-test` com o usuário logado e confirmar recebimento no device

---

### ⚠️ GAP-4 (menor) — Lint: `react-hooks/exhaustive-deps` em `novo-gasto-modal.tsx:142`

**Arquivo:** `web/components/novo-gasto-modal.tsx`, linha 142  
**Problema:** Warning do ESLint — `useEffect` com dependência faltando (`editandoGasto`). Não causa bug em produção hoje (ausência intencional para evitar reset no gasto), mas pode introduzir bugs futuros.  
**Ação:** Adicionar `// eslint-disable-next-line react-hooks/exhaustive-deps` com comentário explicando o motivo, ou reestruturar o effect para incluir `editandoGasto` sem causar resets indesejados.

---

### ⚠️ GAP-5 (menor) — Node.js 18 deprecation nos builds

**Problema:** Supabase JS SDK emite warning sobre Node.js 18 sendo depreciado. Não bloqueia build, mas indica necessidade futura de upgrade.  
**Ação:** Verificar a versão do Node.js configurada no Vercel (recomendado: atualizar para Node 20 LTS nas configurações do projeto no Vercel).

---

## 3. Verificações Estruturais

| Verificação | Resultado |
|-------------|-----------|
| Migration `013` existe? | ✅ `db/migrations/013_split_saldo_views.sql` |
| `web/app/api/whatsapp/` existe? | ✅ NÃO existe (pivot correto) |
| `.env.example` tem `NEXT_PUBLIC_VAPID_PUBLIC_KEY`? | ✅ |
| `.env.example` tem `VAPID_PRIVATE_KEY`? | ✅ |
| `.env.example` tem `VAPID_SUBJECT`? | ✅ |
| `.env.example` tem vars `WHATSAPP_*`? | ✅ NÃO tem (limpo) |
| Estrutura usa `(app)/`? | ✅ |
| Existe `(painel)/` (legado)? | ✅ NÃO existe |
| `icon-192.png` em `web/public/`? | ✅ |
| `icon-512.png` em `web/public/`? | ✅ |
| `apple-touch-icon.png` em `web/public/`? | ✅ |
| `manifest.ts` em `web/app/`? | ✅ |
| Edge Function `recurring-cron`? | ✅ `supabase/functions/recurring-cron/index.ts` |
| Edge Function `daily-push`? | ✅ `supabase/functions/daily-push/index.ts` |
| Fórmula centavos parcelas (floor + ajuste última)? | ✅ `v_por_parcela := v_total / v_parcelas` + `v_ultima := v_total - (v_por_parcela * (v_parcelas - 1))` em `003_installments.sql` |

---

## 4. Logs dos Comandos Automáticos

### `tsc --noEmit` (TypeScript)
```
(sem output)
Exit code: 0
```
**Resultado: ✅ Zero erros de tipagem**

---

### `pnpm lint` (ESLint)
```
./components/novo-gasto-modal.tsx
142:6  Warning: React Hook useEffect has a missing dependency: 'editandoGasto'.
       Either include it or remove the dependency array.  react-hooks/exhaustive-deps
```
**Resultado: ✅ Nenhum erro — 1 warning (ver GAP-4)**

---

### `pnpm build` (Next.js production build)
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (17/17)

Route (app)                              Size     First Load JS
┌ ƒ /                                    6.97 kB         108 kB
├ ƒ /acerto                              2.48 kB        98.5 kB
├ ƒ /config                              2.05 kB         158 kB
├ ○ /login                               14.6 kB         162 kB
├ ƒ /metas                               2.88 kB        98.9 kB
├ ƒ /recorrentes                         1.83 kB         103 kB
└ ƒ /resumo                              107 kB          203 kB
+ First Load JS shared by all            87.3 kB

⚠ Node.js 18 deprecation warnings (cosmético — ver GAP-5)
```
**Resultado: ✅ Build limpo, zero erros**

---

### `pnpm test` (Vitest)
```
✓ lib/date.test.ts   (9 tests)   37ms
✓ lib/money.test.ts  (5 tests)   48ms

Test Files  2 passed (2)
Tests       14 passed (14)
Duration    5.76s
```
**Resultado: ✅ 14/14 testes passando**

---

### Lighthouse PWA
```
NÃO EXECUTADO — requer acesso ao deploy de produção via browser.
URL alvo: https://dindin-web-virid.vercel.app
Ação: rodar manualmente no Chrome DevTools → Lighthouse → categoria PWA
Score esperado: ≥ 90
```

---

## 5. Pronto para Fase 2?

### Recomendação: ⚠️ SIM, com ressalvas

**O MVP está funcional e estável.** Build limpo, zero erros de TypeScript, 14 testes passando, todas as features críticas implementadas e verificadas.

**Antes de marcar F1 como 100% fechada:**

| Prioridade | Gap | Esforço estimado |
|-----------|-----|-----------------|
| 🔴 Verificação manual | BUG-04: confirmar push chegando em device real | 15 min |
| 🔴 Verificação manual | F1-03: rodar Lighthouse em prod, confirmar ≥ 90 | 10 min |
| 🟡 Código | F1-05: categoria dominante no header da lista | 30 min |
| 🟢 Cosmético | GAP-4: eslint-disable com comentário em `novo-gasto-modal.tsx:142` | 5 min |
| 🟢 Infra | GAP-5: atualizar Node.js para 20 no Vercel | 5 min |

**Decisão sugerida:** Os gaps 🔴 são verificações manuais de 15 min cada — fechar antes de iniciar F2. O GAP da categoria dominante (🟡) pode ser feito junto com F2-01 se o PM decidir não bloquear. F2-01 pode iniciar em paralelo enquanto as verificações manuais são feitas.
