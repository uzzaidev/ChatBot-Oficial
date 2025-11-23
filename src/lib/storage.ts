import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const MEDIA_BUCKET = 'media-uploads'

/**
 * Faz upload de arquivo para Supabase Storage
 *
 * @param file - Buffer do arquivo
 * @param filename - Nome do arquivo
 * @param mimeType - Tipo MIME do arquivo
 * @param clientId - ID do cliente (multi-tenant)
 * @returns URL pública do arquivo
 */
export const uploadFileToStorage = async (
  file: Buffer,
  filename: string,
  mimeType: string,
  clientId: string
): Promise<string> => {
  try {
    // Sanitizar nome do arquivo (remover caracteres especiais)
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')

    // Path: {clientId}/{timestamp}_{filename}
    const path = `${clientId}/${Date.now()}_${sanitizedFilename}`

    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      throw error
    }

    // Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(path)

    return publicUrlData.publicUrl
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to upload file to storage: ${errorMessage}`)
  }
}

/**
 * Deleta arquivo do Supabase Storage
 *
 * @param publicUrl - URL pública do arquivo
 * @returns true se deletado com sucesso
 */
export const deleteFileFromStorage = async (publicUrl: string): Promise<boolean> => {
  try {
    // Extrair path da URL
    // URL format: https://{project}.supabase.co/storage/v1/object/public/media-uploads/{clientId}/{filename}
    const urlParts = publicUrl.split('/media-uploads/')
    if (urlParts.length < 2) {
      throw new Error('Invalid storage URL')
    }

    const path = urlParts[1]

    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .remove([path])

    if (error) {
      throw error
    }

    return true
  } catch (error) {
    console.error('Failed to delete file from storage:', error)
    return false
  }
}

/**
 * Cria o bucket de mídia se não existir
 *
 * IMPORTANTE: Executar manualmente via Supabase Dashboard ou migration
 */
export const ensureMediaBucketExists = async (): Promise<void> => {
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      throw listError
    }

    const bucketExists = buckets?.some((bucket) => bucket.name === MEDIA_BUCKET)

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(MEDIA_BUCKET, {
        public: true,
        fileSizeLimit: 104857600, // 100 MB
      })

      if (createError) {
        throw createError
      }

      console.log(`✅ Bucket '${MEDIA_BUCKET}' criado com sucesso`)
    }
  } catch (error) {
    console.error('Erro ao criar bucket:', error)
    throw error
  }
}
