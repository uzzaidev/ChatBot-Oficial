'use client'

import { useState, useEffect } from 'react'
import { useFlowArchitectureStore } from '@/stores/flowArchitectureStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Save } from 'lucide-react'
import type { NodeConfig } from '@/stores/flowArchitectureStore'

interface CheckContinuityPropertiesProps {
  nodeId: string
  config: NodeConfig
}

export default function CheckContinuityProperties({ nodeId, config }: CheckContinuityPropertiesProps) {
  const { updateNodeConfig, saving } = useFlowArchitectureStore()
  const [localConfig, setLocalConfig] = useState(config)

  useEffect(() => { setLocalConfig(config) }, [config])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Threshold de Nova Conversa (Horas)</Label>
        <Input
          type="number"
          value={localConfig.new_conversation_threshold_hours || 24}
          onChange={(e) => setLocalConfig({ ...localConfig, new_conversation_threshold_hours: parseInt(e.target.value) })}
        />
      </div>

      <div className="space-y-2">
        <Label>Saudação - Novo Cliente</Label>
        <Textarea
          value={localConfig.greeting_for_new_customer || ''}
          onChange={(e) => setLocalConfig({ ...localConfig, greeting_for_new_customer: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Saudação - Cliente Retornando</Label>
        <Textarea
          value={localConfig.greeting_for_returning_customer || ''}
          onChange={(e) => setLocalConfig({ ...localConfig, greeting_for_returning_customer: e.target.value })}
          rows={3}
        />
      </div>

      <Button onClick={() => updateNodeConfig(nodeId, localConfig)} disabled={saving} className="w-full gap-2">
        <Save className="w-4 h-4" />
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}
