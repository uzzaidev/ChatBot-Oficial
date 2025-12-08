'use client'
import { useState, useEffect } from 'react'
import { useFlowArchitectureStore, type NodeConfig } from '@/stores/flowArchitectureStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Save } from 'lucide-react'

export default function DetectRepetitionProperties({ nodeId, config }: { nodeId: string; config: NodeConfig }) {
  const { updateNodeConfig, saving } = useFlowArchitectureStore()
  const [localConfig, setLocalConfig] = useState(config)
  useEffect(() => { setLocalConfig(config) }, [config])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Threshold de Similaridade</Label>
        <Input type="number" min={0} max={1} step={0.1} value={localConfig.similarity_threshold || 0.8} onChange={(e) => setLocalConfig({ ...localConfig, similarity_threshold: parseFloat(e.target.value) })} />
        <p className="text-xs text-gray-500">0.0 = mínimo, 1.0 = máximo</p>
      </div>
      <div className="space-y-2">
        <Label>Verificar Últimas N Respostas</Label>
        <Input type="number" min={1} value={localConfig.check_last_n_responses || 3} onChange={(e) => setLocalConfig({ ...localConfig, check_last_n_responses: parseInt(e.target.value) })} />
      </div>
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <Label>Usar Embeddings (OpenAI)</Label>
        <Switch checked={localConfig.use_embeddings || false} onCheckedChange={(v) => setLocalConfig({ ...localConfig, use_embeddings: v })} />
      </div>
      <Button onClick={() => updateNodeConfig(nodeId, localConfig)} disabled={saving} className="w-full gap-2">
        <Save className="w-4 h-4" />{saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}
