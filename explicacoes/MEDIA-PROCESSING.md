# Processamento de Mídia (Áudio e Imagem)

## Visão Geral

O chatbot agora suporta **processamento inteligente de mídia**, convertendo áudio em texto (transcrição) e imagens em descrições detalhadas antes de processar com o AI Agent.

## Fluxo de Processamento

### Mensagem de Texto (type: "text")
```
Webhook → Parse → CheckOrCreateCustomer → NormalizeMessage → Redis → AI Agent
```

### Mensagem de Áudio (type: "audio")
```
Webhook → Parse → CheckOrCreateCustomer → 
  → Download Audio (Meta API) →
  → Transcribe Audio (Whisper) →
  → NormalizeMessage → Redis → AI Agent
```

### Mensagem de Imagem (type: "image")
```
Webhook → Parse → CheckOrCreateCustomer →
  → Get Image URL (Meta API) →
  → Analyze Image (GPT-4o Vision) →
  → NormalizeMessage → Redis → AI Agent
```

## Exemplo de Webhook (Áudio)

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "555499250023",
          "type": "audio",
          "audio": {
            "id": "1361216488727476",
            "mime_type": "audio/ogg; codecs=opus",
            "voice": true
          }
        }]
      }
    }]
  }]
}
```

## Nodes Envolvidos

### 1. `parseMessage.ts`
Extrai informações do webhook, detecta tipo de mídia:
- `type`: "text", "audio", "image"
- `metadata.id`: ID do arquivo no Meta
- `content`: Texto/legenda (se aplicável)

### 2. `downloadMetaMedia.ts`
Baixa arquivo de mídia do Meta:
```typescript
const audioBuffer = await downloadMetaMedia(mediaId)
// Retorna: Buffer com dados binários do arquivo
```

### 3. `transcribeAudio.ts`
Transcreve áudio com Whisper (OpenAI):
```typescript
const transcription = await transcribeAudio(audioBuffer)
// Retorna: "Olá, quero saber sobre energia solar"
```

### 4. `analyzeImage.ts`
Analisa imagem com GPT-4o Vision:
```typescript
const imageUrl = await getMediaUrl(imageId)
const description = await analyzeImage(imageUrl)
// Retorna: "A imagem mostra um painel solar instalado no telhado..."
```

### 5. `normalizeMessage.ts`
Unifica o conteúdo processado:
```typescript
normalizeMessage({
  parsedMessage: { type: 'audio', ... },
  processedContent: 'Texto transcrito do áudio'
})
// Retorna: { content: 'Texto transcrito do áudio', ... }
```

## Custos

### Whisper (Transcrição de Áudio)
- **Modelo**: `whisper-1`
- **Custo**: $0.006 / minuto de áudio
- **Exemplo**: Áudio de 30s = $0.003

### GPT-4o Vision (Análise de Imagem)
- **Modelo**: `gpt-4o`
- **Custo**: $0.01 / 1K tokens de entrada + $0.03 / 1K tokens de saída
- **Exemplo**: Análise de imagem + descrição de 200 tokens = ~$0.01

## Variáveis de Ambiente Necessárias

```env
# OpenAI (Whisper + GPT-4o Vision)
OPENAI_API_KEY=sk-proj-...

# Meta (Download de Mídia)
META_ACCESS_TOKEN=EAAUWWYWAXJYBPx1o...
META_PHONE_NUMBER_ID=899639703222013
```

## Logs Esperados

### Processamento de Áudio
```
[chatbotFlow] NODE 4a: Baixando áudio...
[chatbotFlow] NODE 4b: Transcrevendo áudio...
[chatbotFlow] 🎤 Áudio transcrito: Olá, quero saber sobre energia solar
```

### Processamento de Imagem
```
[chatbotFlow] NODE 4a: Obtendo URL da imagem...
[chatbotFlow] NODE 4b: Analisando imagem com GPT-4o Vision...
[chatbotFlow] 🖼️ Imagem analisada: Descrição da imagem: A imagem mostra...
```

## Limitações e Melhorias Futuras

### Atual
- ✅ Áudio em formato OGG (WhatsApp padrão)
- ✅ Imagens JPEG/PNG
- ✅ Legendas de imagem combinadas com descrição
- ❌ Vídeos (não suportado)
- ❌ Documentos (não suportado)
- ❌ Cache de transcrições/análises (processa sempre)

### Melhorias Planejadas
- [ ] Cache de transcrições no Redis (evitar reprocessamento)
- [ ] Suporte a vídeo (download + extração de frame + análise)
- [ ] Suporte a documentos PDF (OCR + extração de texto)
- [ ] Fallback se OpenAI falhar (ex: usar Groq Whisper)
- [ ] Compressão de imagens antes de enviar para GPT-4o

## Troubleshooting

### Erro: "No media ID found"
**Causa**: Webhook não contém `metadata.id`
**Solução**: Verificar formato do webhook no Meta Developer Console

### Erro: "Failed to download media from Meta API"
**Causa**: Token inválido ou expirado
**Solução**: Renovar `META_ACCESS_TOKEN`

### Erro: "Failed to transcribe audio with Whisper"
**Causa**: OPENAI_API_KEY inválida ou sem créditos
**Solução**: Verificar créditos em https://platform.openai.com/usage

### Erro: "Failed to analyze image with GPT-4o Vision"
**Causa**: Imagem muito grande (>20MB) ou formato não suportado
**Solução**: Meta já envia imagens comprimidas, verificar se URL é acessível
