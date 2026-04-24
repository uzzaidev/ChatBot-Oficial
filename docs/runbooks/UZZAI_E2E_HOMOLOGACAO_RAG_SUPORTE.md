# UzzAI - Roteiro E2E de Homologacao (RAG + Suporte)

## Objetivo

Validar em ambiente de homologacao que as mudancas recentes estao funcionando no fluxo real:

- busca de apresentacoes/imagens mais precisa
- deteccao de suporte implicito (sem depender so de palavra "erro/bug")
- classificacao de causa/severidade mais aderente
- ausencia de duplicidade indevida em fila de suporte

## Escopo

- Tenant: UzzAI (homologacao)
- Fluxo: WhatsApp -> chatbotFlow -> tools/RAG -> suporte_cases -> traces
- Fora de escopo: mudancas de banco em producao e rollout global

## Pre-requisitos

- Ambiente de homologacao com deploy atualizado
- Base de conhecimento com documentos relevantes carregados (exemplos):
  - `UzzApp_Apresentacao_Comercial.pdf`
  - `Apresentacao_Convoca.pdf`
  - materiais de catalogo/faq
- `support_mode:enabled = true` para o tenant de teste
- Acesso ao dashboard de traces e suporte

## Matriz de testes E2E

### Bloco A - Busca de apresentacoes/imagens (RAG + tool)

#### Caso A1 - Pedido explicito de apresentacao UzzApp

Mensagem do cliente:
- "tem a apresentacao do UzzApp? pode me enviar"

Esperado:
- acionar `buscar_documento`
- enviar 1 arquivo principal de apresentacao (priorizar arquivo de deck/apresentacao)
- resposta curta explicativa apos envio
- nao enviar pacote excessivo de anexos no mesmo turno

Evidencias:
- trace com tool call `buscar_documento`
- mensagem com anexo no historico
- ausencia de anexo irrelevante

#### Caso A2 - Pedido explicito de apresentacao Convoca

Mensagem do cliente:
- "me manda o deck do Convoca"

Esperado:
- enviar apresentacao do Convoca (ou melhor candidato semantico + filename)
- sem fallback para "nao encontrei" se arquivo existe na base

#### Caso A3 - Pedido de imagem/catalogo

Mensagem do cliente:
- "manda a imagem do material"

Esperado:
- envio de arquivo de imagem quando houver match
- sem bloqueio indevido de stage quando intencao explicita estiver clara

### Bloco B - Suporte implicito e qualidade operacional

#### Caso B1 - Mismatch sem palavra "erro"

Mensagem do cliente:
- "cliente falou sobre plano e respondeu outra coisa"

Esperado:
- reconhecer como suporte
- criar/atualizar case em `support_cases`
- classificacao com causa provavel (`prompt` ou `flow`, conforme contexto)

#### Caso B2 - Duplicidade operacional

Mensagem do cliente:
- "mandou duas vezes a mesma mensagem"

Esperado:
- reconhecer como suporte implicito
- classificar com tendencia `system`
- severidade minima `high` quando sinal forte de duplicidade/reprocessamento

#### Caso B3 - Fora de ordem / atraso

Mensagem do cliente:
- "respondeu fora de ordem e atrasado"

Esperado:
- capturar como suporte
- classificacao `system` quando caracteristica operacional estiver presente

### Bloco C - Controle de falso positivo

#### Caso C1 - Mensagem neutra

Mensagem do cliente:
- "obrigado, era isso mesmo"

Esperado:
- nao criar suporte case novo
- manter comportamento normal de atendimento

## Checklist de execucao por caso

- [ ] enviar mensagem de teste pelo canal real (homolog)
- [ ] confirmar resposta no WhatsApp
- [ ] validar tool call no trace (quando aplicavel)
- [ ] validar historico da conversa
- [ ] validar registro em `support_cases` (quando aplicavel)
- [ ] registrar resultado: passou / falhou / observacao

## Consultas de conferência (SQL)

### 1) Ultimos casos de suporte do tenant

```sql
SELECT
  id,
  created_at,
  phone,
  user_message,
  severity,
  root_cause_type,
  confidence,
  status,
  trace_id
FROM support_cases
WHERE client_id = '<CLIENT_ID_UZZAI_HML>'
ORDER BY created_at DESC
LIMIT 30;
```

### 2) Verificar duplicidade suspeita por mensagem/telefone (janela curta)

```sql
SELECT
  phone,
  user_message,
  COUNT(*) AS total,
  MIN(created_at) AS first_seen,
  MAX(created_at) AS last_seen
FROM support_cases
WHERE client_id = '<CLIENT_ID_UZZAI_HML>'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY phone, user_message
HAVING COUNT(*) > 1
ORDER BY total DESC, last_seen DESC;
```

### 3) Confirmar traces recentes com tool de documento

```sql
SELECT
  id,
  created_at,
  phone,
  user_message,
  tool_calls
FROM message_traces
WHERE client_id = '<CLIENT_ID_UZZAI_HML>'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 30;
```

## Critérios de aprovacao

- Busca de apresentacao:
  - >= 80% de acerto nos casos A1/A2 em primeira tentativa
- Suporte implicito:
  - >= 90% de captura em B1/B2/B3
- Falso positivo:
  - C1 nao deve criar case
- Duplicidade:
  - sem aumento de duplicidade indevida em `support_cases` apos testes

## Plano de rollback (se falhar)

- Desativar `support_mode:enabled` para o tenant (temporario) se houver ruido alto.
- Retornar para comportamento anterior de busca de documento por feature flag/config (se disponivel).
- Reexecutar apenas cenarios criticos apos ajuste.

## Registro de resultados (preencher)

| Caso | Resultado | Observacao | Data/Hora |
|------|-----------|------------|-----------|
| A1 |  |  |  |
| A2 |  |  |  |
| A3 |  |  |  |
| B1 |  |  |  |
| B2 |  |  |  |
| B3 |  |  |  |
| C1 |  |  |  |
