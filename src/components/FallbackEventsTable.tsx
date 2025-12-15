'use client'

/**
 * Fallback Events Table Component
 * 
 * Displays table of fallback events when primary model fails
 */

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface FallbackEvent {
  id: string
  timestamp: string
  primaryModel: string
  fallbackModel: string
  reason: string
  success: boolean
  latencyMs: number
}

interface FallbackEventsTableProps {
  events: FallbackEvent[]
  maxRows?: number
}

export const FallbackEventsTable = ({ events, maxRows = 10 }: FallbackEventsTableProps) => {
  const displayEvents = events.slice(0, maxRows)

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Nenhum evento de fallback registrado</p>
        <p className="text-sm mt-1">Todos os requests foram processados com sucesso</p>
      </div>
    )
  }

  return (
    <Table>
      <TableCaption>
        {events.length > maxRows 
          ? `Mostrando ${maxRows} de ${events.length} eventos`
          : `${events.length} eventos no total`
        }
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Data/Hora</TableHead>
          <TableHead>Modelo Primário</TableHead>
          <TableHead>Fallback</TableHead>
          <TableHead>Motivo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Latência</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayEvents.map((event) => (
          <TableRow key={event.id}>
            <TableCell className="font-mono text-sm">
              {new Date(event.timestamp).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{event.primaryModel}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{event.fallbackModel}</Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {event.reason}
            </TableCell>
            <TableCell>
              {event.success ? (
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  ✓ Sucesso
                </Badge>
              ) : (
                <Badge variant="destructive">
                  ✗ Falhou
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right font-mono text-sm">
              {event.latencyMs}ms
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
