'use client'
import { useState, useEffect } from 'react'
import { useFlowArchitectureStore, type NodeConfig } from '@/stores/flowArchitectureStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Save } from 'lucide-react'

export default function BatchMessagesProperties({ nodeId, config }: { nodeId: string; config: NodeConfig }) {
  const { updateNodeConfig, saving } = useFlowArchitectureStore()
  const [localConfig, setLocalConfig] = useState(config)
  useEffect(() => { setLocalConfig(config) }, [config])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Delay de Batching (Segundos)</Label>
        <Input type="number" min={0} max={60} value={localConfig.delay_seconds || 3} onChange={(e) => setLocalConfig({ ...localConfig, delay_seconds: parseInt(e.target.value) })} />
        <p className="text-xs text-gray-500">Tempo de espera para agrupar mensagens sequenciais</p>
      </div>
      <Button onClick={() => updateNodeConfig(nodeId, localConfig)} disabled={saving} className="w-full gap-2">
        <Save className="w-4 h-4" />{saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}
