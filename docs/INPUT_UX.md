# UX do Input — DinDin PWA

> Substitui `BOT_SPEC.md`. Define o fluxo de entrada de gastos no PWA.

## Filosofia

**O input é o produto.** Toda decisão de UX é avaliada por uma pergunta: "isso aumenta ou diminui a probabilidade da Gaia abrir o app pra registrar?"

Meta dura: **3 toques + digitar valor** para registrar um gasto comum, contados desde o ícone na tela inicial.

## Tela principal (home do PWA)

```
┌────────────────────────────────────────┐
│  💰 Gaia te deve R$ 280,00      [⚙️]  │  ← saldo sempre no topo
├────────────────────────────────────────┤
│                                        │
│  Maio/2026 · R$ 4.320,00 gasto         │
│  ──────────────────────────────────    │
│                                        │
│  hoje                                  │
│  🛒 Mercado          R$ 120,00  Vitim │
│  🍽️ Restaurante       R$ 89,00  Gaia  │
│                                        │
│  ontem                                 │
│  🚗 Uber              R$ 32,00  Vitim │
│  🛒 Mercado · 1/3     R$ 93,33  Vitim │  ← parcelado: mostra "1/3"
│                                        │
│  ...                                   │
│                                        │
│                              ┌──────┐  │
│                              │  +   │  │  ← FAB grande, canto inferior
│                              └──────┘  │
└────────────────────────────────────────┘
```

Elementos:
- **Saldo no topo**: nunca esconde, sempre visível. Toque abre detalhe (lista de pendências).
- **Total do mês + categoria dominante**: contexto rápido sem precisar abrir relatório.
- **Lista agrupada por dia** (hoje, ontem, dd/mm).
- **FAB "+"**: canto inferior direito, 56px, sombra acentuada — alvo gigante pro polegar.
- **⚙️**: configurações (recorrentes, push, perfis, sair).

## Modal de novo gasto

Abre full-screen ao tocar no FAB. Slide up animation <100ms.

```
┌────────────────────────────────────────┐
│  ✕                          Novo gasto │
├────────────────────────────────────────┤
│                                        │
│      ┌──────────────────────────┐     │
│      │  R$  [   _   ]           │     │  ← teclado numérico já aberto
│      └──────────────────────────┘     │     foco automático
│                                        │
│  Categoria                             │
│  ┌────┬────┬────┬────┬────┐           │
│  │ 🛒 │ 🍽️ │ 🏠 │ 🎉 │ ⚕️ │           │  ← chips visuais
│  └────┴────┴────┴────┴────┘           │
│  ┌────┬────┬────┬────┐                │
│  │ 🚗 │ ✈️ │ 🎁 │ 📦 │                │
│  └────┴────┴────┴────┘                │
│                                        │
│  Pago por:    [Vitim] [Gaia]           │  ← toggle, default = logged in
│                                        │
│  ▾ Avançado                            │  ← colapsado por padrão
│                                        │
│              ┌──────────────┐          │
│              │   Salvar     │          │  ← desabilitado até preencher
│              └──────────────┘          │
└────────────────────────────────────────┘
```

### Campos avançados (expandir)
- **Parcelas** — input numérico (default 1). Se >1, mostra preview "3x de R$ 93,33".
- **Divisão** — radio: 50/50 (default) · só pagador · custom (slider 0-100%)
- **Data** — picker (default hoje). Atalhos rápidos: hoje · ontem · anteontem.
- **Descrição** — textarea opcional (livre).

### Validações (Zod)
- Valor: > 0 e < R$ 50.000 (alerta de confirmação se ≥ R$ 5.000)
- Categoria: obrigatório (uma das 9)
- Pagador: obrigatório
- Parcelas: 1-24 (alerta de confirmação se >12)

### Confirmação
Ao tocar "Salvar":
1. Modal fecha
2. Toast no topo: `✅ R$ 120,00 — 🛒 Mercado · 50/50`
3. Lista atualiza com fade-in da nova linha
4. Saldo atualiza (animação numérica curta)

Tempo total alvo: 300ms entre toque e UI atualizada.

## Tela de recorrentes

Acesso via ⚙️ → Recorrentes.

```
┌────────────────────────────────────────┐
│  ←                       Recorrentes   │
├────────────────────────────────────────┤
│  🏠 Aluguel       R$ 1.500   dia 5     │
│  🏠 Netflix       R$ 39,90   dia 10    │
│  ⚕️ Plano saúde   R$ 850     dia 8     │
│                                        │
│                              ┌──────┐  │
│                              │  +   │  │
│                              └──────┘  │
└────────────────────────────────────────┘
```

Cada linha:
- Toque rápido: ver detalhe + opções (pausar, editar, remover)
- Indicador visual se está pausado

Modal de novo recorrente é o mesmo do gasto, com 1 campo extra (`dia do mês`).

## Tela de acerto (PIX)

Acesso via ⚙️ → Acerto.

```
┌────────────────────────────────────────┐
│  ←                            Acerto   │
├────────────────────────────────────────┤
│                                        │
│  De:    [Vitim]  →  Para: [Gaia]       │
│                                        │
│  Valor: R$ [   _   ]                   │
│                                        │
│  Data: [hoje]                          │
│                                        │
│  Nota: ________________                │
│                                        │
│              ┌──────────────┐          │
│              │   Salvar     │          │
│              └──────────────┘          │
└────────────────────────────────────────┘
```

## Push notifications

### Permissão
Ao primeiro login no PWA instalado:
1. Banner amigável: "Quer ser lembrado de registrar os gastos? Vamos te avisar 1x por dia, às 22h."
2. Toque em "Sim" → solicita permissão nativa do navegador
3. Salva subscription em `push_subscriptions`

Banner aparece no máximo 2x. Se a Gaia recusar 2x, não pergunta mais (acessível via ⚙️).

### Disparo diário
Edge Function do Supabase com `pg_cron` roda às **22:00 BRT**:
- Para cada usuário com subscription ativa
- Verifica se já registrou algo hoje
- Se SIM: pula
- Se NÃO: envia push

### Conteúdo do push
```
DinDin
Nenhum gasto registrado hoje. Tudo certo?
[Toque pra abrir]
```

Toque na notificação abre o PWA já no modal de novo gasto.

## Onboarding (primeiro acesso)

Tela única, 4 passos rápidos:

1. Bem-vindo — nome do casal, foto opcional
2. **Instalar como app** — instruções claras pra adicionar à tela inicial (iOS e Android variam)
3. **Permitir notificações** — explicando que é 1x por dia, às 22h
4. Pronto — cai na tela principal já com saldo zerado

## Acessibilidade (mínimos)

- Contraste WCAG AA em todos os textos
- Áreas de toque ≥ 44x44px
- Suporte a Dynamic Type (iOS) e Font Scaling (Android)
- Modo escuro automático (`prefers-color-scheme`)
- Labels claros em todos os inputs

## Casos de erro

| Situação | Resposta |
|---|---|
| Sem internet | Banner amarelo "Modo offline — gasto será sincronizado". Salva em IndexedDB local; sincroniza quando voltar. |
| Erro de validação | Borda vermelha no campo + mensagem inline ("Valor obrigatório") |
| Erro do servidor | Toast vermelho: "Não consegui salvar. Tente de novo em alguns segundos." |
| Sessão expirada | Redireciona pra login com toast: "Sua sessão expirou, faça login de novo." |

## Princípios de UX (não negociáveis)

1. **Saldo sempre visível** na tela principal — informação mais usada
2. **Categoria sempre selecionada** antes de salvar — sem campo livre
3. **Apelidos** (Vitim/Gaia) em toda a UI — nunca "Victor/Letícia"
4. **Foco automático** no campo de valor ao abrir o modal
5. **Modal full-screen** no celular (no desktop pode ser dialog menor)
6. **Tempo de salvar <300ms p95** — sempre que falhar isso, é bug

## Aceleradores planejados (Fase 2/3)

- **Atalho iOS / Widget Android** — abre direto no modal de novo gasto
- **Foto de nota fiscal** com OCR (Google Vision)
- **Áudio** com Whisper API ("paguei 80 reais no mercado")
- **Templates rápidos** ("Café da manhã" → 15 reais Mercado)
- **Auto-sugestão** de categoria baseado em descrição passada
