// Fallback hardcoded de todos os templates de mensagem.
// Usado quando a leitura do banco falha ou a chave está vazia/inativa.
// Notificações nunca quebram por causa do editor de templates.
export const DEFAULTS: Record<string, string[]> = {
  boas_vindas: [
    'Oi! O DinDin tá aqui 💚 Bora registrar os gastos juntos?',
    'Notificações ativas! Agora você não vai mais esquecer de lançar. A gente lembra 😉',
    '💚 Pronto! A partir de agora o DinDin avisa quando precisar. Bora lá?',
  ],

  'falta_uso.7d': [
    '7 dias sem registrar nada 👀 Sua conta vai estourar e depois não vem dizer que não avisei, hein 😏',
    'Tá namorando o esquecimento? Uma semana sem lançar. Bora antes que vire bagunça 🙃',
    'O DinDin sumiu do radar ou foi você? Bora retomar antes de perder o fio 🧵',
  ],
  'falta_uso.14d': [
    '2 semanas sem registrar… tudo bem? Um lançamento rápido já ajuda a manter o controle 🙏',
    'Quinze dias sem abrir o app. O dinheiro não para, mas a gente pode parar de perder o rastro 📊',
    'Ei, sumiço de 2 semanas. Não precisa registrar tudo — começa pelo de hoje 💪',
  ],
  'falta_uso.21d': [
    'Três semanas por aí… que tal uma reconstrução rápida? O DinDin não julga, só ajuda 💚',
    'Olha, 21 dias. Que tal começar de novo hoje? Esquece o passado, registra o presente 🌱',
    'Último empurrão: bora retomar de onde parou? Três toques e o gasto entra 🚀',
  ],

  'diario.neutro': [
    'Psiu… cadê os gastos de hoje? 👀',
    'Dia sem gastos ou alguém esqueceu de anotar? 😏',
    'Bora lançar os perrengues de hoje antes de dormir?',
    'O DinDin tá de olho 👀 Registrou os gastos de hoje?',
    'Tudo quieto por aqui… foi day off da carteira ou esquecimento?',
  ],
  'diario.recomeco': [
    'Semana nova! Bora começar registrando certinho? 💪',
    'Segunda-feira, cabeça nova. Mantém o DinDin atualizado essa semana?',
    'Novo começo de semana. Que tal começar com os lançamentos em dia?',
  ],
  'diario.fim_de_semana': [
    'Sextou! Os rolês de hoje já entraram no DinDin? 👀',
    'Sábado é fácil o dinheiro sumir sem ninguém ver. Registrou?',
    'Final de semana chegou — e os gastos também. Não esquece de anotar 😉',
  ],
  'diario.balanco': [
    'Domingo de fechar a conta: a semana toda entrou no app?',
    'Último dia da semana — confere lá se está tudo registrado antes de dormir.',
  ],
  'diario.fechamento': [
    'Reta final do mês! Bora fechar tudo registrado pra não ter surpresa? 🏁',
    'Últimos dias do mês — bora não deixar nada pra trás antes do acerto?',
    'Faltam poucos dias pro fechamento. Tem gasto esquecido aí?',
  ],

  'risco.vai_estourar': [
    '{emoji} Eita, {cat} tá voando 😅 No ritmo fecha em {projecao}, uns {diff} acima da meta. Bora maneirar?',
    '{emoji} Psiu… {cat} acelerou. Projeção do mês: {projecao} ({diff} acima). Segura essa? 👀',
    '{emoji} {cat} tá empolgada esse mês, hein. Do jeito que vai, {projecao} — {diff} além da meta.',
  ],
  'risco.estourou': [
    '{emoji} Ó… {cat} passou da meta de {meta} (já em {gasto}). Faltam {dias} dias — bora compensar no resto? 😬',
    '{emoji} {cat} estourou a meta, mas relaxa: ainda dá pra equilibrar o mês. Tá em {gasto} de {meta}.',
    '{emoji} A meta de {cat} foi de base 🙈 {gasto} de {meta}. Resto do mês a gente segura?',
  ],

  'ritmo.tom_llm': [
    'Escreva em português do Brasil com tom LEVE e DESCONTRAÍDO — como um parceiro que cobra brincando, cutuca de leve com humor, sem peso, sem culpa, sem sermão. Nunca soe como cobrança séria ou julgamento. Pode usar uma piadinha curta e, no máximo, 1 emoji. Foque na 1 ou 2 categorias mais críticas. Pode cruzar categorias se fizer sentido. Se nenhuma categoria estiver crítica, manda um elogio leve e curto.',
  ],
  'ritmo.hint_calibracao': ['Ainda calibrando o ritmo do mês. Continue registrando!'],
  'ritmo.hint_aprendizado': ['Sem dados suficientes para projeção este mês.'],
}
