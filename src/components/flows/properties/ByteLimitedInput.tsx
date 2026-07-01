'use client'

/**
 * Byte-limited input for WhatsApp interactive fields.
 *
 * Meta measures field limits in UTF-8 BYTES, not characters:
 *  - accents (ç, á, ã...) = 2 bytes
 *  - emojis (😀) = 4+ bytes
 *
 * This component truncates input to the byte limit (never overflows) and
 * shows a live byte counter that warns as it approaches / reaches the limit.
 */

import { countBytes, truncateToBytes } from '@/lib/whatsapp/byteLimits'

interface ByteLimitedInputProps {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  maxBytes: number
  placeholder?: string
  className?: string
  multiline?: boolean
  rows?: number
}

export default function ByteLimitedInput({
  value,
  onChange,
  onBlur,
  maxBytes,
  placeholder,
  className,
  multiline = false,
  rows = 3,
}: ByteLimitedInputProps) {
  const bytes = countBytes(value)
  const ratio = maxBytes > 0 ? bytes / maxBytes : 0
  const counterColor =
    ratio >= 1 ? 'text-red-600 font-medium' : ratio >= 0.85 ? 'text-amber-600' : 'text-gray-400'

  const handleChange = (raw: string) => {
    // Truncate by bytes so the value can never exceed Meta's limit
    onChange(truncateToBytes(raw, maxBytes))
  }

  return (
    <div className="w-full">
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={className}
          rows={rows}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={className}
        />
      )}
      <p className={`text-[10px] mt-0.5 text-right ${counterColor}`}>
        {bytes}/{maxBytes} bytes
        {ratio >= 1 && ' • limite atingido'}
      </p>
    </div>
  )
}
