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
  const [audioError, setAudioError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Debug logs
  console.log('[AudioMessage] Props:', {
    audioUrl,
    hasTranscription: !!transcription,
    durationSeconds,
    direction
  })

  const togglePlay = async () => {
    if (audioRef.current) {
      try {
        if (isPlaying) {
          audioRef.current.pause()
        } else {
          console.log('[AudioMessage] Attempting to play:', audioUrl)
          await audioRef.current.play()
          console.log('[AudioMessage] Play started successfully')
        }
        setIsPlaying(!isPlaying)
      } catch (error) {
        console.error('[AudioMessage] Play error:', error)
        setAudioError(error instanceof Error ? error.message : 'Erro ao reproduzir áudio')
      }
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
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleError = (e: Event) => {
      console.error('[AudioMessage] Audio element error:', e)
      const audioElement = e.target as HTMLAudioElement
      if (audioElement.error) {
        console.error('[AudioMessage] Error details:', {
          code: audioElement.error.code,
          message: audioElement.error.message
        })
        setAudioError(`Erro ao carregar áudio (código: ${audioElement.error.code})`)
      }
    }
    const handleLoadedMetadata = () => {
      console.log('[AudioMessage] Audio metadata loaded successfully')
    }

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('error', handleError)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [])

  return (
    <div
      className={`flex flex-col gap-2 max-w-md ${
        direction === 'outbound'
          ? 'ml-auto bg-blue-500 text-white'
          : 'bg-gray-200 text-gray-900'
      } rounded-lg p-3 shadow-sm`}
    >
      {/* Player de Áudio */}
      <div className="flex items-center gap-3">
        {/* Botão Play/Pause */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition shrink-0"
          aria-label={isPlaying ? 'Pausar áudio' : 'Reproduzir áudio'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {/* Waveform / Progress */}
        <div className="flex-1 min-w-0">
          <div className="relative h-8 flex items-center gap-0.5">
            {/* Barras de waveform simuladas */}
            {Array.from({ length: 20 }).map((_, i) => {
              const height = Math.random() * 80 + 20 // 20% a 100%
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
        <Volume2 className="w-4 h-4 opacity-75 shrink-0" />
      </div>

      {/* Botão Mostrar Transcrição */}
      {transcription && transcription.trim().length > 0 && (
        <button
          onClick={() => setShowTranscription(!showTranscription)}
          className="flex items-center gap-2 text-xs opacity-75 hover:opacity-100 transition self-start"
        >
          <FileText className="w-3 h-3" />
          {showTranscription ? 'Ocultar' : 'Mostrar'} transcrição
        </button>
      )}

      {/* Transcrição (expansível) */}
      {showTranscription && transcription && (
        <div className="text-sm border-t border-white/20 pt-2 mt-1">
          <p className="italic opacity-90 whitespace-pre-wrap">{transcription}</p>
        </div>
      )}

      {/* Erro de áudio */}
      {audioError && (
        <div className="text-xs bg-red-500/20 border border-red-500/50 rounded p-2 mt-2">
          <p className="font-medium">❌ {audioError}</p>
          <p className="opacity-75 mt-1">URL: {audioUrl}</p>
        </div>
      )}

      {/* Audio element (invisível) */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" crossOrigin="anonymous" />

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
