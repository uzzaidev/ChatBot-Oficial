import { describe, expect, it, vi } from 'vitest'
import { handleHumanHandoff } from '@/nodes/handleHumanHandoff'
import { notifyHumanHandoff } from '@/lib/push-dispatch'

vi.mock('@/lib/postgres', () => ({ query: vi.fn().mockResolvedValue({ rowCount: 1 }) }))
vi.mock('@/lib/gmail', () => ({ sendEmail: vi.fn() }))
vi.mock('@/lib/push-dispatch', () => ({ notifyHumanHandoff: vi.fn().mockResolvedValue(undefined) }))

describe('handleHumanHandoff', () => {
  it('sends push even without Gmail config', async () => {
    delete process.env.GMAIL_APP_PASSWORD
    delete process.env.GMAIL_USER
    await handleHumanHandoff({ phone: '5511999999999', customerName: 'Ana', config: { id: 'c1' } as any })
    expect(notifyHumanHandoff).toHaveBeenCalledWith({ clientId: 'c1', phone: '5511999999999', customerName: 'Ana' })
  })
})
