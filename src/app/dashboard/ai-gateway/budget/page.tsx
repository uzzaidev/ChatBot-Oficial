'use client'

/**
 * AI GATEWAY BUDGET PAGE
 * 
 * Manage client budgets and usage limits
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, DollarSign, AlertTriangle, RefreshCw, TrendingUp } from 'lucide-react'
import { AIGatewayNav } from '@/components/AIGatewayNav'

interface ClientBudget {
  id: string
  clientId: string
  clientName: string
  budgetType: 'tokens' | 'brl' | 'usd'
  budgetLimit: number
  currentUsage: number
  usagePercentage: number
  budgetPeriod: 'daily' | 'weekly' | 'monthly'
  isPaused: boolean
  nextResetAt: string
  lastResetAt: string
}

export default function AIGatewayBudgetPage() {
  const [loading, setLoading] = useState(true)
  const [budgets, setBudgets] = useState<ClientBudget[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBudgets()
  }, [])

  const fetchBudgets = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/ai-gateway/budgets')

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch budgets')
      }

      const data = await response.json()
      setBudgets(data.budgets || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getBudgetStatusColor = (percentage: number, isPaused: boolean) => {
    if (isPaused) return 'text-red-600 bg-red-50'
    if (percentage >= 90) return 'text-orange-600 bg-orange-50'
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const getBudgetStatusText = (percentage: number, isPaused: boolean) => {
    if (isPaused) return 'Pausado'
    if (percentage >= 100) return 'Limite Atingido'
    if (percentage >= 90) return 'Crítico'
    if (percentage >= 80) return 'Atenção'
    return 'Normal'
  }

  const formatBudgetValue = (value: number, type: string) => {
    if (type === 'tokens') {
      return value.toLocaleString('pt-BR') + ' tokens'
    }
    if (type === 'brl') {
      return 'R$ ' + value.toFixed(2)
    }
    if (type === 'usd') {
      return '$ ' + value.toFixed(2)
    }
    return value.toString()
  }

  const formatPeriod = (period: string) => {
    const periods: Record<string, string> = {
      daily: 'Diário',
      weekly: 'Semanal',
      monthly: 'Mensal',
    }
    return periods[period] || period
  }

  const totalClients = budgets.length
  const pausedClients = budgets.filter(b => b.isPaused).length
  const criticalClients = budgets.filter(b => b.usagePercentage >= 90 && !b.isPaused).length
  const warningClients = budgets.filter(b => b.usagePercentage >= 80 && b.usagePercentage < 90).length

  if (loading) {
    return (
      <>
        <AIGatewayNav />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </>
    )
  }

  return (
    <>
      <AIGatewayNav />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Budget Management</h1>
            <p className="text-muted-foreground">
              Gerencie limites de uso e custos por cliente
            </p>
          </div>

          <Button variant="outline" onClick={fetchBudgets}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClients}</div>
              <p className="text-xs text-muted-foreground mt-1">Com budget configurado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pausados</CardTitle>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{pausedClients}</div>
              <p className="text-xs text-muted-foreground mt-1">Limite atingido</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Críticos (≥90%)</CardTitle>
              <TrendingUp className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{criticalClients}</div>
              <p className="text-xs text-muted-foreground mt-1">Próximos ao limite</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Atenção (≥80%)</CardTitle>
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{warningClients}</div>
              <p className="text-xs text-muted-foreground mt-1">Requer monitoramento</p>
            </CardContent>
          </Card>
        </div>

        {/* Budgets List */}
        {budgets.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>Nenhum cliente com budget configurado</p>
              <p className="text-sm mt-2">
                Configure budgets individuais na tabela <code className="bg-gray-100 px-1 rounded">client_budgets</code>
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {budgets.map((budget) => (
              <Card key={budget.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{budget.clientName}</CardTitle>
                      <CardDescription className="mt-1">
                        Limite {formatPeriod(budget.budgetPeriod)}: {formatBudgetValue(budget.budgetLimit, budget.budgetType)}
                      </CardDescription>
                    </div>
                    <Badge
                      className={getBudgetStatusColor(budget.usagePercentage, budget.isPaused)}
                    >
                      {getBudgetStatusText(budget.usagePercentage, budget.isPaused)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Uso atual</span>
                      <span className="font-semibold">
                        {formatBudgetValue(budget.currentUsage, budget.budgetType)} / {formatBudgetValue(budget.budgetLimit, budget.budgetType)}
                      </span>
                    </div>
                    <Progress value={Math.min(budget.usagePercentage, 100)} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{budget.usagePercentage.toFixed(1)}% utilizado</span>
                      <span>
                        Próximo reset: {new Date(budget.nextResetAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                    <div>
                      <span className="font-medium">Tipo:</span> {budget.budgetType.toUpperCase()}
                    </div>
                    <div>
                      <span className="font-medium">Período:</span> {formatPeriod(budget.budgetPeriod)}
                    </div>
                    <div>
                      <span className="font-medium">Último reset:</span> {new Date(budget.lastResetAt).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  {/* Warning Messages */}
                  {budget.isPaused && (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Gateway pausado para este cliente. O limite foi atingido e requisições estão sendo bloqueadas.
                      </AlertDescription>
                    </Alert>
                  )}
                  {!budget.isPaused && budget.usagePercentage >= 90 && (
                    <Alert className="mt-4 border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        Cliente próximo ao limite de budget ({budget.usagePercentage.toFixed(1)}%). Configure alertas para notificações automáticas.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900">Como funciona o Budget Management</p>
                <ul className="mt-2 space-y-1 text-blue-800">
                  <li>• Budgets são configurados por cliente na tabela <code className="bg-blue-100 px-1 rounded">client_budgets</code></li>
                  <li>• Tipos suportados: Tokens (count), BRL (R$), USD ($)</li>
                  <li>• Períodos: Diário, Semanal, Mensal (reset automático)</li>
                  <li>• Alertas automáticos em 80%, 90% e 100% do limite</li>
                  <li>• Gateway pode ser pausado automaticamente ao atingir 100%</li>
                  <li>• Uso é incrementado após cada requisição ao AI Gateway</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
