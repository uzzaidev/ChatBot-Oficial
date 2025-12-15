'use client'

/**
 * Fast Track Router Properties Component
 * 
 * Configuration panel for the Fast Track Router node in Flow Architecture.
 * Allows tenant to configure FAQ detection settings, catalog, and thresholds.
 * 
 * @created 2025-12-15
 */

import { useState, useEffect } from 'react'
import { useFlowArchitectureStore, type NodeConfig } from '@/stores/flowArchitectureStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, AlertCircle, Info } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FastTrackCatalogItem {
  topic: string
  canonical: string
  examples: string[]
}

export default function FastTrackRouterProperties({ 
  nodeId, 
  config 
}: { 
  nodeId: string
  config: NodeConfig 
}) {
  const { updateNodeConfig, saving } = useFlowArchitectureStore()
  const [localConfig, setLocalConfig] = useState(config)
  const [catalogJson, setCatalogJson] = useState('')
  const [keywordsText, setKeywordsText] = useState('')
  const [catalogError, setCatalogError] = useState<string | null>(null)

  // Initialize catalog and keywords text from config
  useEffect(() => {
    setLocalConfig(config)
    
    // Initialize catalog JSON
    if (config.catalog && Array.isArray(config.catalog)) {
      setCatalogJson(JSON.stringify(config.catalog, null, 2))
    } else {
      // Default example catalog
      const defaultCatalog: FastTrackCatalogItem[] = [
        {
          topic: "faq_servicos",
          canonical: "Quais são os serviços disponíveis?",
          examples: [
            "que serviços vocês oferecem?",
            "me fala sobre os serviços",
            "o que vocês fazem?",
            "quais são suas especialidades?"
          ]
        },
        {
          topic: "faq_planos",
          canonical: "Quais são os planos?",
          examples: [
            "pode me mandar o plano?",
            "quero ver os planos",
            "tem plano disponível?",
            "quanto custa?"
          ]
        }
      ]
      setCatalogJson(JSON.stringify(defaultCatalog, null, 2))
    }

    // Initialize keywords text
    if (config.keywords && Array.isArray(config.keywords)) {
      setKeywordsText(config.keywords.join('\n'))
    } else {
      setKeywordsText('')
    }
  }, [config])

  const handleSave = () => {
    // Parse catalog JSON
    let catalogData: FastTrackCatalogItem[] = []
    try {
      catalogData = JSON.parse(catalogJson)
      if (!Array.isArray(catalogData)) {
        setCatalogError('O catálogo deve ser um array JSON')
        return
      }
      setCatalogError(null)
    } catch (error) {
      setCatalogError('JSON inválido. Verifique a sintaxe.')
      return
    }

    // Parse keywords (one per line)
    const keywords = keywordsText
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0)

    // Update config
    const updatedConfig = {
      ...localConfig,
      catalog: catalogData,
      keywords,
    }

    updateNodeConfig(nodeId, updatedConfig)
  }

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Fast Track:</strong> Detecta perguntas FAQ usando similaridade semântica.
          Quando detecta, pula histórico/RAG/data-hora para habilitar cache de prompt da LLM.
        </AlertDescription>
      </Alert>

      {/* Router Model */}
      <div className="space-y-2">
        <Label>Modelo do Roteador</Label>
        <Select
          value={localConfig.router_model || 'gpt-4o-mini'}
          onValueChange={(value) => setLocalConfig({ ...localConfig, router_model: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4o-mini">GPT-4o Mini (recomendado - mais barato)</SelectItem>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Modelo usado para classificar se a mensagem é FAQ. GPT-4o Mini é o mais barato ($0.15/1M tokens).
        </p>
      </div>

      {/* Similarity Threshold */}
      <div className="space-y-2">
        <Label>Threshold de Similaridade</Label>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={localConfig.similarity_threshold || 0.80}
          onChange={(e) =>
            setLocalConfig({ ...localConfig, similarity_threshold: parseFloat(e.target.value) })
          }
        />
        <p className="text-xs text-gray-500">
          0.0 = aceita qualquer similaridade, 1.0 = apenas matches exatos. Recomendado: 0.80
        </p>
      </div>

      {/* Catalog (JSON) */}
      <div className="space-y-2">
        <Label>Catálogo de FAQs (JSON)</Label>
        <Textarea
          value={catalogJson}
          onChange={(e) => setCatalogJson(e.target.value)}
          placeholder='[{"topic": "faq_servicos", "canonical": "Quais são os serviços?", "examples": ["que serviços vocês oferecem?"]}]'
          className="font-mono text-sm"
          rows={12}
        />
        {catalogError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{catalogError}</AlertDescription>
          </Alert>
        )}
        <p className="text-xs text-gray-500">
          Array JSON com objetos: <code>{'{"topic": "...", "canonical": "...", "examples": [...]}'}</code>
        </p>
      </div>

      {/* Keywords (Optional Prefilter) */}
      <div className="space-y-2">
        <Label>Keywords (Prefilter Opcional)</Label>
        <Textarea
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
          placeholder="planos&#10;serviços&#10;orçamento"
          rows={4}
        />
        <p className="text-xs text-gray-500">
          Uma keyword por linha. Se a mensagem contém alguma keyword, roda fast track sem chamar IA (mais rápido).
        </p>
      </div>

      {/* Match Mode */}
      <div className="space-y-2">
        <Label>Modo de Match (Keywords)</Label>
        <Select
          value={localConfig.match_mode || 'contains'}
          onValueChange={(value) => setLocalConfig({ ...localConfig, match_mode: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="contains">Contém (contains)</SelectItem>
            <SelectItem value="starts_with">Começa com (starts_with)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Como comparar keywords: &quot;contém&quot; ou &quot;começa com&quot;
        </p>
      </div>

      {/* Disable Tools */}
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div>
          <Label>Desabilitar Tools no Fast Track</Label>
          <p className="text-xs text-gray-500 mt-1">
            Recomendado: desabilita tools (transferência, busca docs) para prompts mais estáveis
          </p>
        </div>
        <Switch
          checked={localConfig.disable_tools ?? true}
          onCheckedChange={(v) => setLocalConfig({ ...localConfig, disable_tools: v })}
        />
      </div>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving || !!catalogError}
        className="w-full gap-2"
      >
        <Save className="w-4 h-4" />
        {saving ? 'Salvando...' : 'Salvar Configuração'}
      </Button>

      {/* Help Text */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Como funciona:</strong>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>Mensagem é normalizada (lowercase, sem pontuação)</li>
            <li>Se tiver keyword, roda fast track imediatamente</li>
            <li>Se não, chama IA para calcular similaridade com catálogo</li>
            <li>Se similaridade &gt; threshold, roda fast track (pula histórico/RAG)</li>
            <li>Fast track = prompt estável = cache da LLM funciona!</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  )
}
