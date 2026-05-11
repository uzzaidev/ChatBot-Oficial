# PIPELINE — ChatBot-Oficial (14 Nodes)

**Checkpoint:** 2026-04-16  
**Source of truth:** `src/flows/chatbotFlow.ts`

## Entry Point
```
POST /api/webhook/{clientId}
  → HMAC signature validation (X-Hub-Signature-256)
  → getClientConfig(clientId)  ← carrega DB + Vault secrets
  → deduplicação (Redis + PostgreSQL fallback)
  → processChatbotMessage(payload, config)
```

## Nodes em Ordem

| # | Node | Função |
|---|------|--------|
| 1 | filterStatusUpdates | Descarta receipts de entrega/leitura |
| 2 | parseMessage | Extrai phone, name, type, content, messageId, referral |
| 3 | checkOrCreateCustomer | Upsert `clientes_whatsapp`, ensureCRMCard(), captureLeadSource() |
| - | STATUS ROUTER | fluxo_inicial → FlowExecutor; humano/transferido → salva + fim |
| 4 | Process Media | audio→Whisper, image→GPT-4o Vision, document→GPT-4o, sticker→"[Sticker]" |
| 5 | normalizeMessage | Combina parsedMessage + processedContent; emite CRM keyword_detected |
| 6 | checkHumanHandoffStatus | Se humano/transferido: salva msg + return (bot silencioso) |
| 7 | pushToRedis | Push na fila + debounce TTL (configurable) |
| 8 | checkDuplicateMessage | Sai se duplicata detectada |
| 8.5 | saveChatMessage(user) | Insere em `messages` |
| 9 | batchMessages | Aguarda batchingDelaySeconds (default 10s) — acumula msgs do mesmo phone |
| 9.5 | fastTrackRouter | FAQ via similaridade semântica (pula history/RAG/tools) |
| 10+11 | [paralelo] getChatHistory + getRAGContext | Últimas N msgs + pgvector search |
| 10.5 | checkContinuity | Detecta nova conversa, injeta saudação no prompt |
| 10.6 | classifyIntent | Classifica intenção para CRM automation |
| 12 | generateAIResponse | Monta prompt + chama callDirectAI() |
| 12.5 | detectRepetition | Regenera se resposta muito similar ao histórico (temperatura maior) |
| - | TOOL CALL ROUTER | transferir_atendimento / buscar_documento / enviar_resposta_em_audio / registrar_dado_cadastral / calendar tools |
| 13 | formatResponse | Divide em `\n\n`, strip tool artifacts |
| 14 | Send + Save | sendTextMessage() → Meta API → saveChatMessage(ai) → sleep(2000ms) por msg |

## Padrões Chave
- **Nodes são pure functions** em `src/nodes/*` com interface tipada de entrada/saída
- **Cada node é configurável** via `bot_configurations` (enable/disable por cliente)
- **Redis opcional** — degrada graciosamente sem batching
- **Send+Save intercalado** — salva no DB logo após enviar (2-4s disponível no histórico)
- **SEMPRE `await processChatbotMessage()`** — serverless mata processo após HTTP response
