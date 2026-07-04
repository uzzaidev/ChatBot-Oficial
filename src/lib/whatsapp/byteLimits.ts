/**
 * WhatsApp interactive message byte limits (Meta API)
 *
 * IMPORTANT: Meta measures these fields in UTF-8 BYTES, not characters.
 * Accented characters (ç, á, é, í, ã, õ...) use 2 bytes each, so a string
 * with 24 characters can exceed the 24-byte limit.
 *
 * Client-safe (pure functions, no server deps).
 */

/** Meta byte limits per interactive field */
export const META_BYTE_LIMITS = {
  buttonTitle: 20,
  listRowTitle: 24,
  listRowDescription: 72,
  listSectionTitle: 24,
  listButtonText: 20,
  body: 1024,
  header: 60,
  footer: 60,
} as const

/** Count UTF-8 bytes of a string (matches Meta's measurement) */
export const countBytes = (text: string): number =>
  new TextEncoder().encode(text || '').length

/**
 * Truncate a string so it fits within `maxBytes` UTF-8 bytes without
 * splitting a multi-byte character in half.
 */
export const truncateToBytes = (text: string, maxBytes: number): string => {
  if (!text) return ''
  if (countBytes(text) <= maxBytes) return text

  const chars = Array.from(text) // split by code point, not UTF-16 unit
  let result = ''
  let bytes = 0
  for (const char of chars) {
    const charBytes = countBytes(char)
    if (bytes + charBytes > maxBytes) break
    result += char
    bytes += charBytes
  }
  return result
}
