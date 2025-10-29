'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

interface PricingConfig {
  id: string
  client_id: string
  provider: string
  model: string
  prompt_price: number
  completion_price: number
  unit: string
  created_at: string
  updated_at: string
}

interface PricingConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PricingConfigModal({ open, onOpenChange }: PricingConfigModalProps) {
  const { toast } = useToast()
  const [configs, setConfigs] = useState<PricingConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [editingConfig, setEditingConfig] = useState<PricingConfig | null>(null)

  // Fetch pricing configs when modal opens
  useEffect(() => {
    if (open) {
      fetchConfigs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const fetchConfigs = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/pricing-config')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao buscar configurações')
      }

      setConfigs(data.pricingConfigs || [])
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao carregar preços',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (config: PricingConfig) => {
    try {
      setLoading(true)

      const response = await fetch('/api/pricing-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: config.provider,
          model: config.model,
          prompt_price: config.prompt_price,
          completion_price: config.completion_price,
          unit: config.unit,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao salvar configuração')
      }

      toast({
        title: 'Sucesso',
        description: 'Preço atualizado com sucesso',
      })

      setEditingConfig(null)
      fetchConfigs()
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar preço',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (provider: string, model: string) => {
    try {
      setLoading(true)

      const response = await fetch('/api/pricing-config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao resetar configuração')
      }

      toast({
        title: 'Sucesso',
        description: 'Preço resetado para padrão',
      })

      fetchConfigs()
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao resetar preço',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatProvider = (provider: string) => {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      groq: 'Groq',
      whisper: 'Whisper',
      meta: 'Meta',
    }
    return names[provider] || provider
  }

  const formatUnit = (unit: string) => {
    const units: Record<string, string> = {
      per_1k_tokens: 'por 1K tokens',
      per_minute: 'por minuto',
      per_request: 'por requisição',
    }
    return units[unit] || unit
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuração de Preços</DialogTitle>
          <DialogDescription>
            Configure o preço por token para cada modelo. Os custos exibidos no analytics serão calculados
            com base nesses valores.
          </DialogDescription>
        </DialogHeader>

        {loading && !configs.length ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Preço Prompt</TableHead>
                  <TableHead>Preço Completion</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => {
                  const isEditing = editingConfig?.id === config.id

                  return (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">
                        {formatProvider(config.provider)}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {config.model}
                        </code>
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.00001"
                            value={editingConfig.prompt_price}
                            onChange={(e) =>
                              setEditingConfig({
                                ...editingConfig,
                                prompt_price: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24"
                          />
                        ) : (
                          <span className="text-sm">
                            ${config.prompt_price.toFixed(5)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.00001"
                            value={editingConfig.completion_price}
                            onChange={(e) =>
                              setEditingConfig({
                                ...editingConfig,
                                completion_price: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-24"
                          />
                        ) : (
                          <span className="text-sm">
                            ${config.completion_price.toFixed(5)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatUnit(config.unit)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleSave(editingConfig)}
                                disabled={loading}
                              >
                                Salvar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingConfig(null)}
                                disabled={loading}
                              >
                                Cancelar
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingConfig(config)}
                                disabled={loading}
                              >
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReset(config.provider, config.model)}
                                disabled={loading}
                              >
                                Resetar
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {configs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma configuração de preço encontrada.
                <br />
                Execute a migration 012_pricing_config.sql para criar os preços padrão.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
