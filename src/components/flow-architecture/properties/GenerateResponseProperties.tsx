'use client'

/**
 * Generate Response Properties Panel
 * 
 * Configuration for the main AI response generation node.
 * 
 * @created 2025-12-07
 */

import { useState, useEffect } from 'react'
import { useFlowArchitectureStore } from '@/stores/flowArchitectureStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Save } from 'lucide-react'
import type { NodeConfig } from '@/stores/flowArchitectureStore'

interface GenerateResponsePropertiesProps {
  nodeId: string
  config: NodeConfig
}

export default function GenerateResponseProperties({
  nodeId,
  config
}: GenerateResponsePropertiesProps) {
  const { updateNodeConfig, saving } = useFlowArchitectureStore()

  const [localConfig, setLocalConfig] = useState(config)

  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  const handleSave = async () => {
    await updateNodeConfig(nodeId, localConfig)
  }

  const provider = localConfig.primary_model_provider || 'groq'
  const currentModel = provider === 'openai'
    ? (localConfig.openai_model as string | undefined) || 'gpt-4o'
    : (localConfig.groq_model as string | undefined) || 'llama-3.3-70b-versatile'

  const groqModels = [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
  ]
  const openaiModels = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo',
  ]
  const models = provider === 'openai' ? openaiModels : groqModels

  return (
    <div className="space-y-4">
      {/* Provider Selection */}
      <div className="space-y-2">
        <Label htmlFor="provider">Provedor de IA</Label>
        <Select
          value={provider}
          onValueChange={(value) => {
            const newConfig = { ...localConfig, primary_model_provider: value }
            
            // Set default model for provider if not set
            if (value === 'openai' && !(localConfig as any).openai_model) {
              (newConfig as any).openai_model = 'gpt-4o'
            } else if (value === 'groq' && !(localConfig as any).groq_model) {
              (newConfig as any).groq_model = 'llama-3.3-70b-versatile'
            }
            
            setLocalConfig(newConfig)
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="groq">Groq (Rápido & Gratuito)</SelectItem>
            <SelectItem value="openai">OpenAI (Premium)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          {provider === 'groq'
            ? 'Modelos rápidos e gratuitos da Groq'
            : 'Modelos premium da OpenAI (GPT-4, GPT-4o)'}
        </p>
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <Label htmlFor="model">Modelo</Label>
        <Select
          value={currentModel}
          onValueChange={(value) => {
            if (provider === 'openai') {
              setLocalConfig({ ...localConfig, openai_model: value } as any)
            } else {
              setLocalConfig({ ...localConfig, groq_model: value } as any)
            }
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model} value={model}>
                {model}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Temperature */}
      <div className="space-y-2">
        <Label htmlFor="temperature">
          Temperatura (Criatividade)
        </Label>
        <Input
          id="temperature"
          type="number"
          min={0}
          max={2}
          step={0.1}
          value={localConfig.temperature || 0.7}
          onChange={(e) =>
            setLocalConfig({ ...localConfig, temperature: parseFloat(e.target.value) })
          }
        />
        <p className="text-xs text-gray-500">
          0.0 = determinístico, 2.0 = muito criativo
        </p>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <Label htmlFor="max_tokens">Máximo de Tokens</Label>
        <Input
          id="max_tokens"
          type="number"
          min={1}
          max={8000}
          step={100}
          value={localConfig.max_tokens || 1000}
          onChange={(e) =>
            setLocalConfig({ ...localConfig, max_tokens: parseInt(e.target.value) })
          }
        />
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <Label htmlFor="system_prompt">System Prompt</Label>
        <Textarea
          id="system_prompt"
          value={localConfig.system_prompt || ''}
          onChange={(e) =>
            setLocalConfig({ ...localConfig, system_prompt: e.target.value })
          }
          rows={6}
          className="font-mono text-xs"
          placeholder="Instruções para a personalidade da IA..."
        />
      </div>

      {/* Formatter Prompt */}
      <div className="space-y-2">
        <Label htmlFor="formatter_prompt">Formatter Prompt</Label>
        <Textarea
          id="formatter_prompt"
          value={localConfig.formatter_prompt || ''}
          onChange={(e) =>
            setLocalConfig({ ...localConfig, formatter_prompt: e.target.value })
          }
          rows={4}
          className="font-mono text-xs"
          placeholder="Instruções para formatação da resposta..."
        />
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full gap-2"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </div>
  )
}
