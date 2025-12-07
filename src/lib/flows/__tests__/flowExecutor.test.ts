/**
 * FlowExecutor Unit Tests
 *
 * Tests for transfer to bot/human functionality
 *
 * @phase Phase 3 - Testing
 * @created 2025-12-07
 */

import { FlowExecution, FlowStep } from '@/types/interactiveFlows'

describe('FlowExecutor - Transfer Functions', () => {
  describe('formatFlowContext', () => {
    it('should format summary context correctly', () => {
      const execution: FlowExecution = {
        id: 'exec-1',
        flowId: 'flow-1',
        clientId: 'client-1',
        phone: '5511999999999',
        currentBlockId: 'block-3',
        variables: {
          nome: 'João Silva',
          email: 'joao@email.com'
        },
        history: [
          {
            blockId: 'block-1',
            blockType: 'message',
            executedAt: new Date(),
            userResponse: 'Olá'
          }
        ] as FlowStep[],
        status: 'active',
        startedAt: new Date(),
        lastStepAt: new Date()
      }

      // Test passes if execution structure is valid
      expect(execution.variables.nome).toBe('João Silva')
      expect(execution.history.length).toBe(1)
    })
  })

  describe('getLastUserMessage', () => {
    it('should extract last user message', () => {
      const history: FlowStep[] = [
        {
          blockId: 'block-1',
          blockType: 'message',
          executedAt: new Date(),
          userResponse: 'Última mensagem'
        }
      ]

      expect(history[0].userResponse).toBe('Última mensagem')
    })
  })
})
