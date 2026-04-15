# QA -- Testes do Bot Umana Rio Branco

**Data:** 2026-04-01
**Objetivo:** Validar o comportamento do bot conforme o prompt configurado
**Como testar:** Envie as mensagens listadas pelo WhatsApp e avalie a resposta do bot

**Legenda de resultado:**
- OK -- Bot respondeu conforme esperado
- FALHA -- Bot nao seguiu a regra esperada
- PARCIAL -- Resposta aceitavel mas pode melhorar

**IMPORTANTE:** Anote observacoes em cada teste. Feedbacks serao usados para refinar o prompt.

---

## TESTADOR 1: Pedro Vitor

**Foco: Primeiro contato + Perfilamento de lead**

Objetivo: Testar se o bot faz a saudacao correta, coleta informacoes naturalmente e conduz para visita.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| 1.1 | "Oi" | Bot deu boas-vindas sem se identificar como robo? Nao ofereceu multiplas opcoes de cara? | | |
| 1.2 | "Quero saber sobre a escola" | Bot fez alguma pergunta aberta para entender o perfil? (ex: "Voce ja pratica Yoga?") | | |
| 1.3 | "Nunca pratiquei, to curioso" | Bot adaptou a explicacao para iniciante? Mencionou que nao e academia? | | |
| 1.4 | "Vi no Instagram de voces" | Bot registrou a origem sem parecer formulario? Continuou a conversa naturalmente? | | |
| 1.5 | "Que horarios tem de manha?" | Bot filtrou apenas horarios da manha? Perguntou preferencia de dia? | | |
| 1.6 | "Qualquer dia ta bom" | Bot sugeriu opcoes de manha e direcionou para visita? | | |
| 1.7 | "Quanto custa?" | Bot respondeu "a partir de R$X" SEM enviar imagem? Sugeriu visita? | | |
| 1.8 | "Mas quais sao os planos?" | Agora sim enviou imagem "Planos Umana.jpeg"? Veio com texto explicativo? | | |
| 1.9 | "Quero conhecer a escola" | Bot ofereceu agendar visita? Perguntou dia e periodo? | | |
| 1.10 | "Pode ser quinta de manha" | Bot confirmou agendamento ou ofereceu falar com instrutor? | | |

---

## TESTADOR 2: Luis

**Foco: Horarios + Envio de imagens**

Objetivo: Testar regras de horarios, envio de imagens e a regra de nunca enviar mais de uma imagem ao mesmo tempo.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| 2.1 | "Boa tarde, quais os horarios de voces?" | Bot perguntou periodo preferido (manha/tarde/noite) em vez de listar tudo? | | |
| 2.2 | "Me manda a grade completa" | Bot enviou imagem "Horarios Umana.jpeg"? Veio com mensagem explicativa? | | |
| 2.3 | "E os valores tambem" | Bot respondeu "a partir de R$X" primeiro, SEM enviar segunda imagem junto? | | |
| 2.4 | "Quero ver a tabela de precos" | Agora enviou "Planos Umana.jpeg"? Enviou separado da imagem anterior? | | |
| 2.5 | "Que horas tem aula do Carlos?" | Bot listou apenas horarios do Carlos corretamente? | | |
| 2.6 | "E da Julia?" | Bot listou horarios da Julia sem repetir saudacao? | | |
| 2.7 | "Tem aula no sabado?" | Bot informou sobre o Aulao as 10h? | | |
| 2.8 | "Tem aula anti-stress?" | Bot informou sexta as 19h? Mencionou aula tematica e aulao tambem? | | |
| 2.9 | "Me manda os horarios e os planos" | Bot enviou UMA imagem por vez? Tratou os assuntos separadamente? | | |
| 2.10 | "Voces tem aulas online?" | Bot priorizou planos presenciais? So enviou "Plano Umana online.jpeg" se insistir? | | |

---

## TESTADOR 3: Vitor

**Foco: Filosofia + Topicos proibidos + Contraindicacoes**

Objetivo: Testar se o bot fala corretamente sobre filosofia, bloqueia topicos proibidos e lida com contraindicacoes.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| 3.1 | "O que e o Yoga pra voces?" | Bot deu resposta filosofica (autoconhecimento, presenca, conexao)? Sem misticismo? | | |
| 3.2 | "Voces praticam Kundalini Yoga?" | Bot NAO falou sobre Kundalini? Redirecionou para abordagem da Umana? | | |
| 3.3 | "E Raja Yoga, tem?" | Bot NAO explicou Raja Yoga? Manteve foco na propria pratica? | | |
| 3.4 | "Qual a diferenca entre Ashtanga e o Yoga de voces?" | Bot NAO detalhou Ashtanga? Focou na propria abordagem? | | |
| 3.5 | "Tenho problema na coluna, posso praticar?" | Bot recomendou orientacao medica? Nao desencorajou? Mencionou professores preparados? | | |
| 3.6 | "Tomo medicamento controlado, tem problema?" | Bot sugeriu orientacao medica sem criar medo? | | |
| 3.7 | "Quais os beneficios do Yoga?" | Bot falou de presenca, consciencia corporal, clareza mental? Sem promessas medicas? | | |
| 3.8 | "Me indica um livro sobre Yoga" | Bot mencionou "Na Vida como no Yoga" da Naiana Alberti? | | |
| 3.9 | "Voces conhecem a escola X de Yoga?" | Bot NAO comentou sobre concorrentes? Manteve foco na Umana? | | |
| 3.10 | "O Yoga cura ansiedade?" | Bot NAO fez afirmacao medica? Falou de beneficios de forma responsavel? | | |

---

## TESTADOR 4: Pedro Corso

**Foco: Transferencia para humano + Identidade do bot**

Objetivo: Testar gatilhos de transferencia, comportamento quando questionado sobre ser robo, e fluxo de handoff.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| 4.1 | "Oi, quero falar com alguem da equipe" | Bot pediu confirmacao antes de transferir? Nao transferiu direto? | | |
| 4.2 | "Sim, quero falar com um professor" | Bot executou transferencia? Chegou notificacao para a equipe? | | |
| 4.3 | (Nova conversa) "Voce e um robo?" | Bot respondeu "sou o assistente virtual"? Ofereceu conectar com instrutor? | | |
| 4.4 | "Quero continuar com voce mesmo" | Bot continuou normalmente sem insistir na transferencia? | | |
| 4.5 | (Nova conversa) "Estou falando com uma pessoa?" | Mesma resposta do 4.3? Consistente? | | |
| 4.6 | "Quero agendar uma aula experimental" | Bot ofereceu as duas opcoes (agendar direto OU falar com instrutor)? | | |
| 4.7 | "Prefiro falar com o instrutor" | Bot transferiu para humano? | | |
| 4.8 | (Nova conversa) "Quero falar com o Carlos" | Bot entendeu como gatilho de transferencia para professor especifico? | | |
| 4.9 | (Nova conversa) "Me passa o telefone" | Bot deu telefone fixo e email? NAO mencionou WhatsApp? | | |
| 4.10 | (Nova conversa) "Me passa o WhatsApp de voces" | Bot NAO deu numero de WhatsApp? Explicou que ja esta no canal? Ofereceu telefone fixo? | | |

---

## TESTADOR 5: Gui

**Foco: Continuidade de conversa + Repeticoes + Encerramento**

Objetivo: Testar memoria, variacao de respostas e fluxo de encerramento.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| 5.1 | "Ola!" | Bot deu saudacao inicial completa? | | |
| 5.2 | "Quais os horarios?" | Bot respondeu e perguntou periodo? | | |
| 5.3 | "Quais os horarios?" (repetir identica) | Bot NAO repetiu a mesma resposta? Variou a abordagem? | | |
| 5.4 | "Quais os horarios?" (repetir de novo) | Bot continua variando? Nao ficou repetitivo? | | |
| 5.5 | (Esperar 5 min) "Oi" | Bot continuou conversa sem repetir saudacao completa? | | |
| 5.6 | "Obrigado, era so isso" | Bot encerrou educadamente? Mensagem de despedida adequada? | | |
| 5.7 | (Esperar 24h+) "Boa tarde" | Bot iniciou NOVA conversa com saudacao? Nao continuou assunto antigo? | | |
| 5.8 | "Me fala sobre a escola" | Bot deu resposta diferente da primeira vez? Nao repetiu texto identico? | | |
| 5.9 | "Me fala sobre a escola" (repetir) | Bot variou novamente? | | |
| 5.10 | "Valeu!" | Bot encerrou: "Esperamos te ver em breve na Umana" ou similar? | | |

---

## TESTADOR 6: Lucas De Zotti

**Foco: Valores + Estrategia comercial + Planos online vs presencial**

Objetivo: Testar a estrategia progressiva de precos e priorizacao de planos presenciais.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| 6.1 | "Quanto custa pra praticar?" | Bot deu valor "a partir de" SEM imagem? Sugeriu visita? | | |
| 6.2 | "Mas qual o valor exato?" | Bot ainda tentou conduzir para visita ou ja enviou tabela? | | |
| 6.3 | "Me manda a tabela de precos" | Bot enviou "Planos Umana.jpeg"? Com texto explicativo? | | |
| 6.4 | "Tem plano online?" | Bot priorizou presencial primeiro? Explicou que o ideal e presencial? | | |
| 6.5 | "Quero ver o plano online mesmo" | Agora sim enviou "Plano Umana online.jpeg"? | | |
| 6.6 | "Qual o plano mais barato?" | Bot informou sem enviar imagem? Sugeriu visita? | | |
| 6.7 | "Tem desconto pra estudante?" | Bot disse que nao tem essa informacao? Ofereceu contato da equipe? | | |
| 6.8 | "Posso pagar no cartao?" | Bot disse que nao tem essa informacao? SEM oferecer contato proativamente? | | |
| 6.9 | "Me passa o contato pra eu perguntar sobre pagamento" | Agora sim deu telefone e email? Sem WhatsApp? | | |
| 6.10 | "Manda os planos e os horarios" | Bot enviou UMA imagem por vez? Nao mandou as duas juntas? | | |

---

## TESTADOR 7: Lucas Brando

**Foco: Audio + Midia + Mensagens fora de contexto**

Objetivo: Testar resposta a audios, imagens e perguntas completamente fora do escopo.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| 7.1 | (Enviar audio perguntando sobre horarios) | Bot transcreveu e respondeu sobre horarios? Respondeu em texto (nao audio)? | | |
| 7.2 | (Enviar audio longo contando historia pessoal + pergunta no final) | Bot captou a pergunta do audio? Respondeu de forma relevante? | | |
| 7.3 | (Enviar foto da fachada da escola) | Bot descreveu a imagem? Contextualizou com a Umana? | | |
| 7.4 | (Enviar foto aleatoria, ex: comida) | Bot lidou bem sem inventar contexto de Yoga? | | |
| 7.5 | "Qual a cotacao do dolar hoje?" | Bot nao respondeu sobre dolar? Redirecionou para assuntos da Umana? | | |
| 7.6 | "Me conta uma piada" | Bot manteve tom profissional? Redirecionou educadamente? | | |
| 7.7 | "Quem vai ganhar o Grenal?" | Bot nao entrou no assunto? Redirecionou para Yoga/Umana? | | |
| 7.8 | "Voce sabe programar em Python?" | Bot nao respondeu sobre programacao? Manteve identidade? | | |
| 7.9 | (Enviar mensagem com palavrao) | Bot manteve tom acolhedor? Nao replicou linguagem? | | |
| 7.10 | (Enviar sticker) | Bot reagiu de forma natural? Nao travou? | | |

---

## TESTADOR 8: Arthur

**Foco: Agendamento de visita + Fluxo completo de conversao**

Objetivo: Simular um lead real do inicio ao fim, testando todo o funil de conversao.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| 8.1 | "Oi, vi o anuncio de voces no Instagram" | Bot deu boas-vindas? Perguntou o que busca? | | |
| 8.2 | "To procurando algo pra relaxar, muito estressado" | Bot conectou com beneficios do Yoga? Sem prometer cura? | | |
| 8.3 | "Nunca fiz Yoga na vida, tenho medo de nao conseguir" | Bot acolheu? Explicou que e para todos os niveis? Mencionou professores preparados? | | |
| 8.4 | "Moro perto do Bom Fim" | Bot usou a proximidade como argumento? "A Umana fica no Rio Branco, pertinho"? | | |
| 8.5 | "Que horas tem de noite?" | Bot filtrou horarios noturnos? | | |
| 8.6 | "Quanto custa?" | Bot deu "a partir de" e sugeriu visita? SEM imagem? | | |
| 8.7 | "Quero ir conhecer" | Bot ofereceu agendar? Perguntou dia/periodo? | | |
| 8.8 | "Pode ser quarta a noite" | Bot sugeriu horarios de quarta a noite (17h-20h)? Confirmou visita? | | |
| 8.9 | "Preciso levar algo?" | Bot respondeu de forma util? (roupa confortavel, etc. -- se tiver na base) | | |
| 8.10 | "Obrigado, vou la quarta entao!" | Bot encerrou com mensagem positiva? "Esperamos voce!"? | | |

---

## Checklist Geral (todos os testadores devem verificar)

Apos completar seus testes, cada testador deve responder:

| Criterio | Sim | Nao | Obs |
|----------|-----|-----|-----|
| O bot se identificou como robo em algum momento sem ser perguntado? | | | |
| O bot enviou mais de uma imagem na mesma mensagem? | | | |
| O bot ofereceu o numero de WhatsApp? | | | |
| O bot inventou informacao que nao existe? (horarios falsos, valores falsos, professores falsos) | | | |
| O bot usou emoji em alguma resposta? | | | |
| O bot usou markdown (negrito, italico, titulos) nas mensagens? | | | |
| O bot repetiu a mesma resposta identica em algum momento? | | | |
| O bot fez mais de 2 perguntas de uma vez? | | | |
| O bot enviou mensagem com mais de 4-5 frases? | | | |
| O bot falou sobre metodos de Yoga que a Umana nao pratica? | | | |
| O bot ofereceu contato sem o usuario pedir? | | | |
| O bot adaptou o tom de linguagem ao usuario (ficou informal se usuario era informal)? | | | |

---

## Como reportar resultados

1. Preencha a coluna "Resultado" com OK / FALHA / PARCIAL
2. Na coluna "Obs", descreva o que aconteceu de diferente do esperado
3. Se possivel, tire print da conversa
4. Envie este documento preenchido para o Pedro

**Prazo sugerido:** Cada testador deve concluir seus testes em ate 2 dias.
**Ambiente:** Usar o numero de WhatsApp conectado ao bot da Umana Rio Branco.
