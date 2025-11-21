'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Save, RotateCcw, Edit2, Check, X, AlertCircle } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface BotConfig {
  id: string
  client_id: string | null
  config_key: string
  config_value: any
  is_default: boolean
  description?: string
  category?: string
  created_at: string
  updated_at: string
}

interface ConfigsByCategory {
  prompts: BotConfig[]
  rules: BotConfig[]
  thresholds: BotConfig[]
  personality: BotConfig[]
}

export default function BotConfigurationManager() {
  const [configs, setConfigs] = useState<ConfigsByCategory>({
    prompts: [],
    rules: [],
    thresholds: [],
    personality: [],
  })
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>(null)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }, [])

  const fetchConfigs = useCallback(async () => {
    setLoading(true)
    console.log('[BotConfigurationManager] 🔍 Fetching configurations...')
    try {
      const response = await fetch('/api/config')
      console.log('[BotConfigurationManager] 🔍 Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('[BotConfigurationManager] ❌ Response not OK:', errorText)
        throw new Error('Failed to fetch configurations')
      }
      const data = await response.json()
      console.log('[BotConfigurationManager] 🔍 Data received:', {
        configCount: data.configs?.length || 0,
        clientId: data.clientId,
        firstConfig: data.configs?.[0]
      })
      
      // Group configs by category
      const grouped: ConfigsByCategory = {
        prompts: [],
        rules: [],
        thresholds: [],
        personality: [],
      }

      if (data.configs && Array.isArray(data.configs)) {
        data.configs.forEach((config: BotConfig) => {
          const category = config.category as keyof ConfigsByCategory
          console.log('[BotConfigurationManager] 🔍 Processing config:', {
            key: config.config_key,
            category: config.category,
            hasCategory: !!category,
            categoryExists: category && !!grouped[category]
          })
          if (category && grouped[category]) {
            grouped[category].push(config)
          }
        })
      }

      console.log('[BotConfigurationManager] 🔍 Grouped configs:', {
        prompts: grouped.prompts.length,
        rules: grouped.rules.length,
        thresholds: grouped.thresholds.length,
        personality: grouped.personality.length
      })

      setConfigs(grouped)
    } catch (error) {
      console.error('[BotConfigurationManager] ❌ Error fetching configs:', error)
      showNotification('error', 'Falha ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }, [showNotification])

  // Fetch configurations on mount
  useEffect(() => {
    fetchConfigs()
  }, [fetchConfigs])

  const startEditing = (config: BotConfig) => {
    setEditingKey(config.config_key)
    setEditValue(config.config_value)
  }

  const cancelEditing = () => {
    setEditingKey(null)
    setEditValue(null)
  }

  const saveConfig = async (configKey: string, category?: string) => {
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config_key: configKey,
          config_value: editValue,
          category,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save configuration')
      }

      showNotification('success', 'Configuração salva com sucesso')
      setEditingKey(null)
      setEditValue(null)
      fetchConfigs() // Reload configs
    } catch (error) {
      console.error('Error saving config:', error)
      showNotification('error', 'Falha ao salvar configuração')
    }
  }

  const resetConfig = async (configKey: string) => {
    if (!confirm(`Restaurar "${configKey}" para o valor padrão?`)) {
      return
    }

    try {
      const response = await fetch(`/api/config?key=${encodeURIComponent(configKey)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to reset configuration')
      }

      showNotification('success', 'Configuração restaurada para o padrão')
      fetchConfigs() // Reload configs
    } catch (error) {
      console.error('Error resetting config:', error)
      showNotification('error', 'Falha ao restaurar configuração')
    }
  }

  const renderConfigValue = (config: BotConfig) => {
    const isEditing = editingKey === config.config_key
    const value = isEditing ? editValue : config.config_value

    // Handle different value types
    if (typeof value === 'boolean') {
      return (
        <Select
          value={value.toString()}
          onValueChange={(v) => setEditValue(v === 'true')}
          disabled={!isEditing}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="false">false</SelectItem>
          </SelectContent>
        </Select>
      )
    }

    if (typeof value === 'number') {
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => setEditValue(parseFloat(e.target.value))}
          disabled={!isEditing}
          className="font-mono"
        />
      )
    }

    if (typeof value === 'string') {
      if (value.length > 100) {
        return (
          <Textarea
            value={value}
            onChange={(e) => setEditValue(e.target.value)}
            disabled={!isEditing}
            className="font-mono min-h-[100px]"
          />
        )
      }
      return (
        <Input
          type="text"
          value={value}
          onChange={(e) => setEditValue(e.target.value)}
          disabled={!isEditing}
          className="font-mono"
        />
      )
    }

    // Handle objects and arrays (JSON)
    return (
      <Textarea
        value={JSON.stringify(value, null, 2)}
        onChange={(e) => {
          try {
            setEditValue(JSON.parse(e.target.value))
          } catch {
            // Keep the text as-is if it's not valid JSON yet
            setEditValue(e.target.value)
          }
        }}
        disabled={!isEditing}
        className="font-mono min-h-[200px]"
      />
    )
  }

  const renderConfigItem = (config: BotConfig) => {
    const isEditing = editingKey === config.config_key
    const isCustomized = !config.is_default

    return (
      <Card key={config.config_key} className="mb-4">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base font-mono">{config.config_key}</CardTitle>
              {config.description && (
                <CardDescription className="mt-1">{config.description}</CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isCustomized && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  Personalizado
                </span>
              )}
              {isEditing ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => saveConfig(config.config_key, config.category)}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEditing}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="ghost" onClick={() => startEditing(config)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {isCustomized && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => resetConfig(config.config_key)}
                      title="Restaurar padrão"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>{renderConfigValue(config)}</CardContent>
      </Card>
    )
  }

  const renderCategory = (category: keyof ConfigsByCategory, title: string, description: string) => {
    const categoryConfigs = configs[category]

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {categoryConfigs.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Nenhuma configuração encontrada nesta categoria.</AlertDescription>
          </Alert>
        ) : (
          categoryConfigs.map(renderConfigItem)
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Bot</CardTitle>
          <CardDescription>Carregando configurações...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Bot</CardTitle>
        <CardDescription>
          Personalize prompts, regras, limites e configurações de personalidade do seu bot.
          As alterações são aplicadas imediatamente sem necessidade de deploy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {notification && (
          <Alert className={`mb-4 ${notification.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="prompts" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="rules">Regras</TabsTrigger>
            <TabsTrigger value="thresholds">Limites</TabsTrigger>
            <TabsTrigger value="personality">Personalidade</TabsTrigger>
          </TabsList>

          <TabsContent value="prompts" className="mt-6">
            {renderCategory(
              'prompts',
              'Configurações de Prompts',
              'Prompts de sistema usados por diferentes agentes de IA (classificador de intenção, extrator de entidades, etc.)'
            )}
          </TabsContent>

          <TabsContent value="rules" className="mt-6">
            {renderCategory(
              'rules',
              'Regras de Comportamento',
              'Flags booleanas e arrays que controlam o comportamento do bot (usar LLM, ativar RAG, etc.)'
            )}
          </TabsContent>

          <TabsContent value="thresholds" className="mt-6">
            {renderCategory(
              'thresholds',
              'Limites Numéricos',
              'Parâmetros numéricos que controlam tempo, similaridade e limites'
            )}
          </TabsContent>

          <TabsContent value="personality" className="mt-6">
            {renderCategory(
              'personality',
              'Configuração de Personalidade',
              'Configuração complexa definindo personalidade, tom e estilo de resposta do bot'
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
