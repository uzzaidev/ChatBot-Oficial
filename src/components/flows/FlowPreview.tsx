'use client'

/**
 * Flow Preview Component
 * 
 * Chat-style simulator for testing flows before publishing.
 * Uses FlowSimulator to navigate through flow without sending real messages.
 * 
 * @phase Phase 5 - Preview/Simulador
 * @created 2025-12-06
 */

import { useState, useEffect, useRef } from 'react'
import { X, RotateCcw } from 'lucide-react'
import { FlowSimulator, SimulationResult } from '@/lib/flows/flowSimulator'
import type { InteractiveFlow, ListSection, ReplyButton } from '@/types/interactiveFlows'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface PreviewMessage {
  id: string
  type: 'bot' | 'user' | 'system'
  content: string
  timestamp: Date
  interactive?: {
    type: 'list' | 'buttons'
    sections?: ListSection[]
    buttons?: ReplyButton[]
  }
}

interface FlowPreviewProps {
  flow: InteractiveFlow
  open: boolean
  onClose: () => void
}

export default function FlowPreview({ flow, open, onClose }: FlowPreviewProps) {
  const [messages, setMessages] = useState<PreviewMessage[]>([])
  const [simulator, setSimulator] = useState<FlowSimulator | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initialize simulator when dialog opens
  useEffect(() => {
    if (open && flow) {
      const newSimulator = new FlowSimulator(flow)
      setSimulator(newSimulator)
      setMessages([])
      startSimulation(newSimulator)
    }
  }, [open, flow])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const startSimulation = async (sim: FlowSimulator) => {
    if (!flow.startBlockId) {
      addSystemMessage('⚠️ Flow não tem bloco inicial configurado')
      return
    }

    setIsProcessing(true)
    try {
      const result = await sim.executeBlock(flow.startBlockId)
      await processSimulationResult(result, sim)
    } catch (error: any) {
      addSystemMessage(`❌ Erro: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const processSimulationResult = async (result: SimulationResult, sim: FlowSimulator) => {
    switch (result.type) {
      case 'message':
        // Add bot message
        addBotMessage(result.content || '')
        
        // Auto-advance to next block if configured
        if (result.autoAdvance && result.nextBlockId) {
          setTimeout(async () => {
            setIsProcessing(true)
            const nextResult = await sim.executeBlock(result.nextBlockId!)
            await processSimulationResult(nextResult, sim)
            setIsProcessing(false)
          }, 500)
        }
        break

      case 'interactive_list':
        // Add interactive list message
        addBotMessage(result.body || '', {
          type: 'list',
          sections: result.sections || []
        })
        break

      case 'interactive_buttons':
        // Add interactive buttons message
        addBotMessage(result.body || '', {
          type: 'buttons',
          buttons: result.buttons || []
        })
        break

      case 'transfer':
        addSystemMessage(result.message || 'Transferência')
        break

      case 'end':
        addSystemMessage(result.message || '✓ Flow finalizado')
        break

      case 'error':
        addSystemMessage(`❌ ${result.message}`)
        break

      case 'action':
        // Show action was executed (optional, can be hidden)
        addSystemMessage(`⚙️ ${result.actionDescription}`)
        
        // Continue if has next block
        if (result.nextBlockId) {
          setTimeout(async () => {
            setIsProcessing(true)
            const nextResult = await sim.executeBlock(result.nextBlockId!)
            await processSimulationResult(nextResult, sim)
            setIsProcessing(false)
          }, 300)
        }
        break
    }
  }

  const addBotMessage = (content: string, interactive?: PreviewMessage['interactive']) => {
    const newMessage: PreviewMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type: 'bot',
      content,
      timestamp: new Date(),
      interactive
    }
    setMessages(prev => [...prev, newMessage])
  }

  const addUserMessage = (content: string) => {
    const newMessage: PreviewMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type: 'user',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const addSystemMessage = (content: string) => {
    const newMessage: PreviewMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      type: 'system',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const handleInteractiveChoice = async (choiceId: string, choiceTitle: string, nextBlockId: string) => {
    if (!simulator || isProcessing) return

    // Add user's choice
    addUserMessage(choiceTitle)

    setIsProcessing(true)
    try {
      const result = await simulator.handleUserChoice(choiceId, choiceTitle, nextBlockId)
      await processSimulationResult(result, simulator)
    } catch (error: any) {
      addSystemMessage(`❌ Erro: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReset = () => {
    if (simulator) {
      simulator.reset()
      setMessages([])
      startSimulation(simulator)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle>Preview do Flow</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                title="Reiniciar simulação"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 px-6 py-4" ref={scrollRef}>
          <div className="space-y-3">
            {messages.length === 0 && !isProcessing && (
              <div className="text-center text-gray-500 text-sm py-8">
                Nenhuma mensagem ainda
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onInteractiveChoice={handleInteractiveChoice}
                disabled={isProcessing}
              />
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                Processando...
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-3 border-t bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            💡 Simulação - nenhuma mensagem real será enviada
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Message Bubble Component
 */
interface MessageBubbleProps {
  message: PreviewMessage
  onInteractiveChoice: (choiceId: string, choiceTitle: string, nextBlockId: string) => void
  disabled: boolean
}

function MessageBubble({ message, onInteractiveChoice, disabled }: MessageBubbleProps) {
  if (message.type === 'system') {
    return (
      <div className="flex justify-center">
        <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          {message.content}
        </div>
      </div>
    )
  }

  if (message.type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] px-4 py-2 bg-green-500 text-white rounded-lg rounded-tr-none">
          <p className="text-sm">{message.content}</p>
          <p className="text-xs opacity-75 mt-1">
            {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    )
  }

  // Bot message
  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] px-4 py-2 bg-gray-200 text-gray-900 rounded-lg rounded-tl-none">
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {/* Interactive List */}
        {message.interactive?.type === 'list' && message.interactive.sections && (
          <div className="mt-2">
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              {message.interactive.sections.map((section) => (
                <div key={section.id} className="border-b border-gray-200 last:border-b-0">
                  {section.title && (
                    <div className="px-3 py-2 bg-gray-100 font-medium text-xs text-gray-700">
                      {section.title}
                    </div>
                  )}
                  {section.rows.map((row) => (
                    <button
                      key={row.id}
                      onClick={() => onInteractiveChoice(row.id, row.title, row.nextBlockId)}
                      disabled={disabled}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium">{row.title}</div>
                      {row.description && (
                        <div className="text-xs text-gray-600 mt-0.5">{row.description}</div>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Buttons */}
        {message.interactive?.type === 'buttons' && message.interactive.buttons && (
          <div className="mt-2 space-y-1">
            {message.interactive.buttons.map((button) => (
              <button
                key={button.id}
                onClick={() => onInteractiveChoice(button.id, button.title, button.nextBlockId)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {button.title}
              </button>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-1">
          {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}
