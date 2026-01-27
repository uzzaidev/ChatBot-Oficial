'use client'

/**
 * ADMIN BUDGET CONFIGURATION PAGE
 *
 * Configure budget limits for clients:
 * - Mode: tokens, BRL, or both (hybrid)
 * - Set limits
 * - Configure alerts
 * - Auto-pause settings
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2,
  Save,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  Coins,
  TrendingUp
} from 'lucide-react'

interface BudgetConfig {
  client_id: string
  client_name: string
  budget_mode: 'tokens' | 'brl' | 'both'
  token_limit: number
  current_tokens: number
  token_usage_percentage: number
  brl_limit: number
  current_brl: number
  brl_usage_percentage: number
  budget_period: 'daily' | 'weekly' | 'monthly'
  pause_at_limit: boolean
  is_paused: boolean
  pause_reason: string | null
  status: string
}

export default function AdminBudgetPlansPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [budgets, setBudgets] = useState<BudgetConfig[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [budgetMode, setBudgetMode] = useState<'tokens' | 'brl' | 'both'>('both')
  const [tokenLimit, setTokenLimit] = useState<string>('1000000')
  const [brlLimit, setBrlLimit] = useState<string>('500.00')
  const [budgetPeriod, setBudgetPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [pauseAtLimit, setPauseAtLimit] = useState(true)
  const [alert80, setAlert80] = useState(true)
  const [alert90, setAlert90] = useState(true)
  const [alert100, setAlert100] = useState(true)
  const [notificationEmail, setNotificationEmail] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch budgets
      const budgetsRes = await fetch('/api/admin/budgets')
      if (!budgetsRes.ok) throw new Error('Failed to fetch budgets')
      const budgetsData = await budgetsRes.json()
      setBudgets(budgetsData.budgets || [])

      // Fetch clients
      const clientsRes = await fetch('/api/admin/clients')
      if (!clientsRes.ok) throw new Error('Failed to fetch clients')
      const clientsData = await clientsRes.json()
      setClients(clientsData.clients || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!selectedClientId) {
      setError('Please select a client')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          budgetMode,
          tokenLimit: parseInt(tokenLimit) || 0,
          brlLimit: parseFloat(brlLimit) || 0,
          budgetPeriod,
          pauseAtLimit,
          alert80,
          alert90,
          alert100,
          notificationEmail: notificationEmail || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save budget')
      }

      const data = await response.json()
      setSuccess(data.message)
      await fetchData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const loadBudget = (budget: BudgetConfig) => {
    setSelectedClientId(budget.client_id)
    setBudgetMode(budget.budget_mode)
    setTokenLimit(budget.token_limit.toString())
    setBrlLimit(budget.brl_limit.toString())
    setBudgetPeriod(budget.budget_period)
    setPauseAtLimit(budget.pause_at_limit)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAUSED': return 'bg-red-100 text-red-800'
      case 'LIMIT_REACHED': return 'bg-red-100 text-red-800'
      case 'CRITICAL': return 'bg-orange-100 text-orange-800'
      case 'WARNING': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-green-100 text-green-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-poppins font-bold mb-2 bg-gradient-to-r from-uzz-mint to-uzz-blue bg-clip-text text-transparent">Configuração de Budgets</h1>
          <p className="text-uzz-silver">
            Gerencie limites de uso por cliente (Tokens, Reais ou Híbrido)
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} className="border-uzz-mint text-uzz-mint hover:bg-uzz-mint/10">
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="configure">
        <TabsList className="grid w-full grid-cols-2 bg-[#1a1f26] border border-white/10 p-1 rounded-lg">
          <TabsTrigger value="configure" className="data-[state=active]:bg-uzz-mint/15 data-[state=active]:text-white data-[state=active]:shadow-sm text-uzz-silver rounded-md transition-all">Configurar Budget</TabsTrigger>
          <TabsTrigger value="overview" className="data-[state=active]:bg-uzz-mint/15 data-[state=active]:text-white data-[state=active]:shadow-sm text-uzz-silver rounded-md transition-all">Visão Geral</TabsTrigger>
        </TabsList>

        {/* Configure Tab */}
        <TabsContent value="configure" className="space-y-6">
          <Card className="bg-gradient-to-br from-[#1e2530] to-[#1a1f26] border-white/10">
            <CardHeader>
              <CardTitle>Configurar Budget do Cliente</CardTitle>
              <CardDescription>
                Escolha o modo de budget e defina os limites
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Selection */}
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Budget Mode */}
              <div className="space-y-2">
                <Label>Modo de Budget</Label>
                <Select value={budgetMode} onValueChange={(v: any) => setBudgetMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tokens">
                      <div className="flex items-center gap-2">
                        <Coins className="w-4 h-4" />
                        Tokens (apenas contagem)
                      </div>
                    </SelectItem>
                    <SelectItem value="brl">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Reais (apenas custo R$)
                      </div>
                    </SelectItem>
                    <SelectItem value="both">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Híbrido (Tokens E Reais - o que atingir primeiro)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {budgetMode === 'tokens' && 'Rastreia apenas quantidade de tokens consumidos'}
                  {budgetMode === 'brl' && 'Rastreia apenas custo em reais'}
                  {budgetMode === 'both' && '✅ Recomendado: Rastreia ambos e pausa quando QUALQUER limite for atingido'}
                </p>
              </div>

              {/* Token Limit */}
              {(budgetMode === 'tokens' || budgetMode === 'both') && (
                <div className="space-y-2">
                  <Label>Limite de Tokens</Label>
                  <Input
                    type="number"
                    value={tokenLimit}
                    onChange={(e) => setTokenLimit(e.target.value)}
                    placeholder="1000000"
                  />
                  <p className="text-sm text-muted-foreground">
                    Máximo de tokens permitidos no período (0 = ilimitado)
                  </p>
                </div>
              )}

              {/* BRL Limit */}
              {(budgetMode === 'brl' || budgetMode === 'both') && (
                <div className="space-y-2">
                  <Label>Limite em Reais (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={brlLimit}
                    onChange={(e) => setBrlLimit(e.target.value)}
                    placeholder="500.00"
                  />
                  <p className="text-sm text-muted-foreground">
                    Máximo em reais permitido no período (0 = ilimitado)
                  </p>
                </div>
              )}

              {/* Budget Period */}
              <div className="space-y-2">
                <Label>Período de Reset</Label>
                <Select value={budgetPeriod} onValueChange={(v: any) => setBudgetPeriod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diário (reset às 00:00)</SelectItem>
                    <SelectItem value="weekly">Semanal (reset toda segunda)</SelectItem>
                    <SelectItem value="monthly">Mensal (reset dia 1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Auto-pause */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-pausar ao atingir limite</Label>
                  <p className="text-sm text-muted-foreground">
                    Bloqueia automaticamente todas as APIs quando atingir 100%
                  </p>
                </div>
                <Switch checked={pauseAtLimit} onCheckedChange={setPauseAtLimit} />
              </div>

              {/* Alerts */}
              <div className="space-y-4">
                <Label>Alertas de Uso</Label>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Alerta em 80%</span>
                  <Switch checked={alert80} onCheckedChange={setAlert80} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Alerta em 90%</span>
                  <Switch checked={alert90} onCheckedChange={setAlert90} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Alerta em 100%</span>
                  <Switch checked={alert100} onCheckedChange={setAlert100} />
                </div>
              </div>

              {/* Notification Email */}
              <div className="space-y-2">
                <Label>Email de Notificação (opcional)</Label>
                <Input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>

              {/* Save Button */}
              <Button onClick={handleSave} disabled={saving} className="w-full">
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {budgets.length === 0 ? (
            <Card className="bg-gradient-to-br from-[#1e2530] to-[#1a1f26] border-white/10">
              <CardContent className="pt-6 text-center text-muted-foreground">
                <p>Nenhum budget configurado ainda</p>
              </CardContent>
            </Card>
          ) : (
            budgets.map((budget) => (
              <Card key={budget.client_id} className="bg-gradient-to-br from-[#1e2530] to-[#1a1f26] border-white/10">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{budget.client_name}</CardTitle>
                      <CardDescription className="mt-1">
                        Modo: {budget.budget_mode === 'tokens' && 'Tokens'}
                        {budget.budget_mode === 'brl' && 'Reais (R$)'}
                        {budget.budget_mode === 'both' && 'Híbrido (Tokens + R$)'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(budget.status)}>
                        {budget.status}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={() => loadBudget(budget)}>
                        Editar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Token usage */}
                  {(budget.budget_mode === 'tokens' || budget.budget_mode === 'both') && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Tokens</span>
                        <span className="font-semibold">
                          {budget.current_tokens.toLocaleString()} / {budget.token_limit.toLocaleString()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            budget.token_usage_percentage >= 90
                              ? 'bg-red-500'
                              : budget.token_usage_percentage >= 80
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(budget.token_usage_percentage, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {budget.token_usage_percentage.toFixed(1)}% utilizado
                      </p>
                    </div>
                  )}

                  {/* BRL usage */}
                  {(budget.budget_mode === 'brl' || budget.budget_mode === 'both') && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Custo (R$)</span>
                        <span className="font-semibold">
                          R$ {budget.current_brl.toFixed(2)} / R$ {budget.brl_limit.toFixed(2)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            budget.brl_usage_percentage >= 90
                              ? 'bg-red-500'
                              : budget.brl_usage_percentage >= 80
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(budget.brl_usage_percentage, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {budget.brl_usage_percentage.toFixed(1)}% utilizado
                      </p>
                    </div>
                  )}

                  {/* Pause info */}
                  {budget.is_paused && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Cliente pausado: {budget.pause_reason === 'token_limit' && 'Limite de tokens atingido'}
                        {budget.pause_reason === 'brl_limit' && 'Limite de custo atingido'}
                        {budget.pause_reason === 'both' && 'Ambos os limites atingidos'}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
