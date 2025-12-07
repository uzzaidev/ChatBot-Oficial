'use client'

/**
 * Flow Trigger Settings Component
 * 
 * Modal para configurar como o flow será ativado (triggers).
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-07
 */

import { useState, useEffect } from 'react'
import { useFlowStore } from '@/stores/flowStore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Info, X } from 'lucide-react'

interface FlowTriggerSettingsProps {
  open: boolean
  onClose: () => void
}

export default function FlowTriggerSettings({ open, onClose }: FlowTriggerSettingsProps) {
  const { triggerType, triggerKeywords, updateFlowMetadata } = useFlowStore()
  
  const [localTriggerType, setLocalTriggerType] = useState(triggerType)
  const [keywordInput, setKeywordInput] = useState('')
  const [localKeywords, setLocalKeywords] = useState<string[]>(triggerKeywords || [])

  // Sync with store when opening
  useEffect(() => {
    if (open) {
      setLocalTriggerType(triggerType)
      setLocalKeywords(triggerKeywords || [])
      setKeywordInput('')
    }
  }, [open, triggerType, triggerKeywords])

  const handleAddKeyword = () => {
    const keyword = keywordInput.trim().toLowerCase()
    if (keyword && !localKeywords.includes(keyword)) {
      setLocalKeywords([...localKeywords, keyword])
      setKeywordInput('')
    }
  }

  const handleRemoveKeyword = (keyword: string) => {
    setLocalKeywords(localKeywords.filter(k => k !== keyword))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddKeyword()
    }
  }

  const handleSave = () => {
    updateFlowMetadata({
      triggerType: localTriggerType,
      triggerKeywords: localTriggerType === 'keyword' ? localKeywords : [],
    })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configurar Trigger do Flow</DialogTitle>
          <DialogDescription>
            Defina como e quando este flow será ativado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Trigger Type */}
          <div className="space-y-2">
            <Label htmlFor="trigger-type">Tipo de Trigger</Label>
            <Select value={localTriggerType} onValueChange={(value: any) => setLocalTriggerType(value)}>
              <SelectTrigger id="trigger-type">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keyword">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Palavra-chave</span>
                    <span className="text-xs text-gray-500">Inicia quando usuário envia palavra específica</span>
                  </div>
                </SelectItem>
                <SelectItem value="always">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Sempre Ativo</span>
                    <span className="text-xs text-gray-500">Inicia automaticamente para todos os novos contatos</span>
                  </div>
                </SelectItem>
                <SelectItem value="manual">
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Manual</span>
                    <span className="text-xs text-gray-500">Só inicia via API ou dashboard</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Keyword Input (only if trigger_type === 'keyword') */}
          {localTriggerType === 'keyword' && (
            <div className="space-y-2">
              <Label htmlFor="keywords">Palavras-chave</Label>
              <div className="flex gap-2">
                <Input
                  id="keywords"
                  placeholder="Digite uma palavra-chave"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button type="button" onClick={handleAddKeyword} variant="secondary">
                  Adicionar
                </Button>
              </div>
              
              {/* Keywords list */}
              {localKeywords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {localKeywords.map((keyword) => (
                    <Badge
                      key={keyword}
                      variant="secondary"
                      className="px-3 py-1 flex items-center gap-1"
                    >
                      {keyword}
                      <button
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="ml-1 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-2 text-xs text-gray-600 bg-blue-50 p-3 rounded-md">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                <p>
                  O flow iniciará quando a mensagem do usuário <strong>contiver</strong> qualquer uma dessas palavras.
                  Exemplo: se adicionar &quot;oi&quot;, o flow inicia com &quot;oi&quot;, &quot;Oi, tudo bem?&quot; ou &quot;oii&quot;.
                </p>
              </div>
            </div>
          )}

          {/* Warning for 'always' */}
          {localTriggerType === 'always' && (
            <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-md">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                <strong>⚠️ Atenção:</strong> Com trigger &quot;Sempre Ativo&quot;, TODOS os novos contatos (primeira mensagem)
                entrarão automaticamente neste flow. Certifique-se de que é isso que deseja.
              </p>
            </div>
          )}

          {/* Info for 'manual' */}
          {localTriggerType === 'manual' && (
            <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Este flow só será iniciado manualmente através de uma chamada de API
                ou ação no dashboard. Útil para flows de follow-up ou pesquisas.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
