# Plano Técnico: Feature de Áudio/TTS (Text-to-Speech) - MODULAR

**Status:** 📋 Planejamento v2.0
**Prioridade:** Alta
**Complexidade:** Média-Alta
**Arquitetura:** **Modular, Não-Invasiva, TTS como Tool do AI**

---

## 🎯 1. Visão Geral - Abordagem Inteligente

### ❌ O QUE NÃO FAZER (Versão 1.0 - Substituição Global)
- Substituir TODAS as respostas por áudio (tudo ou nada)
- Lógica rígida no `chatbotFlow.ts`
- Cliente não pode escolher preferência
- Alto risco de crash/falha

### ✅ O QUE FAZER (Versão 2.0 - TTS como Tool do AI)

**TTS é uma TOOL opcional que o próprio AI decide quando usar:**

```
Cliente: "Pode me explicar como funciona esse produto?"
AI: "Quer que eu explique por áudio? Fica mais fácil de entender!"
Cliente: "Sim"
AI: <chama tool enviar_audio_explicacao>
```

**3 Níveis de Controle:**
1. **Global (Empresa):** Ativar/desativar TTS para o tenant
2. **Cliente WhatsApp:** Preferência salva (quer áudio? sim/não/perguntar)
3. **Contexto (AI):** Decide quando oferecer (explicações longas, tutoriais)

---

## 2. Arquitetura Modular - TTS como Tool

### 2.1 Nova Tool para o AI Agent

```typescript
// Adicionar ao generateAIResponse.ts (tools do Groq)
{
  type: "function",
  function: {
    name: "enviar_resposta_em_audio",
    description: "Envia a resposta atual como mensagem de voz (áudio) ao invés de texto. Use quando:\n- Explicações longas (>200 caracteres)\n- Cliente solicitou áudio\n- Tutoriais ou passo-a-passo\n- Cliente tem preferência por áudio configurada\nNÃO use para: respostas curtas, perguntas rápidas, confirmações.",
    parameters: {
      type: "object",
      properties: {
        texto_para_audio: {
          type: "string",
          description: "Texto que será convertido em áudio (máximo 5000 caracteres)"
        },
        perguntar_antes: {
          type: "boolean",
          description: "Se true, pergunta ao cliente antes de enviar áudio (ex: 'Quer que eu explique por áudio?')"
        }
      },
      required: ["texto_para_audio"]
    }
  }
}
```

### 2.2 Fluxo Inteligente (AI decide)

```
┌─────────────────────────────────────────────────────────────┐
│ Cliente: "Como funciona o processo de devolução?"           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ AI (Groq): Analisa contexto                                 │
│  - Resposta é longa (>200 chars) ✅                          │
│  - Cliente tem preferência "audio_enabled" ✅               │
│  - Tipo de conteúdo: explicação ✅                          │
│                                                             │
│ Decisão: USAR TOOL enviar_resposta_em_audio                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ chatbotFlow.ts: Detecta tool call                          │
│  - Verifica se TTS está enabled (global)                    │
│  - Verifica preferência do cliente                          │
│  - Se perguntar_antes=true, envia pergunta primeiro         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ NEW: handleAudioToolCall (handler específico)               │
│  ├─ convertTextToSpeech (OpenAI TTS)                        │
│  ├─ uploadAudioToWhatsApp (Media API)                       │
│  └─ sendWhatsAppMessage (type: audio) + FALLBACK           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ FALLBACK ROBUSTO:                                           │
│  try { enviar áudio }                                       │
│  catch { enviar texto (mesma mensagem) }                    │
│  → Nunca deixa cliente sem resposta!                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema - 3 Níveis de Configuração

### 3.1 Migration: Configuração Global + Preferências

```sql
-- Migration 1: Configuração global do tenant
ALTER TABLE clients
ADD COLUMN tts_enabled BOOLEAN DEFAULT false,
ADD COLUMN tts_provider TEXT DEFAULT 'openai' CHECK (tts_provider IN ('openai', 'elevenlabs', 'google')),
ADD COLUMN tts_voice TEXT DEFAULT 'alloy',
ADD COLUMN tts_speed NUMERIC DEFAULT 1.0 CHECK (tts_speed BETWEEN 0.25 AND 4.0),
ADD COLUMN tts_auto_offer BOOLEAN DEFAULT true; -- AI pode oferecer áudio automaticamente?

COMMENT ON COLUMN clients.tts_enabled IS 'Master switch: se false, TTS NUNCA será usado (ignora tool calls)';
COMMENT ON COLUMN clients.tts_auto_offer IS 'Se true, AI pode oferecer áudio. Se false, apenas se cliente pedir explicitamente';

-- Migration 2: Preferências por cliente WhatsApp
ALTER TABLE clientes_whatsapp
ADD COLUMN audio_preference TEXT DEFAULT 'ask' CHECK (audio_preference IN ('always', 'never', 'ask')),
ADD COLUMN last_audio_response_at TIMESTAMPTZ;

COMMENT ON COLUMN clientes_whatsapp.audio_preference IS 'always: sempre enviar áudio | never: nunca | ask: AI pergunta antes';

-- Migration 3: Cache de áudio
CREATE TABLE tts_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  text_hash TEXT NOT NULL, -- MD5 do texto
  audio_url TEXT NOT NULL, -- Supabase Storage ou CDN
  media_id TEXT, -- ID do WhatsApp (expira em 30 dias)
  provider TEXT NOT NULL,
  voice TEXT NOT NULL,
  duration_seconds INTEGER,
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  hit_count INTEGER DEFAULT 0, -- Quantas vezes foi reusado
  UNIQUE(client_id, text_hash)
);

CREATE INDEX idx_tts_cache_expires ON tts_cache(expires_at);
CREATE INDEX idx_tts_cache_hits ON tts_cache(hit_count DESC);

-- RLS
ALTER TABLE tts_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can access all TTS cache"
  ON tts_cache FOR ALL
  USING (auth.role() = 'service_role');
```

---

## 4. Implementação - Node & Tool Handler

### 4.1 Node: convertTextToSpeech.ts (Isolado, Modular)

```typescript
// src/nodes/convertTextToSpeech.ts
import OpenAI from 'openai'
import crypto from 'crypto'
import { createServerClient } from '@/lib/supabase/server'

export interface ConvertTextToSpeechInput {
  text: string
  clientId: string
  voice?: string
  speed?: number
  useCache?: boolean
}

export interface ConvertTextToSpeechOutput {
  audioBuffer: Buffer
  format: 'mp3'
  fromCache: boolean
  durationSeconds?: number
}

export const convertTextToSpeech = async (
  input: ConvertTextToSpeechInput
): Promise<ConvertTextToSpeechOutput> => {
  const { text, clientId, voice = 'alloy', speed = 1.0, useCache = true } = input

  // Validação: máximo 5000 caracteres
  if (text.length > 5000) {
    throw new Error('Text too long for TTS (max 5000 chars)')
  }

  // 1. Verificar cache
  if (useCache) {
    const textHash = crypto.createHash('md5').update(text + voice + speed).digest('hex')
    const supabase = createServerClient()

    const { data: cached } = await supabase
      .from('tts_cache')
      .select('audio_url, duration_seconds')
      .eq('client_id', clientId)
      .eq('text_hash', textHash)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cached) {
      // Cache hit! Atualizar contador
      await supabase
        .from('tts_cache')
        .update({ hit_count: supabase.rpc('increment', { row_id: textHash }) })
        .eq('text_hash', textHash)

      const response = await fetch(cached.audio_url)
      const audioBuffer = Buffer.from(await response.arrayBuffer())

      return {
        audioBuffer,
        format: 'mp3',
        fromCache: true,
        durationSeconds: cached.duration_seconds
      }
    }
  }

  // 2. Gerar áudio via OpenAI TTS
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  const mp3Response = await openai.audio.speech.create({
    model: 'tts-1-hd',
    voice: voice as 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer',
    input: text,
    speed: speed,
    response_format: 'mp3'
  })

  const audioBuffer = Buffer.from(await mp3Response.arrayBuffer())

  // Estimar duração (aproximado: 150 palavras/minuto)
  const wordCount = text.split(/\s+/).length
  const durationSeconds = Math.ceil((wordCount / 150) * 60)

  // 3. Salvar no cache
  if (useCache) {
    const supabase = createServerClient()
    const textHash = crypto.createHash('md5').update(text + voice + speed).digest('hex')
    const fileName = `${clientId}/${textHash}.mp3`

    // Upload para Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('tts-audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      })

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('tts-audio')
        .getPublicUrl(fileName)

      await supabase.from('tts_cache').upsert({
        client_id: clientId,
        text_hash: textHash,
        audio_url: publicUrl,
        provider: 'openai',
        voice: voice,
        duration_seconds: durationSeconds,
        file_size_bytes: audioBuffer.length
      })
    }
  }

  return {
    audioBuffer,
    format: 'mp3',
    fromCache: false,
    durationSeconds
  }
}
```

### 4.2 Node: uploadAudioToWhatsApp.ts

```typescript
// src/nodes/uploadAudioToWhatsApp.ts
import FormData from 'form-data'

export interface UploadAudioToWhatsAppInput {
  audioBuffer: Buffer
  accessToken: string
  phoneNumberId: string
}

export interface UploadAudioToWhatsAppOutput {
  mediaId: string
  expiresAt: Date // WhatsApp media expira em 30 dias
}

export const uploadAudioToWhatsApp = async (
  input: UploadAudioToWhatsAppInput
): Promise<UploadAudioToWhatsAppOutput> => {
  const { audioBuffer, accessToken, phoneNumberId } = input

  const formData = new FormData()
  formData.append('file', audioBuffer, {
    filename: 'audio.mp3',
    contentType: 'audio/mpeg'
  })
  formData.append('messaging_product', 'whatsapp')

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/media`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: formData
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`WhatsApp upload failed: ${JSON.stringify(errorData)}`)
  }

  const data = await response.json()

  // WhatsApp media expira em 30 dias
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  return {
    mediaId: data.id,
    expiresAt
  }
}
```

### 4.3 Handler: handleAudioToolCall.ts (NOVO)

```typescript
// src/handlers/handleAudioToolCall.ts
import { convertTextToSpeech } from '@/nodes/convertTextToSpeech'
import { uploadAudioToWhatsApp } from '@/nodes/uploadAudioToWhatsApp'
import { sendWhatsAppMessage } from '@/nodes/sendWhatsAppMessage'
import { createServerClient } from '@/lib/supabase/server'

export interface HandleAudioToolCallInput {
  texto_para_audio: string
  perguntar_antes?: boolean
  phone: string
  clientId: string
  clientConfig: any
}

export const handleAudioToolCall = async (
  input: HandleAudioToolCallInput
): Promise<{ success: boolean; sentAsAudio: boolean; error?: string }> => {
  const { texto_para_audio, perguntar_antes, phone, clientId, clientConfig } = input

  // 1. Verificação de segurança: TTS habilitado?
  if (!clientConfig.tts_enabled) {
    console.log('[TTS] Disabled globally, sending as text instead')
    return { success: false, sentAsAudio: false, error: 'TTS disabled' }
  }

  // 2. Verificar preferência do cliente
  const supabase = createServerClient()
  const { data: customer } = await supabase
    .from('clientes_whatsapp')
    .select('audio_preference')
    .eq('telefone', phone)
    .eq('client_id', clientId)
    .single()

  // Se cliente não quer áudio, envia texto
  if (customer?.audio_preference === 'never') {
    console.log('[TTS] Customer preference is "never", sending as text')
    await sendWhatsAppMessage({
      phone,
      content: texto_para_audio,
      accessToken: clientConfig.meta_access_token,
      phoneNumberId: clientConfig.meta_phone_number_id,
      type: 'text'
    })
    return { success: true, sentAsAudio: false }
  }

  // 3. Se deve perguntar antes, envia pergunta e aguarda resposta
  if (perguntar_antes && customer?.audio_preference === 'ask') {
    await sendWhatsAppMessage({
      phone,
      content: 'Quer que eu explique isso por áudio? Responda "sim" ou "não".',
      accessToken: clientConfig.meta_access_token,
      phoneNumberId: clientConfig.meta_phone_number_id,
      type: 'text'
    })
    // TODO: Implementar state machine para aguardar resposta
    // Por enquanto, envia texto
    return { success: true, sentAsAudio: false }
  }

  // 4. ENVIAR ÁUDIO com fallback robusto
  try {
    // 4.1 Converter para áudio
    const { audioBuffer, format, fromCache } = await convertTextToSpeech({
      text: texto_para_audio,
      clientId,
      voice: clientConfig.tts_voice || 'alloy',
      speed: clientConfig.tts_speed || 1.0,
      useCache: true
    })

    console.log(`[TTS] Audio generated (from cache: ${fromCache})`)

    // 4.2 Upload para WhatsApp
    const { mediaId } = await uploadAudioToWhatsApp({
      audioBuffer,
      accessToken: clientConfig.meta_access_token,
      phoneNumberId: clientConfig.meta_phone_number_id
    })

    console.log(`[TTS] Audio uploaded to WhatsApp: ${mediaId}`)

    // 4.3 Enviar mensagem de áudio
    await sendWhatsAppMessage({
      phone,
      content: texto_para_audio, // Salva texto no DB mesmo
      accessToken: clientConfig.meta_access_token,
      phoneNumberId: clientConfig.meta_phone_number_id,
      mediaId,
      type: 'audio'
    })

    // 4.4 Atualizar timestamp de último áudio
    await supabase
      .from('clientes_whatsapp')
      .update({ last_audio_response_at: new Date().toISOString() })
      .eq('telefone', phone)
      .eq('client_id', clientId)

    return { success: true, sentAsAudio: true }

  } catch (error) {
    // FALLBACK: Se QUALQUER erro, envia texto
    console.error('[TTS] Error generating/sending audio, falling back to text:', error)

    await sendWhatsAppMessage({
      phone,
      content: texto_para_audio,
      accessToken: clientConfig.meta_access_token,
      phoneNumberId: clientConfig.meta_phone_number_id,
      type: 'text'
    })

    return {
      success: true,
      sentAsAudio: false,
      error: error.message
    }
  }
}
```

---

## 5. Integração no chatbotFlow.ts (NÃO INVASIVO)

### 5.1 Adicionar Tool ao AI

```typescript
// src/nodes/generateAIResponse.ts (MODIFICAR TOOLS)

const tools = [
  {
    type: "function",
    function: {
      name: "transferir_atendimento",
      // ... código existente
    }
  },
  // NOVA TOOL
  {
    type: "function",
    function: {
      name: "enviar_resposta_em_audio",
      description: `Envia a resposta como mensagem de voz (áudio) ao invés de texto.

USE QUANDO:
- Explicações longas ou tutoriais (>200 caracteres)
- Cliente solicitou explicitamente áudio
- Conteúdo educacional ou passo-a-passo
- Cliente tem preferência por áudio

NÃO USE PARA:
- Respostas curtas (<100 caracteres)
- Perguntas simples
- Confirmações rápidas
- Menus de opções`,
      parameters: {
        type: "object",
        properties: {
          texto_para_audio: {
            type: "string",
            description: "Texto que será convertido em áudio (máximo 5000 caracteres)"
          },
          perguntar_antes: {
            type: "boolean",
            description: "Se true, pergunta 'Quer que eu explique por áudio?' antes de enviar",
            default: false
          }
        },
        required: ["texto_para_audio"]
      }
    }
  }
]
```

### 5.2 Detectar Tool Call no Flow

```typescript
// src/flows/chatbotFlow.ts (ADICIONAR HANDLER)

import { handleAudioToolCall } from '@/handlers/handleAudioToolCall'

// ... dentro do flow, após generateAIResponse

// NODE 11: Generate AI Response
const aiResponse = await generateAIResponse({
  chatHistory,
  relevantDocs,
  systemPrompt: clientConfig.system_prompt,
  // ...
})

// NOVO: Detectar tool calls
if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
  for (const toolCall of aiResponse.tool_calls) {
    if (toolCall.function.name === 'enviar_resposta_em_audio') {
      const args = JSON.parse(toolCall.function.arguments)

      // Handler específico para áudio (com fallback)
      const result = await handleAudioToolCall({
        texto_para_audio: args.texto_para_audio,
        perguntar_antes: args.perguntar_antes || false,
        phone: normalizedMessage.phone,
        clientId,
        clientConfig
      })

      // Se enviou áudio com sucesso, não precisa continuar flow
      if (result.sentAsAudio) {
        console.log('[Flow] Audio sent successfully, ending flow')
        return { success: true, sentAsAudio: true }
      }

      // Se falhou ou enviou texto, continua flow normalmente
      console.log('[Flow] Audio not sent, continuing with text flow')
      // Continua para FORMAT RESPONSE...
    }

    if (toolCall.function.name === 'transferir_atendimento') {
      // Handler existente
      // ...
    }
  }
}

// Continua flow normal (NODE 12: Format Response, etc.)
```

---

## 6. Prompt do AI (System Prompt) - Instruções sobre TTS

```typescript
// Adicionar ao system_prompt (em clients.system_prompt ou via dashboard)

const ttsInstructions = `
## Uso de Áudio (TTS)

Você tem uma ferramenta chamada "enviar_resposta_em_audio" que converte texto em mensagem de voz.

**Quando usar:**
- Explicações longas (>200 caracteres) que ficam melhores faladas
- Tutoriais ou instruções passo-a-passo
- Cliente pediu explicitamente áudio ("pode explicar por áudio?")
- Conteúdo educacional complexo

**Quando NÃO usar:**
- Respostas curtas (<100 caracteres)
- Listas ou menus de opções
- Confirmações simples ("ok", "entendi", etc.)
- Informações que precisam ser lidas (telefones, links, códigos)

**Exemplo de uso correto:**
Cliente: "Como funciona o processo de devolução?"
Você: <chama enviar_resposta_em_audio com texto completo da explicação>

**Exemplo incorreto:**
Cliente: "Qual o horário de funcionamento?"
Você: <NÃO use TTS, responda em texto: "Funcionamos das 9h às 18h">

Se não tiver certeza, use perguntar_antes=true para pedir permissão ao cliente.
`
```

---

## 7. Dashboard UI - Configuração Multi-Nível

### 7.1 Configuração Global (Admin)

```tsx
// src/app/dashboard/settings/tts/page.tsx
export default function TTSSettingsPage() {
  const [config, setConfig] = useState({
    tts_enabled: false,
    tts_provider: 'openai',
    tts_voice: 'alloy',
    tts_speed: 1.0,
    tts_auto_offer: true
  })

  return (
    <div className="space-y-6">
      <h1>Configurações de Áudio (TTS)</h1>

      {/* Master Switch */}
      <Card>
        <CardHeader>
          <CardTitle>Ativar TTS (Master Switch)</CardTitle>
          <CardDescription>
            Se desativado, o bot NUNCA enviará áudios, mesmo que o AI tente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Switch
            checked={config.tts_enabled}
            onCheckedChange={(checked) => updateConfig('tts_enabled', checked)}
          />
        </CardContent>
      </Card>

      {/* Auto Offer */}
      <Card>
        <CardHeader>
          <CardTitle>Oferta Automática de Áudio</CardTitle>
          <CardDescription>
            Permite que o AI ofereça áudio automaticamente em contextos apropriados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Switch
            checked={config.tts_auto_offer}
            disabled={!config.tts_enabled}
            onCheckedChange={(checked) => updateConfig('tts_auto_offer', checked)}
          />
          <p className="text-sm text-muted-foreground mt-2">
            Se desativado, áudio só será enviado se cliente pedir explicitamente
          </p>
        </CardContent>
      </Card>

      {/* Configuração de Voz */}
      <Card>
        <CardHeader>
          <CardTitle>Voz e Velocidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label>Voz</label>
            <Select
              value={config.tts_voice}
              onValueChange={(value) => updateConfig('tts_voice', value)}
              disabled={!config.tts_enabled}
            >
              <option value="alloy">Alloy (Neutro)</option>
              <option value="echo">Echo (Masculino)</option>
              <option value="fable">Fable (Feminino)</option>
              <option value="onyx">Onyx (Grave)</option>
              <option value="nova">Nova (Energético)</option>
              <option value="shimmer">Shimmer (Suave)</option>
            </Select>
          </div>

          <div>
            <label>Velocidade: {config.tts_speed}x</label>
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={[config.tts_speed]}
              onValueChange={([value]) => updateConfig('tts_speed', value)}
              disabled={!config.tts_enabled}
            />
          </div>

          <button
            onClick={() => playPreview(config.tts_voice, config.tts_speed)}
            disabled={!config.tts_enabled}
          >
            🔊 Testar Voz
          </button>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas de Uso</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <div className="flex justify-between">
              <span>Áudios enviados (mês):</span>
              <span className="font-bold">1,234</span>
            </div>
            <div className="flex justify-between">
              <span>Cache hit rate:</span>
              <span className="font-bold text-green-600">67%</span>
            </div>
            <div className="flex justify-between">
              <span>Custo estimado:</span>
              <span className="font-bold">$8.50</span>
            </div>
            <div className="flex justify-between">
              <span>Economia com cache:</span>
              <span className="font-bold text-green-600">$17.20</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 7.2 Preferências por Cliente (na conversa)

```tsx
// src/app/dashboard/conversations/[id]/page.tsx
// Adicionar botão na UI da conversa individual

<Card>
  <CardHeader>
    <CardTitle>Preferência de Áudio</CardTitle>
  </CardHeader>
  <CardContent>
    <Select
      value={customer.audio_preference}
      onValueChange={(value) => updateCustomerPreference(value)}
    >
      <option value="always">Sempre enviar áudio</option>
      <option value="ask">Perguntar antes de enviar</option>
      <option value="never">Nunca enviar áudio</option>
    </Select>
  </CardContent>
</Card>
```

---

## 8. Vantagens desta Arquitetura Modular

| Aspecto | Abordagem Global (v1.0) | Abordagem Modular (v2.0) ✅ |
|---------|------------------------|----------------------------|
| **Risco de crash** | Alto (modifica flow principal) | Baixo (isolado, com fallback) |
| **Flexibilidade** | Tudo ou nada | 3 níveis de controle |
| **Inteligência** | Lógica rígida | AI decide contexto |
| **Custo** | Pode enviar áudio desnecessário | Otimizado (só quando útil) |
| **UX** | Pode incomodar cliente | Cliente escolhe preferência |
| **Manutenção** | Acoplado ao flow | Desacoplado (fácil remover) |

---

## 9. Casos de Uso - Exemplos Reais

### Caso 1: Explicação Longa (AI oferece áudio)

```
Cliente: "Como funciona o processo de devolução do produto?"

AI (interno): Esta é uma explicação longa, vou oferecer áudio
AI: "Quer que eu explique o processo de devolução por áudio? Fica mais fácil!"

Cliente: "Sim"

AI: <chama enviar_resposta_em_audio com texto completo>
[Cliente recebe áudio de 90 segundos]
```

### Caso 2: Pergunta Rápida (AI envia texto)

```
Cliente: "Qual o horário de funcionamento?"

AI (interno): Resposta curta, não precisa áudio
AI: "Funcionamos de segunda a sexta, das 9h às 18h!"
[Envia texto normalmente]
```

### Caso 3: Cliente com Preferência "never"

```
Cliente: "Explica como usar o produto" [audio_preference = never]

AI: <tenta chamar enviar_resposta_em_audio>
Handler: Detecta preferência "never", envia texto automaticamente
[Cliente recebe texto mesmo sendo explicação longa]
```

### Caso 4: Fallback (TTS falha)

```
Cliente: "Me explica isso"

AI: <chama enviar_resposta_em_audio>
TTS: [ERRO: OpenAI API timeout]
Handler: Detecta erro, fallback para texto
[Cliente recebe texto SEM PERCEBER que houve falha]
```

---

## 10. Testes de Segurança

### Checklist de Não-Crash

- [ ] TTS desabilitado globalmente → Ignora tool calls, envia texto
- [ ] OpenAI API falha → Fallback para texto
- [ ] WhatsApp upload falha → Fallback para texto
- [ ] Texto vazio → Retorna erro, não gera áudio
- [ ] Texto >5000 chars → Trunca ou retorna erro
- [ ] Cliente sem preferência → Usa padrão "ask"
- [ ] Network timeout → Fallback após 10s
- [ ] Áudio corrompido → Detecta, envia texto

---

## 11. Implementação em Fases

### Phase 1: Core Infrastructure (Semana 1)
1. ✅ Migration do banco (configs + cache)
2. ✅ Node `convertTextToSpeech.ts`
3. ✅ Node `uploadAudioToWhatsApp.ts`
4. ✅ Modificar `sendWhatsAppMessage.ts` (adicionar type: audio)
5. ✅ Criar handler `handleAudioToolCall.ts`
6. ✅ Testar isoladamente (endpoint /api/test/tts)

### Phase 2: AI Integration (Semana 2)
1. ✅ Adicionar tool ao `generateAIResponse.ts`
2. ✅ Integrar handler no `chatbotFlow.ts`
3. ✅ Adicionar instruções ao system prompt
4. ✅ Testar com conversas reais

### Phase 3: UI & Controls (Semana 3)
1. ✅ Dashboard de configuração global
2. ✅ Preferências por cliente
3. ✅ Estatísticas de uso
4. ✅ Preview de vozes

### Phase 4: Optimization (Semana 4)
1. ✅ Cache inteligente
2. ✅ Monitoramento de custos
3. ✅ A/B testing (texto vs áudio)
4. ✅ Feedback do cliente (útil?)

---

## 12. Custos Reais (Otimizado)

### Cenário: 10,000 conversas/mês

| Métrica | Sem TTS Tool | Com TTS Tool (AI decide) |
|---------|--------------|-------------------------|
| Mensagens totais | 10,000 | 10,000 |
| Áudios enviados | 0 | ~2,000 (20% das conversas) |
| Cache hit rate | - | 60% |
| Áudios gerados | 0 | 800 (40% são novos) |
| Custo TTS | $0 | $12 (800 áudios × 500 chars × $15/1M) |
| **Custo total** | **$0** | **$12/mês** |

**Economia vs. TTS sempre ativo:** $63/mês (84% de economia!)

---

## 13. Monitoramento e Logs

```typescript
// src/lib/monitoring/ttsMetrics.ts
export const logTTSUsage = async (event: {
  type: 'generated' | 'cached' | 'failed' | 'fallback'
  clientId: string
  phone: string
  textLength: number
  fromCache?: boolean
  error?: string
}) => {
  // Log para analytics
  await supabase.from('tts_usage_logs').insert({
    event_type: event.type,
    client_id: event.clientId,
    phone: event.phone,
    text_length: event.textLength,
    from_cache: event.fromCache,
    error_message: event.error,
    timestamp: new Date()
  })
}
```

---

## 14. Persistência de Mensagens de Áudio + UI Frontend

### 14.1 Database: Salvar Mensagens de Áudio

**Tabela `messages` já existe, adicionar campos para áudio:**

```sql
-- Migration: Adicionar campos de áudio à tabela messages
ALTER TABLE messages
ADD COLUMN media_id TEXT, -- WhatsApp media ID
ADD COLUMN media_url TEXT, -- URL do áudio (Supabase Storage ou WhatsApp)
ADD COLUMN media_type TEXT CHECK (media_type IN ('audio', 'image', 'video', 'document')),
ADD COLUMN transcription TEXT, -- Texto da mensagem (mesmo que áudio)
ADD COLUMN audio_duration_seconds INTEGER;

COMMENT ON COLUMN messages.media_id IS 'WhatsApp media ID (expira em 30 dias)';
COMMENT ON COLUMN messages.media_url IS 'URL permanente do áudio (Supabase Storage)';
COMMENT ON COLUMN messages.transcription IS 'Transcrição do áudio (para busca e exibição)';

-- Índice para busca por transcrição
CREATE INDEX idx_messages_transcription ON messages USING GIN (to_tsvector('portuguese', transcription));
```

### 14.2 Modificar handleAudioToolCall: Salvar Mensagem

```typescript
// src/handlers/handleAudioToolCall.ts (ADICIONAR PERSISTÊNCIA)

export const handleAudioToolCall = async (input: HandleAudioToolCallInput) => {
  // ... código existente (gera áudio, upload)

  try {
    // 4.1 Converter para áudio
    const { audioBuffer, format, fromCache, durationSeconds } = await convertTextToSpeech({
      text: texto_para_audio,
      clientId,
      voice: clientConfig.tts_voice || 'alloy',
      speed: clientConfig.tts_speed || 1.0,
      useCache: true
    })

    // 4.2 Upload para WhatsApp
    const { mediaId, expiresAt } = await uploadAudioToWhatsApp({
      audioBuffer,
      accessToken: clientConfig.meta_access_token,
      phoneNumberId: clientConfig.meta_phone_number_id
    })

    // 4.2.1 Upload permanente para Supabase Storage (backup)
    const supabase = createServerClient()
    const fileName = `audio/${clientId}/${Date.now()}.mp3`

    const { error: storageError } = await supabase.storage
      .from('message-media')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000' // 1 ano
      })

    let permanentAudioUrl = null
    if (!storageError) {
      const { data: { publicUrl } } = supabase.storage
        .from('message-media')
        .getPublicUrl(fileName)
      permanentAudioUrl = publicUrl
    }

    // 4.3 Enviar mensagem de áudio
    await sendWhatsAppMessage({
      phone,
      content: texto_para_audio,
      accessToken: clientConfig.meta_access_token,
      phoneNumberId: clientConfig.meta_phone_number_id,
      mediaId,
      type: 'audio'
    })

    // ✅ 4.4 SALVAR NA TABELA MESSAGES
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('phone', phone)
      .eq('client_id', clientId)
      .single()

    if (conversation) {
      await supabase.from('messages').insert({
        client_id: clientId,
        conversation_id: conversation.id,
        phone,
        content: texto_para_audio, // Texto original
        transcription: texto_para_audio, // Mesma coisa (bot já gerou texto)
        type: 'audio',
        media_type: 'audio',
        media_id: mediaId,
        media_url: permanentAudioUrl,
        audio_duration_seconds: durationSeconds,
        direction: 'outbound', // Bot enviando
        status: 'sent',
        timestamp: new Date().toISOString(),
        metadata: {
          tts_voice: clientConfig.tts_voice,
          tts_speed: clientConfig.tts_speed,
          from_cache: fromCache,
          whatsapp_media_expires_at: expiresAt.toISOString()
        }
      })
    }

    // 4.5 Atualizar última mensagem da conversa
    await supabase
      .from('conversations')
      .update({
        last_message: `🎙️ Áudio (${durationSeconds}s)`,
        last_update: new Date().toISOString()
      })
      .eq('id', conversation.id)

    return { success: true, sentAsAudio: true }

  } catch (error) {
    // FALLBACK: envia texto e salva como mensagem de texto
    console.error('[TTS] Error, falling back to text:', error)

    await sendWhatsAppMessage({
      phone,
      content: texto_para_audio,
      accessToken: clientConfig.meta_access_token,
      phoneNumberId: clientConfig.meta_phone_number_id,
      type: 'text'
    })

    // Salvar como mensagem de texto
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('phone', phone)
      .eq('client_id', clientId)
      .single()

    if (conversation) {
      await supabase.from('messages').insert({
        client_id: clientId,
        conversation_id: conversation.id,
        phone,
        content: texto_para_audio,
        type: 'text',
        direction: 'outbound',
        status: 'sent',
        timestamp: new Date().toISOString(),
        metadata: {
          tts_fallback: true,
          tts_error: error.message
        }
      })
    }

    return { success: true, sentAsAudio: false, error: error.message }
  }
}
```

### 14.3 Frontend: Componente AudioMessage

```tsx
// src/components/AudioMessage.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, FileText } from 'lucide-react'

interface AudioMessageProps {
  audioUrl: string
  transcription: string
  durationSeconds: number
  direction: 'inbound' | 'outbound'
  timestamp: string
}

export const AudioMessage = ({
  audioUrl,
  transcription,
  durationSeconds,
  direction,
  timestamp
}: AudioMessageProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [showTranscription, setShowTranscription] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  return (
    <div
      className={`flex flex-col gap-2 max-w-md ${
        direction === 'outbound' ? 'ml-auto bg-blue-500 text-white' : 'bg-gray-200'
      } rounded-lg p-3`}
    >
      {/* Player de Áudio */}
      <div className="flex items-center gap-3">
        {/* Botão Play/Pause */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {/* Waveform / Progress */}
        <div className="flex-1">
          <div className="relative h-8 flex items-center gap-0.5">
            {/* Barras de waveform simuladas */}
            {Array.from({ length: 20 }).map((_, i) => {
              const height = Math.random() * 100
              const progress = (currentTime / durationSeconds) * 100
              const barProgress = (i / 20) * 100
              const isPlayed = barProgress < progress

              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all"
                  style={{
                    height: `${height}%`,
                    backgroundColor: isPlayed
                      ? direction === 'outbound'
                        ? 'white'
                        : '#3b82f6'
                      : 'rgba(255,255,255,0.3)',
                    minHeight: '4px'
                  }}
                />
              )
            })}
          </div>

          {/* Tempo */}
          <div className="flex justify-between text-xs opacity-75 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(durationSeconds)}</span>
          </div>
        </div>

        {/* Ícone Volume */}
        <Volume2 className="w-4 h-4 opacity-75" />
      </div>

      {/* Botão Mostrar Transcrição */}
      <button
        onClick={() => setShowTranscription(!showTranscription)}
        className="flex items-center gap-2 text-xs opacity-75 hover:opacity-100 transition"
      >
        <FileText className="w-3 h-3" />
        {showTranscription ? 'Ocultar' : 'Mostrar'} transcrição
      </button>

      {/* Transcrição (expansível) */}
      {showTranscription && (
        <div className="text-sm border-t border-white/20 pt-2 mt-1">
          <p className="italic opacity-90">{transcription}</p>
        </div>
      )}

      {/* Audio element (invisível) */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Timestamp */}
      <span className="text-xs opacity-60 text-right">
        {new Date(timestamp).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </span>
    </div>
  )
}
```

### 14.4 Integrar no MessageBubble Existente

```tsx
// src/components/MessageBubble.tsx (MODIFICAR)
import { AudioMessage } from './AudioMessage'

export const MessageBubble = ({ message }: { message: Message }) => {
  // Se for mensagem de áudio, usar componente específico
  if (message.media_type === 'audio' && message.media_url) {
    return (
      <AudioMessage
        audioUrl={message.media_url}
        transcription={message.transcription || message.content}
        durationSeconds={message.audio_duration_seconds || 0}
        direction={message.direction}
        timestamp={message.timestamp}
      />
    )
  }

  // Mensagem de texto normal (código existente)
  return (
    <div className={/* ... */}>
      {message.content}
    </div>
  )
}
```

### 14.5 Busca por Transcrição

```typescript
// src/app/api/conversations/search/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  const supabase = createServerClient()

  // Busca em mensagens de TEXTO e TRANSCRIÇÕES de áudio
  const { data } = await supabase
    .from('messages')
    .select('*')
    .or(`content.ilike.%${query}%,transcription.ilike.%${query}%`)
    .order('timestamp', { ascending: false })

  return NextResponse.json({ messages: data })
}
```

### 14.6 Dashboard: Filtro de Mensagens de Áudio

```tsx
// src/app/dashboard/conversations/[id]/page.tsx
export default function ConversationPage() {
  const [filterType, setFilterType] = useState<'all' | 'text' | 'audio'>('all')

  const filteredMessages = messages.filter(msg => {
    if (filterType === 'all') return true
    if (filterType === 'audio') return msg.media_type === 'audio'
    if (filterType === 'text') return msg.type === 'text'
    return true
  })

  return (
    <div>
      {/* Filtro */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilterType('all')}>
          Todas ({messages.length})
        </button>
        <button onClick={() => setFilterType('text')}>
          📝 Texto ({messages.filter(m => m.type === 'text').length})
        </button>
        <button onClick={() => setFilterType('audio')}>
          🎙️ Áudio ({messages.filter(m => m.media_type === 'audio').length})
        </button>
      </div>

      {/* Lista de Mensagens */}
      {filteredMessages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  )
}
```

### 14.7 Realtime: Atualizar UI quando Áudio Chega

```typescript
// src/hooks/useRealtimeMessages.ts (MODIFICAR)
useEffect(() => {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      },
      (payload) => {
        const newMessage = payload.new

        // Se for áudio, tocar som de notificação diferente
        if (newMessage.media_type === 'audio') {
          playAudioNotificationSound()
        } else {
          playTextNotificationSound()
        }

        setMessages(prev => [...prev, newMessage])
      }
    )
    .subscribe()

  return () => {
    channel.unsubscribe()
  }
}, [conversationId])
```

### 14.8 Exportar Conversas (incluindo áudios)

```typescript
// src/app/api/conversations/[id]/export/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', params.id)
    .order('timestamp', { ascending: true })

  // Gerar PDF ou JSON com links de áudio
  const exportData = messages.map(msg => ({
    timestamp: msg.timestamp,
    direction: msg.direction,
    type: msg.media_type || msg.type,
    content: msg.transcription || msg.content,
    audioUrl: msg.media_type === 'audio' ? msg.media_url : null
  }))

  return NextResponse.json(exportData)
}
```

---

## 15. Próximos Passos (Ordem de Implementação)

1. **Criar migrations** (configs + cache + preferências)
2. **Implementar nodes isolados** (TTS, upload)
3. **Testar nodes** via `/api/test/tts`
4. **Criar handler com fallback**
5. **Adicionar tool ao AI**
6. **Integrar no flow** (não-invasivo)
7. **Dashboard de configuração**
8. **Testar end-to-end** com WhatsApp real
9. **Monitorar custos** primeiros dias
10. **Ajustar system prompt** baseado em uso

---

**Criado em:** 2025-12-04 (v2.0 - Modular)
**Autor:** Claude Code
**Versão:** 2.0 (Arquitetura Inteligente)
**Aprovação:** ✅ Arquitetura não-invasiva, modular, com fallback robusto
