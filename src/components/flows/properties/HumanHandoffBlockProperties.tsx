'use client'

/**
 * Human Handoff Block Properties Panel
 *
 * Configure human agent transfer settings with transition message
 * and agent notification options.
 *
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-07
 */

import { useState, useEffect } from 'react'

interface HumanHandoffBlockPropertiesProps {
  node: any
  onUpdate: (data: any) => void
}

export default function HumanHandoffBlockProperties({ node, onUpdate }: HumanHandoffBlockPropertiesProps) {
  const [transitionMessage, setTransitionMessage] = useState(
    node.data.transitionMessage || 'Um atendente humano vai te responder em breve.'
  )
  const [notifyAgent, setNotifyAgent] = useState(node.data.notifyAgent ?? true)

  useEffect(() => {
    setTransitionMessage(
      node.data.transitionMessage || 'Um atendente humano vai te responder em breve.'
    )
    setNotifyAgent(node.data.notifyAgent ?? true)
  }, [node.data])

  const handleUpdate = (updates: any) => {
    onUpdate(updates)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">👤 Transferir para Humano</h3>
        <p className="text-sm text-gray-600 mt-1">
          Configure como o cliente será transferido para um atendente humano
        </p>
      </div>

      {/* Transition Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mensagem para o Cliente
        </label>
        <textarea
          value={transitionMessage}
          onChange={(e) => {
            const value = e.target.value
            setTransitionMessage(value)
            handleUpdate({ transitionMessage: value })
          }}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="Ex: Um atendente humano vai te responder em breve..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-h-[100px]"
          maxLength={1024}
        />
        <p className="text-xs text-gray-500 mt-1">
          {transitionMessage.length}/1024 caracteres
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Mensagem enviada ao cliente antes da transferência
        </p>
      </div>

      {/* Notify Agent */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={notifyAgent}
            onChange={(e) => {
              const value = e.target.checked
              setNotifyAgent(value)
              handleUpdate({ notifyAgent: value })
            }}
            className="mt-1 w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-900">
              Enviar notificação para agente humano
            </span>
            <p className="text-xs text-gray-600 mt-1">
              O sistema irá notificar os atendentes sobre a nova conversa (email, notificação, etc.)
            </p>
          </div>
        </label>
      </div>

      {/* Preview */}
      {transitionMessage && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <p className="text-xs text-gray-600 mb-1 font-medium">Preview da mensagem:</p>
          <p className="text-sm text-gray-900">{transitionMessage}</p>
        </div>
      )}

      {/* Info Box */}
      <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-xs text-purple-900 font-medium mb-1">ℹ️ Como funciona:</p>
        <ul className="text-xs text-purple-800 space-y-1 ml-4 list-disc">
          <li>O status do contato muda de &quot;fluxo_inicial&quot; para &quot;humano&quot;</li>
          <li>O fluxo é marcado como concluído (transferred_human)</li>
          {notifyAgent && <li>Os atendentes são notificados sobre a nova conversa</li>}
          <li>A conversa fica disponível no painel de atendimento</li>
        </ul>
      </div>
    </div>
  )
}
