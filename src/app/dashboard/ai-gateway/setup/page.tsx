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
import { Loader2, Save, Check, AlertTriangle, Shield, Key, Trash2 } from 'lucide-react'

export default function AIGatewaySetupPage() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
    fetchCurrentConfig()
  }, [])

  // =====================================================
  // SAVE CONFIGURATION
  // =====================================================

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      // Validate required field
      if (!config.gatewayApiKey.trim()) {
        throw new Error('Gateway API Key é obrigatória')
      }

      if (!config.gatewayApiKey.startsWith('vck_')) {
        throw new Error('Gateway API Key deve começar com vck_')
      }

      const response = await fetch('/api/ai-gateway/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gatewayApiKey: config.gatewayApiKey.trim(),
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
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
              Gateway API Key (vck_...) <span className="text-red-500">*</span>
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
              Obtenha em: https://vercel.com/[seu-usuario]/~/ai
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
