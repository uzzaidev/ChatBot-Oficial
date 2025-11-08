'use client'

import { useState, useEffect } from 'react'
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

  // Fetch configurations on mount
  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/config')
      if (!response.ok) {
        throw new Error('Failed to fetch configurations')
      }
      const data = await response.json()
      
      // Group configs by category
      const grouped: ConfigsByCategory = {
        prompts: [],
        rules: [],
        thresholds: [],
        personality: [],
      }

      data.configs.forEach((config: BotConfig) => {
        const category = config.category as keyof ConfigsByCategory
        if (category && grouped[category]) {
          grouped[category].push(config)
        }
      })

      setConfigs(grouped)
    } catch (error) {
      console.error('Error fetching configs:', error)
      showNotification('error', 'Failed to load configurations')
    } finally {
      setLoading(false)
    }
  }

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

      showNotification('success', 'Configuration saved successfully')
      setEditingKey(null)
      setEditValue(null)
      fetchConfigs() // Reload configs
    } catch (error) {
      console.error('Error saving config:', error)
      showNotification('error', 'Failed to save configuration')
    }
  }

  const resetConfig = async (configKey: string) => {
    if (!confirm(`Reset "${configKey}" to default value?`)) {
      return
    }

    try {
      const response = await fetch(`/api/config?key=${encodeURIComponent(configKey)}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to reset configuration')
      }

      showNotification('success', 'Configuration reset to default')
      fetchConfigs() // Reload configs
    } catch (error) {
      console.error('Error resetting config:', error)
      showNotification('error', 'Failed to reset configuration')
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
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
                  Custom
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
                      title="Reset to default"
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
            <AlertDescription>No configurations found in this category.</AlertDescription>
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
          <CardTitle>Bot Configurations</CardTitle>
          <CardDescription>Loading configurations...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bot Configurations</CardTitle>
        <CardDescription>
          Customize prompts, rules, thresholds, and personality settings for your bot.
          Changes apply immediately without requiring a deployment.
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
            <TabsTrigger value="rules">Rules</TabsTrigger>
            <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
            <TabsTrigger value="personality">Personality</TabsTrigger>
          </TabsList>

          <TabsContent value="prompts" className="mt-6">
            {renderCategory(
              'prompts',
              'Prompt Configurations',
              'System prompts used by different AI agents (intent classifier, entity extractor, etc.)'
            )}
          </TabsContent>

          <TabsContent value="rules" className="mt-6">
            {renderCategory(
              'rules',
              'Behavior Rules',
              'Boolean flags and arrays that control bot behavior (use LLM, enable RAG, etc.)'
            )}
          </TabsContent>

          <TabsContent value="thresholds" className="mt-6">
            {renderCategory(
              'thresholds',
              'Numeric Thresholds',
              'Numeric parameters that control timing, similarity, and limits'
            )}
          </TabsContent>

          <TabsContent value="personality" className="mt-6">
            {renderCategory(
              'personality',
              'Personality Configuration',
              'Complex configuration defining bot personality, tone, and response style'
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
