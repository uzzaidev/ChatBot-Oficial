'use client'

interface DateSeparatorProps {
  date: string
}

/**
 * DateSeparator Component
 * 
 * Displays a date separator between messages (WhatsApp style)
 * Shows discrete date label centered between messages when day changes
 */
export const DateSeparator = ({ date }: DateSeparatorProps) => {
  return (
    <div className="flex items-center justify-center my-3">
      <div className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full shadow-sm">
        {date}
      </div>
    </div>
  )
}
