'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Clock, ExternalLink, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface TraceRow {
  id: string
  phone: string
  status: string
  user_message: string
  latency_total_ms: number | null
  cost_usd: number | null
  created_at: string
}

interface TracesMeta {
  costTodayUsd: number
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  pending:        { label: 'pendente',  icon: AlertCircle,    color: 'text-yellow-500' },
  evaluated:      { label: 'avaliado',  icon: CheckCircle2,   color: 'text-green-500' },
  failed:         { label: 'falhou',    icon: XCircle,        color: 'text-red-500' },
  needs_review:   { label: 'revisão',   icon: AlertCircle,    color: 'text-orange-500' },
  human_reviewed: { label: 'revisado',  icon: CheckCircle2,   color: 'text-blue-500' },
}

const maskPhone = (phone: string) => {
  if (phone.length < 6) return phone
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`
}

const formatLatency = (ms: number | null) =>
  ms == null ? '—' : ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`

const formatCost = (usd: number | null) =>
  usd == null ? '—' : `$${usd.toFixed(5)}`

export function TracesWidget() {
  const [traces, setTraces] = useState<TraceRow[]>([])
  const [meta, setMeta] = useState<TracesMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTraces = async () => {
      try {
        const res = await fetch('/api/traces?limit=5')
        if (!res.ok) throw new Error(`${res.status}`)
        const json = await res.json()
        setTraces(json.data ?? [])
        setMeta(json.meta ?? null)
      } catch (err) {
        setError('Erro ao carregar traces')
      } finally {
        setLoading(false)
      }
    }

    fetchTraces()
  }, [])

  if (loading) {
    return (
      <div className="metric-card animate-pulse space-y-3">
        <div className="h-3 bg-muted rounded w-1/3" />
        <div className="h-8 bg-muted rounded w-1/2" />
        <div className="space-y-2 pt-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="metric-card flex items-center gap-3 text-muted-foreground text-sm">
        <XCircle className="h-4 w-4 text-destructive shrink-0" />
        {error}
      </div>
    )
  }

  const costToday = meta?.costTodayUsd ?? 0

  return (
    <div className="metric-card space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Observabilidade
        </h3>
        <DollarSign className="h-5 w-5 text-uzz-mint opacity-60" />
      </div>

      {/* Cost today */}
      <div>
        <p className="text-3xl font-bold font-poppins text-foreground">
          ${costToday.toFixed(4)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">custo de hoje (USD)</p>
      </div>

      {/* Recent traces table */}
      {traces.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhum trace hoje.</p>
      ) : (
        <div className="space-y-1.5">
          {traces.map((t) => {
            const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.pending
            const StatusIcon = cfg.icon
            return (
              <Link
                key={t.id}
                href={`/api/traces/${t.id}`}
                target="_blank"
                className="flex items-center gap-2 rounded-md px-2.5 py-2 text-xs hover:bg-muted/60 transition-colors group"
              >
                <StatusIcon className={cn('h-3.5 w-3.5 shrink-0', cfg.color)} />
                <span className="font-mono text-muted-foreground w-20 shrink-0">
                  {maskPhone(t.phone)}
                </span>
                <span className="flex-1 truncate text-foreground/80">
                  {t.user_message?.slice(0, 40) ?? '—'}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />
                  {formatLatency(t.latency_total_ms)}
                </span>
                <span className="text-muted-foreground shrink-0 font-mono">
                  {formatCost(t.cost_usd)}
                </span>
                <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-40 shrink-0" />
              </Link>
            )
          })}
        </div>
      )}

      {/* Ver todas */}
      <div className="pt-1 border-t border-border/40">
        <Link
          href="/api/traces"
          target="_blank"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Ver todas via API
        </Link>
      </div>
    </div>
  )
}
