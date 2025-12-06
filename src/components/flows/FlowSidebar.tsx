'use client'

/**
 * Flow Sidebar Component
 * 
 * Left sidebar with draggable blocks palette.
 * 
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import {
  MessageSquare,
  List,
  Square,
  GitBranch,
  Zap,
  Bot,
  User,
  Play,
  StopCircle
} from 'lucide-react'

const blockTypes = [
  {
    type: 'start',
    label: 'Início',
    icon: Play,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    description: 'Bloco inicial do flow'
  },
  {
    type: 'message',
    label: 'Mensagem',
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    description: 'Enviar texto simples'
  },
  {
    type: 'interactive_list',
    label: 'Lista Interativa',
    icon: List,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    description: 'Menu com até 10 opções'
  },
  {
    type: 'interactive_buttons',
    label: 'Botões',
    icon: Square,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-300',
    description: 'Até 3 botões de escolha'
  },
  {
    type: 'condition',
    label: 'Condição',
    icon: GitBranch,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
    description: 'If/else baseado em variável'
  },
  {
    type: 'action',
    label: 'Ação',
    icon: Zap,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    description: 'Definir variável, tag, etc'
  },
  {
    type: 'ai_handoff',
    label: 'Transferir IA',
    icon: Bot,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-300',
    description: 'Enviar para agente IA'
  },
  {
    type: 'human_handoff',
    label: 'Transferir Humano',
    icon: User,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-300',
    description: 'Enviar para atendente'
  },
  {
    type: 'end',
    label: 'Fim',
    icon: StopCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    description: 'Finalizar flow'
  }
]

export default function FlowSidebar() {
  const onDragStart = (event: React.DragEvent, blockType: string) => {
    event.dataTransfer.setData('application/reactflow', blockType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4 text-gray-900">Blocos</h2>
      <p className="text-sm text-gray-600 mb-4">
        Arraste os blocos para o canvas
      </p>

      <div className="space-y-2">
        {blockTypes.map((block) => {
          const Icon = block.icon

          return (
            <div
              key={block.type}
              draggable
              onDragStart={(e) => onDragStart(e, block.type)}
              className={`
                p-3 border-2 ${block.borderColor} ${block.bgColor} rounded-lg
                cursor-grab active:cursor-grabbing
                hover:shadow-md transition-all duration-200
              `}
            >
              <div className="flex items-start gap-2">
                <Icon className={`w-5 h-5 ${block.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <p className="font-medium text-sm text-gray-900">{block.label}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{block.description}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
