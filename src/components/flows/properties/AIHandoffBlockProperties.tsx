'use client'

/**
 * AI Handoff Block Properties Panel
 *
 * Configure AI transfer settings with transition message,
 * auto-response, and flow context options.
 *
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-07
 */

import { useState, useEffect } from 'react'

interface AIHandoffBlockPropertiesProps {
  node: any
  onUpdate: (data: any) => void
}

export default function AIHandoffBlockProperties({ node, onUpdate }: AIHandoffBlockPropertiesProps) {
  const [transitionMessage, setTransitionMessage] = useState(node.data.transitionMessage || '')
  const [autoRespond, setAutoRespond] = useState(node.data.autoRespond ?? true)
  const [includeFlowContext, setIncludeFlowContext] = useState(node.data.includeFlowContext ?? true)
  const [contextFormat, setContextFormat] = useState<'summary' | 'full'>(node.data.contextFormat || 'summary')

  useEffect(() => {
    setTransitionMessage(node.data.transitionMessage || '')
    setAutoRespond(node.data.autoRespond ?? true)
    setIncludeFlowContext(node.data.includeFlowContext ?? true)
    setContextFormat(node.data.contextFormat || 'summary')
  }, [node.data])

  const handleUpdate = (updates: any) => {
    onUpdate(updates)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">🤖 Transferir para Bot (IA)</h3>
        <p className="text-sm text-gray-600 mt-1">
          Configure como o cliente será transferido para o assistente de IA
        </p>
      </div>

      {/* Transition Message */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Mensagem de Transição (Opcional)
        </label>
        <textarea
          value={transitionMessage}
          onChange={(e) => {
            const value = e.target.value
            setTransitionMessage(value)
            handleUpdate({ transitionMessage: value })
          }}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="Ex: Perfeito! Agora vou te conectar com nosso assistente virtual..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 min-h-[100px]"
          maxLength={1024}
        />
        <p className="text-xs text-gray-500 mt-1">
          {transitionMessage.length}/1024 caracteres
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Mensagem enviada ao cliente antes da transferência
        </p>
      </div>

      {/* Auto-Respond */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRespond}
            onChange={(e) => {
              const value = e.target.checked
              setAutoRespond(value)
              handleUpdate({ autoRespond: value })
            }}
            className="mt-1 w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500"
          />
          <div className="flex-1">
            <span className="text-sm font-medium text-gray-900">
              Bot responde automaticamente após transferência
            </span>
            <p className="text-xs text-gray-600 mt-1">
              O bot irá enviar uma resposta imediata ao cliente usando o contexto do fluxo
            </p>
          </div>
        </label>
      </div>

      {/* Flow Context Options (only if auto-respond is enabled) */}
      {autoRespond && (
        <div className="space-y-4 pl-4 border-l-2 border-cyan-300">
          {/* Include Flow Context */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeFlowContext}
                onChange={(e) => {
                  const value = e.target.checked
                  setIncludeFlowContext(value)
                  handleUpdate({ includeFlowContext: value })
                }}
                className="mt-1 w-4 h-4 text-cyan-600 bg-gray-100 border-gray-300 rounded focus:ring-cyan-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Incluir contexto do fluxo na resposta do bot
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  O bot terá acesso às informações coletadas durante o fluxo
                </p>
              </div>
            </label>
          </div>

          {/* Context Format (only if context is included) */}
          {includeFlowContext && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formato do Contexto
              </label>
              <select
                value={contextFormat}
                onChange={(e) => {
                  const value = e.target.value as 'summary' | 'full'
                  setContextFormat(value)
                  handleUpdate({ contextFormat: value })
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
              >
                <option value="summary">Resumo (apenas variáveis)</option>
                <option value="full">Completo (histórico inteiro)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {contextFormat === 'summary'
                  ? 'Envia apenas as variáveis coletadas e última interação'
                  : 'Envia todo o histórico de interações do fluxo'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
        <p className="text-xs text-cyan-900 font-medium mb-1">ℹ️ Como funciona:</p>
        <ul className="text-xs text-cyan-800 space-y-1 ml-4 list-disc">
          <li>O status do contato muda de &quot;fluxo_inicial&quot; para &quot;bot&quot;</li>
          <li>O fluxo é marcado como concluído (transferred_ai)</li>
          {autoRespond && <li>O bot recebe o contexto e responde automaticamente</li>}
        </ul>
      </div>
    </div>
  )
}
