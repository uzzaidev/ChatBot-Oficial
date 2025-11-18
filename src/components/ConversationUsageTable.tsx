'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowUpDown, ArrowUp, ArrowDown, Settings2, ChevronLeft, ChevronRight } from 'lucide-react'
import type { ConversationUsage } from '@/lib/types'

interface ConversationUsageTableProps {
  data: ConversationUsage[]
}

type SortDirection = 'asc' | 'desc' | null
type ColumnId = 'phone' | 'conversation_name' | 'total_tokens' | 'total_cost' | 'request_count' | 'openai_tokens' | 'groq_tokens'

interface Column {
  id: ColumnId
  label: string
  visible: boolean
  align?: 'left' | 'right' | 'center'
}

export function ConversationUsageTable({ data }: ConversationUsageTableProps) {
  const [columns, setColumns] = useState<Column[]>([
    { id: 'phone', label: 'Telefone', visible: true },
    { id: 'conversation_name', label: 'Nome', visible: true },
    { id: 'total_tokens', label: 'Total Tokens', visible: true, align: 'right' },
    { id: 'openai_tokens', label: 'OpenAI Tokens', visible: true, align: 'right' },
    { id: 'groq_tokens', label: 'Groq Tokens', visible: true, align: 'right' },
    { id: 'total_cost', label: 'Custo', visible: true, align: 'right' },
    { id: 'request_count', label: 'Requisições', visible: true, align: 'right' },
  ])

  const [sortColumn, setSortColumn] = useState<ColumnId | null>('total_tokens')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const visibleColumns = useMemo(() => columns.filter(col => col.visible), [columns])

  const toggleColumn = (columnId: ColumnId) => {
    setColumns(prev =>
      prev.map(col =>
        col.id === columnId ? { ...col, visible: !col.visible } : col
      )
    )
  }

  const moveColumn = (columnId: ColumnId, direction: 'left' | 'right') => {
    setColumns(prev => {
      const index = prev.findIndex(col => col.id === columnId)
      if (index === -1) return prev
      
      const newIndex = direction === 'left' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev
      
      const newColumns = [...prev]
      const [removed] = newColumns.splice(index, 1)
      newColumns.splice(newIndex, 0, removed)
      return newColumns
    })
  }

  const handleSort = (columnId: ColumnId) => {
    if (sortColumn === columnId) {
      // Toggle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        setSortColumn(null)
        setSortDirection(null)
      }
    } else {
      setSortColumn(columnId)
      setSortDirection('asc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn]
      const bValue = b[sortColumn]

      let comparison = 0
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sortColumn, sortDirection])

  const renderCellContent = (conversation: ConversationUsage, columnId: ColumnId) => {
    switch (columnId) {
      case 'phone':
        return (
          <div className="font-mono text-sm max-w-[150px] truncate" title={conversation.phone}>
            {conversation.phone}
          </div>
        )
      case 'conversation_name':
        return (
          <div className="text-sm max-w-[200px] truncate" title={conversation.conversation_name}>
            {conversation.conversation_name}
          </div>
        )
      case 'total_tokens':
        return (
          <div className="text-sm font-semibold">
            {Number(conversation.total_tokens || 0).toLocaleString('pt-BR')}
          </div>
        )
      case 'openai_tokens':
        return (
          <div className="text-sm text-emerald-600 dark:text-emerald-400">
            {Number(conversation.openai_tokens || 0).toLocaleString('pt-BR')}
          </div>
        )
      case 'groq_tokens':
        return (
          <div className="text-sm text-purple-600 dark:text-purple-400">
            {Number(conversation.groq_tokens || 0).toLocaleString('pt-BR')}
          </div>
        )
      case 'total_cost':
        return (
          <div className="text-sm font-medium">
            ${Number(conversation.total_cost || 0).toFixed(4)}
          </div>
        )
      case 'request_count':
        return (
          <div className="text-sm text-muted-foreground">
            {Number(conversation.request_count || 0)}
          </div>
        )
      default:
        return null
    }
  }

  const getSortIcon = (columnId: ColumnId) => {
    if (sortColumn !== columnId) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />
    }
    return <ArrowDown className="ml-2 h-4 w-4" />
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Uso por Conversa</CardTitle>
            <CardDescription>
              Top {data.length} conversas que mais consumiram tokens
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings2 className="h-4 w-4" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[250px]">
              <DropdownMenuLabel>Gerenciar Colunas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((column, index) => (
                <div key={column.id} className="flex items-center justify-between px-2 py-1">
                  <DropdownMenuCheckboxItem
                    checked={column.visible}
                    onCheckedChange={() => toggleColumn(column.id)}
                    className="flex-1"
                  >
                    {column.label}
                  </DropdownMenuCheckboxItem>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        moveColumn(column.id, 'left')
                      }}
                      disabled={index === 0}
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        moveColumn(column.id, 'right')
                      }}
                      disabled={index === columns.length - 1}
                    >
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.map((column) => (
                    <TableHead
                      key={column.id}
                      className={`${column.align === 'right' ? 'text-right' : ''} whitespace-nowrap`}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 h-8 data-[state=open]:bg-accent"
                        onClick={() => handleSort(column.id)}
                      >
                        {column.label}
                        {getSortIcon(column.id)}
                      </Button>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length > 0 ? (
                  sortedData.map((conversation, index) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      {visibleColumns.map((column) => (
                        <TableCell
                          key={column.id}
                          className={column.align === 'right' ? 'text-right' : ''}
                        >
                          {renderCellContent(conversation, column.id)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColumns.length}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum dado de uso disponível
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
