export const handleUnknownWABA = async (
  wabaId: string,
  payload: any
): Promise<false> => {
  const phoneNumberId = payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id
  const displayPhone = payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.display_phone_number
  const messageType = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.type
  const from = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from

  console.warn('[AutoProvision] Unknown WABA received webhook:', {
    wabaId,
    phoneNumberId: phoneNumberId || 'unknown',
    displayPhone: displayPhone || 'unknown',
    messageType: messageType || 'unknown',
    from: from || 'unknown',
    timestamp: new Date().toISOString(),
  })

  return false
}
