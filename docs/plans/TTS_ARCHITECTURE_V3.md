# TTS Architecture v3.0 - IMPLEMENTADO

**Data:** 2025-12-04
**Status:** ✅ PRODUÇÃO
**Versão:** 3.0 (Refatoração Completa)

---

## 🎯 Arquitetura Atual (v3.0)

### Mudança Fundamental

**v2.0 (Anterior):**
```typescript
// Tool tinha parâmetros
{
  name: "enviar_resposta_em_audio",
  parameters: {
    texto_para_audio: string,  // ❌ AI gerava texto 2x
    perguntar_antes: boolean   // ❌ Lógica no código
  }
}
```

**v3.0 (Atual):**
```typescript
// Tool SEM parâmetros
{
  name: "enviar_resposta_em_audio",
  parameters: {}  // ✅ SEM argumentos
}
```

---

## Como Funciona Agora

### Fluxo Completo

```
1️⃣ AI gera resposta normalmente
   aiResponse.content = "Claro! Aqui na SPORTS TRAINING..."

2️⃣ AI decide se converte para áudio (baseado no prompt do sistema)
   aiResponse.toolCalls = [{ name: "enviar_resposta_em_audio" }]

3️⃣ chatbotFlow detecta tool call
   - Pega o texto que o AI já gerou (aiResponse.content)
   - Passa para handleAudioToolCall({ aiResponseText })

4️⃣ Handler converte texto → áudio
   - Gera áudio via OpenAI TTS
   - Upload para WhatsApp
   - SALVA no banco (n8n_chat_histories)
   - Fallback para texto se falhar
```

---

## Arquivos Principais

### 1. Tool Definition

**Arquivo:** `src/nodes/generateAIResponse.ts`

```typescript
const TTS_AUDIO_TOOL_DEFINITION = {
  type: "function",
  function: {
    name: "enviar_resposta_em_audio",
    description: `Converte a resposta atual em mensagem de voz (áudio).

IMPORTANTE: Esta tool NÃO requer argumentos.
Ela converte automaticamente o texto da sua resposta atual em áudio.

A decisão de quando usar deve ser configurada no prompt do sistema.`,
    parameters: {
      type: "object",
      properties: {},  // ✅ SEM parâmetros
      required: [],
    },
  },
};
```

### 2. Handler

**Arquivo:** `src/handlers/handleAudioToolCall.ts`

```typescript
export interface HandleAudioToolCallInput {
  aiResponseText: string;  // ✅ Texto que AI já gerou
  phone: string;
  clientId: string;
  config: ClientConfig;
}

export const handleAudioToolCall = async (input) => {
  const { aiResponseText, phone, clientId, config } = input;

  // 1. Verificar se TTS está habilitado
  if (!config.settings?.tts_enabled) {
    // Envia como texto + SALVA NO BANCO
    const { messageId } = await sendTextMessage(phone, aiResponseText, config);
    await saveChatMessage({ phone, message: aiResponseText, type: "ai", clientId, wamid: messageId });
    return { success: true, sentAsAudio: false };
  }

  // 2. Tentar gerar e enviar áudio
  try {
    // Gerar áudio
    const { audioBuffer, durationSeconds } = await convertTextToSpeech({
      text: aiResponseText,
      clientId,
      voice: config.settings?.tts_voice || "alloy",
      speed: config.settings?.tts_speed || 1.0,
    });

    // Upload para WhatsApp
    const { mediaId } = await uploadAudioToWhatsApp({ audioBuffer, ... });

    // Enviar mensagem
    const { messageId } = await sendAudioMessageByMediaId(phone, mediaId, config);

    // ✅ SALVAR no banco
    await saveChatMessage({
      phone,
      message: aiResponseText,
      type: "ai",
      clientId,
      mediaMetadata: { type: "audio", url: audioUrl, ... },
      wamid: messageId,
    });

    return { success: true, sentAsAudio: true, messageId };

  } catch (error) {
    // 3. FALLBACK: Envia texto + SALVA NO BANCO
    const { messageId } = await sendTextMessage(phone, aiResponseText, config);
    await saveChatMessage({ phone, message: aiResponseText, type: "ai", clientId, wamid: messageId });
    return { success: true, sentAsAudio: false, error: error.message };
  }
};
```

### 3. ChatbotFlow Integration

**Arquivo:** `src/flows/chatbotFlow.ts`

```typescript
// Detectar tool call
if (toolCall.function.name === "enviar_resposta_em_audio") {

  // ✅ Pega o texto que o AI já gerou
  const aiText = aiResponse.content || "";

  if (!aiText || aiText.trim().length === 0) {
    console.warn("No AI text to convert to audio");
    continue;
  }

  // ✅ Passa o texto para o handler
  const audioResult = await handleAudioToolCall({
    aiResponseText: aiText,  // Texto do AI
    phone: parsedMessage.phone,
    clientId: config.id,
    config,
  });

  // Se enviou áudio com sucesso, terminar fluxo
  if (audioResult.sentAsAudio) {
    logger.finishExecution("success");
    return { success: true, sentAsAudio: true, messagesSent: 1 };
  }

  // Se falhou mas enviou texto (fallback), terminar fluxo
  if (audioResult.success && !audioResult.sentAsAudio) {
    logger.finishExecution("success");
    return { success: true, sentAsAudio: false, messagesSent: 1 };
  }
}
```

---

## Configuração via Prompt (Frontend)

A lógica de **quando usar áudio** está 100% no **prompt do sistema** (configurável via Dashboard):

```
EXEMPLO DE INSTRUÇÃO NO PROMPT:

# Uso de Áudio (TTS)

Você pode converter suas respostas em áudio usando a tool "enviar_resposta_em_audio".

QUANDO USAR:
- Cliente PEDIU EXPLICITAMENTE áudio ("me manda um áudio", "pode explicar por áudio?")
- Explicações muito longas (>500 caracteres)
- Conteúdo educacional complexo

QUANDO NÃO USAR:
- Respostas curtas (<200 caracteres)
- Informações que precisam ser copiadas (telefones, links, códigos)
- Listas ou menus de opções

IMPORTANTE: Se não tiver certeza, PERGUNTE PRIMEIRO usando texto normal:
"Quer que eu explique isso por áudio? Responda 'sim' ou 'não'."

Depois que o cliente confirmar, aí sim você gera a resposta e chama a tool.
```

---

## Vantagens da v3.0

| Aspecto | v2.0 | v3.0 ✅ |
|---------|------|---------|
| **Eficiência** | AI gera texto 2x | AI gera texto 1x |
| **Tokens** | Duplicado nos argumentos | Sem desperdício |
| **Simplicidade** | Parâmetros complexos | Sem parâmetros |
| **Consistência** | Texto ≠ Áudio possível | Sempre idênticos |
| **Configuração** | Lógica hardcoded | 100% no prompt |
| **Bugs** | Mensagens não salvas | SEMPRE salva |

---

## Problemas Corrigidos

### Bug 1: Mensagens Não Salvas
❌ **Antes:** Handler perguntava e enviava texto mas NÃO salvava no banco
✅ **Agora:** TODAS as mensagens são salvas (texto ou áudio)

### Bug 2: Duplicação de Mensagens
❌ **Antes:** Handler enviava pergunta + texto sem esperar resposta
✅ **Agora:** Pergunta está no prompt do AI (se necessário)

### Bug 3: Frontend Não Exibia
❌ **Antes:** Mensagens enviadas mas não apareciam no dashboard
✅ **Agora:** `saveChatMessage()` garante persistência

### Bug 4: Backend Monitor Errado
❌ **Antes:** Mostrava `_END` mas mensagens foram enviadas
✅ **Agora:** Logs corretos em cada etapa

---

## Configuração

### 1. Habilitar TTS (Global)

```sql
-- Via dashboard ou SQL
UPDATE clients
SET tts_enabled = true
WHERE id = 'client-id';
```

### 2. Configurar Voz

```typescript
// Dashboard: Settings → TTS
{
  tts_voice: "alloy",     // alloy, echo, fable, onyx, nova, shimmer
  tts_speed: 1.0,         // 0.5 - 2.0
  tts_model: "tts-1-hd"   // tts-1 (fast) ou tts-1-hd (quality)
}
```

### 3. Adicionar ao Prompt do Sistema

```
Você tem uma tool chamada "enviar_resposta_em_audio" para converter
suas respostas em áudio. Use apenas quando [sua lógica aqui].
```

---

## Nodes Implementados

1. ✅ `convertTextToSpeech.ts` - Gera áudio via OpenAI TTS
2. ✅ `uploadAudioToWhatsApp.ts` - Upload para Meta API
3. ✅ `handleAudioToolCall.ts` - Orquestrador completo
4. ✅ `saveChatMessage.ts` - Persistência no banco
5. ✅ Integration no `chatbotFlow.ts`

---

## Migrations

```sql
-- Adicionar campos de áudio ao n8n_chat_histories
ALTER TABLE n8n_chat_histories
ADD COLUMN IF NOT EXISTS transcription TEXT,
ADD COLUMN IF NOT EXISTS audio_duration_seconds INTEGER;

-- Índice para busca de transcrições
CREATE INDEX IF NOT EXISTS idx_chat_histories_transcription
ON n8n_chat_histories USING GIN (to_tsvector('portuguese', COALESCE(transcription, '')));
```

---

## Custos Estimados

### OpenAI TTS Pricing
- `tts-1`: $15.00 / 1M caracteres
- `tts-1-hd`: $30.00 / 1M caracteres

### Exemplo: 1000 mensagens de áudio/mês
- Média: 500 caracteres por mensagem
- Total: 500,000 caracteres
- Custo (tts-1-hd): **$15.00/mês**

---

## Próximos Passos (Opcional)

- [ ] Cache de áudio (reduzir custos 60-80%)
- [ ] Estatísticas de uso no dashboard
- [ ] Preferências por cliente WhatsApp
- [ ] Múltiplas vozes (personalização)
- [ ] Componente `AudioMessage` no frontend

---

## Referências

- Plano original: `docs/plans/PLANO_TTS_AUDIO.md` (v2.0 - desatualizado)
- Changelog: `CHANGELOG.md` (seção "Não Lançado")
- Handler: `src/handlers/handleAudioToolCall.ts`
- Tool: `src/nodes/generateAIResponse.ts` (TTS_AUDIO_TOOL_DEFINITION)

---

**Última atualização:** 2025-12-04
**Autor:** Claude Code
**Status:** ✅ Produção
