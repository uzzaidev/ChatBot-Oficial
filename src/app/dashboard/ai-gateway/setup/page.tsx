'use client'

/**
 * AI GATEWAY SETUP PAGE (Admin Only)
 *
 * Configure shared AI Gateway keys via UI
 * Keys are automatically saved to Supabase Vault
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Loader2,
  Save,
  Check,
  AlertTriangle,
  Shield,
  Key,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
} from 'lucide-react'
import { AIGatewayNav } from '@/components/AIGatewayNav'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClientBrowser } from '@/lib/supabase'

export default function AIGatewaySetupPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  const [availableModels, setAvailableModels] = useState<
    Array<{ gatewayIdentifier: string; displayName: string }>
  >([])
  const [selectedFallbackToAdd, setSelectedFallbackToAdd] = useState<string>('')

  const [clients, setClients] = useState<Array<{ id: string; name: string; slug: string }>>([])
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [bulkPrimaryModel, setBulkPrimaryModel] = useState<string>('')
  const [bulkApplying, setBulkApplying] = useState(false)

  // Configuration state
  const [config, setConfig] = useState({
    gatewayApiKey: '',
    openaiApiKey: '',
    groqApiKey: '',
    anthropicApiKey: '',
    googleApiKey: '',
    cacheEnabled: true,
    cacheTTLSeconds: 3600,
    defaultFallbackChain: ['openai/gpt-4o-mini', 'groq/llama-3.3-70b-versatile'],
  })

  // Current config status
  const [currentStatus, setCurrentStatus] = useState({
    hasGatewayKey: false,
    hasOpenAIKey: false,
    hasGroqKey: false,
    hasAnthropicKey: false,
    hasGoogleKey: false,
    updatedAt: null as string | null,
  })

  // =====================================================
  // FETCH CURRENT CONFIGURATION
  // =====================================================

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

  const fetchCurrentConfig = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-gateway/setup')

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch configuration')
      }

      const data = await response.json()

      setCurrentStatus({
        hasGatewayKey: data.hasGatewayKey,
        hasOpenAIKey: data.hasOpenAIKey,
        hasGroqKey: data.hasGroqKey,
        hasAnthropicKey: data.hasAnthropicKey,
        hasGoogleKey: data.hasGoogleKey,
        updatedAt: data.updatedAt,
      })

      // Update form with current settings (without keys)
      setConfig((prev) => ({
        ...prev,
        cacheEnabled: data.cacheEnabled,
        cacheTTLSeconds: data.cacheTTLSeconds,
        defaultFallbackChain: data.defaultFallbackChain || prev.defaultFallbackChain,
      }))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!checkingAdmin && isAdmin) {
      fetchCurrentConfig()
    }
  }, [checkingAdmin, isAdmin])

  // Fetch available models for fallback chain editor
  useEffect(() => {
    if (!checkingAdmin && !isAdmin) return

    const fetchModels = async () => {
      try {
        const response = await fetch('/api/ai-gateway/models')
        if (!response.ok) return

        const data = await response.json()
        const models = Array.isArray(data.models) ? data.models : []

        const normalized = models
          .map((m: any) => ({
            gatewayIdentifier: String(m.gatewayIdentifier || m.displayName || ''),
            displayName: String(m.displayName || m.gatewayIdentifier || ''),
          }))
          .filter((m: any) => m.gatewayIdentifier)

        setAvailableModels(normalized)
      } catch {
        // ignore model list fetch errors; editor will still work with existing chain
      }
    }

    fetchModels()
  }, [checkingAdmin, isAdmin])

  // Fetch clients list (admin-only) for bulk apply
  useEffect(() => {
    if (!checkingAdmin && !isAdmin) return

    const fetchClients = async () => {
      try {
        const response = await fetch('/api/admin/clients')
        if (!response.ok) return
        const data = await response.json()
        const normalized = Array.isArray(data.clients)
          ? data.clients.map((c: any) => ({
              id: String(c.id),
              name: String(c.name || ''),
              slug: String(c.slug || ''),
            }))
          : []
        setClients(normalized)
      } catch {
        // ignore
      }
    }

    fetchClients()
  }, [checkingAdmin, isAdmin])

  // Default bulk model to the first fallback item (usually the intended primary)
  useEffect(() => {
    setBulkPrimaryModel((prev) => prev || config.defaultFallbackChain?.[0] || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.defaultFallbackChain])

  const toggleClientSelection = (clientId: string) => {
    setSelectedClientIds((prev) => {
      if (prev.includes(clientId)) return prev.filter((id) => id !== clientId)
      return [...prev, clientId]
    })
  }

  const toggleSelectAllClients = () => {
    setSelectedClientIds((prev) => {
      if (clients.length === 0) return prev
      if (prev.length === clients.length) return []
      return clients.map((c) => c.id)
    })
  }

  const applyModelToClients = async () => {
    setBulkApplying(true)
    setError(null)
    setSuccess(null)

    try {
      const modelValue = bulkPrimaryModel.trim()
      if (!modelValue) {
        throw new Error('Selecione um modelo para aplicar')
      }

      if (selectedClientIds.length === 0) {
        throw new Error('Selecione ao menos um client_id')
      }

      const [provider, ...rest] = modelValue.split('/')
      const modelName = rest.join('/')

      if (!provider || !modelName) {
        throw new Error('Modelo inválido. Use o formato provider/model')
      }

      const payload: any = {
        clientIds: selectedClientIds,
        primaryModelProvider: provider,
      }

      if (provider === 'openai') payload.openaiModel = modelName
      if (provider === 'groq') payload.groqModel = modelName

      const response = await fetch('/api/admin/clients/apply-ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao aplicar configuração')
      }

      setSuccess(`Configuração aplicada para ${data.updated || 0} cliente(s).`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setBulkApplying(false)
    }
  }

  const moveFallbackItem = (index: number, direction: -1 | 1) => {
    setConfig((prev) => {
      const next = [...prev.defaultFallbackChain]
      const targetIndex = index + direction
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      const tmp = next[index]
      next[index] = next[targetIndex]
      next[targetIndex] = tmp
      return { ...prev, defaultFallbackChain: next }
    })
  }

  const removeFallbackItem = (index: number) => {
    setConfig((prev) => {
      const next = prev.defaultFallbackChain.filter((_, i) => i !== index)
      return { ...prev, defaultFallbackChain: next }
    })
  }

  const addFallbackItem = () => {
    const value = selectedFallbackToAdd.trim()
    if (!value) return

    setConfig((prev) => {
      if (prev.defaultFallbackChain.includes(value)) return prev
      return { ...prev, defaultFallbackChain: [...prev.defaultFallbackChain, value] }
    })
    setSelectedFallbackToAdd('')
  }

  // =====================================================
  // SAVE CONFIGURATION
  // =====================================================

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const gatewayKey = config.gatewayApiKey.trim()
      const needsGatewayKey = !currentStatus.hasGatewayKey

      // Only required for first-time setup
      if (needsGatewayKey && !gatewayKey) {
        throw new Error('Gateway API Key é obrigatória na primeira configuração')
      }

      if (gatewayKey && !gatewayKey.startsWith('vck_')) {
        throw new Error('Gateway API Key deve começar com vck_')
      }

      const response = await fetch('/api/ai-gateway/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayApiKey: gatewayKey || undefined,
          openaiApiKey: config.openaiApiKey.trim() || undefined,
          groqApiKey: config.groqApiKey.trim() || undefined,
          anthropicApiKey: config.anthropicApiKey.trim() || undefined,
          googleApiKey: config.googleApiKey.trim() || undefined,
          cacheEnabled: config.cacheEnabled,
          cacheTTLSeconds: config.cacheTTLSeconds,
          defaultFallbackChain: config.defaultFallbackChain,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao salvar configuração')
      }

      const data = await response.json()

      setSuccess('Configuração salva com sucesso! Keys criptografadas no Vault.')

      // Clear form
      setConfig((prev) => ({
        ...prev,
        gatewayApiKey: '',
        openaiApiKey: '',
        groqApiKey: '',
        anthropicApiKey: '',
        googleApiKey: '',
      }))

      // Refresh status
      fetchCurrentConfig()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // =====================================================
  // CLEAR CONFIGURATION
  // =====================================================

  const handleClear = async () => {
    if (!confirm('Tem certeza que deseja limpar todas as keys? Isso desabilitará o AI Gateway.')) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/ai-gateway/setup', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao limpar configuração')
      }

      setSuccess('Configuração limpa com sucesso')
      fetchCurrentConfig()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // =====================================================
  // RENDER
  // =====================================================

  if (checkingAdmin) {
    return (
      <>
        <AIGatewayNav />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </>
    )
  }

  if (!isAdmin) {
    return (
      <>
        <AIGatewayNav />
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">AI Gateway - Configuração</h1>
            <p className="text-muted-foreground">Acesso restrito a administradores.</p>
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Você não tem permissão para editar as configurações compartilhadas do AI Gateway.
            </AlertDescription>
          </Alert>
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <>
      <AIGatewayNav />
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Gateway - Configuração</h1>
          <p className="text-muted-foreground">
            Configure as API keys compartilhadas para o Vercel AI Gateway. As keys são criptografadas
            no Supabase Vault e compartilhadas por todos os clientes.
          </p>
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

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Status Atual
          </CardTitle>
          <CardDescription>Keys configuradas no Vault</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <StatusRow label="Gateway API Key (vck_...)" configured={currentStatus.hasGatewayKey} />
          <StatusRow label="OpenAI API Key" configured={currentStatus.hasOpenAIKey} />
          <StatusRow label="Groq API Key" configured={currentStatus.hasGroqKey} />
          <StatusRow label="Anthropic API Key" configured={currentStatus.hasAnthropicKey} />
          <StatusRow label="Google API Key" configured={currentStatus.hasGoogleKey} />

          {currentStatus.updatedAt && (
            <p className="text-sm text-muted-foreground mt-4">
              Última atualização: {new Date(currentStatus.updatedAt).toLocaleString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Configurar Keys
          </CardTitle>
          <CardDescription>
            Adicione ou atualize as API keys. Deixe em branco para manter a key existente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gateway API Key (required) */}
          <div>
            <Label htmlFor="gatewayKey">
              Gateway API Key (vck_...) {!currentStatus.hasGatewayKey && (
                <span className="text-red-500">*</span>
              )}
            </Label>
            <Input
              id="gatewayKey"
              type="password"
              placeholder="vck_..."
              value={config.gatewayApiKey}
              onChange={(e) => setConfig({ ...config, gatewayApiKey: e.target.value })}
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground mt-1">
              {currentStatus.hasGatewayKey
                ? 'Deixe em branco para manter a key existente.'
                : 'Obrigatória na primeira configuração. Obtenha em: https://vercel.com/[seu-usuario]/~/ai'}
            </p>
          </div>

          {/* OpenAI API Key */}
          <div>
            <Label htmlFor="openaiKey">OpenAI API Key (sk-proj-...)</Label>
            <Input
              id="openaiKey"
              type="password"
              placeholder="sk-proj-..."
              value={config.openaiApiKey}
              onChange={(e) => setConfig({ ...config, openaiApiKey: e.target.value })}
              className="font-mono"
            />
          </div>

          {/* Groq API Key */}
          <div>
            <Label htmlFor="groqKey">Groq API Key (gsk_...)</Label>
            <Input
              id="groqKey"
              type="password"
              placeholder="gsk_..."
              value={config.groqApiKey}
              onChange={(e) => setConfig({ ...config, groqApiKey: e.target.value })}
              className="font-mono"
            />
          </div>

          {/* Anthropic API Key */}
          <div>
            <Label htmlFor="anthropicKey">Anthropic API Key (sk-ant-...)</Label>
            <Input
              id="anthropicKey"
              type="password"
              placeholder="sk-ant-..."
              value={config.anthropicApiKey}
              onChange={(e) => setConfig({ ...config, anthropicApiKey: e.target.value })}
              className="font-mono"
            />
          </div>

          {/* Google API Key */}
          <div>
            <Label htmlFor="googleKey">Google API Key (AIza...)</Label>
            <Input
              id="googleKey"
              type="password"
              placeholder="AIza..."
              value={config.googleApiKey}
              onChange={(e) => setConfig({ ...config, googleApiKey: e.target.value })}
              className="font-mono"
            />
          </div>

          <hr className="my-6" />

          {/* Cache Settings */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="cacheEnabled">Cache Enabled</Label>
              <p className="text-sm text-muted-foreground">Habilitar cache do AI Gateway</p>
            </div>
            <Switch
              id="cacheEnabled"
              checked={config.cacheEnabled}
              onCheckedChange={(checked) => setConfig({ ...config, cacheEnabled: checked })}
            />
          </div>

          <div>
            <Label htmlFor="cacheTTL">Cache TTL (segundos)</Label>
            <Input
              id="cacheTTL"
              type="number"
              value={config.cacheTTLSeconds}
              onChange={(e) =>
                setConfig({ ...config, cacheTTLSeconds: parseInt(e.target.value) || 3600 })
              }
            />
          </div>

          <hr className="my-6" />

          {/* Fallback Chain */}
          <div className="space-y-3">
            <div>
              <Label>Fallback de Modelos (ordem)</Label>
              <p className="text-sm text-muted-foreground">
                Quando o modelo principal falhar, o Gateway tentará na ordem abaixo (de cima para
                baixo).
              </p>
              <p className="text-sm text-muted-foreground">
                Importante: isso não altera o modelo primário do cliente; apenas define a lista de
                tentativa quando o primário falha.
              </p>
            </div>

            <div className="space-y-2">
              {config.defaultFallbackChain.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum fallback configurado.</p>
              ) : (
                config.defaultFallbackChain.map((item, index) => (
                  <div key={`${item}-${index}`} className="flex items-center gap-2 p-2 border rounded">
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveFallbackItem(index, -1)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveFallbackItem(index, 1)}
                        disabled={index === config.defaultFallbackChain.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-medium font-mono">{item}</p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFallbackItem(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Select value={selectedFallbackToAdd} onValueChange={setSelectedFallbackToAdd}>
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar modelo ao fallback" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels
                      .filter((m) => !config.defaultFallbackChain.includes(m.gatewayIdentifier))
                      .map((m) => (
                        <SelectItem key={m.gatewayIdentifier} value={m.gatewayIdentifier}>
                          {m.displayName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={addFallbackItem} disabled={!selectedFallbackToAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          <hr className="my-6" />

          {/* Bulk Apply (Admin) */}
          <div className="space-y-3">
            <div>
              <Label>Aplicar Modelo Primário para Vários Clientes</Label>
              <p className="text-sm text-muted-foreground">
                O modelo que roda de verdade vem de <span className="font-mono">clients.primary_model_provider</span> +
                <span className="font-mono"> clients.openai_model/groq_model</span>. O fallback só entra se o primário falhar.
              </p>
            </div>

            <div className="grid gap-3">
              <div>
                <Label>Modelo primário (provider/model)</Label>
                <Select value={bulkPrimaryModel} onValueChange={setBulkPrimaryModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.defaultFallbackChain.map((m) => (
                      <SelectItem key={`chain-${m}`} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                    {availableModels
                      .filter((m) => !config.defaultFallbackChain.includes(m.gatewayIdentifier))
                      .map((m) => (
                        <SelectItem key={`models-${m.gatewayIdentifier}`} value={m.gatewayIdentifier}>
                          {m.displayName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={clients.length > 0 && selectedClientIds.length === clients.length}
                    onCheckedChange={() => toggleSelectAllClients()}
                  />
                  <span className="text-sm">Selecionar todos</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Selecionados: {selectedClientIds.length}
                </span>
              </div>

              <div className="border rounded p-2 max-h-56 overflow-auto space-y-2">
                {clients.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">
                    Nenhum cliente carregado (ou você não tem permissão).
                  </p>
                ) : (
                  clients.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={selectedClientIds.includes(c.id)}
                        onCheckedChange={() => toggleClientSelection(c.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground font-mono truncate">{c.id}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{c.slug}</span>
                    </label>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={applyModelToClients}
                  disabled={bulkApplying || selectedClientIds.length === 0 || !bulkPrimaryModel}
                  className="w-full"
                >
                  {bulkApplying ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Aplicando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Aplicar para selecionados
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configuração
                </>
              )}
            </Button>

            <Button variant="destructive" onClick={handleClear} disabled={saving}>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">ℹ️ Arquitetura de Keys Compartilhadas</h3>
          <ul className="text-sm space-y-1 text-blue-900">
            <li>✅ UMA gateway key (vck_...) para todos os clientes</li>
            <li>✅ Provider keys compartilhadas (OpenAI, Groq, etc)</li>
            <li>✅ Controle por cliente via budget (tokens/BRL)</li>
            <li>✅ Tracking multi-tenant no banco de dados</li>
            <li>✅ Gateway GRÁTIS (sem markup da Vercel)</li>
          </ul>
        </CardContent>
      </Card>
      </div>
    </>
  )
}

// =====================================================
// STATUS ROW COMPONENT
// =====================================================

function StatusRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium">{label}</span>
      {configured ? (
        <span className="flex items-center gap-1 text-sm text-green-600">
          <Check className="w-4 h-4" />
          Configurada
        </span>
      ) : (
        <span className="text-sm text-gray-400">Não configurada</span>
      )}
    </div>
  )
}
