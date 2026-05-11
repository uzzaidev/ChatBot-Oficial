# AI SYSTEM — ChatBot-Oficial

**Checkpoint:** 2026-04-16  
**Source of truth:** `src/lib/direct-ai-client.ts`, `src/nodes/generateAIResponse.ts`, `src/lib/vault.ts`

---

## Arquitetura: Direct AI Client

Sem gateway compartilhado. Cada cliente usa suas próprias API keys do Vault.

```
generateAIResponse()
  └─→ callDirectAI()                    [src/lib/direct-ai-client.ts]
        ├─ checkBudgetAvailable()       [src/lib/unified-tracking.ts]
        ├─ getClientVaultCredentials()  [src/lib/vault.ts]
        ├─ createGroq/createOpenAI({ apiKey })
        ├─ normalizeToolsForAISDK()
        ├─ generateText()               [Vercel AI SDK v5 - ai@^5]
        ├─ normalizeToolCalls()
        └─ logDirectAIUsage()           [async, não-bloqueante]
```

## Modelos por Operação

| Operação | Modelo | Provider |
|----------|--------|----------|
| Chat (padrão) | llama-3.3-70b-versatile | Groq |
| Chat (openai) | gpt-4o-mini | OpenAI |
| Análise de imagem | gpt-4o (vision) | OpenAI (sempre) |
| Análise de documento | gpt-4o | OpenAI (sempre) |
| Transcrição de áudio | whisper-1 | OpenAI (sempre) |
| Embeddings RAG | text-embedding-3-small | OpenAI (sempre) |
| TTS voz | tts-1 / tts-1-hd | OpenAI (ou ElevenLabs) |

Seleção via `clients.primary_model_provider` → override por `agents.primary_provider`

## 7 AI Tools Disponíveis

**Sempre disponíveis (quando `enableTools = true`):**
- `transferir_atendimento` → handoff humano + email
- `buscar_documento` → busca na KB + envia arquivos
- `enviar_resposta_em_audio` → TTS → WhatsApp audio
- `registrar_dado_cadastral` → salva CPF, email, como_conheceu, indicado_por, objetivo

**Apenas quando calendário conectado e `calendar_bot_enabled`:**
- `verificar_agenda` — lista horários livres / eventos
- `criar_evento_agenda` — cria evento
- `alterar_evento_agenda` — reagenda por event_id
- `cancelar_evento_agenda` — cancela por id ou título

## Construção do Prompt

```
[system] client.system_prompt  (ou DEFAULT_SYSTEM_PROMPT)
[system] "Data e hora atual: ..." (omitido no fast-track para caching)
[system] "IMPORTANTE - Contexto da conversa: ..." (se checkContinuity disparar)
[system] "DADOS JÁ COLETADOS: ..." (metadata do contato: email, cpf, etc.)
[system] "REGRAS DE CALENDÁRIO: ..." (injetado quando calendário conectado)
[user]   "Contexto relevante da base de conhecimento:\n\n{ragContext}"
[user/assistant...] chatHistory (últimas N msgs)
[user]   "{customerName}: {currentMessage}"
```

## RAG System

1. `generateEmbedding(query, clientId)` — text-embedding-3-small (1536 dims)
2. `supabase.rpc("match_documents", { query_embedding, match_threshold: 0.7, match_count: 5, filter_client_id })`
3. Contexto injetado como `[user]` message ANTES do histórico
4. Configurável por cliente via `bot_configurations`: `rag:similarity_threshold`, `rag:max_results`

## TTS Cache

Hash MD5 de `{text}_{voice}_{speed}` → lookup em `tts_cache` → cache hit = download do bucket `tts-audio`.

Preços: OpenAI tts-1-hd = $15/1M chars | tts-1 = $7.50/1M | ElevenLabs = $0.30/1K chars

## Budget Enforcement

```typescript
const budgetAvailable = await checkBudgetAvailable(clientId)
if (!budgetAvailable) throw new Error("❌ Limite de budget atingido...")
```

Tabela: `client_budgets` — verificado antes de TODA chamada AI.

## Tracking de Uso

Todas as chamadas logadas async em `gateway_usage_logs`:
```typescript
logDirectAIUsage({ clientId, provider, modelName, inputTokens, outputTokens, latencyMs })
```

## Fast Track (FAQ Cache)

Quando ativo (`fastTrackRouter`):
- Detecção por similaridade semântica com FAQs configuradas
- Pula history/RAG/tools
- Omite datetime do prompt (permite caching no provider)
- Usa `canonical_question` em vez da mensagem original
