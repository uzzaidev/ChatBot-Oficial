'use client'
import { useState, useEffect } from 'react'
import { useFlowArchitectureStore, type NodeConfig } from '@/stores/flowArchitectureStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Save } from 'lucide-react'

export default function SearchDocumentProperties({ nodeId, config }: { nodeId: string; config: NodeConfig }) {
  const { updateNodeConfig, saving } = useFlowArchitectureStore()
  const [localConfig, setLocalConfig] = useState(config)
  useEffect(() => { setLocalConfig(config) }, [config])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Threshold de Similaridade</Label>
        <Input type="number" min={0} max={1} step={0.1} value={localConfig.similarity_threshold || 0.7} onChange={(e) => setLocalConfig({ ...localConfig, similarity_threshold: parseFloat(e.target.value) })} />
      </div>
      <div className="space-y-2">
        <Label>Máximo de Resultados</Label>
        <Input type="number" min={1} max={10} value={localConfig.max_results || 3} onChange={(e) => setLocalConfig({ ...localConfig, max_results: parseInt(e.target.value) })} />
      </div>
      <div className="space-y-2">
        <Label>Tamanho Máximo do Arquivo (MB)</Label>
        <Input type="number" min={1} max={100} value={localConfig.max_file_size_mb || 10} onChange={(e) => setLocalConfig({ ...localConfig, max_file_size_mb: parseInt(e.target.value) })} />
      </div>
      <Button onClick={() => updateNodeConfig(nodeId, localConfig)} disabled={saving} className="w-full gap-2">
        <Save className="w-4 h-4" />{saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}
