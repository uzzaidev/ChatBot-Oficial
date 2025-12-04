// src/nodes/uploadAudioToWhatsApp.ts
export interface UploadAudioToWhatsAppInput {
  audioBuffer: Buffer
  accessToken: string
  phoneNumberId: string
}

export interface UploadAudioToWhatsAppOutput {
  mediaId: string
  expiresAt: Date
}

export const uploadAudioToWhatsApp = async (
  input: UploadAudioToWhatsAppInput
): Promise<UploadAudioToWhatsAppOutput> => {
  const { audioBuffer, accessToken, phoneNumberId } = input

  console.log(`[WhatsApp Upload] Uploading ${audioBuffer.length} bytes to WhatsApp`)

  // Create FormData with Blob (works with fetch)
  const formData = new FormData()
  const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mpeg' })
  formData.append('file', blob, 'audio.mp3')
  formData.append('messaging_product', 'whatsapp')

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/media`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData
    }
  )

  if (!response.ok) {
    const errorData = await response.json()
    console.error('[WhatsApp Upload] Failed:', errorData)
    throw new Error(`WhatsApp upload failed: ${JSON.stringify(errorData)}`)
  }

  const data = await response.json()

  // WhatsApp media expira em 30 dias
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 30)

  console.log(`[WhatsApp Upload] Success! Media ID: ${data.id}`)

  return {
    mediaId: data.id,
    expiresAt
  }
}
