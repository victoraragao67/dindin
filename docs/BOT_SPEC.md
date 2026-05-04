# WhatsApp Bot — Especificação

## Filosofia

**O bot é o produto.** Toda mensagem do casal deve resultar em uma resposta clara, curta e útil em <2s. Se o bot exige mais que 1 mensagem para registrar um gasto comum, ele falhou.

## Apelidos

- **Vitim** → Victor (aliases: `vic`, `victor`, `vitim`)
- **Gaia** → Letícia (aliases: `let`, `leti`, `letícia`, `leticia`, `gaia`)

O bot **sempre** responde usando os apelidos. Nunca "Victor" ou "Letícia" formais.

## Comandos suportados (V1)

### Registrar gasto
Sintaxe livre, parser tolerante. **A ordem dos elementos não importa** — o parser identifica cada um pelo formato.

#### Gasto simples (à vista)
```
120 mercado
mercado 120
R$ 120 mercado
120,50 mercado
80 ifood vitim         ← Vitim pagou (override do remetente)
80 ifood gaia          ← Gaia pagou
200 viagem 70/30       ← split 70% pagador, 30% outro
50 presente da mãe só  ← 100% pagador (gasto pessoal)
120 mercado ontem      ← data_compra = ontem
```

**Resposta padrão:**
```
✅ R$ 120,00 — 🛒 Mercado
👤 Pago por Vitim
⚖️ 50/50 → Gaia te deve R$ 60,00
📊 Saldo atual: Gaia te deve R$ 280,00
```

#### Gasto parcelado
Decisão da Letícia: registrar valor cheio + número de parcelas. O bot gera as N parcelas no banco, mas só conta na "saldo do mês" as parcelas com competência ≤ hoje.

Sintaxes aceitas:
```
mercado 280 em 3 parcelas
mercado 280 em 3x
mercado 280 3x
280 mercado parcelado em 3
```

**Resposta:**
```
✅ R$ 280,00 — 🛒 Mercado
🔁 3 parcelas de R$ 93,33 (1ª em mai/26, última em jul/26)
👤 Pago por Vitim
⚖️ 50/50 → Gaia te deve R$ 46,67 este mês
📊 Saldo atual: Gaia te deve R$ 326,67
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
Vitim deve R$ 280,00 à Gaia
(referente a 12 lançamentos não acertados)
```

Se zerado:
```
💰 Saldo atual
Vocês estão quites! 🎉
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
Total gasto: R$ 4.320,00
🛒 Mercado: R$ 1.200 (28%)
🍽️ Restaurante: R$ 890 (21%)
🏠 Fixo: R$ 1.500 (35%)
🎉 Lazer: R$ 730 (16%)

💡 Insight: gasto com restaurante +18% vs. abril
```

### Registrar acerto (PIX entre o casal)
```
pix 280 gaia          ← Vitim pagou R$ 280 à Gaia
acerto 500 vitim      ← Gaia pagou R$ 500 ao Vitim
```

### Cadastrar recorrente
Decisão da Letícia: gastos recorrentes ficam como template, geram lançamento automático todo mês.

```
recorrente aluguel 1500 fixo dia 5
recorrente netflix 39,90 fixo dia 10 só
recorrente plano saúde 850 saúde dia 8
```

**Resposta:**
```
🔁 Recorrente cadastrado
🏠 Aluguel — R$ 1.500,00
📅 Todo dia 5 — próximo lançamento: 05/jun/26
⚖️ 50/50
```

### Listar recorrentes
```
recorrentes
templates
```

### Pausar / remover recorrente
```
pausar aluguel
remover netflix
```

### Desfazer último registro
```
apagar
desfazer
errei
```

**Resposta:**
```
🗑️ Apagado: R$ 120 — 🛒 Mercado (registrado às 14:32)
Saldo restaurado: Gaia te deve R$ 160,00
```

### Ajuda
```
ajuda
help
?
```

## Parser — regras (ordem de extração)

1. **Comando especial** — palavras-chave: `saldo`, `mês`, `mes`, `resumo`, `apagar`, `desfazer`, `errei`, `ajuda`, `help`, `recorrente`, `recorrentes`, `templates`, `pausar`, `remover`, `pix`, `acerto`. Se bater, rota para handler específico.
2. **Valor** — primeira ocorrência de número (com `,` ou `.` decimal opcional, com ou sem `R$`)
3. **Parcelas** — padrões: `Nx`, `em N parcelas`, `em N`, `parcelado em N`. Se ausente, parcelas = 1.
4. **Pagador** — apelido (`vitim`/`vic`/`victor` ou `gaia`/`let`/`leti`/`letícia`); se ausente, infere pelo número que enviou
5. **Divisão** — padrão `XX/YY` (XX + YY = 100); palavra `só`/`solo` → 100% pagador
6. **Data** — `hoje`, `ontem`, `anteontem`, `dd/mm`, `dd/mm/aaaa`; default = hoje
7. **Categoria** — match contra `categories.nome` ou `categories.aliases` (case-insensitive, com remoção de acentos). Se não bater, bot pergunta:

```
🤔 Não entendi a categoria de "120 supermarket".
Quis dizer: 1) 🛒 Mercado  2) 🍽️ Restaurante  3) 📦 Outros
Responde com o número.
```

## Casos de erro

| Situação | Resposta |
|---|---|
| Número não cadastrado | `🚫 Número não autorizado.` |
| Sem valor identificável | `🤔 Não achei o valor. Tenta: "120 mercado"` |
| Valor absurdo (>R$50k) | `⚠️ R$ 50.000 em "Mercado"? Confirma com "sim" ou cancela com "não".` |
| Categoria ambígua | Pergunta com opções numeradas |
| Parcelas > 24 | `⚠️ 36 parcelas é bastante. Confirma com "sim".` |
| Erro interno | `😵 Deu ruim aqui. Vitim já foi notificado.` (+ alerta no log) |

## Princípios de UX do bot

1. **Confirma sempre** o que registrou (valor + categoria + divisão + saldo) — vocês precisam ver que entrou certo
2. **Use os apelidos**, sempre (Vitim/Gaia, nunca Victor/Letícia)
3. **Use emojis** para escaneabilidade rápida — mas só 1-2 por linha
4. **Saldo aparece em toda confirmação** — é a informação mais usada
5. **Erros são gentis** — nunca culpa o usuário, sempre sugere o formato certo
6. **Latência <2s** — se demorar mais, manda primeiro `⏳ processando...` e depois a confirmação

## Comandos planejados (V2)

- `/foto` — envia foto da nota fiscal, OCR extrai valor e categoriza
- `/áudio` — manda áudio "comprei 80 reais no mercado", Whisper transcreve, parser processa
- `/relatório` — gera PDF do mês e envia
- `/meta` — alerta quando categoria passar do limite mensal
- Parser por LLM (Haiku) como fallback quando regex não bate
