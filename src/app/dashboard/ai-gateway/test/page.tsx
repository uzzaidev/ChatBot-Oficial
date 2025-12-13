'use client'

/**
 * AI GATEWAY TEST PAGE
 * 
 * Test endpoint for validating AI Gateway functionality before production
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, Play, CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { AIGatewayNav } from '@/components/AIGatewayNav'

interface TestResult {
  timestamp: string
  success: boolean
  tests: Record<string, any>
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
    success: boolean
  }
  totalDurationMs: number
  errors?: string[]
}

export default function AIGatewayTestPage() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Test configuration
  const [config, setConfig] = useState({
    prompt: 'Olá! Este é um teste do sistema. Por favor, responda brevemente.',
    testCache: true,
    provider: '',
    model: '',
    clientId: '',
  })

  const runTest = async () => {
    setTesting(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/ai-gateway/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: config.prompt || undefined,
          testCache: config.testCache,
          provider: config.provider || undefined,
          model: config.model || undefined,
          clientId: config.clientId || undefined,
        }),
      })

      const data = await response.json()
      setResult(data)

      if (!data.success) {
        setError(`Alguns testes falharam. Verifique os resultados abaixo.`)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao executar testes')
    } finally {
      setTesting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <>
      <AIGatewayNav />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Gateway - Testes</h1>
          <p className="text-muted-foreground">
            Teste o funcionamento completo do AI Gateway antes de colocar em produção
          </p>
        </div>

        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Teste</CardTitle>
            <CardDescription>
              Configure os parâmetros do teste de integração
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="prompt">Prompt de Teste</Label>
              <Textarea
                id="prompt"
                value={config.prompt}
                onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                placeholder="Digite a mensagem que será enviada para a IA..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Esta mensagem será enviada para o modelo de IA como teste
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="testCache">Testar Cache</Label>
                <p className="text-xs text-muted-foreground">
                  Faz duas chamadas idênticas para testar cache
                </p>
              </div>
              <Switch
                id="testCache"
                checked={config.testCache}
                onCheckedChange={(checked) => setConfig({ ...config, testCache: checked })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="provider">Provider (opcional)</Label>
                <Input
                  id="provider"
                  value={config.provider}
                  onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                  placeholder="openai, groq, anthropic..."
                />
              </div>

              <div>
                <Label htmlFor="model">Modelo (opcional)</Label>
                <Input
                  id="model"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder="gpt-4o-mini, llama-3.3-70b..."
                />
              </div>
            </div>

            <div>
              <Label htmlFor="clientId">Client ID (opcional)</Label>
              <Input
                id="clientId"
                value={config.clientId}
                onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                placeholder="UUID do cliente (usa primeiro cliente se vazio)"
              />
            </div>

            <Button 
              onClick={runTest} 
              disabled={testing}
              className="w-full"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Executando Testes...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Executar Testes
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Resumo dos Testes</CardTitle>
                    <CardDescription>
                      Executado em {new Date(result.timestamp).toLocaleString('pt-BR')}
                    </CardDescription>
                  </div>
                  <Badge 
                    className={result.success ? 'bg-green-600' : 'bg-red-600'}
                  >
                    {result.success ? 'Todos Passaram' : 'Alguns Falharam'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{result.summary.total}</div>
                    <div className="text-sm text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{result.summary.passed}</div>
                    <div className="text-sm text-muted-foreground">Aprovados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{result.summary.failed}</div>
                    <div className="text-sm text-muted-foreground">Falharam</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-yellow-600">{result.summary.warnings}</div>
                    <div className="text-sm text-muted-foreground">Avisos</div>
                  </div>
                </div>
                <div className="mt-4 text-center text-sm text-muted-foreground">
                  Tempo total: {result.totalDurationMs}ms
                </div>
              </CardContent>
            </Card>

            {/* Individual Test Results */}
            <div className="space-y-4">
              {Object.entries(result.tests).map(([testName, testData]: [string, any]) => (
                <Card key={testName} className={getStatusColor(testData.status)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(testData.status)}
                        <CardTitle className="text-lg capitalize">
                          {testName.replace(/([A-Z])/g, ' $1').trim()}
                        </CardTitle>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {testData.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-white/50 p-3 rounded overflow-auto max-h-60">
                      {JSON.stringify(testData, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Errors */}
            {result.errors && result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-semibold mb-2">Erros Encontrados:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {result.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Play className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900">Testes Executados</p>
                <ul className="mt-2 space-y-1 text-blue-800">
                  <li>1. <strong>Client</strong> - Valida que existe um cliente configurado</li>
                  <li>2. <strong>Models</strong> - Lista modelos de IA disponíveis</li>
                  <li>3. <strong>AI Gateway</strong> - Faz chamada real para a IA</li>
                  <li>4. <strong>Cache</strong> - Testa cache hit (se habilitado)</li>
                  <li>5. <strong>Usage Logs</strong> - Verifica logging de uso</li>
                  <li>6. <strong>Budget</strong> - Checa status de budget do cliente</li>
                  <li>7. <strong>Analytics</strong> - Testa endpoint de métricas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
