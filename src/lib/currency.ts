/**
 * CURRENCY CONVERSION
 *
 * Converts between currencies with 24h cache
 * Primary use: USD → BRL conversion for AI Gateway costs
 */

// =====================================================
// TYPES
// =====================================================

interface ExchangeRateCache {
  rate: number
  timestamp: number
}

// =====================================================
// CACHE
// =====================================================

// In-memory cache for exchange rates (24h TTL)
const exchangeRateCache = new Map<string, ExchangeRateCache>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

// =====================================================
// EXCHANGE RATE API
// =====================================================

/**
 * Get exchange rate from API
 * Uses free Exchange Rate API: https://www.exchangerate-api.com/
 *
 * Free tier: 1500 requests/month
 */
const fetchExchangeRate = async (from: string, to: string): Promise<number> => {
  try {
    // Using Exchange Rate API (free tier)
    const apiUrl = `https://api.exchangerate-api.com/v4/latest/${from}`

    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.rates || !data.rates[to]) {
      throw new Error(`Exchange rate not found for ${from} → ${to}`)
    }

    return data.rates[to]
  } catch (error) {
    console.error('[Currency] Error fetching exchange rate:', error)

    // Fallback to hardcoded rate if API fails (BRL ≈ 5.00 USD as of Dec 2025)
    if (from === 'USD' && to === 'BRL') {
      console.warn('[Currency] Using fallback rate: 1 USD = 5.00 BRL')
      return 5.0
    }
    if (from === 'BRL' && to === 'USD') {
      console.warn('[Currency] Using fallback rate: 1 BRL = 0.20 USD')
      return 0.2
    }

    throw error
  }
}

/**
 * Get cached exchange rate or fetch fresh
 */
export const getExchangeRate = async (from: string, to: string): Promise<number> => {
  // Same currency
  if (from === to) {
    return 1.0
  }

  const cacheKey = `${from}-${to}`
  const cached = exchangeRateCache.get(cacheKey)

  // Check if cache is valid (< 24h old)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[Currency] Using cached rate: ${from} → ${to} = ${cached.rate}`)
    return cached.rate
  }

  // Fetch fresh rate
  console.log(`[Currency] Fetching fresh rate: ${from} → ${to}`)
  const rate = await fetchExchangeRate(from, to)

  // Cache the rate
  exchangeRateCache.set(cacheKey, {
    rate,
    timestamp: Date.now(),
  })

  return rate
}

// =====================================================
// CONVERSION HELPERS
// =====================================================

/**
 * Convert USD to BRL
 *
 * @param usd - Amount in USD
 * @returns Amount in BRL
 */
export const convertUSDtoBRL = async (usd: number): Promise<number> => {
  const rate = await getExchangeRate('USD', 'BRL')
  return usd * rate
}

/**
 * Convert BRL to USD
 *
 * @param brl - Amount in BRL
 * @returns Amount in USD
 */
export const convertBRLtoUSD = async (brl: number): Promise<number> => {
  const rate = await getExchangeRate('BRL', 'USD')
  return brl * rate
}

/**
 * Format currency with locale
 *
 * @param amount - Amount to format
 * @param currency - Currency code (BRL, USD, etc)
 * @returns Formatted string (e.g., "R$ 10,50" or "$10.50")
 */
export const formatCurrency = (amount: number, currency: 'BRL' | 'USD' | 'EUR'): string => {
  const locales: Record<string, string> = {
    BRL: 'pt-BR',
    USD: 'en-US',
    EUR: 'de-DE',
  }

  return new Intl.NumberFormat(locales[currency] || 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format tokens with thousands separator
 *
 * @param tokens - Number of tokens
 * @returns Formatted string (e.g., "1,234,567")
 */
export const formatTokens = (tokens: number): string => {
  return new Intl.NumberFormat('en-US').format(tokens)
}

// =====================================================
// CACHE MANAGEMENT
// =====================================================

/**
 * Clear exchange rate cache (for testing or manual refresh)
 */
export const clearExchangeRateCache = (): void => {
  exchangeRateCache.clear()
  console.log('[Currency] Exchange rate cache cleared')
}

/**
 * Get cache status (for debugging)
 */
export const getCacheStatus = (): {
  size: number
  entries: { pair: string; rate: number; age: string }[]
} => {
  const entries = Array.from(exchangeRateCache.entries()).map(([pair, data]) => {
    const ageMs = Date.now() - data.timestamp
    const ageHours = Math.floor(ageMs / (60 * 60 * 1000))
    const ageMinutes = Math.floor((ageMs % (60 * 60 * 1000)) / (60 * 1000))

    return {
      pair,
      rate: data.rate,
      age: `${ageHours}h ${ageMinutes}m`,
    }
  })

  return {
    size: exchangeRateCache.size,
    entries,
  }
}

// =====================================================
// COST CALCULATION HELPERS
// =====================================================

/**
 * Calculate cost per million tokens in BRL
 *
 * @param inputPrice - Input price in USD per 1M tokens
 * @param outputPrice - Output price in USD per 1M tokens
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Object with costs in USD and BRL
 */
export const calculateTokenCost = async (
  inputPrice: number,
  outputPrice: number,
  inputTokens: number,
  outputTokens: number
): Promise<{
  usd: number
  brl: number
  breakdown: {
    inputUSD: number
    outputUSD: number
    inputBRL: number
    outputBRL: number
  }
}> => {
  const inputUSD = (inputTokens / 1_000_000) * inputPrice
  const outputUSD = (outputTokens / 1_000_000) * outputPrice
  const totalUSD = inputUSD + outputUSD

  const totalBRL = await convertUSDtoBRL(totalUSD)
  const inputBRL = await convertUSDtoBRL(inputUSD)
  const outputBRL = await convertUSDtoBRL(outputUSD)

  return {
    usd: totalUSD,
    brl: totalBRL,
    breakdown: {
      inputUSD,
      outputUSD,
      inputBRL,
      outputBRL,
    },
  }
}
