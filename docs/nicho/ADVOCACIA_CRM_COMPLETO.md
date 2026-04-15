# CRM para Escritorios de Advocacia -- Guia Completo UzzApp

**Segmento:** Direito / Escritorios de Advocacia
**Versao:** 1.0 | **Data:** 2026-04-06

---

## Contexto do Segmento

Escritorios de advocacia tem desafios unicos:
- Leads chegam em momentos de dor/urgencia (divorcio, processo, multa, demissao)
- Tempo de resposta e critico -- quem responde primeiro fecha
- Sigilo profissional e obrigatorio (OAB)
- O ciclo de venda vai de consulta inicial ate contrato assinado
- Muitos leads vem de Google ("advogado trabalhista perto de mim") e indicacao
- Atendimento precisa parecer humano e empatico desde o primeiro contato
- Varios advogados na equipe com especialidades diferentes

---

## Estrutura do CRM Sugerida

### Colunas do Kanban

| Coluna | Slug | Proposito |
|--------|------|-----------|
| Novos Contatos | `novos` | Leads que acabaram de chegar |
| Triagem | `triagem` | Bot ou assistente entendendo a demanda |
| Aguardando Consulta | `aguardando-consulta` | Consulta marcada, aguardando o dia |
| Consulta Realizada | `consulta-realizada` | Consulta feita, proposta a ser enviada |
| Proposta Enviada | `proposta-enviada` | Honorarios enviados, aguardando aceite |
| Em Negociacao | `negociacao` | Cliente pediu ajuste ou esta decidindo |
| Contrato Assinado | `contrato-assinado` | Fechou! Cliente ativo |
| Em Andamento | `em-andamento` | Caso em andamento no escritorio |
| Caso Encerrado | `caso-encerrado` | Processo finalizado |
| Perdido | `perdido` | Nao fechou |

### Tags Recomendadas

**Por area do direito:**
- `trabalhista`, `civil`, `familia`, `criminal`, `tributario`, `empresarial`, `consumidor`, `previdenciario`, `imobiliario`, `digital`

**Por status do lead:**
- `urgente`, `indicacao`, `retorno`, `vip`, `risco-perda`, `consulta-gratis`, `consulta-paga`

**Por origem:**
- `google-ads`, `instagram`, `indicacao-cliente`, `indicacao-parceiro`, `site`, `organico`

**Por perfil:**
- `pessoa-fisica`, `pessoa-juridica`, `empresa-pequena`, `empresa-media`

---

## Automacoes por Trigger -- Detalhamento Completo

---

### TRIGGER 1: Mensagem Recebida

**1.1 -- Primeiro contato: triagem automatica**
- Trigger: Mensagem recebida (is_first_message = true)
- Acoes:
  - Criar card na coluna "Novos Contatos"
  - Adicionar tag "novo-lead"
  - Registrar atividade "Primeiro contato via WhatsApp"
  - Notificar equipe "Novo lead: {{contact_name}}"
- Valor: Todo lead que chega ja esta no CRM. Nenhum contato se perde mesmo fora do horario comercial.

**1.2 -- Registro de cada interacao**
- Trigger: Mensagem recebida (qualquer)
- Acao: Registrar atividade "Cliente enviou mensagem: {{message_type}}"
- Valor: Timeline completa de cada lead. Util para advogados que precisam revisar historico antes de retornar.

**1.3 -- Alerta de retorno de lead antigo**
- Trigger: Mensagem recebida (lead que ja existia e estava inativo)
- Acoes: Mover de "Perdido" para "Novos Contatos" + Adicionar tag "retorno" + Notificar responsavel original
- Valor: Lead que tinha desistido e voltou. Oportunidade de segunda chance com contexto do que aconteceu antes.

---

### TRIGGER 2: Mensagem Enviada

**2.1 -- Controle de SLA de resposta**
- Trigger: Mensagem enviada (sent_by = human)
- Acao: Registrar atividade "Advogado respondeu" com timestamp
- Valor: Medir tempo entre chegada do lead e primeira resposta humana. Escritorios que respondem em menos de 5 minutos fecham 3x mais.

**2.2 -- Mover card quando advogado responde**
- Trigger: Mensagem enviada (sent_by = human)
- Acoes: Mover de "Novos Contatos" para "Triagem" + Atualizar status para "in_service"
- Valor: Gestor sabe quais leads ja estao sendo atendidos e quais ainda esperam.

**2.3 -- Auditoria de comunicacao**
- Trigger: Mensagem enviada (sent_by = bot)
- Acao: Registrar atividade com conteudo resumido
- Valor: Socio consegue auditar o que o bot esta respondendo. Importante para compliance da OAB (nao pode dar parecer juridico via bot).

---

### TRIGGER 3: Palavra-chave Detectada

**3.1 -- Classificacao automatica por area do direito**
- Keywords por area:
  - Trabalhista: "demissao", "rescisao", "CLT", "hora extra", "assedio", "FGTS", "seguro desemprego"
  - Familia: "divorcio", "pensao", "guarda", "separacao", "inventario", "heranca", "testamento"
  - Criminal: "preso", "delegacia", "boletim de ocorrencia", "fianca", "audiencia", "juri"
  - Consumidor: "Procon", "produto defeituoso", "cobranca indevida", "negativado", "SPC", "Serasa"
  - Tributario: "imposto", "IRPF", "divida ativa", "execucao fiscal", "parcelamento"
  - Empresarial: "CNPJ", "contrato social", "socio", "empresa", "abertura", "fechamento"
  - Previdenciario: "aposentadoria", "INSS", "auxilio", "beneficio", "incapacidade", "BPC"
  - Imobiliario: "escritura", "usucapiao", "despejo", "aluguel", "contrato de locacao", "condominio"
- Acoes: Adicionar tag da area + Mover para coluna "Triagem" + Atribuir ao advogado especialista
- Valor: O lead ja chega classificado e direcionado ao advogado certo. Zero triagem manual.

**3.2 -- Detectar urgencia juridica**
- Keywords: "preso", "mandado", "audiencia amanha", "prazo vencendo", "liminar", "urgente", "emergencia"
- Acoes: Adicionar tag "urgente" + Notificar todos ativos (prioridade critica) + Transferir para humano imediatamente
- Valor: Casos criminais e liminares nao podem esperar. O escritorio e notificado em segundos.

**3.3 -- Detectar intencao de contratar**
- Keywords: "quanto cobra", "honorarios", "valores", "como funciona pra contratar", "preciso de um advogado"
- Acoes: Adicionar tag "intencao-contratar" + Mover para "Triagem" + Notificar advogado
- Valor: Lead quente identificado automaticamente. Prioridade maxima na fila.

**3.4 -- Capturar leads de indicacao**
- Keywords: "indicacao", "fulano indicou", "me recomendaram", "um amigo falou"
- Acoes: Adicionar tag "indicacao-cliente" + Registrar nota "Veio por indicacao" + Atribuir ao advogado senior
- Valor: Leads de indicacao tem taxa de conversao 5x maior. Tratamento VIP desde o inicio.

**3.5 -- Identificar consulta gratuita vs. paga**
- Keywords: "consulta gratis", "primeira consulta", "consulta gratuita", "avaliacao sem custo"
- Acoes: Adicionar tag "consulta-gratis"
- Valor: Segmentar leads que esperam gratuidade para ajustar a abordagem comercial.

**3.6 -- Detectar mencao a concorrente ou experiencia anterior**
- Keywords: "outro advogado", "ja tenho advogado", "meu advogado nao resolve", "trocar de advogado"
- Acoes: Adicionar tag "troca-advogado" + Registrar nota
- Valor: Abordagem diferente -- o lead ja tem experiencia ruim. Oportunidade de mostrar diferencial.

---

### TRIGGER 4: Inatividade

**4.1 -- Follow-up apos consulta (3 dias)**
- Trigger: 3 dias de inatividade (card na coluna "Consulta Realizada")
- Acao: Enviar mensagem "Ola {{contact_name}}, tudo bem? Queria saber se voce teve oportunidade de avaliar a proposta que conversamos. Fico a disposicao para esclarecer qualquer duvida."
- Valor: Muitos clientes precisam de um empurrao apos a consulta. Follow-up gentil sem parecer insistente.

**4.2 -- Escalar para socio (7 dias)**
- Trigger: 7 dias de inatividade (card na coluna "Proposta Enviada")
- Acoes: Notificar socio "Lead {{contact_name}} com proposta enviada ha 7 dias sem resposta" + Adicionar tag "risco-perda"
- Valor: Socio pode intervir com ligacao direta ou ajuste nos honorarios antes de perder o cliente.

**4.3 -- Ultima tentativa (14 dias)**
- Trigger: 14 dias de inatividade
- Acao: Enviar template "{{contact_name}}, notamos que faz um tempo que conversamos. Se precisar de orientacao juridica, estamos a disposicao. Conte conosco."
- Valor: Mensagem nao invasiva que mantem a porta aberta. Alguns leads retornam meses depois.

**4.4 -- Arquivar lead frio (30 dias)**
- Trigger: 30 dias de inatividade
- Acoes: Mover para "Perdido" + Adicionar tag "perdido-inatividade" + Remover tag "ativo"
- Valor: CRM limpo. Apenas oportunidades reais no funil ativo.

**4.5 -- Reativacao de clientes antigos (90 dias)**
- Trigger: 90 dias de inatividade (clientes com tag "contrato-assinado")
- Acao: Enviar template "Ola {{contact_name}}! Faz um tempo que finalizamos seu caso. Tudo certo? Se surgir qualquer nova questao juridica, estamos aqui."
- Valor: Manter relacionamento com ex-clientes gera indicacoes e novos casos.

---

### TRIGGER 5: Mudanca de Status

**5.1 -- Bot transfere para advogado**
- Trigger: Status muda de "bot" para "human"
- Acoes:
  - Notificar advogado designado (prioridade importante)
  - Adicionar nota automatica com resumo da conversa do bot
  - Atualizar auto-status para "awaiting_attendant"
  - Registrar atividade "Transferido para atendimento humano"
- Valor: O advogado recebe o contexto completo: area do direito, urgencia, o que o lead ja perguntou. Comeca a conversa sem repetir perguntas.

**5.2 -- Encerramento de atendimento**
- Trigger: Status muda para "closed"
- Acoes: Mover card para coluna adequada + Registrar "Atendimento encerrado"
- Valor: Historico limpo de quando cada conversa foi finalizada.

**5.3 -- Reativacao do bot apos atendimento**
- Trigger: Status muda de "human" para "bot"
- Acao: Enviar mensagem "Se precisar de mais alguma orientacao, estou por aqui!"
- Valor: Transicao suave. O cliente nao fica "no limbo" quando o advogado termina.

---

### TRIGGER 6: Origem do Lead

**6.1 -- Leads de Google Ads por area**
- Trigger: Origem = meta_ads (ou Google, via UTM capturado)
- Acoes: Tag com nome da campanha + Mover para "Novos Contatos" + Notificar equipe
- Configuracao sugerida por campanha:
  - Campanha "Trabalhista POA" -> Tag "google-trabalhista" + Atribuir advogado trabalhista
  - Campanha "Divorcio RS" -> Tag "google-familia" + Atribuir advogado familiarista
  - Campanha "Empresa" -> Tag "google-empresarial" + Atribuir advogado societario
- Valor: ROI real por campanha. Saber qual anuncio gera clientes que FECHAM, nao so leads.

**6.2 -- Indicacoes com tratamento VIP**
- Trigger: Origem = referral
- Acoes: Tag "indicacao" + Atribuir ao socio + Mover para "Triagem" + Notificar (prioridade importante)
- Valor: Indicacoes sao o melhor lead de advocacia. Atendimento pelo socio aumenta a conversao.

**6.3 -- Organico com rastreamento**
- Trigger: Origem = organic
- Acoes: Tag "organico" + Registrar nota
- Valor: Medir quanto do faturamento vem de SEO/conteudo. Justifica investimento em blog juridico e redes sociais.

---

### TRIGGER 7: Transferencia para Humano

**7.1 -- Distribuicao por especialidade**
- Trigger: Transferencia solicitada
- Logica:
  - Se tag "trabalhista" -> Atribuir ao Dr. [trabalhista]
  - Se tag "familia" -> Atribuir ao Dr. [familiarista]
  - Se tag "criminal" -> Atribuir ao Dr. [criminalista]
  - Se sem tag -> Round-robin entre advogados disponiveis
- Acoes: Notificar advogado + Adicionar nota com resumo + Mover para "Triagem"
- Valor: Cada lead vai direto para o especialista certo. Sem "deixa eu ver quem pode te atender".

**7.2 -- SLA com alerta de janela de 24h**
- Trigger: Transferencia solicitada
- Acoes: Registrar hora + Se nao respondido em 1h, notificar gestor + Se nao respondido em 4h, escalar para socio
- Valor: Nenhuma transferencia fica sem resposta. Escalonamento automatico evita perder a janela de 24h.

**7.3 -- Contexto automatico para o advogado**
- Trigger: Transferencia solicitada
- Acao: Adicionar nota "Lead solicita atendimento humano. Resumo do bot: Area: {{tags}}. Ultima mensagem: {{request_text}}"
- Valor: O advogado abre o card e ja sabe: area, urgencia, o que o lead quer. Atendimento comeca direto no ponto.

---

### TRIGGER 8: Card Criado

**8.1 -- Setup completo do novo lead**
- Trigger: Card criado
- Acoes:
  - Mover para "Novos Contatos"
  - Adicionar tag "novo-lead"
  - Notificar equipe "Novo lead: {{contact_name}} ({{phone}})"
  - Registrar atividade "Card criado automaticamente"
- Valor: Todo lead entra organizado. Sem cards perdidos ou esquecidos.

**8.2 -- Boas-vindas com posicionamento**
- Trigger: Card criado
- Acao: Enviar mensagem (via bot) "Ola! Sou o assistente do escritorio [nome]. Posso te ajudar a entender como podemos auxiliar no seu caso. Qual assunto voce gostaria de tratar?"
- Valor: Primeiro contato imediato, 24/7. Mesmo de madrugada o lead recebe atendimento.

**8.3 -- Alerta diferenciado por horario**
- Trigger: Card criado (fora do horario comercial)
- Acoes: Adicionar tag "fora-horario" + Registrar nota "Lead chegou fora do expediente"
- Valor: Na manha seguinte, a equipe sabe quais leads chegaram a noite e prioriza o retorno.

---

### TRIGGER 9: Tag Adicionada

**9.1 -- Fluxo por area do direito**
- Trigger: Tag "trabalhista" adicionada
- Acoes: Atribuir ao advogado trabalhista + Mover para "Triagem" + Registrar "Classificado como Trabalhista"
- (Repetir para cada area: familia, criminal, civil, etc.)
- Valor: No momento que o bot ou atendente classifica, o card ja vai para o lugar certo com o dono certo.

**9.2 -- Protocolo de urgencia**
- Trigger: Tag "urgente" adicionada
- Acoes: Notificar todos os advogados ativos (critico) + Transferir para humano + Atualizar status "awaiting_attendant"
- Valor: Preso, audiencia amanha, prazo prescricional. O escritorio inteiro e mobilizado em segundos.

**9.3 -- Fluxo de cliente VIP**
- Trigger: Tag "vip" adicionada
- Acoes: Atribuir ao socio + Notificar socio (importante) + Registrar "Lead marcado como VIP"
- Valor: Grandes contas ou indicacoes de clientes importantes recebem atencao do socio.

**9.4 -- Alerta de risco de perda**
- Trigger: Tag "risco-perda" adicionada
- Acoes: Notificar gestor (critico) + Registrar atividade + Mover para "Negociacao"
- Valor: Intervencao rapida antes do lead desistir. Pode ser ajuste de honorarios ou atendimento personalizado.

---

### TRIGGER 10: Card Movido

**10.1 -- Consulta agendada**
- Trigger: Card movido para "Aguardando Consulta"
- Acoes:
  - Enviar mensagem "{{contact_name}}, sua consulta esta confirmada. No dia, tenha em maos os documentos relacionados ao seu caso. Qualquer duvida, estamos a disposicao."
  - Registrar atividade "Consulta agendada"
  - Notificar advogado responsavel
- Valor: Lembrete automatico reduz no-show. Cliente ja sabe o que levar.

**10.2 -- Proposta enviada: iniciar follow-up**
- Trigger: Card movido para "Proposta Enviada"
- Acoes:
  - Registrar atividade "Proposta de honorarios enviada"
  - Agendar follow-up automatico em 3 dias (via trigger de inatividade)
- Valor: Nenhuma proposta fica sem acompanhamento.

**10.3 -- Contrato assinado: onboarding**
- Trigger: Card movido para "Contrato Assinado"
- Acoes:
  - Adicionar tag "cliente-ativo" + Remover tag "lead"
  - Enviar mensagem "Seja bem-vindo! Seu caso esta oficialmente conosco. O Dr. [nome] sera seu advogado responsavel. Em breve entraremos em contato com os proximos passos."
  - Notificar equipe "Novo contrato: {{contact_name}}"
  - Registrar atividade "Contrato assinado"
- Valor: Transicao profissional de lead para cliente. Onboarding comeca no momento da assinatura.

**10.4 -- Caso encerrado: pos-atendimento**
- Trigger: Card movido para "Caso Encerrado"
- Acoes:
  - Enviar mensagem "{{contact_name}}, seu caso foi finalizado. Foi um prazer te representar. Se no futuro precisar de orientacao juridica, conte conosco."
  - Adicionar tag "ex-cliente"
  - Registrar atividade "Caso encerrado"
- Valor: Encerramento profissional que abre portas para indicacoes e novos casos.

**10.5 -- Lead perdido: analise e reativacao futura**
- Trigger: Card movido para "Perdido"
- Acoes:
  - Registrar nota "Motivo da perda: [a ser preenchido]"
  - Enviar mensagem "{{contact_name}}, entendemos sua decisao. Se mudar de ideia ou surgir outra questao juridica, estamos a disposicao. Sucesso!"
  - Agendar reativacao em 60 dias
- Valor: Coleta de motivos de perda + porta aberta para retorno.

---

### TRIGGER 11: Pagamento Concluido

**11.1 -- Confirmacao de pagamento de honorarios**
- Trigger: Pagamento confirmado
- Acoes:
  - Mover para "Contrato Assinado"
  - Enviar mensagem "Pagamento de R${{amount}} confirmado. Seu contrato esta ativo. Proximo passo: vamos agendar uma reuniao para alinhar a estrategia do seu caso."
  - Notificar advogado "Pagamento recebido de {{contact_name}} - R${{amount}}"
  - Registrar atividade "Pagamento confirmado: R${{amount}} - {{product_name}}"
- Valor: Zero fricao entre pagamento e inicio do trabalho.

**11.2 -- Recebimento de parcela**
- Trigger: Pagamento de parcela confirmado
- Acoes: Registrar nota "Parcela R${{amount}} paga em {{payment_date}}" + Atualizar tag de adimplencia
- Valor: Controle financeiro automatico. Saber quais clientes estao em dia.

**11.3 -- Pagamento de consulta**
- Trigger: Pagamento confirmado (product = "consulta")
- Acoes: Mover para "Aguardando Consulta" + Enviar confirmacao + Notificar advogado
- Valor: Consulta paga = compromisso firme. Reduz no-show drasticamente.

---

### TRIGGER 12: Intencao Detectada (LLM)

**12.1 -- Detectar que o lead quer contratar**
- Trigger: Intencao "hire_lawyer" com confianca > 0.85
- Exemplos de mensagens que ativam:
  - "Preciso de um advogado pra resolver isso"
  - "Como faco pra voces pegarem meu caso?"
  - "Quero que voces me representem"
  - "Vamos fechar?"
- Acoes: Tag "intencao-contratar" + Mover para "Negociacao" + Notificar advogado (importante)
- Valor: A IA entende intencao mesmo sem palavras-chave exatas. "Quero resolver isso logo" indica contratacao.

**12.2 -- Detectar insatisfacao com advogado anterior**
- Trigger: Intencao "dissatisfied_previous" com confianca > 0.80
- Exemplos:
  - "Meu advogado nunca me responde"
  - "Ja gastei dinheiro e nao resolveu nada"
  - "To decepcionado com o atendimento que tive"
- Acoes: Tag "troca-advogado" + Registrar nota + Notificar advogado
- Valor: Saber que o lead vem de experiencia ruim permite uma abordagem de confianca e transparencia.

**12.3 -- Detectar lead apenas pesquisando (nao pronto)**
- Trigger: Intencao "just_researching" com confianca > 0.80
- Exemplos:
  - "To so vendo quanto mais ou menos custa"
  - "Ainda nao decidi se vou entrar com processo"
  - "Queria entender meus direitos primeiro"
- Acoes: Tag "pesquisando" + Manter em "Triagem"
- Valor: Nao pressionar quem esta pesquisando. Nutrir com informacoes ate estar pronto.

**12.4 -- Detectar situacao emocional delicada**
- Trigger: Intencao "emotional_distress" com confianca > 0.80
- Exemplos:
  - "Nao sei mais o que fazer"
  - "To desesperado com essa situacao"
  - "Minha vida ta desmoronando"
- Acoes: Tag "sensivel" + Notificar advogado + Registrar nota "Lead em situacao emocional delicada - abordagem cuidadosa"
- Valor: Advocacia lida com momentos dificeis. O advogado sabe que precisa de empatia redobrada.

---

### TRIGGER 13: Urgencia Detectada (LLM)

**13.1 -- Emergencia criminal**
- Trigger: Urgencia "high" + tag "criminal"
- Exemplos:
  - "Meu filho foi preso agora"
  - "Estao cumprindo mandado na minha casa"
  - "Preciso de um advogado AGORA na delegacia"
- Acoes: Notificar TODOS os advogados (critico) + Transferir para humano + Tag "emergencia-criminal" + Mover para "Urgente"
- Valor: Caso criminal nao espera horario comercial. Mobilizacao imediata.

**13.2 -- Prazo judicial vencendo**
- Trigger: Urgencia "high"
- Exemplos:
  - "Tenho audiencia amanha e meu advogado sumiu"
  - "O prazo vence na sexta"
  - "Preciso protocolar ate amanha"
- Acoes: Notificar equipe toda (critico) + Tag "prazo-urgente"
- Valor: Prazos judiciais sao imperdoaveis. O sistema garante que ninguem perca.

**13.3 -- Triagem por nivel de urgencia**
- Trigger: Urgencia detectada (qualquer nivel)
- Logica:
  - High: Notificar todos + Transferir humano + Tag "urgente"
  - Medium: Notificar responsavel + Tag "prioridade-media"
  - Low: Manter fluxo normal + Registrar atividade
- Valor: Fila inteligente. Emergencias passam na frente sem ninguem decidir manualmente.

---

## Fluxos Completos -- Jornadas Reais

### Jornada 1: Lead Trabalhista via Google Ads

```
1. Pessoa pesquisa "advogado trabalhista Porto Alegre" no Google
2. Clica no anuncio e manda WhatsApp

[lead_source: meta_ads, campanha "Trabalhista POA"]
  -> Card criado + Tag "google-trabalhista" + Coluna "Novos"
  -> Notifica equipe

3. Bot atende: "Ola! Sou o assistente do escritorio. Como posso ajudar?"
4. Lead: "Fui demitido e acho que nao recebi tudo certo"

[keyword_detected: "demitido"]
  -> Tag "trabalhista" + Atribuir Dr. Fulano (trabalhista)

5. Bot coleta informacoes basicas e pergunta se quer agendar consulta
6. Lead: "Quanto custa a consulta?"

[keyword_detected: "quanto custa"]
  -> Tag "intencao-contratar" + Notifica advogado

7. Bot responde valor da consulta
8. Lead: "Quero agendar"

[intent_detected: "schedule_consultation"]
  -> Mover para "Aguardando Consulta"
  -> Enviar confirmacao

9. Consulta realizada, advogado move card

[card_moved: para "Consulta Realizada"]
  -> Registrar atividade

10. Proposta enviada

[card_moved: para "Proposta Enviada"]
  -> Iniciar timer de follow-up (3 dias)

11. 3 dias sem resposta

[inactivity: 3 dias]
  -> Enviar follow-up automatico

12. Lead aceita e paga

[payment_completed]
  -> Mover para "Contrato Assinado"
  -> Notificar equipe "Novo contrato!"
  -> Mensagem de boas-vindas
```

**Tempo total sem automacao:** Horas de trabalho manual entre etapas
**Tempo total com automacao:** Tudo acontece sozinho, advogado so atende e faz o juridico

---

### Jornada 2: Emergencia Criminal de Madrugada

```
1. 02h30 da manha. Mae manda mensagem: "Meu filho foi preso"

[message_received: is_first_message]
  -> Card criado + Tag "novo-lead"

[keyword_detected: "preso"]
  -> Tag "criminal" + Tag "urgente"

[urgency_detected: high]
  -> Notificar TODOS os advogados (critico)
  -> Push notification no celular de todos
  -> Transferir para humano imediatamente

2. Bot responde: "Entendo a urgencia da situacao. Estou acionando um de nossos advogados criminalistas agora mesmo."

3. Dr. Criminalista recebe notificacao, abre o app, ve:
   - Tag: criminal, urgente
   - Nota: "Filho preso, mae desesperada"
   - Historico completo da conversa

4. Advogado responde em 5 minutos

[message_sent: sent_by = human]
  -> Registrar "Advogado respondeu em 5min"
  -> Mover para "Triagem"
```

**Sem automacao:** Mae manda mensagem, ninguem ve ate 8h da manha. 6 horas perdidas.
**Com automacao:** Advogado notificado em segundos, mesmo dormindo.

---

### Jornada 3: Divorcio -- Lead Emocional com Longo Ciclo

```
1. Lead manda: "Boa tarde, to passando por uma separacao e nao sei o que fazer"

[message_received: is_first_message]
  -> Card criado

[intent_detected: "emotional_distress"]
  -> Tag "sensivel"
  -> Nota: "Abordagem cuidadosa - situacao emocional"

[keyword_detected: "separacao"]
  -> Tag "familia"
  -> Atribuir Dra. Familiarista

2. Bot atende com empatia, coleta informacoes basicas
3. Lead: "Ainda nao sei se quero entrar com divorcio"

[intent_detected: "just_researching"]
  -> Tag "pesquisando"
  -> Manter em "Triagem"

4. Bot fornece informacoes gerais, nao pressiona
5. Lead para de responder

[inactivity: 3 dias]
  -> Follow-up gentil: "Ola, estou por aqui se precisar conversar."

6. Lead volta 10 dias depois: "Decidi que quero o divorcio"

[message_received: lead com tag "pesquisando"]
  -> Remover tag "pesquisando"
  -> Adicionar tag "decidido"
  -> Notificar Dra. Familiarista

[intent_detected: "hire_lawyer"]
  -> Tag "intencao-contratar"
  -> Mover para "Negociacao"
  -> Notificar (importante)

7. Dra. atende, agenda consulta, envia proposta, fecha contrato
```

**Valor:** O sistema respeitou o tempo do lead. Nao pressionou. Quando decidiu, estava la pronto.

---

### Jornada 4: Cliente Ativo -- Caso em Andamento

```
1. Cliente (ja com contrato) manda mensagem sobre o caso

[message_received: card com tag "cliente-ativo"]
  -> Notificar advogado responsavel
  -> Registrar atividade "Cliente entrou em contato"

2. Bot responde: "Ola {{contact_name}}! Vou avisar o Dr. [nome] que voce entrou em contato."

3. Advogado responde com atualizacao do processo

[message_sent: sent_by = human]
  -> Registrar "Advogado atualizou cliente"

4. Caso finalizado, advogado move card

[card_moved: para "Caso Encerrado"]
  -> Enviar mensagem de encerramento
  -> Tag "ex-cliente"

5. 90 dias depois

[inactivity: 90 dias]
  -> Enviar: "Ola {{contact_name}}! Como voce esta? Se surgir qualquer questao, estamos por aqui."

6. Ex-cliente responde 6 meses depois: "Tenho um amigo que precisa de advogado"

[keyword_detected: "amigo", "precisa de advogado"]
  -> Tag "indicou-amigo"
  -> Nota: "Ex-cliente indicando novo lead"
  -> Notificar equipe
```

**Valor:** Ciclo completo de cliente. Da contratacao ao pos-atendimento ate geracao de indicacao.

---

## Prompt do Bot -- Diretrizes para Advocacia

O bot de um escritorio de advocacia deve seguir regras especificas:

**PODE fazer:**
- Coletar informacoes basicas (nome, area do problema, urgencia)
- Informar areas de atuacao do escritorio
- Informar valores de consulta (se autorizado)
- Agendar consultas
- Fornecer endereco e contato
- Explicar como funciona o processo de contratacao

**NAO PODE fazer:**
- Dar parecer juridico ou opiniao sobre o caso
- Dizer se a pessoa "tem direito" ou "vai ganhar"
- Recomendar acoes juridicas especificas
- Interpretar leis ou jurisprudencia
- Prometer resultados
- Fazer diagnostico juridico

**Frase padrao quando pressionado:**
"Para uma analise adequada do seu caso, e importante conversar com um dos nossos advogados. Posso agendar uma consulta para voce."

---

## KPIs que as Automacoes Permitem Medir

| KPI | Como medir | Trigger/Acao envolvida |
|-----|-----------|----------------------|
| Tempo medio de primeira resposta | Diferenca entre card_created e primeira message_sent (human) | message_sent + log_activity |
| Taxa de conversao por campanha | Cards em "Contrato Assinado" / Cards com tag da campanha | lead_source + card_moved |
| Taxa de no-show em consultas | Cards em "Aguardando Consulta" que nunca moveram | card_moved + inactivity |
| Motivos de perda | Notas em cards na coluna "Perdido" | card_moved + add_note |
| Volume de leads por area | Contagem de tags por area do direito | keyword_detected + add_tag |
| Receita por advogado | Pagamentos agrupados por advogado responsavel | payment_completed + assign_to |
| Leads que voltaram | Cards com tag "retorno" | message_received + add_tag |
| Eficiencia do bot | Conversas resolvidas sem transferencia humana | transfer_human (ausencia) |
| NPS / Satisfacao | Respostas de pesquisa pos-atendimento | card_moved + send_message |

---

## Resumo Executivo para Apresentacao Comercial

**Para o advogado/socio:**
"O sistema classifica automaticamente cada lead por area do direito, direciona para o advogado certo, e faz follow-up sozinho. Voce so atende e faz o juridico. O CRM cuida do resto."

**Para o gestor/administrativo:**
"Voce vai ter visibilidade total do funil: quantos leads, quantas consultas, quantas propostas, quantos contratos. Tudo atualizado em tempo real sem ninguem precisar mover cards manualmente."

**Para o financeiro:**
"Cada pagamento atualiza o CRM automaticamente. Voce sabe quem pagou, quem esta em atraso, e quanto cada campanha de marketing gerou de faturamento real."

**Objecoes comuns e respostas:**

| Objecao | Resposta |
|---------|---------|
| "O bot pode dar parecer juridico?" | Nao. O bot coleta informacoes e agenda consulta. Quem analisa e o advogado. |
| "E se o cliente mandar mensagem de madrugada?" | O bot atende 24/7. Se for urgencia criminal, notifica todos os advogados no celular. |
| "Tenho medo de parecer robotico" | O prompt e personalizado com o tom do escritorio. A maioria dos leads nao percebe que e bot. |
| "E sigilo profissional?" | As conversas ficam em banco de dados criptografado. Acesso apenas pela equipe autorizada. |
| "Quanto custa por mensagem?" | Mensagens recebidas sao gratuitas (janela 24h). Templates (fora da janela) custam ~R$0,30 cada. |
