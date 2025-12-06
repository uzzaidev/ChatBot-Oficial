/**
 * Flow Simulator
 * 
 * Simulates flow execution WITHOUT sending real messages.
 * Used for preview/testing flows before publishing.
 * 
 * @phase Phase 5 - Preview/Simulador
 * @created 2025-12-06
 */

import type {
  InteractiveFlow,
  FlowBlock,
  FlowEdge,
  ListSection,
  ReplyButton,
  Condition
} from '@/types/interactiveFlows'

export interface SimulationResult {
  type: 'message' | 'interactive_list' | 'interactive_buttons' | 'condition' | 'action' | 'transfer' | 'end' | 'error'
  content?: string
  body?: string
  sections?: ListSection[]
  buttons?: ReplyButton[]
  destination?: 'bot' | 'human'
  message?: string
  autoAdvance?: boolean
  nextBlockId?: string | null
  actionDescription?: string
}

export class FlowSimulator {
  private flow: InteractiveFlow
  private currentBlockId: string
  private variables: Record<string, any> = {}
  private history: string[] = []

  constructor(flow: InteractiveFlow) {
    this.flow = flow
    this.currentBlockId = flow.startBlockId
  }

  /**
   * Execute a block and return simulation result
   * Does NOT send real messages
   */
  async executeBlock(blockId: string): Promise<SimulationResult> {
    const block = this.flow.blocks.find(b => b.id === blockId)
    
    if (!block) {
      return {
        type: 'error',
        message: 'Block not found'
      }
    }

    this.currentBlockId = blockId
    this.history.push(blockId)

    switch (block.type) {
      case 'start':
        // Start block just advances to next
        const startNextId = this.findNextBlock(blockId)
        if (startNextId) {
          return this.executeBlock(startNextId)
        }
        return { type: 'end' }

      case 'message':
        return {
          type: 'message',
          content: block.data.messageText || 'Mensagem vazia',
          autoAdvance: true,
          nextBlockId: this.findNextBlock(blockId)
        }

      case 'interactive_list':
        return {
          type: 'interactive_list',
          body: block.data.listBody || 'Lista',
          sections: block.data.listSections || []
        }

      case 'interactive_buttons':
        return {
          type: 'interactive_buttons',
          body: block.data.buttonsBody || 'Escolha uma opção',
          buttons: block.data.buttons || []
        }

      case 'condition':
        // Evaluate conditions
        const conditions = block.data.conditions || []
        
        for (const condition of conditions) {
          if (this.evaluateCondition(condition)) {
            if (condition.nextBlockId) {
              return this.executeBlock(condition.nextBlockId)
            }
          }
        }

        // Default path
        const defaultNextId = block.data.defaultNextBlockId || this.findNextBlock(blockId)
        if (defaultNextId) {
          return this.executeBlock(defaultNextId)
        }
        
        return {
          type: 'condition',
          message: 'Nenhuma condição correspondeu',
          autoAdvance: false
        }

      case 'action':
        const actionType = block.data.actionType
        const actionParams = block.data.actionParams || {}
        let actionDescription = ''

        switch (actionType) {
          case 'set_variable':
            this.variables[actionParams.name] = actionParams.value
            actionDescription = `Variável "${actionParams.name}" = "${actionParams.value}"`
            break
          case 'increment':
            this.variables[actionParams.name] = (this.variables[actionParams.name] || 0) + 1
            actionDescription = `Variável "${actionParams.name}" incrementada`
            break
          case 'add_tag':
            actionDescription = `Tag "${actionParams.tag}" adicionada`
            break
          case 'remove_tag':
            actionDescription = `Tag "${actionParams.tag}" removida`
            break
          default:
            actionDescription = 'Ação executada'
        }

        // Auto-advance to next block
        const actionNextId = this.findNextBlock(blockId)
        if (actionNextId) {
          return this.executeBlock(actionNextId)
        }

        return {
          type: 'action',
          actionDescription,
          autoAdvance: true,
          nextBlockId: null
        }

      case 'ai_handoff':
        return {
          type: 'transfer',
          destination: 'bot',
          message: '🤖 Transferido para Bot/IA'
        }

      case 'human_handoff':
        return {
          type: 'transfer',
          destination: 'human',
          message: '👤 Transferido para Atendente Humano'
        }

      case 'end':
        return {
          type: 'end',
          message: '✓ Flow finalizado'
        }

      default:
        return {
          type: 'error',
          message: `Tipo de bloco desconhecido: ${block.type}`
        }
    }
  }

  /**
   * Handle user choice from interactive message
   */
  async handleUserChoice(choiceId: string, choiceTitle: string, nextBlockId: string): Promise<SimulationResult> {
    // Save choice in variable
    this.variables.last_choice = choiceTitle
    this.variables.last_choice_id = choiceId

    // Execute next block
    if (nextBlockId) {
      return this.executeBlock(nextBlockId)
    }

    return {
      type: 'error',
      message: 'Nenhum bloco conectado a esta opção'
    }
  }

  /**
   * Find next block from current block
   */
  private findNextBlock(currentBlockId: string): string | null {
    const edge = this.flow.edges.find(e => e.source === currentBlockId)
    return edge?.target || null
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: Condition): boolean {
    const varValue = this.variables[condition.variable]

    switch (condition.operator) {
      case '==':
        return varValue == condition.value
      case '!=':
        return varValue != condition.value
      case '>':
        return Number(varValue) > Number(condition.value)
      case '<':
        return Number(varValue) < Number(condition.value)
      case 'contains':
        return String(varValue || '').includes(String(condition.value))
      case 'not_contains':
        return !String(varValue || '').includes(String(condition.value))
      default:
        return false
    }
  }

  /**
   * Go back to previous block
   */
  goBack(): string | null {
    if (this.history.length > 1) {
      this.history.pop() // Remove current
      const previousBlockId = this.history[this.history.length - 1]
      this.currentBlockId = previousBlockId
      return previousBlockId
    }
    return null
  }

  /**
   * Get current state
   */
  getState() {
    return {
      currentBlockId: this.currentBlockId,
      variables: { ...this.variables },
      history: [...this.history]
    }
  }

  /**
   * Reset simulator
   */
  reset() {
    this.currentBlockId = this.flow.startBlockId
    this.variables = {}
    this.history = []
  }
}
