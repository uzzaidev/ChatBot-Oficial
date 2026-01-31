'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Pin, Send, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { CRMNote } from '@/lib/types'

interface CardNotesProps {
  notes: CRMNote[]
  onAddNote: (content: string, isPinned: boolean) => Promise<boolean>
  loading?: boolean
}

export const CardNotes = ({ notes, onAddNote, loading = false }: CardNotesProps) => {
  const [newNote, setNewNote] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!newNote.trim()) return

    setSubmitting(true)
    const success = await onAddNote(newNote.trim(), isPinned)
    if (success) {
      setNewNote('')
      setIsPinned(false)
    }
    setSubmitting(false)
  }

  const pinnedNotes = notes.filter((n) => n.is_pinned)
  const regularNotes = notes.filter((n) => !n.is_pinned)

  return (
    <div className="flex flex-col h-full">
      {/* Add Note Form */}
      <div className="p-4 border-b border-border space-y-2">
        <Textarea
          placeholder="Adicionar nota..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPinned(!isPinned)}
            className={cn(isPinned && 'text-yellow-600 dark:text-yellow-500')}
          >
            <Pin className={cn('h-4 w-4 mr-1', isPinned && 'fill-current')} />
            Fixar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!newNote.trim() || submitting}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-1" />
                Enviar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Pinned Notes */}
            {pinnedNotes.length > 0 && (
              <>
                <div className="space-y-3">
                  {pinnedNotes.map((note) => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
                <Separator />
              </>
            )}

            {/* Regular Notes */}
            <div className="space-y-3">
              {regularNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>

            {notes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma nota adicionada ainda
              </p>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

const NoteCard = ({ note }: { note: CRMNote }) => {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border',
        note.is_pinned ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border bg-card'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {note.is_pinned && <Pin className="h-3 w-3 text-yellow-600 dark:text-yellow-500 fill-current" />}
          <span className="text-xs font-medium text-foreground">
            {note.author?.name || 'Desconhecido'}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(note.created_at), {
            addSuffix: true,
            locale: ptBR,
          })}
        </span>
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
    </div>
  )
}
