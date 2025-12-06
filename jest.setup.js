/**
 * Jest Setup File
 * Executado antes de todos os testes
 */

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.META_ACCESS_TOKEN = 'test-meta-token'
process.env.META_PHONE_NUMBER_ID = '123456789'

// Mock Next.js headers/cookies functions
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(() => []),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    entries: jest.fn(() => []),
  })),
}))

// Mock console methods to reduce noise (opcional)
global.console = {
  ...console,
  // Desabilitar logs durante testes (opcional)
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(), // Manter errors visíveis
}
