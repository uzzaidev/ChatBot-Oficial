'use client'

/**
 * Model Selector Component
 * 
 * Dropdown selector for AI models with pricing and capabilities info
 */

import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface AIModel {
  id: string
  provider: string
  modelName: string
  displayName: string
  costPer1kInputTokens: number
  costPer1kOutputTokens: number
  supportsVision: boolean
  supportsTools: boolean
  enabled: boolean
}

interface ModelSelectorProps {
  value?: string
  onChange: (modelId: string) => void
  filterByCapability?: 'vision' | 'tools'
  showPricing?: boolean
}

export const ModelSelector = ({
  value,
  onChange,
  filterByCapability,
  showPricing = true,
}: ModelSelectorProps) => {
  const [models, setModels] = useState<AIModel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchModels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterByCapability])

  const fetchModels = async () => {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      
      if (filterByCapability) {
        params.append('capability', filterByCapability)
      }

      const response = await fetch(`/api/ai-gateway/models?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setModels(data.models || [])
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    } finally {
      setLoading(false)
    }
  }

  // Group models by provider
  const modelsByProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = []
    }
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, AIModel[]>)

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 border rounded">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Carregando modelos...</span>
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Selecione um modelo de IA" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
          <SelectGroup key={provider}>
            <SelectLabel className="font-semibold capitalize">{provider}</SelectLabel>
            {providerModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center gap-2">
                  <span>{model.displayName}</span>
                  
                  {/* Capabilities Badges */}
                  {model.supportsVision && (
                    <Badge variant="secondary" className="text-xs">
                      👁️ Vision
                    </Badge>
                  )}
                  {model.supportsTools && (
                    <Badge variant="secondary" className="text-xs">
                      🛠️ Tools
                    </Badge>
                  )}

                  {/* Pricing */}
                  {showPricing && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      ${model.costPer1kInputTokens.toFixed(4)}/1k
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
