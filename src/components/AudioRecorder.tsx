'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Loader2, Send, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { AudioVisualizer } from '@/components/AudioVisualizer'

interface AudioRecorderProps {
  phone: string
  clientId: string
  onAudioSent?: () => void
  onRecordingChange?: (isRecording: boolean) => void
}

interface RecordedAudio {
  blob: Blob
  url: string
  file: File
}

export const AudioRecorder = ({ phone, clientId, onAudioSent, onRecordingChange }: AudioRecorderProps) => {
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<RecordedAudio | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const getSupportedMimeType = (): string => {
    // Lista de MIME types em ordem de preferência
    // IMPORTANTE: WhatsApp só aceita: ogg/opus, mpeg (MP3), amr, mp4, aac
    const types = [
      'audio/ogg;codecs=opus',   // ✅ WhatsApp ACEITA - Preferido (Chrome/Firefox)
      'audio/mp4',               // ✅ WhatsApp ACEITA - iOS Safari
      'audio/mpeg',              // ✅ WhatsApp ACEITA - MP3 fallback
      'audio/aac',               // ✅ WhatsApp ACEITA - AAC
      'audio/webm;codecs=opus',  // ❌ WhatsApp REJEITA (mas tenta converter)
    ]

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('🎤 [AudioRecorder] Codec selecionado:', type)
        return type
      }
    }

    console.warn('⚠️ [AudioRecorder] Nenhum codec suportado, usando padrão do navegador')
    return ''
  }

  const startRecording = async () => {
    try {
      // Solicita acesso ao microfone (popup automático do navegador)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      streamRef.current = stream

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
        // IMPORTANTE: Usar o MIME type ORIGINAL do MediaRecorder
        // Não modificar o tipo, pois isso pode corromper o arquivo
        const actualMimeType = mediaRecorder.mimeType
        console.log('🎵 [AudioRecorder] MIME type gravado:', actualMimeType)

        // Determinar extensão baseada no MIME type
        let extension = 'ogg'
        if (actualMimeType.includes('mp4')) {
          extension = 'm4a'
        } else if (actualMimeType.includes('mpeg') || actualMimeType.includes('mp3')) {
          extension = 'mp3'
        } else if (actualMimeType.includes('aac')) {
          extension = 'aac'
        } else if (actualMimeType.includes('webm')) {
          extension = 'webm'
          console.warn('⚠️ [AudioRecorder] WebM não é suportado pelo WhatsApp')
        } else if (actualMimeType.includes('ogg') || actualMimeType.includes('opus')) {
          extension = 'ogg'
        }

        // Criar Blob e File com o MIME type ORIGINAL (não modificar!)
        const audioBlob = new Blob(chunksRef.current, { type: actualMimeType })
        const audioFile = new File(
          [audioBlob],
          `audio_${Date.now()}.${extension}`,
          { type: actualMimeType }  // ✅ Usar tipo original do blob
        )

        // ✅ NOVO: Armazena o áudio para preview ao invés de enviar automaticamente
        const audioUrl = URL.createObjectURL(audioBlob)
        setRecordedAudio({
          blob: audioBlob,
          url: audioUrl,
          file: audioFile
        })

        // Parar todas as tracks de áudio
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      // CRITICAL para iOS Safari: timeslice de 100ms garante que dados sejam capturados
      // Sem isso, iOS só captura no final e pode perder dados
      mediaRecorder.start(100) // Captura a cada 100ms
      setRecording(true)
      onRecordingChange?.(true)
    } catch (error) {
      console.error('Erro ao acessar microfone:', error)

      let errorMessage = 'Não foi possível acessar o microfone'

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Você precisa permitir acesso ao microfone. Clique no ícone 🔒 na barra de endereço.'
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'Nenhum microfone encontrado no seu dispositivo'
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Microfone já está sendo usado por outro aplicativo'
        }
      }

      toast({
        title: 'Erro ao acessar microfone',
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
      onRecordingChange?.(false)
    }
  }

  const cancelRecording = () => {
    if (recordedAudio) {
      URL.revokeObjectURL(recordedAudio.url)
      setRecordedAudio(null)
    }
  }

  const confirmSend = async () => {
    if (recordedAudio) {
      await uploadAudio(recordedAudio.file)
      URL.revokeObjectURL(recordedAudio.url)
      setRecordedAudio(null)
    }
  }

  const uploadAudio = async (file: File) => {
    try {
      setUploading(true)

      console.log('📤 [AudioRecorder] Enviando áudio:', {
        filename: file.name,
        size: file.size,
        type: file.type,
        phone
      })

      // Validar tamanho (16 MB máximo para WhatsApp)
      const maxSize = 16 * 1024 * 1024
      if (file.size > maxSize) {
        console.error('❌ [AudioRecorder] Áudio muito grande:', file.size)
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

      console.log('🔄 [AudioRecorder] Chamando API /api/commands/send-media...')

      const response = await fetch('/api/commands/send-media', {
        method: 'POST',
        body: formData
      })

      console.log('📥 [AudioRecorder] Resposta da API:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ [AudioRecorder] Erro da API:', errorData)
        throw new Error(errorData.error || 'Erro ao enviar áudio')
      }

      const responseData = await response.json()
      console.log('✅ [AudioRecorder] Áudio enviado com sucesso:', responseData)

      toast({
        title: 'Sucesso',
        description: 'Áudio enviado com sucesso'
      })

      if (onAudioSent) {
        onAudioSent()
      }
    } catch (error) {
      console.error('❌ [AudioRecorder] Erro ao enviar áudio:', error)
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
      if (recordedAudio) {
        URL.revokeObjectURL(recordedAudio.url)
      }
    }
  }, [recordedAudio])

  // Se há áudio gravado, mostra preview
  if (recordedAudio) {
    return (
      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
        {/* Player de áudio */}
        <audio
          src={recordedAudio.url}
          controls
          className="h-10"
          style={{ width: '180px' }}
        />

        {/* Botão Cancelar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          disabled={uploading}
          className="flex-shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50"
          title="Cancelar e regravar"
        >
          <X className="h-5 w-5" />
        </Button>

        {/* Botão Enviar */}
        <Button
          onClick={confirmSend}
          disabled={uploading}
          size="icon"
          className="h-10 w-10 rounded-full flex-shrink-0 bg-mint-600 hover:bg-mint-700"
          title="Enviar áudio"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    )
  }

  // Se está gravando, mostra visualizer
  if (recording) {
    return (
      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 flex-1 min-w-0 overflow-hidden">
        {/* Visualizador de ondas sonoras */}
        <AudioVisualizer stream={streamRef.current} recording={recording} />

        {/* Botão de parar gravação */}
        <Button
          variant="ghost"
          size="icon"
          onClick={stopRecording}
          className="flex-shrink-0"
          title="Parar gravação"
        >
          <Square className="h-5 w-5 text-red-500 fill-red-500 animate-pulse" />
        </Button>
      </div>
    )
  }

  // Interface normal (botão de microfone)
  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={startRecording}
        disabled={uploading}
        className="flex-shrink-0"
        title="Gravar áudio"
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Mic className="h-5 w-5" />
        )}
      </Button>
    </div>
  )
}
