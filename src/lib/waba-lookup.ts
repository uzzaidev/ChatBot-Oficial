import { getClientConfig } from '@/lib/config'
import { createServiceRoleClient } from '@/lib/supabase'
import { get, setWithExpiry } from '@/lib/redis'
import type { ClientConfig } from '@/lib/types'

const CACHE_TTL_SECONDS = 300

export const extractWABAId = (payload: any): string | null => {
  try {
    return payload?.entry?.[0]?.id || null
  } catch {
    return null
  }
}

export const getClientByWABAId = async (wabaId: string): Promise<ClientConfig | null> => {
  const cacheKey = `waba:${wabaId}`

  try {
    const cached = await get(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached) as ClientConfig
      console.log(`[WABA Lookup] Cache hit for WABA ${wabaId} → client ${parsed.id}`)
      return parsed
    }
  } catch (cacheError) {
    console.warn('[WABA Lookup] Redis cache unavailable, falling back to DB:', cacheError)
  }

  const supabase = createServiceRoleClient()
  const { data: clientRow, error } = await supabase
    .from('clients')
    .select('id')
    .eq('meta_waba_id', wabaId)
    .eq('status', 'active')
    .single()

  if (error || !clientRow) {
    console.log(`[WABA Lookup] No active client found for WABA ${wabaId}`)
    return null
  }

  const clientId = (clientRow as { id: string }).id
  const config = await getClientConfig(clientId)

  if (!config) {
    console.warn(`[WABA Lookup] getClientConfig returned null for client ${clientId}`)
    return null
  }

  console.log(`[WABA Lookup] DB hit for WABA ${wabaId} → client ${config.id} (${config.name})`)

  try {
    await setWithExpiry(cacheKey, JSON.stringify(config), CACHE_TTL_SECONDS)
  } catch (cacheError) {
    console.warn('[WABA Lookup] Failed to cache config:', cacheError)
  }

  return config
}

export const invalidateWABACache = async (wabaId: string): Promise<void> => {
  try {
    const { deleteKey } = await import('@/lib/redis')
    await deleteKey(`waba:${wabaId}`)
  } catch {
    // Non-critical
  }
}
