# Arquitetura do Fluxo do Chatbot com Configurações

## Visão Geral

Este documento descreve a arquitetura completa do fluxo do chatbot, mostrando onde cada prompt e configuração é utilizada.

## Diagrama de Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MENSAGEM WHATSAPP RECEBIDA                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NODE 1-8: Preprocessing                                                │
│  • Filter Status Updates                                                │
│  • Parse Message                                                        │
│  • Check/Create Customer                                                │
│  • Process Media (audio/image/document)                                 │
│  • Normalize Message                                                    │
│  • Push to Redis (batching)                                             │
│  • Save User Message                                                    │
│  • Batch Messages (aguarda X segundos)                                  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NODE 9: Get Chat History                                               │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 📝 CONFIGURAÇÃO USADA:                                            │ │
│  │ • chat_history:max_messages                                       │ │
│  │   (quantas mensagens buscar do histórico)                         │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NODE 10: Get RAG Context (se habilitado)                               │
│  • Busca contexto relevante da base de conhecimento                     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  🆕 NODE 9.5: Check Continuity (FASE 1)                                 │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 📝 CONFIGURAÇÕES USADAS:                                          │ │
│  │ • continuity:new_conversation_threshold_hours                     │ │
│  │   (24h padrão - define se é conversa nova)                        │ │
│  │                                                                   │ │
│  │ • continuity:greeting_for_new_customer                            │ │
│  │   "Você está iniciando uma conversa com um novo cliente..."      │ │
│  │                                                                   │ │
│  │ • continuity:greeting_for_returning_customer                      │ │
│  │   "Você está continuando uma conversa com um cliente..."         │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  📤 OUTPUT: greetingInstruction                                          │
│  (instrução de saudação para injetar no prompt principal)                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  🆕 NODE 9.6: Classify Intent (FASE 2)                                  │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 📝 CONFIGURAÇÕES USADAS:                                          │ │
│  │                                                                   │ │
│  │ • intent_classifier:use_llm (boolean)                             │ │
│  │   true = usa LLM (Groq), false = usa regex                        │ │
│  │                                                                   │ │
│  │ • intent_classifier:prompt (se use_llm = true)                    │ │
│  │   Prompt específico para o LLM classificar intenção               │ │
│  │   "Classifique a intenção do usuário nas categorias..."           │ │
│  │                                                                   │ │
│  │ • intent_classifier:intents                                       │ │
│  │   Lista de intenções suportadas: [saudacao, orcamento,           │ │
│  │   agendamento, duvida_tecnica, reclamacao, etc]                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  🔄 PROCESSAMENTO:                                                       │
│  • Se use_llm = true: Chama Groq com prompt configurado                 │
│  • Se use_llm = false: Usa regex pattern matching                       │
│                                                                          │
│  📤 OUTPUT: { intent, confidence, usedLLM }                              │
│  (pode ser usado para roteamento futuro)                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NODE 11: Generate AI Response (PRINCIPAL)                              │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 📝 CONFIGURAÇÕES USADAS:                                          │ │
│  │                                                                   │ │
│  │ 🎭 personality:config (JSON COMPLETO)                             │ │
│  │ Este é o PROMPT PRINCIPAL do bot, contém:                         │ │
│  │ {                                                                 │ │
│  │   "name": "Luana",                                                │ │
│  │   "role": "assistente virtual especializada...",                 │ │
│  │   "tone": "amigável, profissional, empática",                    │ │
│  │   "style": ["Use linguagem natural e acessível"...],             │ │
│  │   "rules": ["Sempre seja educada"...],                           │ │
│  │   "context_awareness": "Alto - Referencia conversas anteriores"  │ │
│  │ }                                                                 │ │
│  │                                                                   │ │
│  │ ➕ greetingInstruction (do Node 9.5)                              │ │
│  │ Instrução de saudação injetada dinamicamente                      │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  🔄 PROCESSAMENTO:                                                       │
│  1. Monta system prompt = personality.role + personality.rules +         │
│  │                         personality.style + greetingInstruction        │
│  2. Adiciona histórico de chat                                           │
│  3. Adiciona contexto RAG (se disponível)                                │
│  4. Envia para Groq LLM (llama-3.3-70b-versatile)                        │
│                                                                          │
│  📤 OUTPUT: { content: "resposta do bot", toolCalls: [...] }             │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  🆕 NODE 11.5: Detect Repetition (FASE 3)                               │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │ 📝 CONFIGURAÇÕES USADAS:                                          │ │
│  │                                                                   │ │
│  │ • repetition_detector:similarity_threshold                        │ │
│  │   0.70 (70%) padrão - acima disso = repetição                     │ │
│  │                                                                   │ │
│  │ • repetition_detector:check_last_n_responses                      │ │
│  │   3 padrão - compara com últimas 3 respostas                      │ │
│  │                                                                   │ │
│  │ • repetition_detector:use_embeddings                              │ │
│  │   false - futuramente usará OpenAI embeddings                     │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  🔄 PROCESSAMENTO:                                                       │
│  1. Busca últimas N respostas do bot para este cliente                  │
│  2. Calcula similaridade (Jaccard) entre resposta atual e anteriores    │
│  3. Se similaridade > threshold: REGENERA COM VARIAÇÃO                   │
│                                                                          │
│  📤 OUTPUT: { isRepetition: boolean, similarityScore: number }           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                              É repetição?
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                   SIM                             NÃO
                    │                               │
                    ▼                               │
┌─────────────────────────────────────────┐        │
│  🆕 NODE 11.6: Regenerate with Variation│        │
│                                          │        │
│  🔄 PROCESSAMENTO:                       │        │
│  1. Adiciona instrução anti-repetição:   │        │
│     "IMPORTANTE: Varie sua resposta.     │        │
│      Não repita exatamente o que disse." │        │
│  2. Chama generateAIResponse novamente   │        │
│  3. Usa a nova resposta variada          │        │
└─────────────────────────────────────────┘        │
                    │                               │
                    └───────────────┬───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NODE 12: Save AI Response                                              │
│  • Salva resposta do bot no histórico de chat                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NODE 13: Format Response                                               │
│  • Quebra resposta em mensagens menores se necessário                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  NODE 14: Send WhatsApp Message                                         │
│  • Envia mensagem(ns) via WhatsApp Business API                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Hierarquia e Relacionamento dos Prompts

### 1. **Prompt Principal (Personality Config)**
   - **Localização**: `personality:config` nas configurações
   - **Quando é usado**: NODE 11 - Generate AI Response
   - **Função**: Define a personalidade PRINCIPAL do bot
   - **Conteúdo**: 
     - Nome do bot
     - Papel/função
     - Tom de voz
     - Estilo de comunicação
     - Regras gerais de comportamento
   - **Status**: ✅ **SEMPRE USADO** - Este é o prompt base do bot

### 2. **Prompts Específicos (Agentes Auxiliares)**
   - **Intent Classifier Prompt**: `intent_classifier:prompt`
     - NODE 9.6 - Classify Intent
     - LLM separado (Groq) para classificar intenção
     - NÃO substitui o prompt principal
     - É um agente auxiliar que roda ANTES da resposta principal
   
   - **Entity Extractor Prompt**: `entity_extractor:prompt` (futuro)
     - Extrair nomes, datas, locais
     - Agente auxiliar independente
   
   - **Sentiment Analyzer Prompt**: `sentiment_analyzer:prompt` (futuro)
     - Detectar sentimento (feliz/frustrado)
     - Agente auxiliar independente

### 3. **Instruções Dinâmicas (Injetadas no Prompt Principal)**
   - **Greeting Instruction**: Gerada pelo NODE 9.5
     - Injetada DENTRO do prompt principal
     - Modifica temporariamente o comportamento
     - Exemplo: "Você está iniciando conversa com novo cliente. Apresente-se..."
   
   - **Anti-Repetition Instruction**: Gerada pelo NODE 11.6 (se necessário)
     - Injetada DENTRO do prompt principal
     - Exemplo: "IMPORTANTE: Varie sua resposta..."

## Exemplo Prático de Como Funciona

### Cenário: Cliente envia "Olá, quanto custa?"

```
1. NODE 9.5 (Continuity):
   • Verifica: última mensagem foi há 48h
   • Conclusão: NOVA conversa (> 24h threshold)
   • Seleciona: continuity:greeting_for_new_customer
   • Gera: "Você está iniciando conversa com novo cliente. Apresente-se."

2. NODE 9.6 (Intent):
   • Usa: intent_classifier:prompt (se use_llm = true)
   • LLM classifica: "orcamento" (pedido de orçamento)
   • Confidence: "high"
   • Armazena para possível uso futuro

3. NODE 11 (Generate AI Response):
   • Monta System Prompt:
     ┌─────────────────────────────────────────────────────────┐
     │ VOCÊ É: Luana, assistente virtual especializada...      │
     │ (do personality:config)                                 │
     │                                                         │
     │ TOM: amigável, profissional, empática                   │
     │                                                         │
     │ REGRAS:                                                 │
     │ • Sempre seja educada                                   │
     │ • Use linguagem natural                                 │
     │ • etc...                                                │
     │                                                         │
     │ ➕ INSTRUÇÃO DINÂMICA (do Node 9.5):                    │
     │ Você está iniciando conversa com novo cliente.         │
     │ Apresente-se educadamente.                              │
     └─────────────────────────────────────────────────────────┘
   
   • Adiciona: Histórico de chat (últimas 20 mensagens)
   • Adiciona: Contexto RAG (se disponível)
   • Envia para Groq LLM
   • Recebe: "Olá! Sou a Luana, assistente virtual da empresa..."

4. NODE 11.5 (Detect Repetition):
   • Compara resposta com últimas 3 respostas
   • Similaridade: 0.15 (15%) - muito diferente
   • Conclusão: NÃO é repetição
   • Mantém resposta original

5. Envia para WhatsApp: "Olá! Sou a Luana..."
```

## Resposta às Perguntas do Usuário

### Pergunta 1: "Onde entra cada prompt?"

**Resposta**:
- **Prompt Principal** (`personality:config`): NODE 11 - É o SISTEMA do bot, sempre usado
- **Intent Classifier Prompt**: NODE 9.6 - Agente auxiliar que classifica intenção ANTES
- **Greeting Instructions**: NODE 9.5 → NODE 11 - Injetado no prompt principal
- **Entity/Sentiment Prompts** (futuro): Seriam agentes auxiliares adicionais

### Pergunta 2: "O Agent Prompt ainda será usado ou substituído?"

**Resposta**: ✅ **AINDA SERÁ USADO!**

O `personality:config` (Agent Prompt) é o **PROMPT PRINCIPAL** do bot. Ele:
- ✅ **NÃO É SUBSTITUÍDO** pelos novos prompts
- ✅ **É COMPLEMENTADO** pelas instruções dinâmicas (greetings)
- ✅ **SEMPRE É USADO** em toda geração de resposta

Os novos prompts são **AGENTES AUXILIARES** que:
- Rodam ANTES do prompt principal (intent classifier)
- Ou injetam instruções DENTRO do prompt principal (greeting, anti-repetition)
- Mas NÃO substituem a personalidade base do bot

## Arquitetura Multi-Agente

```
┌──────────────────────────────────────────────────────────┐
│                    ARQUITETURA                           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  🎭 AGENTE PRINCIPAL (personality:config)                │
│     • Sempre ativo                                       │
│     • Define personalidade do bot                        │
│     • Recebe instruções dinâmicas                        │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  AGENTES AUXILIARES (rodam antes/durante)          │ │
│  │                                                    │ │
│  │  🔍 Intent Classifier                              │ │
│  │     • Classifica intenção                          │ │
│  │     • Usa LLM separado                             │ │
│  │     • Output: { intent, confidence }               │ │
│  │                                                    │ │
│  │  🤝 Continuity Checker                             │ │
│  │     • Detecta nova vs continuação                  │ │
│  │     • Gera instrução de saudação                   │ │
│  │     • Output: greetingInstruction                  │ │
│  │                                                    │ │
│  │  🔄 Repetition Detector                            │ │
│  │     • Detecta respostas repetitivas                │ │
│  │     • Força regeneração com variação               │ │
│  │     • Output: { isRepetition, score }              │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Configurações no Dashboard

Todas estas configurações podem ser customizadas em:
**`/dashboard/settings` → "Configurações do Bot"**

### Aba "Prompts"
- `personality:config` - ⭐ **PROMPT PRINCIPAL**
- `intent_classifier:prompt` - Prompt do classificador de intenção
- `entity_extractor:prompt` - (futuro) Prompt do extrator de entidades
- `sentiment_analyzer:prompt` - (futuro) Prompt do analisador de sentimento
- `continuity:greeting_for_new_customer` - Instrução para novo cliente
- `continuity:greeting_for_returning_customer` - Instrução para cliente retornando

### Aba "Regras"
- `intent_classifier:use_llm` - Usar LLM ou regex
- `intent_classifier:intents` - Lista de intenções suportadas
- `rag:enabled` - Habilitar busca de contexto

### Aba "Limites"
- `continuity:new_conversation_threshold_hours` - Threshold de nova conversa
- `repetition_detector:similarity_threshold` - Threshold de similaridade
- `repetition_detector:check_last_n_responses` - Quantas respostas verificar
- `chat_history:max_messages` - Máximo de mensagens no histórico

## Exemplo de Customização por Cliente

### Cliente A: Suporte Técnico
```json
{
  "personality:config": {
    "name": "TechBot",
    "role": "assistente de suporte técnico especializado",
    "tone": "técnico, preciso, paciente"
  },
  "intent_classifier:use_llm": true,
  "intent_classifier:intents": [
    "problema_tecnico",
    "instalacao",
    "configuracao",
    "erro"
  ],
  "repetition_detector:similarity_threshold": 0.80
}
```

### Cliente B: Vendas
```json
{
  "personality:config": {
    "name": "SalesBot",
    "role": "consultora de vendas amigável",
    "tone": "entusiasta, persuasiva, acolhedora"
  },
  "intent_classifier:use_llm": false,
  "intent_classifier:intents": [
    "orcamento",
    "produto",
    "desconto",
    "agendamento"
  ],
  "repetition_detector:similarity_threshold": 0.60
}
```

## Conclusão

**Resumo da Arquitetura**:
1. ✅ **Prompt Principal** (`personality:config`) SEMPRE é usado - define a personalidade base
2. ✅ **Prompts Auxiliares** (intent, entity, sentiment) são agentes independentes que rodam antes
3. ✅ **Instruções Dinâmicas** (greetings, anti-repetition) são injetadas NO prompt principal
4. ✅ **Tudo é configurável** por cliente via dashboard sem deploy

**Analogia**:
- `personality:config` = **Identidade permanente** do bot (quem ele é)
- Prompts auxiliares = **Ferramentas especializadas** (analisam situações)
- Instruções dinâmicas = **Lembretes temporários** (ajustam comportamento pontual)
