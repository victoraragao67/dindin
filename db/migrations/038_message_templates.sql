-- ============================================================
-- 038_message_templates.sql
-- Tabela de templates de mensagens editável pelo /admin.
-- Toda a copy de notificações e tom sai do código para cá.
-- ============================================================

CREATE TABLE public.message_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chave       text        NOT NULL UNIQUE,
  grupo       text        NOT NULL,
  descricao   text,
  variacoes   text[]      NOT NULL DEFAULT '{}',
  ativo       boolean     NOT NULL DEFAULT true,
  updated_by  uuid        REFERENCES public.users(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado (e service role no cron)
CREATE POLICY mt_select ON public.message_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Escrita: service role apenas (Server Actions usam admin client com service_role)
-- Não criamos policy de escrita para authenticated — o admin client bypassa RLS.

-- ── Seed com a copy atual ──────────────────────────────────────

INSERT INTO public.message_templates (chave, grupo, descricao, variacoes) VALUES

-- Boas-vindas
('boas_vindas', 'boas_vindas',
 '1ª push enviada ao ativar notificações.',
 ARRAY[
   'Oi! O DinDin tá aqui 💚 Bora registrar os gastos juntos?',
   'Notificações ativas! Agora você não vai mais esquecer de lançar. A gente lembra 😉',
   '💚 Pronto! A partir de agora o DinDin avisa quando precisar. Bora lá?'
 ]),

-- Falta de utilização (3 níveis)
('falta_uso.7d', 'falta_utilizacao',
 '7+ dias sem registrar — primeiro lembrete, tom atrevido.',
 ARRAY[
   '7 dias sem registrar nada 👀 Sua conta vai estourar e depois não vem dizer que não avisei, hein 😏',
   'Tá namorando o esquecimento? Uma semana sem lançar. Bora antes que vire bagunça 🙃',
   'O DinDin sumiu do radar ou foi você? Bora retomar antes de perder o fio 🧵'
 ]),
('falta_uso.14d', 'falta_utilizacao',
 '14+ dias sem registrar — tom mais sério, mas ainda leve.',
 ARRAY[
   '2 semanas sem registrar… tudo bem? Um lançamento rápido já ajuda a manter o controle 🙏',
   'Quinze dias sem abrir o app. O dinheiro não para, mas a gente pode parar de perder o rastro 📊',
   'Ei, sumiço de 2 semanas. Não precisa registrar tudo — começa pelo de hoje 💪'
 ]),
('falta_uso.21d', 'falta_utilizacao',
 '21+ dias sem registrar — último empurrão antes de parar de incomodar.',
 ARRAY[
   'Três semanas por aí… que tal uma reconstrução rápida? O DinDin não julga, só ajuda 💚',
   'Olha, 21 dias. Que tal começar de novo hoje? Esquece o passado, registra o presente 🌱',
   'Último empurrão: bora retomar de onde parou? Três toques e o gasto entra 🚀'
 ]),

-- Alertas diários
('diario.neutro', 'alertas_diarios',
 'Lembrete padrão — terça a quinta.',
 ARRAY[
   'Psiu… cadê os gastos de hoje? 👀',
   'Dia sem gastos ou alguém esqueceu de anotar? 😏',
   'Bora lançar os perrengues de hoje antes de dormir?',
   'O DinDin tá de olho 👀 Registrou os gastos de hoje?',
   'Tudo quieto por aqui… foi day off da carteira ou esquecimento?'
 ]),
('diario.recomeco', 'alertas_diarios',
 'Segunda-feira — recomeço de semana.',
 ARRAY[
   'Semana nova! Bora começar registrando certinho? 💪',
   'Segunda-feira, cabeça nova. Mantém o DinDin atualizado essa semana?',
   'Novo começo de semana. Que tal começar com os lançamentos em dia?'
 ]),
('diario.fim_de_semana', 'alertas_diarios',
 'Sexta e sábado — clima de final de semana.',
 ARRAY[
   'Sextou! Os rolês de hoje já entraram no DinDin? 👀',
   'Sábado é fácil o dinheiro sumir sem ninguém ver. Registrou?',
   'Final de semana chegou — e os gastos também. Não esquece de anotar 😉'
 ]),
('diario.balanco', 'alertas_diarios',
 'Domingo — balanço da semana.',
 ARRAY[
   'Domingo de fechar a conta: a semana toda entrou no app?',
   'Último dia da semana — confere lá se está tudo registrado antes de dormir.'
 ]),
('diario.fechamento', 'alertas_diarios',
 'Últimos 3 dias do mês.',
 ARRAY[
   'Reta final do mês! Bora fechar tudo registrado pra não ter surpresa? 🏁',
   'Últimos dias do mês — bora não deixar nada pra trás antes do acerto?',
   'Faltam poucos dias pro fechamento. Tem gasto esquecido aí?'
 ]),

-- Risco de metas
('risco.vai_estourar', 'risco_metas',
 'Alerta: projeção supera a meta. Placeholders: {emoji} {cat} {projecao} {diff} {meta}',
 ARRAY[
   '{emoji} Eita, {cat} tá voando 😅 No ritmo fecha em {projecao}, uns {diff} acima da meta. Bora maneirar?',
   '{emoji} Psiu… {cat} acelerou. Projeção do mês: {projecao} ({diff} acima). Segura essa? 👀',
   '{emoji} {cat} tá empolgada esse mês, hein. Do jeito que vai, {projecao} — {diff} além da meta.'
 ]),
('risco.estourou', 'risco_metas',
 'Alerta: meta já ultrapassada. Placeholders: {emoji} {cat} {meta} {gasto} {dias}',
 ARRAY[
   '{emoji} Ó… {cat} passou da meta de {meta} (já em {gasto}). Faltam {dias} dias — bora compensar no resto? 😬',
   '{emoji} {cat} estourou a meta, mas relaxa: ainda dá pra equilibrar o mês. Tá em {gasto} de {meta}.',
   '{emoji} A meta de {cat} foi de base 🙈 {gasto} de {meta}. Resto do mês a gente segura?'
 ]),

-- Ritmo do Mês (texto na tela, não push)
('ritmo.tom_llm', 'ritmo_tela',
 'Instrução de tom injetada no prompt do Gemini. 1 variação = 1 parágrafo de tom.',
 ARRAY[
   'Escreva em português do Brasil com tom LEVE e DESCONTRAÍDO — como um parceiro que cobra brincando, cutuca de leve com humor, sem peso, sem culpa, sem sermão. Nunca soe como cobrança séria ou julgamento. Pode usar uma piadinha curta e, no máximo, 1 emoji. Foque na 1 ou 2 categorias mais críticas. Pode cruzar categorias se fizer sentido. Se nenhuma categoria estiver crítica, manda um elogio leve e curto.'
 ]),
('ritmo.hint_calibracao', 'ritmo_tela',
 'Texto exibido no resumo quando ainda não há histórico suficiente (1º mês).',
 ARRAY[
   'Ainda calibrando o ritmo do mês. Continue registrando!'
 ]),
('ritmo.hint_aprendizado', 'ritmo_tela',
 'Texto exibido quando não há dados suficientes para projeção.',
 ARRAY[
   'Sem dados suficientes para projeção este mês.'
 ]);
