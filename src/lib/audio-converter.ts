/**
 * Audio Converter - Converte áudio para formato compatível com WhatsApp
 *
 * WhatsApp aceita: OGG/Opus, MP3, AAC, AMR, MP4
 * Formato preferido: OGG/Opus (melhor compressão e qualidade)
 */

import ffmpeg from 'fluent-ffmpeg'
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

// Configurar FFmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

export interface ConvertAudioOptions {
  inputBuffer: Buffer
  inputFormat?: string // 'mp4', 'webm', etc.
  outputFormat?: 'ogg' | 'mp3' // Default: 'ogg'
}

/**
 * Converte áudio para formato compatível com WhatsApp
 *
 * @param options - Opções de conversão
 * @returns Buffer do áudio convertido
 */
export async function convertAudioToWhatsAppFormat(
  options: ConvertAudioOptions
): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  const { inputBuffer, inputFormat, outputFormat = 'ogg' } = options

  // Criar arquivos temporários
  const tempDir = tmpdir()
  const inputPath = join(tempDir, `input_${Date.now()}.${inputFormat || 'webm'}`)
  const outputPath = join(tempDir, `output_${Date.now()}.${outputFormat}`)

  try {
    // Salvar buffer de entrada em arquivo temporário
    await writeFile(inputPath, inputBuffer)

      input: inputPath,
      output: outputPath,
      format: outputFormat,
    })

    // Converter usando FFmpeg
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg(inputPath)

      if (outputFormat === 'ogg') {
        // OGG com codec Opus (melhor para WhatsApp)
        command
          .audioCodec('libopus')
          .audioBitrate('64k')
          .audioChannels(1)
          .audioFrequency(16000)
          .format('ogg')
      } else if (outputFormat === 'mp3') {
        // MP3 fallback
        command
          .audioCodec('libmp3lame')
          .audioBitrate('64k')
          .audioChannels(1)
          .audioFrequency(16000)
          .format('mp3')
      }

      command
        .output(outputPath)
        .on('end', () => {
          resolve()
        })
        .on('error', (err) => {
          reject(err)
        })
        .run()
    })

    // Ler arquivo convertido
    const fs = require('fs')
    const outputBuffer = await fs.promises.readFile(outputPath)

      size: outputBuffer.length,
      format: outputFormat,
    })

    // Limpar arquivos temporários
    await unlink(inputPath).catch(() => {})
    await unlink(outputPath).catch(() => {})

    return {
      buffer: outputBuffer,
      mimeType: outputFormat === 'ogg' ? 'audio/ogg; codecs=opus' : 'audio/mpeg',
      extension: outputFormat,
    }
  } catch (error) {
    // Limpar arquivos em caso de erro
    await unlink(inputPath).catch(() => {})
    await unlink(outputPath).catch(() => {})

    throw new Error(
      `Erro ao converter áudio: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    )
  }
}
