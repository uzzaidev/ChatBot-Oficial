# UzzAI - Integracoes e Incidentes

## Integracoes oficiais suportadas

- WhatsApp Business API (Meta)
- Automacoes internas via n8n como base operacional

## Limitacoes conhecidas por integracao

- Restricoes do WhatsApp oficial (incluindo comportamento de grupo/comunidade)
- Dependencia de aprovacao e politicas da Meta
- Variacao de comportamento conforme setup do cliente

## Erros/incidentes recorrentes

- Trigger de automacao
- Duplicidade por reprocessamento/retry
- Falhas de setup/configuracao
- Inconsistencia de contexto do bot

## Logs/evidencias minimas em bug report

- Timestamp
- ID do contato/conversa
- Payload/entrada
- Resposta recebida
- Print da tela
- Ambiente
- Passo a passo de reproducao

## Sinais de duplicidade por retry/reprocessamento

- Mensagens repetidas no mesmo contexto em curto intervalo
- Multiplos eventos identicos
- Mudanca duplicada em CRM
- Timestamps muito proximos

## Sinais de problema de contexto/memoria

- Resposta contraditoria na mesma conversa
- Perda de preferencia ja informada
- Retomada em estado antigo
- Alucinacao fora da base validada
