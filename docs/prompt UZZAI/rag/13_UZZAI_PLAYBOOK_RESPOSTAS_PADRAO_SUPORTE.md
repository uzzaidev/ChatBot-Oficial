# UzzAI - Playbook de Respostas Padrao (Suporte)

## Objetivo

Padronizar respostas de suporte para manter consistencia, clareza e velocidade.
Formato recomendado: confirmacao + proximo passo + coleta minima + encaminhamento quando necessario.

## Estrutura curta obrigatoria

1. Confirmar o problema com linguagem simples.
2. Informar o proximo passo imediato.
3. Pedir no maximo 1 a 2 dados faltantes.
4. Sinalizar encaminhamento humano se houver risco, recorrencia ou baixa confianca.

## Cenarios e respostas base

### 1) "Cliente falou uma coisa e o bot respondeu outra"

Resposta base:
"Entendi, o bot respondeu fora do contexto do que voce pediu. Vou registrar essa inconsistencia agora e validar o fluxo dessa conversa. Se puder, me envie a mensagem exata que voce mandou e a resposta recebida para eu acelerar a analise tecnica."

### 2) "Respondeu errado" / "Nao respondeu o que perguntei"

Resposta base:
"Perfeito, entendi o ponto. Essa resposta nao ficou aderente ao que voce perguntou e vou tratar como ajuste de qualidade. Me confirma por favor qual era o resultado esperado para eu registrar corretamente."

### 3) "Mandou duas vezes a mesma mensagem"

Resposta base:
"Obrigado por avisar, isso indica possivel duplicidade no envio. Vou abrir a verificacao desse evento agora. Me confirma o horario aproximado e se aconteceu uma vez ou varias vezes."

### 4) "Mandou duas imagens iguais"

Resposta base:
"Entendi, houve duplicidade de imagem no envio. Vou registrar como incidente de repeticao para analise tecnica. Se puder, me diga o horario e em qual etapa do atendimento isso aconteceu."

### 5) "Precisei mandar duas vezes para funcionar"

Resposta base:
"Perfeito, isso nao e o comportamento esperado. Vou registrar como possivel falha intermitente e revisar o fluxo. Me confirma o que voce tentou na primeira vez e o que mudou na segunda tentativa."

### 6) "Parou de responder"

Resposta base:
"Entendi, tivemos interrupcao no atendimento. Vou tratar como prioridade e verificar se houve falha no fluxo ou integracao. Me envie o horario aproximado da ultima mensagem sem resposta."

### 7) "Sumiu mensagem" / "Nao puxou contato"

Resposta base:
"Obrigado pelo contexto, isso pode indicar falha de sincronizacao. Vou registrar e acionar verificacao tecnica com esses dados. Se puder, me passe o contato afetado e o horario do ocorrido."

### 8) "Bot se perdeu" / "Misturou conversa"

Resposta base:
"Entendi, houve inconsistência de contexto nessa conversa. Vou registrar como incidente de memoria/contexto para ajuste. Me envia um exemplo curto da pergunta e da resposta para eu anexar ao ticket."

### 9) "Respondeu fora de ordem" / "Resposta atrasada"

Resposta base:
"Perfeito, obrigado por sinalizar. Vou registrar como possivel problema de ordenacao/tempo de processamento. Me confirma o intervalo aproximado entre as mensagens para eu fechar a triagem."

### 10) Cliente envia print com erro sem explicar muito

Resposta base:
"Analisei o print e identifiquei o ponto principal do erro. Vou registrar para validacao tecnica agora. Para concluir a triagem, me confirma o que voce tentou fazer imediatamente antes dessa tela."

## Variantes por severidade

### Alta severidade (critical/high)

Modelo:
"Entendi, esse caso tem impacto alto no atendimento. Ja estou encaminhando para analise tecnica prioritaria e acompanhando por aqui. Se tiver mais ocorrencias agora, me avise no mesmo canal para anexarmos no chamado."

### Media/baixa severidade (medium/low)

Modelo:
"Perfeito, ja registrei esse comportamento para ajuste. Vou seguir com a validacao tecnica e te manter atualizado por aqui. Se repetir, me envie horario e print para acelerar a correção."

## Frases proibidas (nao usar)

- "Isso e normal" (sem validar evidencia)
- "Ja sei a causa" (sem confirmacao tecnica)
- "Ate X horas fica pronto" (sem prazo formal)
- "Nao da para fazer nada" (sem oferecer encaminhamento)

## Checklist rapido para operador/agente

- problema confirmado em 1 frase
- impacto identificado (bloqueante, parcial, intermitente)
- evidencia minima coletada (horario, exemplo, print)
- classificacao inicial definida (prompt, fluxo, sistema, unknown)
- severidade sugerida definida (critical, high, medium, low)
- proximo passo comunicado ao cliente
