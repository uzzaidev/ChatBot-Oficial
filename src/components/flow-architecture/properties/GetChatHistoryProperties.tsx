'use client'
import { useState, useEffect } from 'react'
import { useFlowArchitectureStore, type NodeConfig } from '@/stores/flowArchitectureStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Save } from 'lucide-react'

export default function GetChatHistoryProperties({ nodeId, config }: { nodeId: string; config: NodeConfig }) {
  const { updateNodeConfig, saving } = useFlowArchitectureStore()
  const [localConfig, setLocalConfig] = useState(config)
  useEffect(() => { setLocalConfig(config) }, [config])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Máximo de Mensagens no Histórico</Label>
        <Input type="number" min={1} max={100} value={localConfig.max_messages || 20} onChange={(e) => setLocalConfig({ ...localConfig, max_messages: parseInt(e.target.value) })} />
        <p className="text-xs text-gray-500">Número de mensagens a buscar do histórico</p>
      </div>
      <Button onClick={() => updateNodeConfig(nodeId, localConfig)} disabled={saving} className="w-full gap-2">
        <Save className="w-4 h-4" />{saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}
