'use client'

/**
 * Budget Configuration Component
 * 
 * Form for configuring budget limits and alerts
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Save, AlertTriangle, Check } from 'lucide-react'
import { BudgetProgressBar } from './BudgetProgressBar'

interface BudgetConfigurationProps {
  clientId: string
  currentUsage?: number
  onSave?: () => void
}

interface BudgetConfig {
  budgetType: 'tokens' | 'brl' | 'usd'
  budgetLimit: number
  budgetPeriod: 'daily' | 'weekly' | 'monthly'
  alertThreshold80: boolean
  alertThreshold90: boolean
  alertThreshold100: boolean
  pauseAtLimit: boolean
}

export const BudgetConfiguration = ({ 
  clientId, 
  currentUsage = 0, 
  onSave 
}: BudgetConfigurationProps) => {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [config, setConfig] = useState<BudgetConfig>({
    budgetType: 'tokens',
    budgetLimit: 100000,
    budgetPeriod: 'monthly',
    alertThreshold80: true,
    alertThreshold90: true,
    alertThreshold100: true,
    pauseAtLimit: false,
  })

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (config.budgetLimit <= 0) {
        throw new Error('Budget limit deve ser maior que 0')
      }

      const response = await fetch('/api/budget/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          ...config,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao salvar configuração')
      }

      setSuccess('Configuração de budget salva com sucesso!')
      onSave?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!confirm('Tem certeza que deseja resetar para o budget padrão do plano?')) {
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/budget/config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao resetar configuração')
      }

      setSuccess('Budget resetado para o padrão do plano!')
      onSave?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de Budget</CardTitle>
        <CardDescription>
          Configure limites de uso e alertas para controle de custos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

        {/* Current Usage */}
        {currentUsage > 0 && (
          <div>
            <Label>Uso Atual</Label>
            <div className="mt-2">
              <BudgetProgressBar
                current={currentUsage}
                limit={config.budgetLimit}
                type={config.budgetType}
              />
            </div>
          </div>
        )}

        {/* Budget Type */}
        <div>
          <Label htmlFor="budgetType">Tipo de Budget</Label>
          <Select
            value={config.budgetType}
            onValueChange={(value: any) => setConfig({ ...config, budgetType: value })}
          >
            <SelectTrigger id="budgetType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tokens">Tokens</SelectItem>
              <SelectItem value="brl">BRL (R$)</SelectItem>
              <SelectItem value="usd">USD ($)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            Unidade de medida para o limite de budget
          </p>
        </div>

        {/* Budget Limit */}
        <div>
          <Label htmlFor="budgetLimit">Limite de Budget</Label>
          <Input
            id="budgetLimit"
            type="number"
            value={config.budgetLimit}
            onChange={(e) => setConfig({ ...config, budgetLimit: parseFloat(e.target.value) || 0 })}
            min="0"
            step={config.budgetType === 'tokens' ? '1000' : '1'}
          />
          <p className="text-sm text-muted-foreground mt-1">
            {config.budgetType === 'tokens' && 'Exemplo: 100000 = 100k tokens'}
            {config.budgetType === 'brl' && 'Exemplo: 100.00 = R$ 100,00'}
            {config.budgetType === 'usd' && 'Exemplo: 20.00 = $20.00'}
          </p>
        </div>

        {/* Budget Period */}
        <div>
          <Label htmlFor="budgetPeriod">Período do Budget</Label>
          <Select
            value={config.budgetPeriod}
            onValueChange={(value: any) => setConfig({ ...config, budgetPeriod: value })}
          >
            <SelectTrigger id="budgetPeriod">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground mt-1">
            Budget será resetado automaticamente no início de cada período
          </p>
        </div>

        {/* Alert Thresholds */}
        <div className="space-y-3">
          <Label>Alertas de Budget</Label>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Alerta em 80%</p>
              <p className="text-sm text-muted-foreground">Warning quando atingir 80% do limite</p>
            </div>
            <Switch
              checked={config.alertThreshold80}
              onCheckedChange={(checked) => setConfig({ ...config, alertThreshold80: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Alerta em 90%</p>
              <p className="text-sm text-muted-foreground">Critical quando atingir 90% do limite</p>
            </div>
            <Switch
              checked={config.alertThreshold90}
              onCheckedChange={(checked) => setConfig({ ...config, alertThreshold90: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Alerta em 100%</p>
              <p className="text-sm text-muted-foreground">Error quando exceder o limite</p>
            </div>
            <Switch
              checked={config.alertThreshold100}
              onCheckedChange={(checked) => setConfig({ ...config, alertThreshold100: checked })}
            />
          </div>
        </div>

        {/* Auto-pause */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="text-sm font-medium">Pausar ao atingir limite</p>
            <p className="text-sm text-muted-foreground">
              Desabilita automaticamente o AI Gateway quando o budget é excedido
            </p>
          </div>
          <Switch
            checked={config.pauseAtLimit}
            onCheckedChange={(checked) => setConfig({ ...config, pauseAtLimit: checked })}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
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

          <Button variant="outline" onClick={handleReset} disabled={saving}>
            Resetar Padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
