'use client'

/**
 * Cache Performance Card Component
 * 
 * Displays cache performance metrics with savings calculation
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Zap, TrendingUp, DollarSign } from 'lucide-react'

interface CachePerformanceCardProps {
  hitRate: number
  totalRequests: number
  cachedRequests: number
  tokensSaved: number
  costSavings: number
}

export const CachePerformanceCard = ({
  hitRate,
  totalRequests,
  cachedRequests,
  tokensSaved,
  costSavings,
}: CachePerformanceCardProps) => {
  const getHitRateColor = (rate: number) => {
    if (rate >= 60) return 'text-green-600'
    if (rate >= 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProgressColor = (rate: number) => {
    if (rate >= 60) return '[&>div]:bg-green-500'
    if (rate >= 30) return '[&>div]:bg-yellow-500'
    return '[&>div]:bg-red-500'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Cache Performance
        </CardTitle>
        <CardDescription>
          Economia gerada pelo cache do AI Gateway
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hit Rate */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Cache Hit Rate</span>
            <span className={`text-2xl font-bold ${getHitRateColor(hitRate)}`}>
              {hitRate.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={hitRate} 
            className={`h-3 ${getProgressColor(hitRate)}`}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {cachedRequests.toLocaleString('pt-BR')} de {totalRequests.toLocaleString('pt-BR')} requests
          </p>
        </div>

        {/* Tokens Saved */}
        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">Tokens Economizados</p>
              <p className="text-xs text-blue-700">Redução de uso</p>
            </div>
          </div>
          <span className="text-lg font-bold text-blue-600">
            {tokensSaved >= 1000 
              ? `${(tokensSaved / 1000).toFixed(1)}k`
              : tokensSaved.toLocaleString('pt-BR')
            }
          </span>
        </div>

        {/* Cost Savings */}
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">Economia em R$</p>
              <p className="text-xs text-green-700">Custo evitado</p>
            </div>
          </div>
          <span className="text-lg font-bold text-green-600">
            R$ {costSavings.toFixed(2)}
          </span>
        </div>

        {/* Performance Indicator */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            {hitRate >= 60 && '✅ Excelente performance de cache'}
            {hitRate >= 30 && hitRate < 60 && '⚠️ Performance moderada de cache'}
            {hitRate < 30 && '❌ Cache precisa de otimização'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
