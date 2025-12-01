'use client'

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronDown,
  Download,
  Eye,
  Trash2,
  Loader2,
} from 'lucide-react'
import type { Message, StoredMediaMetadata } from '@/lib/types'

interface MessageActionMenuProps {
  message: Message
  onReaction: (emoji: string) => Promise<void>
  onDelete: () => Promise<void>
  isDeleting?: boolean
}

// Common reaction emojis (WhatsApp style)
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

// Type guard for stored media metadata
const isStoredMediaMetadata = (obj: unknown): obj is StoredMediaMetadata => {
  if (!obj || typeof obj !== 'object') return false
  const meta = obj as Record<string, unknown>
  return (
    typeof meta.type === 'string' &&
    ['image', 'audio', 'document', 'video'].includes(meta.type) &&
    typeof meta.url === 'string' &&
    typeof meta.mimeType === 'string'
  )
}

export const MessageActionMenu = ({
  message,
  onReaction,
  onDelete,
  isDeleting = false,
}: MessageActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isReacting, setIsReacting] = useState(false)
  const isIncoming = message.direction === 'incoming'

  // Extract media metadata
  const rawMediaMetadata = message.metadata && typeof message.metadata === 'object'
    ? (message.metadata as Record<string, unknown>).media
    : null
  const mediaMetadata: StoredMediaMetadata | null = isStoredMediaMetadata(rawMediaMetadata) ? rawMediaMetadata : null
  const hasMedia = mediaMetadata !== null

  // 📱 Check if wamid is available for reactions
  const wamid = message.metadata && typeof message.metadata === 'object'
    ? (message.metadata as Record<string, unknown>).wamid as string | undefined
    : undefined
  const canReact = !!wamid // Reactions require WhatsApp message ID

  const handleReaction = async (emoji: string) => {
    setIsReacting(true)
    try {
      await onReaction(emoji)
    } finally {
      setIsReacting(false)
      setIsOpen(false)
    }
  }

  const handleDownload = () => {
    if (mediaMetadata?.url) {
      // Open in new tab for download
      window.open(mediaMetadata.url, '_blank')
    }
    setIsOpen(false)
  }

  const handleView = () => {
    if (mediaMetadata?.url) {
      window.open(mediaMetadata.url, '_blank')
    }
    setIsOpen(false)
  }

  const handleDelete = async () => {
    await onDelete()
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={`
            absolute top-1 opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            p-1 rounded-full
            ${isIncoming 
              ? 'right-1 bg-white/80 hover:bg-white text-erie-black-500' 
              : 'left-1 bg-white/20 hover:bg-white/30 text-white'
            }
          `}
          aria-label="Message actions"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align={isIncoming ? 'end' : 'start'}
        className="min-w-[280px] bg-white dark:bg-zinc-800 border dark:border-zinc-700"
      >
        {/* Emoji reactions row - only show if wamid is available */}
        {canReact && (
          <div className="flex items-center justify-evenly gap-1 p-2 border-b dark:border-zinc-700">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                disabled={isReacting}
                className="
                  p-1.5 rounded-full hover:bg-silver-100 dark:hover:bg-zinc-700
                  transition-colors text-xl flex-shrink-0
                  disabled:opacity-50
                "
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Media actions - only show for media messages */}
        {hasMedia && (
          <>
            <DropdownMenuItem onClick={handleView} className="gap-2 cursor-pointer">
              <Eye className="h-4 w-4" />
              <span>Visualizar</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload} className="gap-2 cursor-pointer">
              <Download className="h-4 w-4" />
              <span>Baixar</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Delete action */}
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={isDeleting}
          className="gap-2 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          <span>{isDeleting ? 'Apagando...' : 'Apagar'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
