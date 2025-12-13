'use client'

/**
 * Gateway Metrics Dashboard Component
 * 
 * Displays comprehensive AI Gateway metrics with charts and tables
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useGatewayMetrics } from '@/hooks/useGatewayMetrics'

interface GatewayMetricsDashboardProps {
  period: '7d' | '30d' | '60d' | '90d'
  aggregated?: boolean
  clientId?: string
}

export const GatewayMetricsDashboard = ({ 
  period, 
  aggregated = false,
  clientId 
}: GatewayMetricsDashboardProps) => {
  const { data, loading, error, refetch } = useGatewayMetrics({
    period,
    aggregated,
    clientId,
  })

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-800">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Request Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline de Requests</CardTitle>
          <CardDescription>
            Volume de requests ao longo do período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            {/* Chart implementation would go here */}
            Timeline chart - {data.totalRequests} total requests
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Breakdown de Custos</CardTitle>
          <CardDescription>
            Custos por modelo e provider
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.costByModel?.map((item: any) => (
              <div key={item.model} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <p className="font-medium">{item.model}</p>
                  <p className="text-sm text-muted-foreground">{item.provider}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">R$ {item.cost.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">{item.requests} requests</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
