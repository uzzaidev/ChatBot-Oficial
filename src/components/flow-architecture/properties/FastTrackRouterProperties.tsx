'use client'

/**
 * Fast Track Router Properties Component
 * 
 * Configuration panel for the Fast Track Router node in Flow Architecture.
 * Allows tenant to configure FAQ detection settings, catalog, and thresholds.
 * 
 * @updated 2025-12-15 - Improved UI with form-based FAQ management
 * @updated 2025-12-15 - Added model selector populated from AI Gateway models
 */

import { useState, useEffect } from 'react'
import { useFlowArchitectureStore, type NodeConfig } from '@/stores/flowArchitectureStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, AlertCircle, Info, Plus, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
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

interface AIModel {
  id: string
  provider: string
  modelName: string
  displayName: string
  gatewayIdentifier: string
}

interface FAQItemEditorProps {
  item: FastTrackCatalogItem
  index: number
  onUpdate: (index: number, item: FastTrackCatalogItem) => void
  onDelete: (index: number) => void
  isExpanded: boolean
  onToggle: () => void
}

const FAQItemEditor = ({ item, index, onUpdate, onDelete, isExpanded, onToggle }: FAQItemEditorProps) => {
  const [localItem, setLocalItem] = useState(item)
  const [examplesText, setExamplesText] = useState(item.examples.join('\n'))

  useEffect(() => {
    setLocalItem(item)
    setExamplesText(item.examples.join('\n'))
  }, [item])

  const handleUpdate = () => {
    const examples = examplesText
      .split('\n')
      .map(e => e.trim())
      .filter(e => e.length > 0)
    
    onUpdate(index, {
      ...localItem,
      examples,
    })
  }

  const handleExamplesBlur = () => {
    const examples = examplesText
      .split('\n')
      .map(e => e.trim())
      .filter(e => e.length > 0)
    
    setLocalItem({ ...localItem, examples })
    onUpdate(index, { ...localItem, examples })
  }

  return (
    <Card className="mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="p-1 h-auto"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <CardTitle className="text-sm font-medium">
              FAQ {index + 1}: {localItem.topic || '(sem tópico)'}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(index)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {!isExpanded && (
          <CardDescription className="text-xs mt-1">
            {localItem.canonical || '(sem pergunta canônica)'}
          </CardDescription>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-3 pt-0">
          <div className="space-y-2">
            <Label htmlFor={`topic-${index}`}>Tópico *</Label>
            <Input
              id={`topic-${index}`}
              value={localItem.topic}
              onChange={(e) => setLocalItem({ ...localItem, topic: e.target.value })}
              onBlur={handleUpdate}
              placeholder="Ex: faq_planos, faq_servicos"
            />
            <p className="text-xs text-gray-500">
              Identificador do tópico (ex: faq_planos, faq_servicos, faq_horario)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`canonical-${index}`}>Pergunta Canônica *</Label>
            <Input
              id={`canonical-${index}`}
              value={localItem.canonical}
              onChange={(e) => setLocalItem({ ...localItem, canonical: e.target.value })}
              onBlur={handleUpdate}
              placeholder="Ex: Quais são os planos disponíveis?"
            />
            <p className="text-xs text-gray-500">
              Forma base da pergunta FAQ
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`examples-${index}`}>Exemplos de Variações *</Label>
            <Textarea
              id={`examples-${index}`}
              value={examplesText}
              onChange={(e) => setExamplesText(e.target.value)}
              onBlur={handleExamplesBlur}
              placeholder="pode me mandar o plano?&#10;quero ver os planos&#10;tem plano disponível?&#10;quanto custa?"
              rows={5}
            />
            <p className="text-xs text-gray-500">
              Uma variação por linha (3-5 exemplos recomendados). Inclua gírias e variações reais.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  )
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
  const [catalogItems, setCatalogItems] = useState<FastTrackCatalogItem[]>([])
  const [keywordsText, setKeywordsText] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]))
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // AI Gateway models state
  const [aiModels, setAIModels] = useState<AIModel[]>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [modelsError, setModelsError] = useState<string | null>(null)

  // Fetch AI Gateway models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoadingModels(true)
        const response = await fetch('/api/ai-gateway/models')
        if (!response.ok) {
          throw new Error('Failed to fetch models')
        }
        const data = await response.json()
        // API returns { models: [...] }, not array directly
        setAIModels(data.models || [])
        setModelsError(null)
      } catch (error) {
        console.error('Error fetching AI models:', error)
        setModelsError('Não foi possível carregar os modelos do AI Gateway')
        setAIModels([])
      } finally {
        setLoadingModels(false)
      }
    }

    fetchModels()
  }, [])

  // Initialize from config
  useEffect(() => {
    setLocalConfig(config)
    
    // Initialize catalog items
    if (config.catalog && Array.isArray(config.catalog)) {
      setCatalogItems(config.catalog)
      // Expand first item by default
      setExpandedItems(new Set([0]))
    } else {
      // Default example
      setCatalogItems([
        {
          topic: "faq_servicos",
          canonical: "Quais são os serviços disponíveis?",
          examples: [
            "que serviços vocês oferecem?",
            "me fala sobre os serviços",
            "o que vocês fazem?",
            "quais são suas especialidades?"
          ]
        }
      ])
      setExpandedItems(new Set([0]))
    }

    // Initialize keywords text
    if (config.keywords && Array.isArray(config.keywords)) {
      setKeywordsText(config.keywords.join('\n'))
    } else {
      setKeywordsText('')
    }
  }, [config])

  const handleAddFAQ = () => {
    const newItem: FastTrackCatalogItem = {
      topic: `faq_${catalogItems.length + 1}`,
      canonical: "",
      examples: []
    }
    const newItems = [...catalogItems, newItem]
    setCatalogItems(newItems)
    // Expand the new item
    setExpandedItems(new Set([...Array.from(expandedItems), newItems.length - 1]))
  }

  const handleUpdateFAQ = (index: number, item: FastTrackCatalogItem) => {
    const newItems = [...catalogItems]
    newItems[index] = item
    setCatalogItems(newItems)
  }

  const handleDeleteFAQ = (index: number) => {
    const newItems = catalogItems.filter((_, i) => i !== index)
    setCatalogItems(newItems)
    // Update expanded items
    const newExpanded = new Set<number>()
    expandedItems.forEach(i => {
      if (i < index) newExpanded.add(i)
      else if (i > index) newExpanded.add(i - 1)
    })
    setExpandedItems(newExpanded)
  }

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedItems(newExpanded)
  }

  const validateAndSave = async () => {
    // Validate catalog
    if (catalogItems.length === 0) {
      setValidationError('Adicione pelo menos 1 FAQ ao catálogo')
      return
    }

    for (let i = 0; i < catalogItems.length; i++) {
      const item = catalogItems[i]
      if (!item.topic || item.topic.trim().length === 0) {
        setValidationError(`FAQ ${i + 1}: Tópico é obrigatório`)
        return
      }
      if (!item.canonical || item.canonical.trim().length === 0) {
        setValidationError(`FAQ ${i + 1}: Pergunta canônica é obrigatória`)
        return
      }
      if (!item.examples || item.examples.length === 0) {
        setValidationError(`FAQ ${i + 1}: Adicione pelo menos 1 exemplo`)
        return
      }
    }

    setValidationError(null)

    // Parse keywords (one per line)
    const keywords = keywordsText
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0)

    // Update config with router_model
    const updatedConfig = {
      ...localConfig,
      catalog: catalogItems,
      keywords,
    }

    // 🔧 FIX: Auto-enable the node when saving config
    // This ensures the node is enabled even if the toggle doesn't work
    await toggleNodeEnabled(nodeId, true)

    await updateNodeConfig(nodeId, updatedConfig)
  }

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Fast Track:</strong> Detecta perguntas FAQ para habilitar cache de prompt da LLM.
          Selecione o modelo a ser usado para classificação semântica.
        </AlertDescription>
      </Alert>

      {/* Router Model Selector */}
      <div className="space-y-2">
        <Label>Modelo do Roteador</Label>
        {loadingModels ? (
          <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-600">Carregando modelos...</span>
          </div>
        ) : modelsError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{modelsError}</AlertDescription>
          </Alert>
        ) : aiModels.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Nenhum modelo encontrado no AI Gateway. Configure modelos em /dashboard/ai-gateway/models
            </AlertDescription>
          </Alert>
        ) : (
          <Select
            value={localConfig.router_model || 'gpt-4o-mini'}
            onValueChange={(value) => setLocalConfig({ ...localConfig, router_model: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o modelo" />
            </SelectTrigger>
            <SelectContent>
              {aiModels.map((model) => (
                <SelectItem key={model.id} value={model.modelName}>
                  {model.provider} - {model.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <p className="text-xs text-gray-500">
          Modelo usado para classificar se a mensagem é FAQ. Será rastreado em budget/analytics.
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

      {/* FAQ Catalog */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Catálogo de FAQs</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddFAQ}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar FAQ
          </Button>
        </div>
        
        {catalogItems.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Nenhuma FAQ cadastrada. Clique em &quot;Adicionar FAQ&quot; para começar.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            {catalogItems.map((item, index) => (
              <FAQItemEditor
                key={index}
                item={item}
                index={index}
                onUpdate={handleUpdateFAQ}
                onDelete={handleDeleteFAQ}
                isExpanded={expandedItems.has(index)}
                onToggle={() => toggleExpanded(index)}
              />
            ))}
          </div>
        )}

        {validationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{validationError}</AlertDescription>
          </Alert>
        )}
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
          Uma keyword por linha. Se detectar keyword, roda fast track sem chamar IA (mais rápido).
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
            Recomendado: desabilita tools para prompts mais estáveis e cache melhor
          </p>
        </div>
        <Switch
          checked={localConfig.disable_tools ?? true}
          onCheckedChange={(v) => setLocalConfig({ ...localConfig, disable_tools: v })}
        />
      </div>

      {/* Save Button */}
      <Button
        onClick={validateAndSave}
        disabled={saving || !!validationError}
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
            <li>Se não, chama IA (modelo do AI Gateway) para calcular similaridade</li>
            <li>Se similaridade &gt; threshold, roda fast track (pula histórico/RAG)</li>
            <li>Fast track = prompt estável = cache da LLM funciona!</li>
          </ol>
        </AlertDescription>
      </Alert>
    </div>
  )
}
