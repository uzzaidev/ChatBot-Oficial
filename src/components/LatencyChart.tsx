'use client'

/**
 * Latency Chart Component
 * 
 * Line chart showing P50, P95, and P99 latency over time
 */

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Loader2 } from 'lucide-react'

interface LatencyChartProps {
  period: '7d' | '30d' | '60d' | '90d'
  clientId?: string
}

interface LatencyData {
  date: string
  p50: number
  p95: number
  p99: number
}

export const LatencyChart = ({ period, clientId }: LatencyChartProps) => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<LatencyData[]>([])

  useEffect(() => {
    fetchLatencyData()
  }, [period, clientId])

  const fetchLatencyData = async () => {
    setLoading(true)
    
    try {
      const params = new URLSearchParams({ period })
      if (clientId) {
        params.append('clientId', clientId)
      }

      const response = await fetch(`/api/ai-gateway/latency?${params}`)
      
      if (response.ok) {
        const result = await response.json()
        setData(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch latency data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        Nenhum dado de latência disponível
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
        />
        <YAxis label={{ value: 'Latência (ms)', angle: -90, position: 'insideLeft' }} />
        <Tooltip 
          labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
          formatter={(value: any) => [`${value}ms`, '']}
        />
        <Legend />
        <Line type="monotone" dataKey="p50" stroke="#8884d8" name="P50" strokeWidth={2} />
        <Line type="monotone" dataKey="p95" stroke="#82ca9d" name="P95" strokeWidth={2} />
        <Line type="monotone" dataKey="p99" stroke="#ffc658" name="P99" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
