import { downloadMedia } from '@/lib/meta'

export const downloadMetaMedia = async (mediaId: string): Promise<Buffer> => {
  try {
    return await downloadMedia(mediaId)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to download Meta media: ${errorMessage}`)
  }
}
