# Árvore de Decisão do Fluxo - ChatBot

## 🌳 Fluxo Completo com IF/ELSE

Esta é a visualização em árvore de decisão mostrando EXATAMENTE qual caminho o código segue.

---

## 📊 Sequência Linear (Sempre Executados)

```
START
  ↓
1. filter_status
  ↓
  IF (mensagem é status update)
    → STOP (não processa)
  ELSE
    → Continua ↓
  ↓
2. parse_message
  ↓
3. check_customer
  ↓
  IF (customer.status === "human")
    → STOP (já transferido)
  ELSE
    → Continua ↓
  ↓
4. process_media
  ↓
  IF (tipo === "audio")
    → 4a. download_audio → 4b. transcribe_audio (Whisper)
  ELSE IF (tipo === "image")
    → 4a. download_image → 4b. analyze_image (GPT-4o Vision)
  ELSE IF (tipo === "document")
    → 4a. download_document → 4b. analyze_document (GPT-4o)
  ELSE
    → Skip (texto simples)
  ↓
5. normalize_message
  ↓
6. push_to_redis
  ↓
7. save_user_message (salva mensagem do USUÁRIO no histórico)
  ↓
```

---

## 🔀 Primeira Decisão: Message Batching

```
8. batch_messages
  ↓
  IF (config.settings.messageSplitEnabled === true)
    → Aguarda 10s
    → Busca todas mensagens do Redis
    → Concatena em batchedContent
    → Continua ↓
  ELSE
    → batchedContent = processedContent (pula batching)
    → Continua ↓
  ↓
  IF (batchedContent vazio)
    → STOP (sem conteúdo)
  ELSE
    → Continua ↓
  ↓
```

---

## 🔀 Segunda Decisão: RAG Context

```
9-10. Processamento Paralelo (Promise.all)
  ↓
  PARALELO:
  ├─ 9. get_chat_history (busca últimas 15 mensagens)
  ├─ 10. get_rag_context (SE config.settings.enableRAG === true)
  │     ↓
  │     IF (enableRAG === true)
  │       → Vector search (Supabase pgvector)
  │       → Retorna top 5 documentos relevantes
  │     ELSE
  │       → ragContext = "" (vazio)
  │
  └─ 9.6. classify_intent (classifica intenção do usuário)
        ↓
        IF (config.intent_classifier.use_llm === true)
          → Usa Groq para classificar
        ELSE
          → Regex pattern matching
  ↓
  (Aguarda todos 3 terminarem)
  ↓
```

---

## 🔀 Terceira Decisão: Continuity Check

```
9.5. check_continuity
  ↓
  Calcula hoursSinceLastMessage
  ↓
  IF (hoursSinceLastMessage > config.continuity.threshold)
    → isNewConversation = true
    → greetingInstruction = "Saudar como NOVO cliente"
  ELSE
    → isNewConversation = false
    → greetingInstruction = "Continuar conversa normalmente"
  ↓
```

---

## 🤖 Geração de Resposta

```
11. generate_response (Groq Llama 3.3 70B ou OpenAI GPT-4o)
  ↓
  Inputs:
  - batchedContent (mensagem do usuário)
  - chatHistory (últimas 15 msgs)
  - ragContext (documentos relevantes)
  - greetingInstruction (saudar ou não)
  - intentInfo (intenção classificada)
  ↓
  LLM gera resposta
  ↓
  IF (LLM chama tool "transferir_atendimento")
    → handleHumanHandoff()
    → STOP (transferido para humano)
  ELSE
    → Continua ↓
  ↓
```

---

## 🔀 Quarta Decisão: Repetition Detection

```
11.5. detect_repetition
  ↓
  Compara resposta com últimas N respostas salvas
  ↓
  IF (config.repetition_detector.use_embeddings === true)
    → Calcula similarity com OpenAI embeddings
  ELSE
    → Compara strings diretamente
  ↓
  IF (similarityScore > config.repetition_detector.threshold)
    → isRepetition = true
    → Regenera resposta com instrução de variar
    → aiResponse = nova resposta
  ELSE
    → Continua com resposta original
  ↓
```

---

## 💾 Salvamento e Formatação

```
11.6. save_ai_message (salva resposta da IA no histórico)
  ↓
  Salva aiResponse.content em PostgreSQL (n8n_chat_histories)
  ↓
12. format_response
  ↓
  IF (config.settings.messageSplitEnabled === true)
    → Usa segundo LLM (Groq) para dividir em múltiplas msgs
    → Split em \n\n
    → Retorna array de mensagens
  ELSE
    → formattedMessages = [aiResponse.content] (mensagem única)
  ↓
13. send_whatsapp
  ↓
  Para cada mensagem em formattedMessages:
    → Envia via Meta WhatsApp API
    → Aguarda 2s entre cada mensagem
  ↓
  STOP (fluxo completo)
```

---

## 🔄 Bypass Routes (Árvore de Decisão)

### Cenário 1: `batch_messages` DESABILITADO

```
IF (batch_messages.enabled === false)
  ENTÃO:
    - chat_history conecta de: save_user_message (bypass)
    - rag_context conecta de: save_user_message (bypass)
    - classify_intent conecta de: save_user_message (bypass)

  CAMINHO:
    save_user_message → ┬─ chat_history
                        ├─ rag_context
                        └─ classify_intent → generate_response
```

### Cenário 2: `chat_history` DESABILITADO

```
IF (chat_history.enabled === false)
  ENTÃO:
    check_continuity procura bypass CASCADE:

    1º Tenta: batch_messages
       IF (batch_messages.enabled === true)
         → Bypass ATIVO: batch_messages → check_continuity (LARANJA)
         → PARA AQUI (não procura mais)

    2º Tenta: save_user_message (SE batch também disabled)
       IF (batch_messages.enabled === false)
         → Bypass ATIVO: save_user_message → check_continuity (LARANJA)
```

### Cenário 3: `detect_repetition` DESABILITADO

```
IF (detect_repetition.enabled === false)
  ENTÃO:
    save_ai_message procura bypass:

    → Bypass ATIVO: generate_response → save_ai_message (LARANJA)
```

### Cenário 4: TODOS os análise nodes DESABILITADOS

```
IF (chat_history.enabled === false
    AND rag_context.enabled === false
    AND classify_intent.enabled === false)
  ENTÃO:
    generate_response procura bypass CASCADE:

    1º Tenta: batch_messages
       IF (batch_messages.enabled === true)
         → Bypass: batch_messages → generate_response (LARANJA)

    2º Tenta: save_user_message (SE batch também disabled)
       IF (batch_messages.enabled === false)
         → Bypass: save_user_message → generate_response (LARANJA)
```

---

## 📝 Resumo de Salvamentos

| Node | O que salva | Quando |
|------|-------------|--------|
| **7. save_user_message** | Mensagem do USUÁRIO | Logo após normalize, ANTES de batch |
| **11.6. save_ai_message** | Resposta da IA | APÓS generate + detect_repetition, ANTES de formatar |

**Ordem cronológica:**
1. Usuário envia mensagem WhatsApp
2. **NODE 7**: Salva mensagem do usuário
3. Processamento (batch, history, rag, generate)
4. **NODE 11.6**: Salva resposta da IA
5. **NODE 12**: Formata resposta em múltiplas mensagens
6. **NODE 13**: Envia via WhatsApp

---

## 🎨 Legenda Visual

- **Linha sólida cinza** → Conexão normal (node habilitado)
- **Linha tracejada cinza** → Conexão desabilitada (node disabled)
- **Linha pontilhada LARANJA grossa** → Bypass ATIVO (primeiro disponível na cascade)
- **Linha pontilhada cinza** → Bypass INATIVO (target disabled, procurando próximo)

---

## 🧪 Exemplos de Cenários

### Exemplo 1: Configuração Padrão (Tudo Habilitado)

```
CAMINHO:
normalize → push_redis → save_user → batch (10s) →
  ┬─ chat_history → check_continuity ─┐
  ├─ rag_context ─────────────────────┼→ generate → detect_repetition → save_ai → format → send
  └─ classify_intent ─────────────────┘
```

### Exemplo 2: Sem Batching (Resposta Imediata)

```
config.settings.messageSplitEnabled = false

CAMINHO:
normalize → push_redis → save_user → [batch SKIP] →
  ┬─ chat_history (de save_user via bypass) → check_continuity ─┐
  ├─ rag_context (de save_user via bypass) ─────────────────────┼→ generate → ...
  └─ classify_intent (de save_user via bypass) ─────────────────┘
```

### Exemplo 3: Sem RAG (Economia de Custos)

```
config.settings.enableRAG = false

CAMINHO:
... → batch →
  ┬─ chat_history → check_continuity ─┐
  ├─ [rag_context SKIP] ───────────────┼→ generate → ...
  └─ classify_intent ──────────────────┘
```

### Exemplo 4: Mínimo (Performance Máxima)

```
Tudo desabilitado exceto essenciais:
- batch: OFF
- chat_history: OFF
- rag: OFF
- classify_intent: OFF
- detect_repetition: OFF

CAMINHO:
normalize → save_user → generate (via bypass de save_user) → save_ai → send
```

---

**Última atualização:** 2025-11-16
