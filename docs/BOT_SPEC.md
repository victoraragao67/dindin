# WhatsApp Bot — Especificação

## Filosofia

**O bot é o produto.** Toda mensagem do casal deve resultar em uma resposta clara, curta e útil em <2s. Se o bot exige mais que 1 mensagem para registrar um gasto comum, ele falhou.

## Comandos suportados (V1)

### Registrar gasto
Sintaxe livre, parser tolerante:

```
120 mercado
mercado 120
R$ 120 mercado
120,50 mercado
120 mercado vic        ← Victor pagou (override do remetente padrão? não — apenas explicita)
80 ifood let           ← Letícia pagou
200 viagem 70/30       ← split 70% pagador, 30% outro
50 presente da mãe só  ← 100% pagador (gasto pessoal)
120 mercado ontem      ← data = ontem
```

**Resposta padrão:**
```
✅ R$ 120,00 — Mercado
👤 Pago por Victor
⚖️ 50/50 → você deve R$ 60 à Letícia
📊 Saldo atual: você deve R$ 280 à Letícia
```

### Consultar saldo
```
saldo
quanto eu devo
quem deve
```

**Resposta:**
```
💰 Saldo atual
Victor deve R$ 280,00 à Letícia
(referente a 12 gastos não acertados)
```

### Resumo do mês
```
mês
mes
resumo
```

**Resposta:**
```
📊 Maio/2026
Total gasto: R$ 4.320
🛒 Mercado: R$ 1.200 (28%)
🍽️ Restaurante: R$ 890 (21%)
🏠 Fixo: R$ 1.500 (35%)
✈️ Lazer: R$ 730 (16%)

💡 Insight: gasto com restaurante +18% vs. abril
```

### Registrar acerto (PIX entre o casal)
```
pix 280 let          ← Victor pagou R$ 280 à Letícia
acerto 500 vic       ← Letícia pagou R$ 500 ao Victor
```

### Desfazer último registro
```
apagar
desfazer
errei
```

**Resposta:**
```
🗑️ Apagado: R$ 120 — Mercado (registrado às 14:32)
Saldo restaurado: você deve R$ 160 à Letícia
```

### Ajuda
```
ajuda
help
?
```

## Parser — regras

Ordem de extração:

1. **Valor** — primeira ocorrência de número (com `,` ou `.` decimal opcional, com ou sem `R$`)
2. **Pagador** — palavra `vic`/`victor` ou `let`/`letícia` no fim; senão, infere pelo número que enviou
3. **Divisão** — padrão `XX/YY` (XX + YY = 100); palavra `só` / `solo` → 100% pagador
4. **Data** — palavras-chave: `hoje`, `ontem`, `anteontem`, `dd/mm`, `dd/mm/aaaa`; default = hoje
5. **Categoria** — match contra `categories.nome` ou `categories.aliases`. Se não bater, bot pergunta:

```
🤔 Não entendi a categoria de "120 supermarket".
Quis dizer: 1) Mercado  2) Restaurante  3) Outros
Responde com o número.
```

## Casos de erro

| Situação | Resposta |
|---|---|
| Número não cadastrado | `🚫 Número não autorizado. Fale com o Victor.` |
| Sem valor identificável | `🤔 Não achei o valor. Tenta: "120 mercado"` |
| Valor absurdo (>R$50k) | `⚠️ R$ 50.000 em "Mercado"? Confirma com "sim" ou cancela com "não".` |
| Categoria ambígua | Pergunta com opções numeradas |
| Erro interno | `😵 Deu ruim aqui. O Victor já foi notificado.` (+ alerta no log) |

## Princípios de UX do bot

1. **Confirma sempre** o que registrou (valor + categoria + divisão + saldo) — vocês precisam ver que entrou certo
2. **Use emojis** para escaneabilidade rápida — mas só 1 ou 2 por linha
3. **Saldo aparece em toda confirmação** — é a informação mais usada
4. **Erros são gentis** — nunca culpa o usuário, sempre sugere o formato certo
5. **Latência <2s** — se o webhook demorar mais, manda primeiro um "⏳ processando..." e depois a confirmação

## Comandos planejados (V2)

- `/foto` — envia foto da nota fiscal, OCR extrai valor e categoriza
- `/áudio` — manda áudio "comprei 80 reais no mercado", Whisper transcreve, parser processa
- `/recorrente` — cadastra gasto recorrente ("aluguel 1500 todo dia 5")
- `/relatório` — gera PDF do mês e envia
- `/meta` — alerta quando categoria passar do limite mensal
