# Roadmap — DinDin

> **Pivot 04/mai/2026:** WhatsApp removido do escopo. PWA puro como canal único.

## Filosofia de fases

Cada fase tem **um objetivo único e mensurável**. Não passa pra próxima sem completar a anterior. Lean: entregar valor pequeno e contínuo, não big bang.

---

## Fase 0 — Planejamento ✅

Concluída em 04/mai/2026. Stack final, decisões da Letícia, pivot pra PWA, documentação.

---

## Fase 1 — MVP PWA 🎯

**Objetivo:** Vitim e Gaia conseguem registrar 100% dos gastos do mês via PWA e ver o saldo correto.

**Critério de sucesso:** 30 dias de uso real sem voltar para planilha.

### Escopo IN
- PWA instalável (manifest + service worker + ícone)
- Auth via magic link (Supabase)
- Tela principal: saldo + lista do mês + FAB
- Modal de novo gasto (3 toques + valor)
- Suporte a parcelas (3x, etc) e divisão custom
- Tela de recorrentes + Edge Function que gera lançamentos
- Tela de acerto (PIX)
- Push notification diária às 22h
- Banco Supabase com schema completo (RLS habilitado)
- Deploy em produção no Vercel

### Escopo OUT (Fase 2+)
- Insights automáticos
- Gráficos no painel (mantém só lista + saldo)
- OCR de notas fiscais
- Áudio
- Multi-casal

### Estimativa
2-3 semanas de Claude Code + 1 semana de uso piloto.

---

## Fase 2 — Inteligência 🧠

**Objetivo:** O DinDin começa a observar e sugerir, não só registrar.

### Escopo IN
- Tela de insights (acessível pelo menu)
- Geração semanal automática (Edge Function com cron)
- Detecção de anomalias (gasto de categoria X subiu N% vs. média)
- Detecção de desequilíbrio persistente
- Gráficos no painel (Recharts): gasto por categoria + tendência
- Exportação CSV do mês
- Push semanal de insights ("Vocês gastaram 18% a mais com restaurante este mês")

### Critério de sucesso
Pelo menos 1 insight acionado por mês que mude alguma decisão financeira do casal.

---

## Fase 3 — Aceleradores de input 🚀

**Objetivo:** Tornar o registro ainda mais natural.

### Escopo IN
- **Atalho iOS** (Apple Shortcut) e **Widget Android** que abrem direto no modal
- **OCR de foto de nota fiscal** (Google Vision API; ~R$0 nos primeiros 1.000/mês)
- **Áudio** com Whisper API ("paguei 80 no mercado" → registra)
- **Templates rápidos** (gastos frequentes vira atalho)
- **Auto-sugestão de categoria** baseada em descrição
- Notificação proativa: "Faz 3 dias que vocês não registram nada — tudo certo?"

---

## Fase 4 — Produto 🌱

**Objetivo:** Avaliar se vale abrir para outros casais.

Decisão de continuar é do CEO (Vitim). Se sim:
- Multi-tenant (vários casais isolados — RLS já preparado desde Fase 1)
- Onboarding self-service
- Modelo de cobrança (freemium?)
- Política de privacidade, termos, LGPD
- Landing page de marketing

---

## Métricas que vamos acompanhar (do dia 1)

| Métrica | Meta MVP | Como medir |
|---|---|---|
| Tempo médio entre gasto e registro | <5 min | Comparar `data_compra` vs. `created_at` |
| Cobertura de gastos | 100% dos gastos do mês registrados | Conferência manual no fim do mês |
| Latência do salvar | <300ms p95 | Vercel Analytics |
| Adoção do push | ambos com subscription ativa | Tabela `push_subscriptions` |
| Saldo ficou certo? | sim | Conferência mensal |

A métrica mais importante: **vocês continuam usando depois da segunda semana?** Se não, a Fase 1 falhou e refazemos antes de seguir.
