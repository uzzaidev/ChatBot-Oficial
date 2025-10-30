import { downloadMedia } from '@/lib/meta'

/**
 * 🔐 Download de mídia do WhatsApp usando config do cliente
 *
 * @param mediaId - ID da mídia no Meta
 * @param accessToken - Token opcional (do config do cliente)
 * @returns Buffer com o conteúdo da mídia
 */
export const downloadMetaMedia = async (mediaId: string, accessToken?: string): Promise<Buffer> => {
  try {
    return await downloadMedia(mediaId, accessToken)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to download Meta media: ${errorMessage}`)
  }
}
