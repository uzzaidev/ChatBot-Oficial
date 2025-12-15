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
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Loader2, Edit, Trash2, Check, AlertTriangle, Save, Plus, Play } from 'lucide-react'
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const [testingModelId, setTestingModelId] = useState<string | null>(null)

  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [priceForm, setPriceForm] = useState({
    inputPricePerMillion: '',
    outputPricePerMillion: '',
    cachedInputPricePerMillion: '',
  })

  const [newModelForm, setNewModelForm] = useState({
    provider: '',
    modelName: '',
    gatewayIdentifier: '',
    contextWindow: 4096,
    maxOutputTokens: 2048,
    inputPricePerMillion: 0,
    outputPricePerMillion: 0,
    cachedInputPricePerMillion: '' as string,
    description: '',
    isActive: true,
    capabilities: {
      vision: false,
      tools: true,
      streaming: true,
      caching: false,
    },
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

  const handleTestModel = async (model: AIModel) => {
    if (!canEdit) {
      setError('Somente admin pode testar modelos.')
      return
    }

    setError(null)
    setSuccess(null)
    setTestingModelId(model.id)

    try {
      const response = await fetch('/api/ai-gateway/models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: model.id,
          gatewayIdentifier: model.displayName,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao testar modelo')
      }

      if (data.ok === true) {
        const info = typeof data.info === 'string' && data.info.trim() ? ` ${data.info.trim()}` : ''
        const requestId = typeof data.requestId === 'string' && data.requestId.trim() ? ` requestId=${data.requestId.trim()}` : ''
        const finishReason = typeof data.finishReason === 'string' && data.finishReason.trim() ? ` finish=${data.finishReason.trim()}` : ''
        const usage = data.usage && typeof data.usage === 'object' && typeof data.usage.totalTokens === 'number'
          ? ` tokens=${data.usage.totalTokens}`
          : ''
        setSuccess(
          `Teste OK: ${data.provider}/${data.model} (${data.latencyMs}ms). Preview: ${data.outputPreview || 'OK'}.${info}${requestId}${finishReason}${usage}`,
        )
      } else {
        setError(data.error || 'Falha ao testar modelo')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setTestingModelId(null)
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

  const handleCreateModel = async () => {
    setError(null)
    setSuccess(null)

    if (!canEdit) {
      setError('Somente admin pode adicionar modelos.')
      return
    }

    const provider = newModelForm.provider.trim()
    const modelName = newModelForm.modelName.trim()
    const gatewayIdentifier = newModelForm.gatewayIdentifier.trim()

    if (!provider || !modelName || !gatewayIdentifier) {
      setError('Preencha provider, modelName e gatewayIdentifier')
      return
    }

    setCreating(true)
    try {
      const cachedRaw = newModelForm.cachedInputPricePerMillion.trim()
      const cachedValue = cachedRaw === '' ? undefined : Number(cachedRaw)
      if (cachedValue !== undefined && (!Number.isFinite(cachedValue) || cachedValue < 0)) {
        throw new Error('cachedInputPricePerMillion inválido')
      }

      const response = await fetch('/api/ai-gateway/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          modelName,
          gatewayIdentifier,
          capabilities: {
            text: true,
            vision: newModelForm.capabilities.vision,
            tools: newModelForm.capabilities.tools,
            streaming: newModelForm.capabilities.streaming,
            caching: newModelForm.capabilities.caching,
          },
          contextWindow: newModelForm.contextWindow,
          maxOutputTokens: newModelForm.maxOutputTokens,
          inputPricePerMillion: newModelForm.inputPricePerMillion,
          outputPricePerMillion: newModelForm.outputPricePerMillion,
          cachedInputPricePerMillion: cachedValue,
          isActive: newModelForm.isActive,
          description: newModelForm.description,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Falha ao criar modelo')
      }

      setSuccess('Modelo criado com sucesso')
      setIsAddDialogOpen(false)
      setNewModelForm({
        provider: '',
        modelName: '',
        gatewayIdentifier: '',
        contextWindow: 4096,
        maxOutputTokens: 2048,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        cachedInputPricePerMillion: '',
        description: '',
        isActive: true,
        capabilities: {
          vision: false,
          tools: true,
          streaming: true,
          caching: false,
        },
      })
      fetchModels()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
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

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canEdit}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Modelo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Modelo</DialogTitle>
                <DialogDescription>
                  Crie um modelo no registry (somente admin). Ex.: provider=openai, modelName=gpt-4o-mini,
                  gatewayIdentifier=openai/gpt-4o-mini
                </DialogDescription>
              </DialogHeader>

              {!canEdit && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>Somente admin pode adicionar modelos.</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Input
                      id="provider"
                      placeholder="openai | groq | anthropic | google"
                      value={newModelForm.provider}
                      onChange={(e) => setNewModelForm((p) => ({ ...p, provider: e.target.value }))}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modelName">Model Name</Label>
                    <Input
                      id="modelName"
                      placeholder="gpt-4o-mini"
                      value={newModelForm.modelName}
                      onChange={(e) => setNewModelForm((p) => ({ ...p, modelName: e.target.value }))}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gatewayIdentifier">Gateway Identifier</Label>
                    <Input
                      id="gatewayIdentifier"
                      placeholder="openai/gpt-4o-mini"
                      value={newModelForm.gatewayIdentifier}
                      onChange={(e) =>
                        setNewModelForm((p) => ({ ...p, gatewayIdentifier: e.target.value }))
                      }
                      disabled={!canEdit}
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="contextWindow">Context Window</Label>
                    <Input
                      id="contextWindow"
                      type="number"
                      value={newModelForm.contextWindow}
                      onChange={(e) =>
                        setNewModelForm((p) => ({
                          ...p,
                          contextWindow: Number(e.target.value) || 0,
                        }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxOutputTokens">Max Output Tokens</Label>
                    <Input
                      id="maxOutputTokens"
                      type="number"
                      value={newModelForm.maxOutputTokens}
                      onChange={(e) =>
                        setNewModelForm((p) => ({
                          ...p,
                          maxOutputTokens: Number(e.target.value) || 0,
                        }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="inputPricePerMillion">Input (USD / 1M)</Label>
                    <Input
                      id="inputPricePerMillion"
                      type="number"
                      step="0.0001"
                      value={newModelForm.inputPricePerMillion}
                      onChange={(e) =>
                        setNewModelForm((p) => ({
                          ...p,
                          inputPricePerMillion: Number(e.target.value) || 0,
                        }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="outputPricePerMillion">Output (USD / 1M)</Label>
                    <Input
                      id="outputPricePerMillion"
                      type="number"
                      step="0.0001"
                      value={newModelForm.outputPricePerMillion}
                      onChange={(e) =>
                        setNewModelForm((p) => ({
                          ...p,
                          outputPricePerMillion: Number(e.target.value) || 0,
                        }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cachedInputPricePerMillion">Cached Input (opcional)</Label>
                    <Input
                      id="cachedInputPricePerMillion"
                      type="number"
                      step="0.0001"
                      value={newModelForm.cachedInputPricePerMillion}
                      onChange={(e) =>
                        setNewModelForm((p) => ({
                          ...p,
                          cachedInputPricePerMillion: e.target.value,
                        }))
                      }
                      placeholder="(vazio se não aplica)"
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={newModelForm.description}
                    onChange={(e) => setNewModelForm((p) => ({ ...p, description: e.target.value }))}
                    disabled={!canEdit}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <Label>Vision</Label>
                      <p className="text-xs text-muted-foreground">Suporta imagem</p>
                    </div>
                    <Switch
                      checked={newModelForm.capabilities.vision}
                      onCheckedChange={(checked) =>
                        setNewModelForm((p) => ({
                          ...p,
                          capabilities: { ...p.capabilities, vision: checked },
                        }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <Label>Tools</Label>
                      <p className="text-xs text-muted-foreground">Function calling</p>
                    </div>
                    <Switch
                      checked={newModelForm.capabilities.tools}
                      onCheckedChange={(checked) =>
                        setNewModelForm((p) => ({
                          ...p,
                          capabilities: { ...p.capabilities, tools: checked },
                        }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <Label>Ativo</Label>
                      <p className="text-xs text-muted-foreground">Disponível no gateway</p>
                    </div>
                    <Switch
                      checked={newModelForm.isActive}
                      onCheckedChange={(checked) => setNewModelForm((p) => ({ ...p, isActive: checked }))}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <Label>Streaming</Label>
                      <p className="text-xs text-muted-foreground">Respostas em streaming</p>
                    </div>
                    <Switch
                      checked={newModelForm.capabilities.streaming}
                      onCheckedChange={(checked) =>
                        setNewModelForm((p) => ({
                          ...p,
                          capabilities: { ...p.capabilities, streaming: checked },
                        }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <Label>Caching</Label>
                      <p className="text-xs text-muted-foreground">Prompt caching</p>
                    </div>
                    <Switch
                      checked={newModelForm.capabilities.caching}
                      onCheckedChange={(checked) =>
                        setNewModelForm((p) => ({
                          ...p,
                          capabilities: { ...p.capabilities, caching: checked },
                        }))
                      }
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateModel} disabled={!canEdit || creating}>
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Modelo
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

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
                              onClick={() => handleTestModel(model)}
                              disabled={!canEdit || testingModelId === model.id}
                              title="Testar este modelo"
                            >
                              {testingModelId === model.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
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
