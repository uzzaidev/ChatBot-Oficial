# QA -- Testes do Bot Umana Rio Branco

**Data:** 2026-04-15 (atualizado com testes de calendário, coleta de dados e fluxo de agendamento)
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
| 1.9 | "Quero conhecer a escola" | Bot ofereceu marcar visita ("Quer que eu te ajude a marcar?")? NÃO perguntou dia/horário ainda? | | |
| 1.10 | "Sim, quero marcar" | Bot iniciou coleta de dados — começou por "como conheceu a Umana"? NÃO pediu dia/horário ainda? | | |

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
| 4.6 | "Quero agendar uma aula experimental" | Bot informou que tem custo ANTES de qualquer outra coisa? NÃO ofereceu agendar direto? | | |
| 4.7 | "Sim, tudo bem, quero continuar" | Bot coletou dados e depois transferiu para instrutor (sem criar evento de calendário)? | | |
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
| 8.7 | "Quero ir conhecer" | Bot ofereceu marcar ("Quer que eu ajude a marcar?")? NÃO perguntou dia/horário diretamente? | | |
| 8.8 | "Sim, pode marcar" | Bot iniciou coleta de dados? Primeira pergunta foi "como conheceu a Umana"? | | |
| 8.9 | (Fornecer como_conheceu → objetivo → email → CPF) | Bot coletou um dado por vez, confirmando cada um? Fez resumo e propôs horário da grade (17h-20h na quarta)? | | |
| 8.10 | "Pode ser quarta às 18h" / "Sim" (confirmação) | Bot criou o evento? Confirmação veio só com título e horário, sem dados internos? | | |

---

## TESTADOR 9: Gui (Fluxo Completo de Agendamento de Visita)

**Foco: Coleta de dados no momento certo + agendamento autônomo de visita**

Objetivo: Validar que o bot NÃO pede dados cadastrais durante perguntas gerais, e SÓ inicia a coleta quando há intenção explícita de agendar. Verificar o fluxo completo até a criação do evento.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| 9.1 | "Oi, quero saber como funciona a escola" | Bot respondeu sobre a escola SEM pedir CPF, email ou "como conheceu"? | | |
| 9.2 | "Que horários têm disponíveis para visita?" | Bot informou os horários de visita (seg-qui 10h-13h e 15h-20h / sex 15h-18h) SEM pedir dados? | | |
| 9.3 | "Estou pensando em conhecer o lugar" | Bot NÃO iniciou coleta de dados? Respondeu normalmente e ofereceu marcar? | | |
| 9.4 | "Quero marcar uma visita" | Agora sim o bot iniciou a coleta de dados? Começou por "como conheceu"? | | |
| 9.5 | "Vi no Instagram" | Bot confirmou e passou para o próximo dado (objetivo)? Sem lista de perguntas de uma vez? | | |
| 9.6 | "Quero reduzir o estresse" | Bot confirmou ("Ótimo, anotado!") e pediu e-mail? | | |
| 9.7 | (Fornecer e-mail) | Bot pediu CPF na sequência? | | |
| 9.8 | (Fornecer CPF) | Bot fez resumo dos dados e propôs horário dentro da grade disponível? | | |
| 9.9 | "Pode ser quinta às 16h" | Bot verificou disponibilidade e perguntou "Posso confirmar a visita para quinta às 16h?"? | | |
| 9.10 | "Sim" | Bot criou o evento? Confirmação veio APENAS com título e horário, sem dados internos (telefone/email)? | | |

---

## TESTADOR 10: Luis (Cancelamento e Reagendamento via WhatsApp)

**Foco: Cancelar evento, cancelar múltiplos, reagendar**

Objetivo: Validar que o bot usa a ferramenta correta ao cancelar (não cria novo evento), suporta múltiplos cancelamentos com lista numerada, e consegue reagendar sem cancelar e recriar.

**Pré-requisito:** Ter pelo menos 1 visita agendada para este contato antes de iniciar.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| 10.1 | "Quero cancelar minha visita" | Bot usou `cancelar_evento_agenda` (NÃO criou evento novo)? | | |
| 10.2 | (Se bot pediu confirmação) "Pode cancelar" | Bot confirmou cancelamento? Mensagem contém título e horário? SEM dados internos? | | |
| 10.3 | (Nova conversa com 2+ visitas) "Não vou conseguir ir, pode cancelar" | Se houver múltiplos eventos, bot exibiu lista numerada (1. ... / 2. ...)? | | |
| 10.4 | "Pode cancelar o 1 e o 2" | Bot cancelou os dois em uma única operação? Confirmou quantidade cancelada? | | |
| 10.5 | (Nova conversa com múltiplos) "Cancela todos os meus compromissos aí" | Bot cancelou todos de uma vez após confirmação? | | |
| 10.6 | (Nova conversa com visita agendada) "Quero mudar minha visita para sexta às 16h" | Bot usou `alterar_evento_agenda` em vez de cancelar e recriar? | | |
| 10.7 | (Pós-reagendamento) Verificar no Google Calendar | Evento foi atualizado para sexta às 16h? Ainda é o mesmo evento (mesmo ID)? | | |
| 10.8 | "Não posso mais" | Bot entendeu como cancelamento? NÃO criou evento com "não posso mais" no título? | | |
| 10.9 | "Desmarcar aquela visita da quarta" | Bot localizou pelo dia/título? Cancelou corretamente? | | |
| 10.10 | (Sem nenhuma visita agendada) "Quero cancelar minha visita" | Bot informou que não encontrou compromisso? Não quebrou? | | |

---

## TESTADOR 11: Vitor (Distinção Visita vs Aula Experimental)

**Foco: Visita gratuita (bot autônomo) vs aula experimental/particular (transferência para humano)**

Objetivo: Validar que visitas são agendadas pelo bot e aulas experimentais/particulares sempre vão para humano com aviso de custo.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| 11.1 | "Quero fazer uma aula experimental" | Bot informou que tem custo ANTES de qualquer outra ação? NÃO abriu agenda? | | |
| 11.2 | "Sim, tudo bem pagar" | Bot coletou dados e depois usou `transferir_atendimento`? NÃO criou evento de calendário? | | |
| 11.3 | (Nova conversa) "Quero uma aula particular com o Carlos" | Bot informou custo + usou transferência? Carlos não foi agendado direto? | | |
| 11.4 | (Nova conversa) "Quero conhecer a escola" | Bot ofereceu visita gratuita como primeiro passo? NÃO mencionou custo? | | |
| 11.5 | "Pode ser hoje às 11h" | Bot verificou se 11h está dentro da grade de visitas (seg-qui 10h-13h)? Confirmou? | | |
| 11.6 | "Pode ser hoje às 22h" | Bot recusou e sugeriu horário dentro da grade? NÃO agendou fora do horário? | | |
| 11.7 | "Aula experimental é gratuita?" | Bot deixou claro que tem custo? Ofereceu visita gratuita como alternativa? | | |
| 11.8 | "Qual o valor da aula experimental?" | Bot disse que não tem o valor exato e transferiu para equipe confirmar? | | |
| 11.9 | "Quero visitar mas quero falar com um instrutor antes" | Bot ofereceu transferência? Aguardou confirmação antes de passar contatos? | | |
| 11.10 | (Nova conversa) "Quero marcar com o Fabrício" | Bot entendeu como aula particular → informou custo → transferiu? | | |

---

## TESTADOR 12: Pedro Corso (Anti-duplicata + Dados internos)

**Foco: Evitar criação de eventos duplicados e garantir que dados internos não vazem ao usuário**

Objetivo: Validar que o sistema detecta duplicatas e que a confirmação de agendamento não expõe dados privados (WhatsApp, e-mail de convidado).

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| 12.1 | (Após criar uma visita) "Quero marcar uma visita para o mesmo horário" | Bot identificou que já existe evento semelhante? NÃO criou duplicata? | | |
| 12.2 | Verificar mensagem de confirmação do agendamento | A confirmação contém APENAS título e data/horário? Sem "+55...", sem e-mail de convidado, sem ID? | | |
| 12.3 | (Nova conversa) "Tenho uma visita marcada, qual é?" | Bot informou os detalhes sem expor dados do sistema? | | |
| 12.4 | Verificar no Google Calendar o evento criado | O número de WhatsApp e o e-mail aparecem na DESCRIÇÃO do evento (interno)? NÃO foram enviados ao usuário? | | |
| 12.5 | "Pode marcar de novo para o mesmo horário" | Bot avisa que já existe e pergunta se quer cancelar o anterior ou escolher novo horário? | | |

---

## BATERIA DE TESTES — CALENDÁRIO

> Estes testes devem ser executados com o Google Calendar conectado e o toggle "Agendamento via bot" **ATIVO** no dashboard `/dashboard/calendar`, salvo onde indicado.

---

### CAL-01: Agendamento completo via bot (caminho feliz)

**Pré-requisito:** Calendário conectado, toggle ativo.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| C01.1 | "Quero marcar uma visita" | Bot iniciou coleta de dados? Não foi direto para agenda? | | |
| C01.2 | (Fornecer: como_conheceu → objetivo → email → CPF) | Bot coletou um campo por vez, confirmando cada um? | | |
| C01.3 | (Após coleta completa) Bot propôs horário | Horário proposto está dentro da grade (seg-qui 10h-13h / 15h-20h, sex 15h-18h)? | | |
| C01.4 | "Pode ser quarta às 17h" | Bot verificou disponibilidade antes de confirmar? | | |
| C01.5 | "Sim, confirma" | Bot criou evento? Confirmação contém só título e horário (sem telefone/email/ID)? | | |
| C01.6 | Verificar no Google Calendar | Evento aparece com nome do contato, WhatsApp e e-mail na DESCRIÇÃO (campo interno)? | | |

---

### CAL-02: Cancelamento único

**Pré-requisito:** 1 visita agendada para o contato.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| C02.1 | "Quero cancelar minha visita" | Bot chamou `cancelar_evento_agenda` (NÃO criou novo evento)? | | |
| C02.2 | (Se bot pediu confirmação) "Sim, pode cancelar" | Confirmação de cancelamento veio sem dados internos? | | |
| C02.3 | Verificar no Google Calendar | Evento foi removido da agenda? | | |
| C02.4 | "Quero cancelar minha visita" (sem nenhum evento) | Bot informou que não encontrou compromisso? Não quebrou com erro? | | |

---

### CAL-03: Cancelamento múltiplo com lista numerada

**Pré-requisito:** 2 ou mais visitas agendadas para o contato.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| C03.1 | "Pode cancelar minha visita" | Bot exibiu lista numerada (1. / 2. ...)? Incluiu linha `[IDs: 1=xxx, 2=yyy]` (oculta)? | | |
| C03.2 | "Cancela o 1" | Bot cancelou apenas o evento 1? Não cancelou os outros? | | |
| C03.3 | (Com 2 eventos) "Cancela o 1 e o 2" | Bot cancelou os dois em uma única operação? Confirmou a quantidade? | | |
| C03.4 | "Cancela todos" | Bot cancelou todos os eventos listados? Informou quantos foram cancelados? | | |
| C03.5 | Verificar no Google Calendar | Todos os cancelados foram removidos? Nenhum extra foi apagado? | | |

---

### CAL-04: Reagendamento (alterar sem cancelar)

**Pré-requisito:** 1 visita agendada para o contato.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| C04.1 | "Quero mudar minha visita para sexta às 16h" | Bot chamou `alterar_evento_agenda` (NÃO cancelou e recriou)? | | |
| C04.2 | Verificar no Google Calendar | É o mesmo evento (mesmo ID)? Horário foi atualizado para sexta 16h? | | |
| C04.3 | "Quero reagendar para terça às 19h" | Bot verificou disponibilidade do novo horário antes de alterar? | | |
| C04.4 | (Horário novo ocupado) | Bot informou conflito e sugeriu alternativa? Não alterou para horário ocupado? | | |
| C04.5 | "Mudar para fora da grade, tipo sábado às 8h" | Bot informou que sábado às 8h está fora da grade de visitas? | | |

---

### CAL-05: Verificação de disponibilidade

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| C05.1 | "Tem horário livre quarta de manhã?" | Bot chamou `verificar_agenda`? Respondeu com slots livres? | | |
| C05.2 | "E quinta à tarde?" | Bot verificou sem reiniciar coleta de dados? | | |
| C05.3 | (Horário totalmente ocupado) | Bot sugeriu até 3 alternativas de horários livres no mesmo dia? | | |
| C05.4 | "Quais meus compromissos da semana?" | Bot listou eventos sem expor e-mails/IDs internos? | | |

---

### CAL-06: Anti-duplicata

**Pré-requisito:** 1 visita já criada para o contato em determinado horário.

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| C06.1 | (Tentar agendar no mesmo horário já ocupado) | Bot detectou duplicata e informou "já existe evento semelhante"? NÃO criou segundo evento? | | |
| C06.2 | Verificar no Google Calendar | Apenas 1 evento no horário (sem duplicata)? | | |
| C06.3 | (Tentar agendar 20 min antes do mesmo horário) | Bot ainda detectou como duplicata (tolerância ±30 min)? | | |
| C06.4 | "Pode marcar de novo para o mesmo dia" | Bot perguntou se quer cancelar o anterior ou escolher novo horário? | | |

---

### CAL-07: Toggle desativado (bot pausado)

**Pré-requisito:** Ir em `/dashboard/calendar` e **desativar** o toggle "Agendamento via bot".

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| C07.1 | "Quero marcar uma visita" | Bot NÃO usou `verificar_agenda` nem `criar_evento_agenda`? Respondeu como se não tivesse calendário? | | |
| C07.2 | "Quero cancelar minha visita" | Bot NÃO tentou acessar o calendário? Tratou como dúvida normal? | | |
| C07.3 | "Quais meus compromissos?" | Bot NÃO listou eventos do calendário? | | |
| C07.4 | (Reativar o toggle) "Quero marcar uma visita" | Bot voltou a oferecer agendamento normalmente? | | |

---

### CAL-08: Dados internos não vazam

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| C08.1 | (Após qualquer agendamento) Revisar confirmação enviada ao usuário | Tem "+55...", e-mail ou ID de evento? Se sim: FALHA. | | |
| C08.2 | (Após cancelamento) Revisar mensagem de confirmação | Bot mencionou ID do evento? E-mail do convidado? Se sim: FALHA. | | |
| C08.3 | "Qual o e-mail de vocês?" | Bot deu APENAS o e-mail público da Umana (não e-mail de convite do Google)? | | |
| C08.4 | "Me passa o número de vocês" | Bot deu telefone fixo? NÃO deu WhatsApp nem e-mail de sistema? | | |

---

### CAL-09: Coleta de dados antes do calendário (ORDEM INVIOLÁVEL)

| # | Mensagem para enviar | O que verificar | Resultado | Obs |
|---|---------------------|-----------------|-----------|-----|
| C09.1 | "Queria agendar para amanhã às 10h" (sem ter dados) | Bot NÃO chamou `verificar_agenda`? Iniciou coleta de dados primeiro? | | |
| C09.2 | "Já te disse, quero às 10h de terça" (repetindo horário) | Bot respondeu "Ótimo, vou guardar esse horário" e continuou a coleta? NÃO foi para o calendário? | | |
| C09.3 | (Fornecer só como_conheceu e objetivo, sem email e CPF) | Bot NÃO avançou para verificar agenda? Pediu email na sequência? | | |
| C09.4 | (Fornecer todos os 4 campos) | Agora sim bot chamou `verificar_agenda` e propôs horário? | | |

---

## Checklist Geral (todos os testadores devem verificar)

Apos completar seus testes, cada testador deve responder:

**Comportamento geral**

| Critério | Sim | Não | Obs |
|----------|-----|-----|-----|
| O bot se identificou como robô em algum momento sem ser perguntado? | | | |
| O bot enviou mais de uma imagem na mesma mensagem? | | | |
| O bot ofereceu o número de WhatsApp? | | | |
| O bot inventou informação que não existe? (horários falsos, valores falsos, professores falsos) | | | |
| O bot usou emoji em alguma resposta? | | | |
| O bot usou markdown nas mensagens? (negrito `**`, itálico `*`, títulos `#`) | | | |
| O bot repetiu a mesma resposta idêntica em algum momento? | | | |
| O bot fez mais de 2 perguntas de uma vez? | | | |
| O bot enviou mensagem com mais de 4-5 frases? | | | |
| O bot falou sobre métodos de Yōga que a Umåna não pratica? | | | |
| O bot ofereceu contato sem o usuário pedir? | | | |
| O bot adaptou o tom de linguagem ao usuário (ficou informal se usuário era informal)? | | | |
| O bot usou crase corretamente nos horários? ("às 10h", "à escola") | | | |
| O bot usou "técnicas corporais" em vez de "posturas" ou "poses"? | | | |

**Coleta de dados**

| Critério | Sim | Não | Obs |
|----------|-----|-----|-----|
| O bot pediu CPF/email/objetivo durante perguntas gerais (antes de haver intenção de agendar)? | | | |
| O bot coletou os dados um por vez (não enviou lista de perguntas de uma vez)? | | | |
| O bot confirmou cada dado antes de pedir o próximo ("Ótimo, anotado!")? | | | |
| Em segunda conversa, o bot voltou a pedir dados já coletados anteriormente? | | | |

**Agendamento e calendário**

| Critério | Sim | Não | Obs |
|----------|-----|-----|-----|
| O bot criou evento sem aguardar confirmação explícita ("sim", "pode", "confirma")? | | | |
| O bot agendou visita fora da grade de horários (seg-qui 10h-13h / 15h-20h, sex 15h-18h)? | | | |
| O bot agendou aula experimental/particular direto (sem transferir para instrutor)? | | | |
| A confirmação de agendamento exibiu número de WhatsApp ou e-mail ao usuário? | | | |
| O bot criou evento duplicado para o mesmo contato e horário? | | | |
| Ao pedir cancelamento, o bot criou um novo evento em vez de cancelar? | | | |
| O bot reagendou corretamente (alterou o evento existente, não cancelou e recriou)? | | | |

---

## Como reportar resultados

1. Preencha a coluna "Resultado" com OK / FALHA / PARCIAL
2. Na coluna "Obs", descreva o que aconteceu de diferente do esperado
3. Se possivel, tire print da conversa
4. Envie este documento preenchido para o Pedro

**Prazo sugerido:** Cada testador deve concluir seus testes em ate 2 dias.
**Ambiente:** Usar o numero de WhatsApp conectado ao bot da Umana Rio Branco.
