# Plano: Envio de Mídia no Chat de Atendimento

## Status: 📝 Planejamento

## Contexto Atual

### O que já temos

**Recebimento de mídia (Bot recebe do usuário):**
- ✅ Áudio (transcrição via Whisper)
- ✅ Imagens (análise via GPT-4o Vision)
- ✅ Documentos (processamento via GPT-4o)
- ✅ Download de mídia da Meta (`downloadMetaMedia.ts`)
- ✅ Nodes de processamento: `transcribeAudio.ts`, `analyzeImage.ts`, `analyzeDocument.ts`

**Envio de mensagens (Bot/Humano envia para usuário):**
- ✅ Texto apenas (`sendTextMessage` em `meta.ts`)
- ✅ Interface de chat no dashboard (`SendMessageForm.tsx`)
- ✅ API de envio manual (`/api/commands/send-message`)
- ✅ Salvamento no histórico (`saveChatMessage.ts`)

### O que falta

**Para humanos (prioridade ALTA):**
- ❌ Envio de áudio
- ❌ Envio de imagens
- ❌ Envio de documentos (PDF, TXT, etc)

**Para IA (prioridade MÉDIA):**
- ❌ IA gerar e enviar áudio (Text-to-Speech)
- ❌ IA enviar imagens (DALL-E, screenshots)
- ❌ IA enviar documentos (relatórios, PDFs gerados)

---

## Objetivos

### Fase 1: Humanos enviam mídia (MVP) 🎯
Permitir que atendentes humanos enviem áudio, fotos e documentos no dashboard, tornando a experiência semelhante ao WhatsApp real.

### Fase 2: IA envia mídia (Futuro)
Habilitar a IA a enviar mídia contextual (áudios, imagens, documentos) como parte das respostas automáticas.

---

## Análise da API do WhatsApp

### Endpoints de envio de mídia (Meta Graph API v18.0)

**POST** `https://graph.facebook.com/v18.0/{phone-number-id}/messages`

#### 1. Envio de Imagem

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "5554999999999",
  "type": "image",
  "image": {
    "link": "https://example.com/image.jpg",
    "caption": "Legenda opcional"
  }
}
```

**OU com upload direto:**

```json
{
  "messaging_product": "whatsapp",
  "to": "5554999999999",
  "type": "image",
  "image": {
    "id": "MEDIA_ID"
  }
}
```

#### 2. Envio de Áudio

```json
{
  "messaging_product": "whatsapp",
  "to": "5554999999999",
  "type": "audio",
  "audio": {
    "link": "https://example.com/audio.ogg"
  }
}
```

**Formatos aceitos:**
- `.aac`, `.m4a`, `.amr`, `.mp3`, `.ogg` (codec opus recomendado)

#### 3. Envio de Documento

```json
{
  "messaging_product": "whatsapp",
  "to": "5554999999999",
  "type": "document",
  "document": {
    "link": "https://example.com/document.pdf",
    "caption": "Documento importante",
    "filename": "relatorio.pdf"
  }
}
```

**Formatos aceitos:**
- Qualquer tipo MIME (PDF, DOC, XLS, etc)

### Upload de mídia para Meta

**POST** `https://graph.facebook.com/v18.0/{phone-number-id}/media`

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Body (multipart/form-data):**
```
file: [binary file data]
messaging_product: whatsapp
type: image/jpeg (ou outro MIME type)
```

**Response:**
```json
{
  "id": "1234567890"
}
```

### Limites de tamanho

| Tipo | Tamanho Máximo |
|------|----------------|
| Imagem | 5 MB |
| Áudio | 16 MB |
| Documento | 100 MB |
| Vídeo | 16 MB |

---

## Fase 1: Implementação MVP (Humanos enviam mídia)

### 1.1 Backend - Funções de envio de mídia

**Arquivo:** `src/lib/meta.ts`

Adicionar novas funções:

```typescript
/**
 * Envia imagem via WhatsApp
 */
export const sendImageMessage = async (
  phone: string,
  imageUrl: string,
  caption?: string,
  config?: ClientConfig
): Promise<{ messageId: string }> => {
  const accessToken = config?.apiKeys.metaAccessToken
  const phoneNumberId = config?.apiKeys.metaPhoneNumberId || getRequiredEnvVariable('META_PHONE_NUMBER_ID')
  const client = createMetaApiClient(accessToken)

  const response = await client.post(`/${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'image',
    image: {
      link: imageUrl,
      ...(caption && { caption })
    }
  })

  const messageId = response.data?.messages?.[0]?.id
  if (!messageId) throw new Error('No message ID returned from Meta API')

  return { messageId }
}

/**
 * Envia áudio via WhatsApp
 */
export const sendAudioMessage = async (
  phone: string,
  audioUrl: string,
  config?: ClientConfig
): Promise<{ messageId: string }> => {
  // Similar à sendImageMessage
}

/**
 * Envia documento via WhatsApp
 */
export const sendDocumentMessage = async (
  phone: string,
  documentUrl: string,
  filename: string,
  caption?: string,
  config?: ClientConfig
): Promise<{ messageId: string }> => {
  // Similar à sendImageMessage
}

/**
 * Faz upload de mídia para Meta e retorna ID
 */
export const uploadMediaToMeta = async (
  file: Buffer,
  mimeType: string,
  config?: ClientConfig
): Promise<{ mediaId: string }> => {
  const accessToken = config?.apiKeys.metaAccessToken
  const phoneNumberId = config?.apiKeys.metaPhoneNumberId || getRequiredEnvVariable('META_PHONE_NUMBER_ID')

  const formData = new FormData()
  formData.append('file', new Blob([file], { type: mimeType }))
  formData.append('messaging_product', 'whatsapp')
  formData.append('type', mimeType)

  const response = await axios.post(
    `${META_BASE_URL}/${phoneNumberId}/media`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${accessToken || getRequiredEnvVariable('META_ACCESS_TOKEN')}`,
        'Content-Type': 'multipart/form-data'
      }
    }
  )

  return { mediaId: response.data.id }
}
```

### 1.2 Backend - Nodes de envio de mídia

**Arquivo:** `src/nodes/sendWhatsAppImage.ts`

```typescript
import { sendImageMessage } from '@/lib/meta'
import { ClientConfig } from '@/lib/types'

export interface SendWhatsAppImageInput {
  phone: string
  imageUrl: string
  caption?: string
  config: ClientConfig
}

export const sendWhatsAppImage = async (input: SendWhatsAppImageInput): Promise<string> => {
  try {
    const { phone, imageUrl, caption, config } = input
    const { messageId } = await sendImageMessage(phone, imageUrl, caption, config)
    return messageId
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to send WhatsApp image: ${errorMessage}`)
  }
}
```

**Criar também:**
- `src/nodes/sendWhatsAppAudio.ts`
- `src/nodes/sendWhatsAppDocument.ts`

### 1.3 Backend - Armazenamento de mídia

**Opção 1: Supabase Storage (RECOMENDADO)**

```typescript
// src/lib/storage.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const uploadFileToStorage = async (
  file: Buffer,
  filename: string,
  mimeType: string,
  clientId: string
): Promise<string> => {
  const bucket = 'media-uploads'
  const path = `${clientId}/${Date.now()}_${filename}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return publicUrl
}
```

**Opção 2: Upload direto para Meta (sem armazenar)**

```typescript
// Upload direto para Meta, usa o ID retornado
const { mediaId } = await uploadMediaToMeta(fileBuffer, mimeType, config)
// Envia usando o ID (não URL)
```

### 1.4 Backend - API de envio de mídia

**Arquivo:** `src/app/api/commands/send-media/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getClientIdFromSession } from '@/lib/supabase-server'
import { getClientConfig } from '@/lib/config'
import { uploadFileToStorage } from '@/lib/storage'
import { sendImageMessage, sendAudioMessage, sendDocumentMessage } from '@/lib/meta'
import { saveChatMessage } from '@/nodes/saveChatMessage'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession()
    if (!clientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const phone = formData.get('phone') as string
    const file = formData.get('file') as File
    const mediaType = formData.get('type') as 'image' | 'audio' | 'document'
    const caption = formData.get('caption') as string | null

    if (!phone || !file || !mediaType) {
      return NextResponse.json({ error: 'phone, file e type são obrigatórios' }, { status: 400 })
    }

    const config = await getClientConfig(clientId)
    if (!config) {
      return NextResponse.json({ error: 'Client configuration not found' }, { status: 404 })
    }

    // Converter file para buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload para Supabase Storage
    const publicUrl = await uploadFileToStorage(
      buffer,
      file.name,
      file.type,
      clientId
    )

    // Enviar via WhatsApp
    let messageId: string
    switch (mediaType) {
      case 'image':
        const imageResult = await sendImageMessage(phone, publicUrl, caption || undefined, config)
        messageId = imageResult.messageId
        break
      case 'audio':
        const audioResult = await sendAudioMessage(phone, publicUrl, config)
        messageId = audioResult.messageId
        break
      case 'document':
        const docResult = await sendDocumentMessage(phone, publicUrl, file.name, caption || undefined, config)
        messageId = docResult.messageId
        break
    }

    // Salvar no histórico
    await saveChatMessage({
      phone,
      message: caption || `[${mediaType.toUpperCase()}] ${file.name}`,
      type: 'ai', // TODO: Mudar para 'atendente'
      clientId: config.id
    })

    return NextResponse.json({
      success: true,
      messageId,
      mediaUrl: publicUrl
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
```

### 1.5 Frontend - Componente de upload de mídia

**Arquivo:** `src/components/MediaUploadButton.tsx`

```typescript
'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, Image, Mic, FileText, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MediaUploadButtonProps {
  phone: string
  clientId: string
  onMediaSent?: () => void
}

export const MediaUploadButton = ({ phone, clientId, onMediaSent }: MediaUploadButtonProps) => {
  const [uploading, setUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (file: File, type: 'image' | 'audio' | 'document') => {
    try {
      setUploading(true)

      // Validar tamanho
      const maxSize = type === 'document' ? 100 * 1024 * 1024 : type === 'audio' ? 16 * 1024 * 1024 : 5 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: 'Arquivo muito grande',
          description: `Tamanho máximo: ${maxSize / (1024 * 1024)} MB`,
          variant: 'destructive'
        })
        return
      }

      const formData = new FormData()
      formData.append('phone', phone)
      formData.append('file', file)
      formData.append('type', type)

      const response = await fetch('/api/commands/send-media', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Erro ao enviar mídia')
      }

      toast({
        title: 'Sucesso',
        description: 'Mídia enviada com sucesso'
      })

      if (onMediaSent) {
        onMediaSent()
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao enviar mídia',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={uploading}
            className="flex-shrink-0"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Paperclip className="h-5 w-5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
            <Image className="h-4 w-4 mr-2" />
            Imagem
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => audioInputRef.current?.click()}>
            <Mic className="h-4 w-4 mr-2" />
            Áudio
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => documentInputRef.current?.click()}>
            <FileText className="h-4 w-4 mr-2" />
            Documento
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileUpload(file, 'image')
        }}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileUpload(file, 'audio')
        }}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileUpload(file, 'document')
        }}
      />
    </>
  )
}
```

### 1.6 Frontend - Gravação de áudio

**Arquivo:** `src/components/AudioRecorder.tsx`

**Compatibilidade:**
- ✅ Desktop (Chrome, Firefox, Edge, Safari)
- ✅ Mobile (iOS Safari, Chrome Mobile, Android)
- ✅ Solicita permissão do microfone automaticamente
- ✅ Suporta múltiplos formatos de áudio conforme navegador

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface AudioRecorderProps {
  phone: string
  clientId: string
  onAudioSent?: () => void
}

export const AudioRecorder = ({ phone, clientId, onAudioSent }: AudioRecorderProps) => {
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [permissionState, setPermissionState] = useState<'granted' | 'denied' | 'prompt' | 'unknown'>('unknown')
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  // Verificar permissão do microfone ao montar componente
  useEffect(() => {
    checkMicrophonePermission()
  }, [])

  const checkMicrophonePermission = async () => {
    try {
      // Verifica se o navegador suporta Permissions API
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        setPermissionState(result.state)

        // Listener para mudanças de permissão
        result.addEventListener('change', () => {
          setPermissionState(result.state)
        })
      } else {
        // Navegadores que não suportam Permissions API (iOS Safari)
        setPermissionState('unknown')
      }
    } catch (error) {
      // Fallback para navegadores sem suporte completo
      setPermissionState('unknown')
    }
  }

  const getSupportedMimeType = (): string => {
    // Lista de MIME types em ordem de preferência
    const types = [
      'audio/webm;codecs=opus',  // Preferido para WhatsApp
      'audio/webm',              // Fallback WebM
      'audio/ogg;codecs=opus',   // OGG Opus
      'audio/mp4',               // iOS Safari
      'audio/mpeg',              // MP3 fallback
      'audio/wav'                // WAV fallback
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }

    // Se nenhum suportado, usa vazio (navegador decide)
    return ''
  }

  const startRecording = async () => {
    // Verificar se permissão foi negada
    if (permissionState === 'denied') {
      toast({
        title: 'Microfone bloqueado',
        description: 'Você precisa permitir acesso ao microfone nas configurações do navegador',
        variant: 'destructive',
        duration: 5000
      })
      return
    }

    try {
      // Solicita acesso ao microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      streamRef.current = stream

      // Atualizar estado de permissão após sucesso
      setPermissionState('granted')

      // Detectar MIME type suportado
      const mimeType = getSupportedMimeType()

      const mediaRecorder = new MediaRecorder(stream, {
        ...(mimeType && { mimeType })
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        // Determinar extensão baseada no MIME type usado
        const usedMimeType = mediaRecorder.mimeType
        let extension = 'webm'
        let fileType = 'audio/webm'

        if (usedMimeType.includes('ogg')) {
          extension = 'ogg'
          fileType = 'audio/ogg'
        } else if (usedMimeType.includes('mp4')) {
          extension = 'm4a'
          fileType = 'audio/mp4'
        } else if (usedMimeType.includes('mpeg')) {
          extension = 'mp3'
          fileType = 'audio/mpeg'
        }

        const audioBlob = new Blob(chunksRef.current, { type: fileType })
        const audioFile = new File(
          [audioBlob],
          `audio_${Date.now()}.${extension}`,
          { type: fileType }
        )

        await uploadAudio(audioFile)

        // Parar todas as tracks de áudio
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.start()
      setRecording(true)

      toast({
        title: 'Gravando',
        description: 'Clique novamente para parar a gravação',
        duration: 2000
      })
    } catch (error) {
      console.error('Erro ao acessar microfone:', error)

      // Atualizar estado de permissão após erro
      setPermissionState('denied')

      let errorMessage = 'Não foi possível acessar o microfone'

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Permissão de microfone negada. Clique no ícone de cadeado na barra de endereço para permitir.'
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Nenhum microfone encontrado no dispositivo'
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Microfone já está sendo usado por outro aplicativo'
        }
      }

      toast({
        title: 'Erro ao gravar áudio',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const uploadAudio = async (file: File) => {
    try {
      setUploading(true)

      // Validar tamanho (16 MB máximo para WhatsApp)
      const maxSize = 16 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: 'Áudio muito grande',
          description: 'O áudio gravado excede 16 MB. Tente gravar um áudio mais curto.',
          variant: 'destructive'
        })
        return
      }

      const formData = new FormData()
      formData.append('phone', phone)
      formData.append('file', file)
      formData.append('type', 'audio')

      const response = await fetch('/api/commands/send-media', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao enviar áudio')
      }

      toast({
        title: 'Sucesso',
        description: 'Áudio enviado com sucesso'
      })

      if (onAudioSent) {
        onAudioSent()
      }
    } catch (error) {
      console.error('Erro ao enviar áudio:', error)
      toast({
        title: 'Erro ao enviar áudio',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      })
    } finally {
      setUploading(false)
    }
  }

  // Cleanup ao desmontar componente
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={recording ? stopRecording : startRecording}
        disabled={uploading}
        className="flex-shrink-0"
        title={
          permissionState === 'denied'
            ? 'Microfone bloqueado - clique para mais informações'
            : recording
            ? 'Parar gravação'
            : 'Gravar áudio (será solicitada permissão do microfone)'
        }
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : permissionState === 'denied' ? (
          <AlertCircle className="h-5 w-5 text-red-500" />
        ) : recording ? (
          <Square className="h-5 w-5 text-red-500 fill-red-500 animate-pulse" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>

      {/* Indicador de gravação em andamento */}
      {recording && (
        <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full animate-pulse" />
      )}
    </div>
  )
}
```

**Recursos implementados:**
- ✅ Verificação automática de permissão do microfone
- ✅ Detecção de MIME type suportado pelo navegador
- ✅ Otimização de áudio (cancelamento de eco, supressão de ruído)
- ✅ Tratamento de erros específicos por tipo
- ✅ Validação de tamanho antes do upload
- ✅ Indicador visual de gravação em andamento
- ✅ Cleanup automático ao desmontar componente
- ✅ Suporte para iOS Safari, Chrome, Firefox, Edge

### 1.7 Frontend - Integração no SendMessageForm

**Arquivo:** `src/components/SendMessageForm.tsx` (atualizar)

```typescript
// Adicionar imports
import { MediaUploadButton } from '@/components/MediaUploadButton'
import { AudioRecorder } from '@/components/AudioRecorder'

// No JSX, antes do textarea:
<div className="flex items-end gap-2 bg-white rounded-lg p-2">
  <MediaUploadButton
    phone={phone}
    clientId={clientId}
    onMediaSent={onMessageSent}
  />

  <AudioRecorder
    phone={phone}
    clientId={clientId}
    onAudioSent={onMessageSent}
  />

  <textarea
    // ... código existente
  />

  <Button
    // ... código existente (botão Send)
  />
</div>
```

### 1.8 Frontend - Visualização de mídia nas mensagens

**Arquivo:** `src/components/MessageBubble.tsx` (criar novo)

```typescript
'use client'

import { Message } from '@/lib/types'
import { Image, FileText, Headphones } from 'lucide-react'

interface MessageBubbleProps {
  message: Message
}

export const MessageBubble = ({ message }: MessageBubbleProps) => {
  const isIncoming = message.direction === 'incoming'

  // Detectar tipo de mídia pelo conteúdo
  const isImage = message.content.includes('[IMAGEM]') || message.metadata?.mimeType?.startsWith('image/')
  const isAudio = message.content.includes('[AUDIO]') || message.metadata?.mimeType?.startsWith('audio/')
  const isDocument = message.content.includes('[DOCUMENTO]') || message.metadata?.mimeType === 'application/pdf'

  return (
    <div className={`flex ${isIncoming ? 'justify-start' : 'justify-end'} mb-2`}>
      <div className={`max-w-[70%] rounded-lg p-3 ${
        isIncoming ? 'bg-white' : 'bg-mint-500 text-white'
      }`}>
        {/* Renderizar imagem */}
        {isImage && message.metadata?.url && (
          <img
            src={message.metadata.url}
            alt="Imagem enviada"
            className="max-w-full rounded-lg mb-2"
          />
        )}

        {/* Renderizar áudio */}
        {isAudio && message.metadata?.url && (
          <audio controls className="w-full mb-2">
            <source src={message.metadata.url} />
          </audio>
        )}

        {/* Renderizar documento */}
        {isDocument && message.metadata?.filename && (
          <a
            href={message.metadata.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 mb-2"
          >
            <FileText className="h-5 w-5" />
            <span>{message.metadata.filename}</span>
          </a>
        )}

        {/* Conteúdo de texto */}
        <p className="whitespace-pre-wrap">{message.content}</p>

        <p className="text-xs opacity-70 mt-1">
          {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  )
}
```

### 1.9 Database - Armazenar metadados de mídia

**Migração:** `supabase/migrations/TIMESTAMP_add_media_metadata.sql`

```sql
-- Adicionar coluna para metadados de mídia nas mensagens
ALTER TABLE n8n_chat_histories
ADD COLUMN IF NOT EXISTS media_metadata JSONB;

-- Index para buscar mensagens com mídia
CREATE INDEX IF NOT EXISTS idx_media_messages
ON n8n_chat_histories (session_id)
WHERE media_metadata IS NOT NULL;

-- Comentário
COMMENT ON COLUMN n8n_chat_histories.media_metadata IS 'Metadados de mídia (URL, tipo MIME, filename, etc)';
```

**Estrutura do JSONB:**
```json
{
  "type": "image",
  "url": "https://...",
  "mimeType": "image/jpeg",
  "filename": "foto.jpg",
  "size": 1024000,
  "mediaId": "META_ID_OPTIONAL"
}
```

### 1.10 Types - Atualizar interfaces

**Arquivo:** `src/lib/types.ts`

```typescript
// Adicionar à interface Message
export interface Message {
  // ... campos existentes
  media_metadata?: {
    type: 'image' | 'audio' | 'document' | 'video'
    url: string
    mimeType: string
    filename?: string
    size?: number
    mediaId?: string
  } | null
}

// Nova interface para envio de mídia
export interface SendMediaRequest {
  phone: string
  file: File
  type: 'image' | 'audio' | 'document'
  caption?: string
  client_id: string
}
```

---

## Fase 2: IA envia mídia (Futuro)

### 2.1 Text-to-Speech para áudio

**Serviços possíveis:**
- OpenAI TTS (RECOMENDADO - já temos integração)
- ElevenLabs (qualidade superior, mais caro)
- Google Cloud TTS

**Implementação:**

```typescript
// src/lib/openai.ts
export const generateSpeech = async (
  text: string,
  apiKey?: string
): Promise<Buffer> => {
  const openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY })

  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',
    input: text
  })

  const buffer = Buffer.from(await mp3.arrayBuffer())
  return buffer
}
```

**Node:** `src/nodes/generateSpeechAudio.ts`

**Tool da IA:**
```typescript
{
  name: 'enviar_audio',
  description: 'Envia uma mensagem de áudio para o cliente',
  parameters: {
    type: 'object',
    properties: {
      message: {
        type: 'string',
        description: 'Texto que será convertido em áudio'
      }
    }
  }
}
```

### 2.2 Geração de imagens (DALL-E)

**Implementação:**

```typescript
// src/lib/openai.ts
export const generateImage = async (
  prompt: string,
  apiKey?: string
): Promise<string> => {
  const openai = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY })

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024'
  })

  return response.data[0].url
}
```

**Tool da IA:**
```typescript
{
  name: 'enviar_imagem_gerada',
  description: 'Gera e envia uma imagem criada por IA',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Descrição da imagem a ser gerada'
      },
      caption: {
        type: 'string',
        description: 'Legenda opcional'
      }
    }
  }
}
```

### 2.3 Geração de documentos (PDFs)

**Bibliotecas:**
- `pdfkit` - Criação de PDFs
- `jsPDF` - Alternativa

**Casos de uso:**
- Relatórios de atendimento
- Comprovantes
- Guias instrucionais

### 2.4 IA envia documentos da Base de Conhecimento ⭐

**Contexto:**
O sistema já possui base de conhecimento (RAG) em `/dashboard/knowledge` onde usuários fazem upload de PDFs/TXTs. A IA pode acessar e enviar esses documentos diretamente para clientes via WhatsApp.

**Fluxo proposto:**

```
Cliente: "Pode me enviar o manual de instruções?"
    ↓
IA identifica necessidade de documento
    ↓
Busca na base de conhecimento (documents table)
    ↓
Encontra documento relevante
    ↓
Obtém URL público do arquivo
    ↓
Envia via WhatsApp usando sendDocumentMessage
    ↓
Cliente: "Obrigado! Recebi o manual"
```

**Implementação:**

#### 2.4.1 Tool da IA para enviar documentos

**Arquivo:** `src/nodes/generateAIResponse.ts` (adicionar tool)

```typescript
{
  name: 'enviar_documento_base_conhecimento',
  description: 'Envia um documento da base de conhecimento para o cliente via WhatsApp',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Termo de busca para encontrar o documento (ex: "manual", "contrato", "política")'
      },
      caption: {
        type: 'string',
        description: 'Mensagem opcional para acompanhar o documento'
      }
    },
    required: ['query']
  }
}
```

#### 2.4.2 Função de busca de documentos

**Arquivo:** `src/lib/knowledge.ts` (criar novo)

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface KnowledgeDocument {
  id: string
  filename: string
  url: string
  content: string
  client_id: string
  created_at: string
}

/**
 * Busca documentos na base de conhecimento
 */
export const searchDocuments = async (
  query: string,
  clientId: string,
  limit: number = 5
): Promise<KnowledgeDocument[]> => {
  try {
    // Busca por nome de arquivo ou conteúdo
    const { data, error } = await supabase
      .from('documents')
      .select('id, filename, url, content, client_id, created_at')
      .eq('client_id', clientId)
      .or(`filename.ilike.%${query}%,content.ilike.%${query}%`)
      .limit(limit)

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Erro ao buscar documentos:', error)
    return []
  }
}

/**
 * Obtém documento por ID
 */
export const getDocumentById = async (
  documentId: string,
  clientId: string
): Promise<KnowledgeDocument | null> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('client_id', clientId)
      .single()

    if (error) throw error

    return data
  } catch (error) {
    console.error('Erro ao buscar documento:', error)
    return null
  }
}

/**
 * Obtém URL público do arquivo no Supabase Storage
 */
export const getDocumentPublicUrl = async (
  filename: string,
  clientId: string
): Promise<string | null> => {
  try {
    const bucket = 'knowledge-base'
    const path = `${clientId}/${filename}`

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  } catch (error) {
    console.error('Erro ao obter URL pública:', error)
    return null
  }
}
```

#### 2.4.3 Handler do tool no chatbotFlow

**Arquivo:** `src/flows/chatbotFlow.ts` (adicionar após NODE 11)

```typescript
// Verificar se IA chamou tool de envio de documento
if (aiResponse.includes('<function=enviar_documento_base_conhecimento>')) {
  // Parse dos parâmetros do tool call
  const toolMatch = aiResponse.match(
    /<function=enviar_documento_base_conhecimento>(.*?)<\/function>/s
  )

  if (toolMatch) {
    const params = JSON.parse(toolMatch[1])
    const { query, caption } = params

    // Buscar documento na base de conhecimento
    const documents = await searchDocuments(query, config.id)

    if (documents.length > 0) {
      const doc = documents[0] // Pega o mais relevante

      // Obter URL pública do arquivo
      const publicUrl = await getDocumentPublicUrl(doc.filename, config.id)

      if (publicUrl) {
        // Enviar documento via WhatsApp
        await sendDocumentMessage(
          normalizedMessage.phone,
          publicUrl,
          doc.filename,
          caption || `Aqui está o documento: ${doc.filename}`,
          config
        )

        // Salvar no histórico
        await saveChatMessage({
          phone: normalizedMessage.phone,
          message: `[DOCUMENTO ENVIADO] ${doc.filename}`,
          type: 'ai',
          clientId: config.id
        })

        // Retornar sem continuar o fluxo (documento já foi enviado)
        return
      }
    } else {
      // Documento não encontrado, IA deve responder isso
      console.log('Nenhum documento encontrado para:', query)
    }
  }
}
```

#### 2.4.4 Alternativa: Usar vector search para melhor precisão

Se quiser busca semântica (mais precisa):

```typescript
/**
 * Busca semântica usando pgvector
 */
export const searchDocumentsSemanticaly = async (
  query: string,
  clientId: string,
  limit: number = 3
): Promise<KnowledgeDocument[]> => {
  try {
    // Gerar embedding da query
    const { embedding } = await generateEmbedding(query)

    // Buscar documentos similares usando vector search
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit,
      filter_client_id: clientId
    })

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Erro na busca semântica:', error)
    return []
  }
}
```

**Vantagens desta abordagem:**
- ✅ Cliente recebe documento completo (não apenas trechos)
- ✅ IA pode identificar quando é melhor enviar arquivo vs responder texto
- ✅ Reduz uso de tokens (não precisa incluir documento inteiro na resposta)
- ✅ Experiência mais rica no WhatsApp
- ✅ Documentos já estão na base de conhecimento (zero setup adicional)

**Casos de uso:**
```
Cliente: "Preciso do contrato de adesão"
IA: [busca "contrato"] → Envia contrato.pdf

Cliente: "Como funciona a garantia?"
IA: [busca "garantia"] → Envia politica_garantia.pdf + texto explicativo

Cliente: "Quais são os termos de uso?"
IA: [busca "termos"] → Envia termos_uso.pdf
```

**Storage necessário:**

Documentos devem estar em bucket público ou com signed URLs:

```sql
-- Criar bucket se não existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', true);

-- Política RLS para acesso público (somente leitura)
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'knowledge-base');
```

---

## Checklist de Implementação - Fase 1 (MVP)

### Backend
- [ ] Criar `sendImageMessage` em `meta.ts`
- [ ] Criar `sendAudioMessage` em `meta.ts`
- [ ] Criar `sendDocumentMessage` em `meta.ts`
- [ ] Criar `uploadMediaToMeta` em `meta.ts`
- [ ] Criar `uploadFileToStorage` em `storage.ts` (novo arquivo)
- [ ] Criar nodes: `sendWhatsAppImage.ts`, `sendWhatsAppAudio.ts`, `sendWhatsAppDocument.ts`
- [ ] Criar API route: `/api/commands/send-media/route.ts`
- [ ] Criar bucket `media-uploads` no Supabase Storage
- [ ] Aplicar migração para adicionar `media_metadata` em `n8n_chat_histories`
- [ ] Atualizar `saveChatMessage` para salvar metadados de mídia
- [ ] Atualizar `/api/messages/[phone]` para retornar metadados de mídia

### Frontend
- [ ] Criar `MediaUploadButton.tsx`
- [ ] Criar `AudioRecorder.tsx`
- [ ] Criar `MessageBubble.tsx`
- [ ] Atualizar `SendMessageForm.tsx` para incluir botões de mídia
- [ ] Atualizar `ConversationDetail.tsx` para usar `MessageBubble`
- [ ] Adicionar shadcn/ui `DropdownMenu` (`npx shadcn@latest add dropdown-menu`)

### Types
- [ ] Atualizar `Message` interface em `types.ts`
- [ ] Criar `SendMediaRequest` interface

### Testes
- [ ] Testar upload de imagem (< 5 MB)
- [ ] Testar upload de áudio (< 16 MB)
- [ ] Testar upload de documento (< 100 MB)
- [ ] Testar gravação de áudio pelo navegador
- [ ] Testar visualização de mídia nas mensagens
- [ ] Testar multi-tenant (verificar se mídia é isolada por cliente)
- [ ] Testar validação de tamanho de arquivo
- [ ] Testar validação de tipos MIME

### Documentação
- [ ] Atualizar `CLAUDE.md` com novas rotas e componentes
- [ ] Atualizar `docs/tables/tabelas.md` com coluna `media_metadata`
- [ ] Criar `docs/features/mensagens/MEDIA_FLOW.md` (diagrama do fluxo)

---

## Riscos e Considerações

### 1. Armazenamento
**Problema:** Mídia pode crescer rapidamente

**Soluções:**
- Usar Supabase Storage (gratuito até 1 GB, depois pago)
- Implementar limpeza automática de arquivos antigos (> 90 dias)
- Comprimir imagens antes do upload
- Limitar tamanhos de arquivo

### 2. Performance
**Problema:** Upload de arquivos grandes pode travar a UI

**Soluções:**
- Mostrar progress bar durante upload
- Implementar upload em chunks para arquivos grandes
- Validar tamanho antes de iniciar upload

### 3. Segurança
**Problema:** Usuários podem enviar arquivos maliciosos

**Soluções:**
- Validar tipos MIME no backend
- Escanear arquivos com antivírus (ClamAV via API)
- Usar RLS do Supabase para isolamento multi-tenant
- Nunca executar arquivos enviados

### 4. Custos
**Problema:** API do WhatsApp cobra por mensagens de mídia

**Soluções:**
- Implementar rate limiting
- Mostrar aviso ao atendente sobre custos
- Monitorar uso em `usage_logs`

### 5. Formato de áudio
**Problema:** WhatsApp prefere OGG/Opus, mas navegadores gravam em formatos variados

**Soluções:**
- Converter no backend usando `ffmpeg`
- Aceitar múltiplos formatos e deixar Meta converter
- Usar `MediaRecorder` com codec específico

---

## Estimativa de Tempo

| Tarefa | Tempo | Prioridade |
|--------|-------|-----------|
| **Backend - Funções Meta API** | 4h | Alta |
| **Backend - Storage Supabase** | 2h | Alta |
| **Backend - API de upload** | 3h | Alta |
| **Frontend - MediaUploadButton** | 3h | Alta |
| **Frontend - AudioRecorder** | 4h | Alta |
| **Frontend - MessageBubble** | 2h | Média |
| **Database - Migração** | 1h | Alta |
| **Testes e validação** | 4h | Alta |
| **TOTAL FASE 1** | **23h** | - |

**Estimativa conservadora:** 3-4 dias de trabalho

---

## Próximos Passos

1. ✅ **Criar este plano** (você está aqui)
2. [ ] **Setup inicial:**
   - Criar bucket no Supabase Storage
   - Aplicar migração de database
   - Instalar dependências (se necessário)
3. [ ] **Implementar backend** (prioridade)
4. [ ] **Implementar frontend**
5. [ ] **Testes end-to-end**
6. [ ] **Deploy e monitoramento**

---

## Referências

- [WhatsApp Cloud API - Media Messages](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#media-messages)
- [WhatsApp Cloud API - Upload Media](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)
- [OpenAI TTS](https://platform.openai.com/docs/guides/text-to-speech)

---

**Última atualização:** 2025-11-22
**Autor:** Claude Code
**Status:** 📝 Aguardando aprovação para implementação
