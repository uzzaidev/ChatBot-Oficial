'use client'

import { useEffect, useRef } from 'react'

interface AudioVisualizerProps {
  stream: MediaStream | null
  recording: boolean
}

export const AudioVisualizer = ({ stream, recording }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  useEffect(() => {
    if (!stream || !recording) {
      // Cleanup quando parar de gravar
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      analyserRef.current = null
      dataArrayRef.current = null
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Criar AudioContext (compatível com iOS Safari)
    // @ts-ignore - Safari usa webkitAudioContext
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    const audioContext = new AudioContextClass()
    audioContextRef.current = audioContext

    // Criar analyser
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256 // Resolução da análise (potência de 2)
    analyser.smoothingTimeConstant = 0.8 // Suavização (0-1)
    analyserRef.current = analyser

    // Conectar stream ao analyser
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    // Buffer para dados de frequência
    const bufferLength = analyser.frequencyBinCount
    const buffer = new ArrayBuffer(bufferLength)
    const dataArray = new Uint8Array(buffer)
    dataArrayRef.current = dataArray

    // Configurações visuais
    const BAR_COUNT = 40 // Número de barras (similar ao WhatsApp)
    const BAR_WIDTH = 3
    const BAR_GAP = 2
    const MIN_HEIGHT = 4
    const MAX_HEIGHT = canvas.height - 8

    // Função de desenho (loop de animação)
    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current) return

      animationFrameRef.current = requestAnimationFrame(draw)

      // Pegar dados de frequência (amplitude)
      // @ts-ignore - TypeScript issue with Uint8Array types in Web Audio API
      analyserRef.current.getByteFrequencyData(dataArrayRef.current)

      // Limpar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Desenhar barras
      for (let i = 0; i < BAR_COUNT; i++) {
        // Pegar amplitude média para esta barra
        const sliceSize = Math.floor(bufferLength / BAR_COUNT)
        const start = i * sliceSize
        const end = start + sliceSize

        let sum = 0
        for (let j = start; j < end; j++) {
          sum += dataArrayRef.current[j]
        }
        const average = sum / sliceSize

        // Converter amplitude (0-255) para altura da barra
        const normalizedHeight = average / 255
        const barHeight = Math.max(MIN_HEIGHT, normalizedHeight * MAX_HEIGHT)

        // Calcular posição X
        const x = i * (BAR_WIDTH + BAR_GAP) + 4

        // Calcular posição Y (centralizado verticalmente)
        const y = (canvas.height - barHeight) / 2

        // Desenhar barra com gradiente verde (estilo WhatsApp)
        const gradient = ctx.createLinearGradient(x, y, x, y + barHeight)
        gradient.addColorStop(0, '#10b981') // mint-500
        gradient.addColorStop(1, '#059669') // mint-600

        ctx.fillStyle = gradient
        ctx.fillRect(x, y, BAR_WIDTH, barHeight)
      }
    }

    // Iniciar animação
    draw()

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [stream, recording])

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={40}
      className="rounded"
      style={{ width: '200px', height: '40px' }}
    />
  )
}
