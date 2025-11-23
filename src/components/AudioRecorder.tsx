'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface AudioRecorderProps {
  phone: string
  clientId: string
  onAudioSent?: () => void
}

export const AudioRecorder = ({ phone, clientId, onAudioSent }: AudioRecorderProps) => {
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
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

        console.log('📦 [AudioRecorder] Arquivo criado:', {
          name: audioFile.name,
          type: audioFile.type,
          size: audioFile.size
        })

        await uploadAudio(audioFile)

        // Parar todas as tracks de áudio
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
      }

      mediaRecorder.start()
      setRecording(true)
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
        title={recording ? 'Parar gravação' : 'Gravar áudio'}
      >
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
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
