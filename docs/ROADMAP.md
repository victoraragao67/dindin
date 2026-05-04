# Roadmap — DinDin

## Filosofia de fases

Cada fase tem **um objetivo único e mensurável**. Não passa pra próxima sem completar a anterior. Lean: entregar valor pequeno e contínuo, não big bang.

---

## Fase 0 — Planejamento ✅
**Status:** concluída.

Objetivo: estrutura de projeto, decisões técnicas, alinhamento de papéis.

Entregas:
- [x] README, ARCHITECTURE, DATA_MODEL, BOT_SPEC, ROADMAP, KANBAN
- [x] Stack definida (WhatsApp + Vercel + Supabase)
- [x] Custo estimado: R$ 0/mês

---

## Fase 1 — MVP funcional 🎯
**Objetivo:** Victor e Letícia conseguem registrar 100% dos gastos do mês via WhatsApp e ver o saldo correto.

**Critério de sucesso:** 30 dias de uso real sem voltar para planilha.

### Escopo IN
- Conta Meta WhatsApp Business + número
- Webhook Vercel recebendo mensagens
- Parser de mensagens simples (`120 mercado`, `saldo`, `mês`, `apagar`)
- Banco Supabase com `users`, `categories`, `expenses`, `transfers`
- Cálculo correto de saldo
- Web app mínimo: login + lista de gastos do mês + saldo
- Deploy em produção

### Escopo OUT (fica para Fase 2+)
- Insights automáticos
- Gráficos no painel
- OCR de notas fiscais
- Recorrentes automáticos
- Multi-casal

### Tarefas chave (ver KANBAN para detalhe)
1. Setup Meta WhatsApp Cloud API (Victor)
2. Provisionar Supabase + migrations iniciais (Claude Code)
3. Criar projeto Next.js + deploy Vercel (Claude Code)
4. Webhook + parser V1 (Claude Code)
5. Painel web mínimo (Claude Code)
6. Teste de aceite com Letícia (Letícia + Victor)

**Estimativa:** 2-3 semanas de Claude Code trabalhando + 1 semana de uso piloto.

---

## Fase 2 — Inteligência 🧠
**Objetivo:** O DinDin começa a falar com vocês — não só responde, ele **observa** e sugere.

### Escopo IN
- Comando `/insights` no WhatsApp
- Geração semanal automática de insights (Edge Function Supabase com cron)
- Detecção de anomalias (gasto de categoria X subiu N% vs. média)
- Detecção de desequilíbrio persistente
- Painel web com gráficos (Recharts)
- Exportação CSV do mês

### Critério de sucesso
- Pelo menos 1 insight acionado por mês que mude alguma decisão financeira do casal.

---

## Fase 3 — Fricção zero+ 🚀
**Objetivo:** Tornar o registro ainda mais natural.

### Escopo IN
- OCR de foto de nota fiscal (Google Vision ou Tesseract)
- Transcrição de áudio (Whisper API)
- Parser livre via LLM (Claude Haiku) para mensagens não estruturadas
- Recorrentes automáticos
- Notificação proativa: "Faz 3 dias que vocês não registram nada — alguma compra?"

---

## Fase 4 — Produto 🌱
**Objetivo:** Avaliar se vale abrir para outros casais.

Decisão de continuar é do CEO (Victor). Se sim:
- Multi-tenant (vários casais isolados)
- Onboarding self-service
- Modelo de cobrança (freemium?)
- Política de privacidade, termos, LGPD

---

## Métricas que vamos acompanhar (do dia 1)

| Métrica | Meta MVP | Como medir |
|---|---|---|
| Tempo médio entre gasto e registro | <5 min | Comparar `data` vs. `created_at` |
| Cobertura de gastos | 100% dos gastos do mês registrados | Conferência manual no fim do mês |
| Latência do bot | <2s p95 | Logs do webhook |
| Taxa de erro do parser | <5% | Mensagens que precisaram fallback |
| Saldo ficou certo? | sim | Conferência mensal |

A métrica mais importante: **vocês continuam usando depois da segunda semana?** Se não, a Fase 1 falhou e refazemos antes de seguir.
