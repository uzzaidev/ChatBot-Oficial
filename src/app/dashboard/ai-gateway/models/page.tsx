'use client'

/**
 * AI GATEWAY MODELS PAGE
 *
 * Manage AI models registry
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Edit, Trash2, Check, AlertTriangle, Save } from 'lucide-react'
import { AIGatewayNav } from '@/components/AIGatewayNav'
import { createClientBrowser } from '@/lib/supabase'

interface AIModel {
  id: string
  provider: string
  modelName: string
  displayName: string
  costPer1kInputTokens: number
  costPer1kOutputTokens: number
  maxContextWindow: number
  maxOutputTokens: number
  supportsVision: boolean
  supportsTools: boolean
  enabled: boolean
  verified: boolean
}

export default function AIGatewayModelsPage() {
  const [loading, setLoading] = useState(true)
  const [models, setModels] = useState<AIModel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)

  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [priceForm, setPriceForm] = useState({
    inputPricePerMillion: '',
    outputPricePerMillion: '',
    cachedInputPricePerMillion: '',
  })

  const canEdit = !checkingAdmin && isAdmin

  useEffect(() => {
    fetchModels()
  }, [])

  useEffect(() => {
    const checkAdminRole = async () => {
      try {
        const supabase = createClientBrowser()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setIsAdmin(false)
          return
        }

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, is_active')
          .eq('id', user.id)
          .single()

        const hasAdminAccess = !!profile && profile.role === 'admin' && !!profile.is_active
        setIsAdmin(hasAdminAccess)
      } catch {
        setIsAdmin(false)
      } finally {
        setCheckingAdmin(false)
      }
    }

    checkAdminRole()
  }, [])

  useEffect(() => {
    if (!editingModel) return

    setPriceForm({
      inputPricePerMillion: String(editingModel.costPer1kInputTokens * 1000),
      outputPricePerMillion: String(editingModel.costPer1kOutputTokens * 1000),
      cachedInputPricePerMillion: '',
    })
  }, [editingModel])

  const fetchModels = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-gateway/models')

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch models')
      }

      const data = await response.json()
      setModels(data.models || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja desabilitar este modelo?')) {
      return
    }

    try {
      const response = await fetch(`/api/ai-gateway/models?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete model')
      }

      setSuccess('Modelo desabilitado com sucesso')
      fetchModels()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleSavePricing = async () => {
    if (!editingModel) return

    setError(null)
    setSuccess(null)

    const input = Number(priceForm.inputPricePerMillion)
    const output = Number(priceForm.outputPricePerMillion)
    const cached = priceForm.cachedInputPricePerMillion.trim()

    if (!Number.isFinite(input) || input < 0) {
      setError('Preço de input inválido (USD por 1M tokens)')
      return
    }
    if (!Number.isFinite(output) || output < 0) {
      setError('Preço de output inválido (USD por 1M tokens)')
      return
    }

    const cachedValue = cached === '' ? undefined : Number(cached)
    if (cachedValue !== undefined && (!Number.isFinite(cachedValue) || cachedValue < 0)) {
      setError('Preço de cached input inválido (USD por 1M tokens)')
      return
    }

    try {
      const response = await fetch('/api/ai-gateway/models', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingModel.id,
          inputPricePerMillion: input,
          outputPricePerMillion: output,
          cachedInputPricePerMillion: cachedValue,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update pricing')
      }

      setSuccess('Preços atualizados com sucesso')
      setEditingModel(null)
      fetchModels()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const groupedModels = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = []
    }
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, AIModel[]>)

  return (
    <>
      <AIGatewayNav />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI Models Registry</h1>
            <p className="text-muted-foreground">
              Gerencie os modelos de IA disponíveis no AI Gateway
            </p>
          </div>

        {/* Note: Add model functionality coming in future update */}
        {/* 
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Modelo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Novo Modelo</DialogTitle>
              <DialogDescription>
                Configure um novo modelo de IA para uso no Gateway
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Form implementation pending...
            </p>
          </DialogContent>
        </Dialog>
        */}
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Models Table */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedModels).map(([provider, providerModels]) => (
            <Card key={provider}>
              <CardHeader>
                <CardTitle className="capitalize">{provider}</CardTitle>
                <CardDescription>
                  {providerModels.length} modelos disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Custo Input</TableHead>
                      <TableHead>Custo Output</TableHead>
                      <TableHead>Context</TableHead>
                      <TableHead>Capacidades</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {providerModels.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">
                          {model.displayName}
                          <p className="text-xs text-muted-foreground font-mono">
                            {model.modelName}
                          </p>
                        </TableCell>
                        <TableCell>
                          ${model.costPer1kInputTokens.toFixed(4)}/1k
                        </TableCell>
                        <TableCell>
                          ${model.costPer1kOutputTokens.toFixed(4)}/1k
                        </TableCell>
                        <TableCell>
                          {model.maxContextWindow.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {model.supportsVision && (
                              <Badge variant="secondary" className="text-xs">
                                👁️ Vision
                              </Badge>
                            )}
                            {model.supportsTools && (
                              <Badge variant="secondary" className="text-xs">
                                🛠️ Tools
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={model.enabled ? 'default' : 'secondary'}
                              className="w-fit"
                            >
                              {model.enabled ? 'Ativo' : 'Inativo'}
                            </Badge>
                            {model.verified && (
                              <Badge variant="outline" className="w-fit text-xs">
                                ✓ Verificado
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingModel(model)}
                              disabled={!canEdit}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(model.id)}
                              disabled={!canEdit}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Pricing Dialog */}
      <Dialog open={!!editingModel} onOpenChange={(open) => !open && setEditingModel(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Preços</DialogTitle>
            <DialogDescription>
              Valores em USD por 1M tokens (usado no cálculo de custo).
            </DialogDescription>
          </DialogHeader>

          {editingModel && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">{editingModel.displayName}</p>
                <p className="text-xs text-muted-foreground font-mono">{editingModel.modelName}</p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="inputPrice">Input (USD / 1M tokens)</Label>
                <Input
                  id="inputPrice"
                  type="number"
                  step="0.0001"
                  value={priceForm.inputPricePerMillion}
                  onChange={(e) =>
                    setPriceForm((prev) => ({ ...prev, inputPricePerMillion: e.target.value }))
                  }
                  disabled={!canEdit}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="outputPrice">Output (USD / 1M tokens)</Label>
                <Input
                  id="outputPrice"
                  type="number"
                  step="0.0001"
                  value={priceForm.outputPricePerMillion}
                  onChange={(e) =>
                    setPriceForm((prev) => ({ ...prev, outputPricePerMillion: e.target.value }))
                  }
                  disabled={!canEdit}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cachedInputPrice">Cached Input (opcional, USD / 1M tokens)</Label>
                <Input
                  id="cachedInputPrice"
                  type="number"
                  step="0.0001"
                  value={priceForm.cachedInputPricePerMillion}
                  onChange={(e) =>
                    setPriceForm((prev) => ({
                      ...prev,
                      cachedInputPricePerMillion: e.target.value,
                    }))
                  }
                  placeholder="(deixe vazio se não aplica)"
                  disabled={!canEdit}
                />
              </div>

              {!canEdit && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>Somente admin pode editar preços.</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingModel(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePricing} disabled={!canEdit}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
