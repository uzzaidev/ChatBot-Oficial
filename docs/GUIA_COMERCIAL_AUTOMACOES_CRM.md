# Guia Comercial -- Automacoes CRM UzzApp

**Documento de uso interno para apresentacao comercial**
**Versao:** 1.0 | **Data:** 2026-04-06

---

## O que sao as Automacoes do CRM?

As automacoes permitem que acoes acontecam automaticamente no CRM quando eventos especificos ocorrem. Em vez de uma pessoa mover cards, adicionar tags, enviar mensagens ou notificar a equipe manualmente, o sistema faz isso sozinho em tempo real.

**Formula:** QUANDO [trigger acontece] -> ENTAO [acao e executada automaticamente]

**Diferenciais tecnicos:**
- Encadeamento de acoes (um trigger dispara varias acoes em sequencia)
- Variaveis dinamicas nas mensagens (nome do contato, valor pago, campanha de origem)
- Politica de 24h do WhatsApp respeitada automaticamente (usa template como fallback)
- Deduplicacao (nao dispara duas vezes para o mesmo evento)
- Inteligencia artificial para detectar intencoes e urgencias

---

## TRIGGER 1: Mensagem Recebida

**O que e:** Dispara sempre que um cliente envia qualquer mensagem no WhatsApp.
**Variavel especial:** `is_first_message` -- permite filtrar apenas o primeiro contato.

### Possibilidades comerciais:

**1.1 -- Boas-vindas automatica para novos leads**
- Trigger: Mensagem recebida (is_first_message = true)
- Acoes: Criar card no CRM + Mover para coluna "Novos" + Adicionar tag "novo-lead"
- Valor: Todo novo contato ja entra organizado no funil sem ninguem precisar fazer nada.

**1.2 -- Alerta de volume para equipe de vendas**
- Trigger: Mensagem recebida (qualquer)
- Acao: Notificar equipe quando ha muitas mensagens chegando
- Valor: O gestor sabe em tempo real o volume de demanda e pode escalar atendentes.

**1.3 -- Registro automatico de atividade**
- Trigger: Mensagem recebida (qualquer)
- Acao: Registrar atividade no timeline do card "Cliente enviou mensagem"
- Valor: Historico completo de interacoes no CRM sem digitacao manual.

**1.4 -- Reativacao de leads frios**
- Trigger: Mensagem recebida (de lead que estava inativo)
- Acoes: Mover card para "Reativados" + Notificar responsavel + Adicionar tag "reativado"
- Valor: Quando um lead frio volta a falar, a equipe e notificada imediatamente para nao perder a oportunidade.

**1.5 -- Classificacao por tipo de midia**
- Trigger: Mensagem recebida (message_type = audio/image/document)
- Acao: Adicionar tag "enviou-audio" ou "enviou-documento"
- Valor: Identificar padrao de comunicacao do lead para personalizar abordagem.

---

## TRIGGER 2: Mensagem Enviada

**O que e:** Dispara quando uma mensagem e enviada para o cliente (pelo bot ou por humano).
**Variavel especial:** `sent_by` -- diferencia se foi o bot ou um atendente humano.

### Possibilidades comerciais:

**2.1 -- Monitorar tempo de resposta humana**
- Trigger: Mensagem enviada (sent_by = human)
- Acao: Registrar atividade "Atendente respondeu" com timestamp
- Valor: O gestor consegue medir SLA de atendimento -- quanto tempo a equipe demora para responder.

**2.2 -- Mover card apos primeiro contato humano**
- Trigger: Mensagem enviada (sent_by = human)
- Acoes: Mover card para "Em Atendimento" + Atualizar status para "in_service"
- Valor: Quando alguem da equipe responde, o card muda automaticamente de coluna. Visibilidade total do funil.

**2.3 -- Notificar gestor sobre respostas do bot**
- Trigger: Mensagem enviada (sent_by = bot)
- Acao: Registrar atividade com conteudo da resposta
- Valor: Auditoria das respostas do bot para controle de qualidade.

**2.4 -- Confirmar envio de proposta**
- Trigger: Mensagem enviada (sent_by = human, conteudo com "proposta" ou "orcamento")
- Acoes: Mover card para "Proposta Enviada" + Adicionar tag "proposta-enviada"
- Valor: Funil atualizado automaticamente quando o vendedor envia uma proposta.

---

## TRIGGER 3: Palavra-chave Detectada

**O que e:** Dispara quando a mensagem do cliente contem palavras especificas configuradas.
**Configuracoes:** Lista de palavras + modo (ANY = qualquer uma, ALL = todas precisam aparecer).

### Possibilidades comerciais:

**3.1 -- Detectar intencao de compra**
- Keywords: "preco", "valor", "quanto custa", "plano", "mensalidade"
- Acoes: Adicionar tag "interesse-preco" + Mover para "Negociacao" + Notificar vendedor
- Valor: Quando o lead pergunta preco, e sinal de compra. O vendedor e avisado na hora.

**3.2 -- Detectar insatisfacao**
- Keywords: "reclamacao", "cancelar", "insatisfeito", "problema", "nao gostei"
- Acoes: Adicionar tag "risco-churn" + Mover para "Atencao" + Notificar gestor (prioridade critica)
- Valor: Retencao proativa -- antes que o cliente cancele, a equipe ja esta ciente.

**3.3 -- Identificar leads de indicacao**
- Keywords: "indicacao", "amigo indicou", "me recomendaram", "fulano falou"
- Acoes: Adicionar tag "indicacao" + Registrar nota "Lead veio por indicacao"
- Valor: Medir ROI de boca a boca e priorizar esses leads (taxa de conversao mais alta).

**3.4 -- Capturar interesse em produtos/servicos especificos**
- Keywords: configurar por produto (ex: "personal", "grupo", "online", "presencial")
- Acoes: Adicionar tag do produto + Mover para coluna correspondente
- Valor: Segmentacao automatica por interesse. Cada lead ja cai no funil certo.

**3.5 -- Detectar urgencia na linguagem**
- Keywords: "urgente", "hoje", "agora", "preciso pra ja", "emergencia"
- Acoes: Notificar equipe (prioridade critica) + Adicionar tag "urgente"
- Valor: Atendimento prioritario para quem precisa de resposta imediata.

**3.6 -- Monitorar mencoes a concorrentes**
- Keywords: nomes de concorrentes
- Acoes: Adicionar tag "comparando-concorrencia" + Notificar vendedor
- Valor: Saber quando o lead esta comparando permite uma abordagem consultiva.

---

## TRIGGER 4: Inatividade

**O que e:** Dispara apos X dias sem nenhuma resposta do cliente.
**Configuracao:** Numero de dias de inatividade (padrao: 3).

### Possibilidades comerciais:

**4.1 -- Follow-up automatico apos 3 dias**
- Trigger: 3 dias de inatividade
- Acao: Enviar mensagem "Oi {{contact_name}}, tudo bem? Vi que conversamos dias atras. Posso te ajudar com mais alguma coisa?"
- Valor: Follow-up sem esforco humano. Muitos leads so precisam de um empurrao.

**4.2 -- Escalar para gestor apos 7 dias**
- Trigger: 7 dias de inatividade
- Acoes: Mover para coluna "Frios" + Notificar gestor + Adicionar tag "inativo-7d"
- Valor: Gestor sabe quais leads estao esfriando e pode decidir estrategia de recuperacao.

**4.3 -- Oferta especial apos 14 dias**
- Trigger: 14 dias de inatividade
- Acao: Enviar template com oferta especial ou convite para evento
- Valor: Ultima tentativa automatica antes de considerar o lead perdido.

**4.4 -- Limpeza automatica apos 30 dias**
- Trigger: 30 dias de inatividade
- Acoes: Mover para "Arquivo" + Adicionar tag "perdido" + Remover tag "ativo"
- Valor: CRM limpo automaticamente. Sem cards mortos poluindo o funil.

**4.5 -- Pesquisa de satisfacao pos-venda**
- Trigger: 5 dias de inatividade apos pagamento
- Acao: Enviar template "Como esta sendo sua experiencia? Conta pra gente!"
- Valor: Coleta de feedback automatica no momento certo.

---

## TRIGGER 5: Mudanca de Status

**O que e:** Dispara quando o status da conversa muda (bot -> humano, humano -> closed, etc).
**Opcoes de status:** bot, human, closed.

### Possibilidades comerciais:

**5.1 -- Preparar atendente quando bot transfere**
- Trigger: Status muda de "bot" para "human"
- Acoes: Notificar atendente designado + Adicionar nota com resumo do bot + Atualizar status para "awaiting_attendant"
- Valor: O atendente recebe contexto completo antes de falar com o cliente. Sem perguntar "como posso ajudar?" de novo.

**5.2 -- Registro de encerramento**
- Trigger: Status muda para "closed"
- Acoes: Registrar atividade "Conversa encerrada" + Mover card para "Concluidos"
- Valor: Metricas de atendimento -- quantas conversas foram encerradas por dia/semana.

**5.3 -- Retorno ao bot apos atendimento humano**
- Trigger: Status muda de "human" para "bot"
- Acoes: Registrar nota "Atendimento humano finalizado, bot reativado" + Enviar mensagem "Se precisar de mais alguma coisa, estou por aqui!"
- Valor: Transicao suave de volta ao bot, sem o cliente perceber descontinuidade.

**5.4 -- Alertar sobre conversas paradas em humano**
- Trigger: Status permanece em "human" (combinado com inatividade)
- Acoes: Notificar gestor "Conversa com {{contact_name}} esta em atendimento humano ha X horas"
- Valor: Evita que leads fiquem esquecidos na fila do atendimento humano.

---

## TRIGGER 6: Origem do Lead

**O que e:** Dispara quando um lead chega de uma fonte especifica.
**Origens:** meta_ads, organic, direct, referral.
**Variaveis:** campaign_name, ad_name, ad_id.

### Possibilidades comerciais:

**6.1 -- Funil separado por campanha de ads**
- Trigger: Origem = meta_ads
- Acoes: Mover para coluna "Leads Ads" + Adicionar tag com nome da campanha + Notificar equipe de vendas
- Valor: Saber exatamente qual campanha gerou qual lead. ROI real do trafego pago.

**6.2 -- Tratamento VIP para indicacoes**
- Trigger: Origem = referral
- Acoes: Mover para "Indicacoes" + Adicionar tag "indicacao" + Atribuir ao vendedor senior
- Valor: Leads de indicacao convertem mais. Tratamento prioritario maximiza conversao.

**6.3 -- Monitorar leads organicos**
- Trigger: Origem = organic
- Acoes: Adicionar tag "organico" + Registrar nota com dados de origem
- Valor: Medir quanto do funil vem organicamente vs. pago. Justifica investimento em SEO/conteudo.

**6.4 -- Abordagem personalizada por campanha**
- Trigger: Origem = meta_ads (campanha especifica)
- Acao: Enviar mensagem personalizada referente ao anuncio que a pessoa viu
- Valor: Continuidade entre o anuncio e o atendimento. Lead sente que a empresa sabe do que ele precisa.

**6.5 -- Relatorio automatico de custo por lead**
- Trigger: Origem = meta_ads
- Acoes: Registrar atividade com ad_id e campaign_name
- Valor: Cruzar dados do CRM com Meta Ads para calcular custo real por lead qualificado.

---

## TRIGGER 7: Transferencia para Humano

**O que e:** Dispara quando o cliente solicita falar com um atendente humano.

### Possibilidades comerciais:

**7.1 -- Distribuicao inteligente de atendimento**
- Trigger: Transferencia solicitada
- Acoes: Atribuir ao vendedor disponivel (round-robin) + Notificar (prioridade importante) + Mover para "Aguardando Atendente"
- Valor: Nenhuma transferencia fica sem dono. Distribuicao justa entre a equipe.

**7.2 -- SLA de resposta**
- Trigger: Transferencia solicitada
- Acoes: Registrar hora da transferencia + Notificar gestor se nao atendido em 30 min
- Valor: Garantir que a janela de 24h nao expire sem resposta. Cada transferencia tem um relogio.

**7.3 -- Contexto para o atendente**
- Trigger: Transferencia solicitada
- Acoes: Adicionar nota automatica com resumo da conversa do bot + Tags de interesse detectadas
- Valor: O atendente nao comeca do zero. Sabe o que o cliente quer antes de responder.

**7.4 -- Metricas de transferencia**
- Trigger: Transferencia solicitada
- Acao: Registrar atividade "Transferencia solicitada: {{request_text}}"
- Valor: Entender POR QUE os leads pedem humano. Se muitos pedem por preco, talvez o bot precise de mais info de precos.

---

## TRIGGER 8: Card Criado

**O que e:** Dispara quando um novo card e criado no CRM (seja automaticamente ou manualmente).

### Possibilidades comerciais:

**8.1 -- Onboarding automatico de novos leads**
- Trigger: Card criado
- Acoes: Mover para "Novos" + Atribuir responsavel + Adicionar tag "novo" + Notificar equipe
- Valor: Todo novo lead ja entra no funil organizado, com dono e na coluna certa.

**8.2 -- Mensagem de boas-vindas personalizada**
- Trigger: Card criado
- Acao: Enviar mensagem "Ola {{contact_name}}! Que bom ter voce por aqui. Em breve alguem da nossa equipe vai falar com voce."
- Valor: O lead sente acolhimento imediato, mesmo que o humano demore um pouco.

**8.3 -- Alerta de novo lead para gestores**
- Trigger: Card criado
- Acao: Notificar todos os admins "Novo lead: {{contact_name}} ({{phone}})"
- Valor: Visibilidade total para a gestao sobre volume de novos leads em tempo real.

**8.4 -- Segmentacao inicial por origem**
- Trigger: Card criado (source_type = meta_ads)
- Acoes: Adicionar tag da campanha + Mover para coluna "Leads Ads"
- Valor: Desde o primeiro segundo, o lead ja esta segmentado corretamente.

---

## TRIGGER 9: Tag Adicionada

**O que e:** Dispara quando uma tag especifica e adicionada a um card.

### Possibilidades comerciais:

**9.1 -- Fluxo de nutricao por interesse**
- Trigger: Tag "interesse-produto-X" adicionada
- Acoes: Enviar mensagem com informacoes do produto + Mover para coluna do produto
- Valor: Nutricao automatica segmentada. Cada lead recebe conteudo relevante ao que demonstrou interesse.

**9.2 -- Alerta de risco de churn**
- Trigger: Tag "risco-churn" adicionada
- Acoes: Notificar gestor (prioridade critica) + Atribuir ao responsavel de retencao + Mover para "Atencao"
- Valor: Time de retencao acionado automaticamente antes do cancelamento.

**9.3 -- Campanha de upsell**
- Trigger: Tag "cliente-ativo" adicionada
- Acao: Apos 30 dias, enviar template com upgrade de plano ou produto complementar
- Valor: Upsell automatizado no momento certo do ciclo de vida do cliente.

**9.4 -- Acionar fluxo de reativacao**
- Trigger: Tag "inativo" adicionada
- Acoes: Mover para "Reativacao" + Enviar sequencia de mensagens de recuperacao
- Valor: Leads inativos entram automaticamente em campanha de recuperacao.

**9.5 -- Marcar como qualificado**
- Trigger: Tag "qualificado" adicionada
- Acoes: Mover para "Qualificados" + Notificar vendedor + Registrar atividade
- Valor: Quando o bot ou atendente marca como qualificado, o funil se organiza sozinho.

---

## TRIGGER 10: Card Movido

**O que e:** Dispara quando um card e movido entre colunas do CRM (Kanban).
**Configuracao:** Coluna de origem e coluna de destino.

### Possibilidades comerciais:

**10.1 -- Notificar cliente sobre avancos no processo**
- Trigger: Card movido para "Proposta Enviada"
- Acao: Enviar mensagem "Preparamos uma proposta especial para voce! Em breve vamos te enviar os detalhes."
- Valor: Cliente acompanha o processo e sente proatividade da empresa.

**10.2 -- Escalar para gerencia**
- Trigger: Card movido para "Negociacao Avancada"
- Acoes: Atribuir ao gerente comercial + Notificar (prioridade importante)
- Valor: Deals grandes automaticamente sobem para quem tem autonomia de aprovacao.

**10.3 -- Pos-venda automatico**
- Trigger: Card movido para "Ganho/Fechado"
- Acoes: Adicionar tag "cliente" + Remover tag "lead" + Enviar mensagem de boas-vindas como cliente + Registrar atividade "Venda concluida"
- Valor: Transicao de lead para cliente sem nenhuma acao manual. Onboarding pos-venda ja comeca.

**10.4 -- Analise de perdas**
- Trigger: Card movido para "Perdido"
- Acoes: Registrar nota com motivo + Adicionar tag "perdido" + Enviar pesquisa "O que poderiamos ter feito diferente?"
- Valor: Coleta automatica de motivos de perda para melhorar a taxa de conversao.

**10.5 -- Revisita apos perda**
- Trigger: Card movido para "Perdido"
- Acao: Agendar follow-up em 30 dias (via inatividade combinada)
- Valor: Leads perdidos nao sao esquecidos. Recebem nova tentativa apos "esfriar".

---

## TRIGGER 11: Pagamento Concluido

**O que e:** Dispara quando um pagamento via Stripe e confirmado.
**Variaveis:** valor, email, telefone, nome do produto, data do pagamento.

### Possibilidades comerciais:

**11.1 -- Pos-venda imediato**
- Trigger: Pagamento confirmado
- Acoes: Mover card para "Clientes" + Remover tag "lead" + Adicionar tag "cliente-ativo" + Enviar mensagem "Pagamento confirmado! Seja bem-vindo. Aqui esta o proximo passo..."
- Valor: Zero atrito entre pagamento e onboarding. O cliente recebe orientacao na hora.

**11.2 -- Notificacao interna de venda**
- Trigger: Pagamento confirmado
- Acoes: Notificar toda equipe "Venda! {{contact_name}} comprou {{product_name}} - R${{amount}}" + Registrar atividade
- Valor: Celebracao e visibilidade. Toda a equipe sabe que fechou uma venda.

**11.3 -- Atualizacao de funil**
- Trigger: Pagamento confirmado
- Acoes: Mover para "Ganho" + Adicionar nota "Pagou R${{amount}} em {{product_name}} via Stripe"
- Valor: Funil 100% atualizado automaticamente com dados reais de faturamento.

**11.4 -- Campanha de indicacao pos-compra**
- Trigger: Pagamento confirmado (apos 7 dias)
- Acao: Enviar template "Gostando da experiencia? Indique um amigo e ganhe [beneficio]!"
- Valor: Programa de indicacao automatizado no momento de maior satisfacao do cliente.

**11.5 -- Cobranca de renovacao**
- Trigger: Pagamento de assinatura confirmado
- Acao: Registrar data de renovacao + Agendar lembrete X dias antes do vencimento
- Valor: Nenhuma renovacao e esquecida. Reduz churn involuntario.

---

## TRIGGER 12: Intencao Detectada (LLM)

**O que e:** O sistema usa IA para analisar a mensagem do cliente e detectar sinais comerciais com nivel de confianca configuravel.
**Diferencial:** Nao depende de palavras-chave exatas. Entende a INTENCAO por tras da mensagem.

### Possibilidades comerciais:

**12.1 -- Detectar intencao de compra mesmo sem palavras obvias**
- Trigger: Intencao "purchase_intent" com confianca > 0.85
- Acoes: Adicionar tag "intencao-compra" + Mover para "Oportunidade" + Notificar vendedor
- Valor: "Sera que da pra comecar semana que vem?" nao contem "preco" ou "valor", mas indica intencao de compra. A IA detecta isso.

**12.2 -- Identificar insatisfacao nas entrelinhas**
- Trigger: Intencao "churn_risk" com confianca > 0.80
- Acoes: Notificar gestor (critico) + Adicionar tag "risco-perda" + Atribuir a retencao
- Valor: "Nao sei se vale a pena continuar" nao tem palavras como "cancelar", mas a IA entende o sentimento.

**12.3 -- Capturar pedidos de agendamento**
- Trigger: Intencao "schedule_visit" com confianca > 0.85
- Acoes: Mover para "Agendamento" + Notificar atendente + Registrar atividade
- Valor: "Quero dar uma passada ai pra conhecer" e detectado como intencao de visita automaticamente.

**12.4 -- Detectar objecoes**
- Trigger: Intencao "objection" com confianca > 0.80
- Acoes: Adicionar tag "tem-objecao" + Registrar nota com a objecao detectada
- Valor: Saber quais objecoes aparecem mais para ajustar script de vendas e prompt do bot.

**12.5 -- Identificar leads prontos para fechar**
- Trigger: Intencao "ready_to_close" com confianca > 0.90
- Acoes: Notificar vendedor (critico) + Mover para "Fechamento"
- Valor: O lead que diz "vamos fechar?" ou "como faco pra assinar?" recebe atencao imediata.

---

## TRIGGER 13: Urgencia Detectada (LLM)

**O que e:** A IA analisa o nivel de urgencia na mensagem do cliente.
**Niveis:** high, medium, low.

### Possibilidades comerciais:

**13.1 -- Atendimento prioritario**
- Trigger: Urgencia "high" com confianca > 0.85
- Acoes: Notificar todos ativos (critico) + Transferir para humano + Mover para "Urgente"
- Valor: "Preciso resolver isso AGORA" recebe atendimento imediato, antes de qualquer outro lead na fila.

**13.2 -- Triagem inteligente de suporte**
- Trigger: Urgencia "medium"
- Acoes: Adicionar tag "prioridade-media" + Atribuir ao proximo atendente disponivel
- Valor: Nem tudo e urgente, mas tambem nao pode esperar. Triagem automatica sem intervenção humana.

**13.3 -- Monitorar padroes de urgencia**
- Trigger: Urgencia "high" (qualquer)
- Acao: Registrar atividade com dados de urgencia
- Valor: Relatorio de quantas mensagens urgentes chegam por dia/semana. Indica se a operacao esta saudavel.

**13.4 -- Prevencao de crises**
- Trigger: Urgencia "high" + keywords de reclamacao
- Acoes: Notificar gestor (critico) + Adicionar tag "crise" + Registrar nota
- Valor: Mensagens como "vou abrir reclamacao no Procon" disparam protocolo de crise automaticamente.

**13.5 -- Priorizacao de fila**
- Trigger: Urgencia detectada (qualquer nivel)
- Acao: Atualizar auto-status com base no nivel (high = "awaiting_attendant", low = "neutral")
- Valor: A fila de atendimento se organiza sozinha por prioridade.

---

## Combinacoes Poderosas (Triggers + Acoes Encadeadas)

As automacoes ganham forca real quando combinadas. Aqui estao fluxos completos:

### Fluxo 1: Lead de Ads ate Venda

```
Lead clica no anuncio e manda mensagem
  -> [lead_source: meta_ads] Cria card + tag campanha + coluna "Leads Ads"
  -> Bot atende e lead pergunta preco
  -> [keyword_detected: "preco","valor"] Tag "interesse-preco" + Notifica vendedor
  -> Lead pede pra falar com humano
  -> [transfer_human] Atribui vendedor + Nota com resumo + Coluna "Em Negociacao"
  -> Vendedor fecha venda, move card
  -> [card_moved: para "Ganho"] Tag "cliente" + Mensagem de boas-vindas
  -> Stripe confirma pagamento
  -> [payment_completed] Nota com valor + Notifica equipe "Venda!"
```

### Fluxo 2: Retencao Automatica

```
Cliente para de responder
  -> [inactivity: 3 dias] Mensagem de follow-up
  -> Continua sem responder
  -> [inactivity: 7 dias] Notifica gestor + Tag "risco"
  -> IA detecta insatisfacao quando volta
  -> [intent_detected: "churn_risk"] Notifica retencao (critico) + Coluna "Atencao"
  -> Se menciona cancelar
  -> [keyword_detected: "cancelar"] Transfere para humano + Protocolo retencao
```

### Fluxo 3: Qualificacao Automatica por IA

```
Lead manda mensagem
  -> [message_received: is_first_message] Card criado + Coluna "Novos"
  -> Bot conversa e IA detecta intencao de compra
  -> [intent_detected: "purchase_intent"] Tag "qualificado" + Coluna "Oportunidade"
  -> Lead pergunta preco
  -> [keyword_detected: "quanto custa"] Notifica vendedor
  -> Lead pede urgencia
  -> [urgency_detected: high] Notifica equipe toda (critico) + Prioriza na fila
```

### Fluxo 4: Pos-Venda e Fidelizacao

```
Pagamento confirmado
  -> [payment_completed] Coluna "Clientes" + Tag "ativo" + Mensagem boas-vindas
  -> 5 dias depois sem mensagem
  -> [inactivity: 5 dias] Enviar pesquisa de satisfacao
  -> 30 dias depois
  -> [inactivity: 30 dias] Enviar oferta de indicacao
  -> Cliente indica alguem
  -> [keyword_detected: "indicacao"] Tag "indicou-amigo" + Nota + Vendedor notificado
```

---

## Resumo Quantitativo

| Recurso | Quantidade |
|---------|-----------|
| Triggers disponiveis | 13 |
| Acoes disponiveis | 9 |
| Combinacoes possiveis (trigger + 1 acao) | 117 |
| Combinacoes com encadeamento (trigger + N acoes) | Ilimitadas |
| Exemplos neste documento | 55+ |

---

## Proximo Passo

Escolha um nicho/segmento e eu detalhare exemplos especificos com:
- Nomes de colunas do CRM sugeridas
- Tags recomendadas
- Fluxos completos passo a passo
- Mensagens prontas para cada automacao
- KPIs que cada automacao permite medir

**Nichos sugeridos:** Escolas/academias, clinicas de saude, e-commerce, consultorios, imobiliarias, SaaS, restaurantes, escritorios de advocacia, agencias de marketing.
