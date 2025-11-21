/**
 * Component: AuditLogsViewer
 *
 * Visualizador de audit logs isolado por tenant
 * Mostra atividades de auditoria com filtros e busca
 *
 * Multi-tenant security: ✅ RLS ativo via useAuditLogs hook
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Filter,
  X,
  Eye,
  Edit,
  Trash2,
  FileText,
  Clock,
  User,
  Shield
} from 'lucide-react'
import { useAuditLogs, type AuditLog, type AuditLogsFilters } from '@/hooks/useAuditLogs'

interface AuditLogsViewerProps {
  autoRefresh?: boolean
  refreshInterval?: number
  limit?: number
}

export default function AuditLogsViewer({
  autoRefresh = true,
  refreshInterval = 10000,
  limit = 100
}: AuditLogsViewerProps) {
  const [filters, setFilters] = useState<AuditLogsFilters>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const { logs, total, loading, error, refetch, applyFilters, clearFilters } = useAuditLogs({
    autoRefresh,
    refreshInterval,
    limit,
    filters
  })

  // Filtrar logs localmente por termo de busca
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()

    return (
      log.user_email?.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.resource_type.toLowerCase().includes(searchLower) ||
      log.resource_id?.toLowerCase().includes(searchLower) ||
      log.endpoint?.toLowerCase().includes(searchLower)
    )
  })

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <FileText className="h-4 w-4" />
      case 'READ': return <Eye className="h-4 w-4" />
      case 'UPDATE': return <Edit className="h-4 w-4" />
      case 'DELETE': return <Trash2 className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-500'
      case 'READ': return 'bg-blue-500'
      case 'UPDATE': return 'bg-yellow-500'
      case 'DELETE': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    return status === 'success'
      ? <CheckCircle className="h-4 w-4 text-green-500" />
      : <AlertCircle className="h-4 w-4 text-red-500" />
  }

  const handleFilterChange = (key: keyof AuditLogsFilters, value: string) => {
    const newFilters = { ...filters }

    if (value === 'all' || !value) {
      delete newFilters[key]
    } else {
      // Type assertion is safe here because value matches the union types in AuditLogsFilters
      (newFilters as any)[key] = value
    }

    setFilters(newFilters)
    applyFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({})
    setSearchTerm('')
    clearFilters()
  }

  const hasActiveFilters = Object.keys(filters).length > 0 || searchTerm.length > 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Audit Logs
          </h2>
          <p className="text-sm text-muted-foreground">
            Registro de todas as operações sensíveis - {total} log(s) total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="md:col-span-2">
              <Input
                type="text"
                placeholder="Buscar por email, recurso, endpoint..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Action filter */}
            <Select
              value={filters.action || 'all'}
              onValueChange={(value) => handleFilterChange('action', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="CREATE">CREATE</SelectItem>
                <SelectItem value="READ">READ</SelectItem>
                <SelectItem value="UPDATE">UPDATE</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
              </SelectContent>
            </Select>

            {/* Status filter */}
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasActiveFilters && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {filteredLogs.length} de {total} logs
              </Badge>
              <Button
                onClick={handleClearFilters}
                variant="ghost"
                size="sm"
                className="h-6 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-500">
          <CardContent className="py-6">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              <p className="font-medium">Erro ao carregar audit logs</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Logs Grid */}
      {!error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Lista de Logs */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">Histórico de Atividades</CardTitle>
              <CardDescription className="text-xs">
                {loading ? 'Carregando...' : `${filteredLogs.length} atividade(s)`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {loading ? (
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    ) : (
                      <>
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum audit log encontrado</p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 p-4">
                    {filteredLogs.map((log) => (
                      <button
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedLog?.id === log.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className={`p-1.5 rounded ${getActionColor(log.action)}`}>
                              {getActionIcon(log.action)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{log.action}</span>
                                <Badge variant="outline" className="text-xs">
                                  {log.resource_type}
                                </Badge>
                                {getStatusIcon(log.status)}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {log.user_email || log.user_id || 'Sistema'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(log.created_at)}
                          </div>
                        </div>

                        {log.endpoint && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {log.method} {log.endpoint}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Detalhes do Log Selecionado */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-sm">Detalhes</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedLog ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Selecione um log para ver detalhes</p>
                </div>
              ) : (
                <ScrollArea className="h-[540px]">
                  <div className="space-y-4 text-sm">
                    {/* Header */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded ${getActionColor(selectedLog.action)}`}>
                          {getActionIcon(selectedLog.action)}
                        </div>
                        <div>
                          <p className="font-bold">{selectedLog.action}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {selectedLog.resource_type}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* User Info */}
                    {selectedLog.user_email && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Usuário</p>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <p className="break-all">{selectedLog.user_email}</p>
                        </div>
                        {selectedLog.user_role && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {selectedLog.user_role}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Data/Hora</p>
                      <p className="break-all">{formatTimestamp(selectedLog.created_at)}</p>
                    </div>

                    {/* Resource ID */}
                    {selectedLog.resource_id && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Resource ID</p>
                        <p className="font-mono text-xs break-all">{selectedLog.resource_id}</p>
                      </div>
                    )}

                    {/* Endpoint */}
                    {selectedLog.endpoint && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Endpoint</p>
                        <Badge variant="outline" className="text-xs mr-1">
                          {selectedLog.method}
                        </Badge>
                        <p className="font-mono text-xs break-all mt-1">{selectedLog.endpoint}</p>
                      </div>
                    )}

                    {/* Status */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(selectedLog.status)}
                        <span className="font-medium">{selectedLog.status}</span>
                      </div>
                      {selectedLog.error_message && (
                        <p className="text-xs text-red-500 mt-2 p-2 bg-red-50 dark:bg-red-950 rounded">
                          {selectedLog.error_message}
                        </p>
                      )}
                    </div>

                    {/* Duration */}
                    {selectedLog.duration_ms !== undefined && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Duração</p>
                        <p>{selectedLog.duration_ms}ms</p>
                      </div>
                    )}

                    {/* Changes */}
                    {selectedLog.changes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Mudanças</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(selectedLog.changes, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Metadata */}
                    {selectedLog.metadata && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Metadata</p>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                          {JSON.stringify(selectedLog.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
