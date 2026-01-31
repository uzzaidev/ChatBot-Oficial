'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, Phone, MessageSquare, Calendar, DollarSign } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { apiFetch } from '@/lib/api'
import type { CRMCard, CRMNote, CRMActivityLog } from '@/lib/types'
import { CardStatusBadge } from './CardStatusBadge'
import { CardTagList } from './CardTagList'
import { CardNotes } from './CardNotes'
import { CardTimeline } from './CardTimeline'

interface CardDetailPanelProps {
  card: CRMCard | null
  open: boolean
  onClose: () => void
  onUpdate?: () => void
}

const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const formatPhone = (phone: string | number): string => {
  const phoneStr = String(phone)
  if (phoneStr.length === 13) {
    return `+${phoneStr.slice(0, 2)} (${phoneStr.slice(2, 4)}) ${phoneStr.slice(4, 9)}-${phoneStr.slice(9)}`
  }
  return phoneStr
}

export const CardDetailPanel = ({ card, open, onClose, onUpdate }: CardDetailPanelProps) => {
  const [notes, setNotes] = useState<CRMNote[]>([])
  const [activities, setActivities] = useState<CRMActivityLog[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [loadingActivities, setLoadingActivities] = useState(false)

  useEffect(() => {
    if (card && open) {
      fetchNotes()
      fetchActivities()
    }
  }, [card?.id, open])

  const fetchNotes = async () => {
    if (!card) return
    setLoadingNotes(true)
    try {
      const response = await apiFetch(`/api/crm/cards/${card.id}/notes`)
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoadingNotes(false)
    }
  }

  const fetchActivities = async () => {
    if (!card) return
    setLoadingActivities(true)
    try {
      // Note: This endpoint doesn't exist yet in Phase 1, so it will fail gracefully
      const response = await apiFetch(`/api/crm/cards/${card.id}/activities`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
      setActivities([]) // Set empty array on error
    } finally {
      setLoadingActivities(false)
    }
  }

  const handleAddNote = async (content: string, isPinned: boolean): Promise<boolean> => {
    if (!card) return false
    try {
      const response = await apiFetch(`/api/crm/cards/${card.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, is_pinned: isPinned }),
      })

      if (response.ok) {
        await fetchNotes()
        await fetchActivities()
        onUpdate?.()
        return true
      }
      return false
    } catch (error) {
      console.error('Error adding note:', error)
      return false
    }
  }

  if (!card) return null

  const contactName = card.contact?.name || 'Sem nome'

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-6 pb-4 space-y-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-to-br from-secondary to-primary text-primary-foreground text-lg font-medium">
                {getInitials(contactName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <SheetTitle className="text-2xl">{contactName}</SheetTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{formatPhone(card.phone)}</span>
              </div>
            </div>
          </div>

          {/* Status & Stats */}
          <div className="flex flex-wrap gap-2">
            <CardStatusBadge status={card.auto_status} size="md" />
            
            {card.last_message_at && (
              <Badge variant="outline" className="gap-1">
                <MessageSquare className="h-3 w-3" />
                {formatDistanceToNow(new Date(card.last_message_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </Badge>
            )}

            {card.estimated_value && (
              <Badge variant="outline" className="gap-1">
                <DollarSign className="h-3 w-3" />
                R$ {card.estimated_value.toLocaleString('pt-BR')}
              </Badge>
            )}

            {card.expected_close_date && (
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(card.expected_close_date).toLocaleDateString('pt-BR')}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Separator />

        {/* Tabs */}
        <Tabs defaultValue="notes" className="flex-1 flex flex-col">
          <TabsList className="mx-6 mt-4">
            <TabsTrigger value="notes">Notas</TabsTrigger>
            <TabsTrigger value="timeline">Atividades</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="flex-1 m-0">
            <CardNotes
              notes={notes}
              onAddNote={handleAddNote}
              loading={loadingNotes}
            />
          </TabsContent>

          <TabsContent value="timeline" className="flex-1 m-0">
            <CardTimeline activities={activities} loading={loadingActivities} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
