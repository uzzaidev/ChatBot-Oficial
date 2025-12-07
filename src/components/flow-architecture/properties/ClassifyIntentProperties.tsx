'use client'
import { useState, useEffect } from 'react'
import { useFlowArchitectureStore, type NodeConfig } from '@/stores/flowArchitectureStore'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Save } from 'lucide-react'

export default function ClassifyIntentProperties({ nodeId, config }: { nodeId: string; config: NodeConfig }) {
  const { updateNodeConfig, saving } = useFlowArchitectureStore()
  const [localConfig, setLocalConfig] = useState(config)
  useEffect(() => { setLocalConfig(config) }, [config])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <Label>Usar LLM para Classificação</Label>
        <Switch checked={localConfig.use_llm || false} onCheckedChange={(v) => setLocalConfig({ ...localConfig, use_llm: v })} />
      </div>
      <div className="space-y-2">
        <Label>Temperature</Label>
        <Input type="number" min={0} max={2} step={0.1} value={localConfig.temperature || 0} onChange={(e) => setLocalConfig({ ...localConfig, temperature: parseFloat(e.target.value) })} />
      </div>
      <div className="space-y-2">
        <Label>Prompt do Classificador</Label>
        <Textarea value={localConfig.prompt || ''} onChange={(e) => setLocalConfig({ ...localConfig, prompt: e.target.value })} rows={6} className="font-mono text-xs" />
      </div>
      <div className="space-y-2">
        <Label>Intenções Suportadas (JSON)</Label>
        <Textarea value={JSON.stringify(localConfig.intents || [], null, 2)} onChange={(e) => { try { setLocalConfig({ ...localConfig, intents: JSON.parse(e.target.value) }) } catch {} }} rows={6} className="font-mono text-xs" />
      </div>
      <Button onClick={() => updateNodeConfig(nodeId, localConfig)} disabled={saving} className="w-full gap-2">
        <Save className="w-4 h-4" />{saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </div>
  )
}
