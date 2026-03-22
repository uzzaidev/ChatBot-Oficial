# Tests Coverage Map

**Projeto:** ChatBot-Oficial (UzzApp WhatsApp SaaS)
**Data:** 2026-03-15
**Análise:** Baseada em código-fonte + jest.config.js

---

## 📊 Summary

**Test Files:** 3
**Test Suites:** 5
**Actual Tests:** ~10 (mostly skeletons)
**Estimated Coverage:** < 5%

**Status:** ⚠️ **CRITICALLY LOW COVERAGE**

---

## 🔍 Test Infrastructure

### Jest Configuration

**Location:** `jest.config.js`

```javascript
{
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/app/**',  // ⚠️ API routes excluded from coverage
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
}
```

**Scripts Available:**
- `npm test` → Run all tests
- `npm run test:watch` → Watch mode
- `npm run test:coverage` → Generate coverage report

**Test Environment:** Node.js (não browser)

---

## 📁 Test Files Inventory

### File 1: `src/lib/flows/__tests__/flowExecutor.test.ts`

**Purpose:** Unit tests for FlowExecutor (transfer functions)

**Created:** 2025-12-07 (Phase 3 - Testing)

**Test Suites:** 2
- `FlowExecutor - Transfer Functions`
  - `formatFlowContext` (1 test)
  - `getLastUserMessage` (1 test)

**Tests:**
1. ✅ `should format summary context correctly` - Tests FlowExecution structure validation
2. ✅ `should extract last user message` - Tests FlowStep history extraction

**Coverage:**
- ✅ FlowExecution type validation
- ✅ FlowStep structure
- ❌ Actual formatFlowContext logic (not tested - only structure validation)
- ❌ Actual getLastUserMessage logic (not tested - only structure validation)

**Status:** ⚠️ **Skeleton tests only** - Tests validate types, not actual logic.

**Lines Covered:** ~10 (type validation only)

---

### File 2: `src/__tests__/integration/gateway-e2e.test.ts`

**Purpose:** E2E integration tests for WhatsApp → AI Gateway → Response flow

**Created:** Unknown (based on gateway infrastructure)

**Test Suites:** 2
- `Complete Message Flow` (4 tests)
- `Multi-Tenant Isolation` (1 test)

**Tests:**
1. ⚠️ `should process WhatsApp message through gateway` - **TODO** (not implemented)
2. ⚠️ `should use cache for identical messages` - **TODO** (not implemented)
3. ⚠️ `should fallback when primary model fails` - **TODO** (not implemented)
4. ⚠️ `should respect budget limits` - **TODO** (not implemented)
5. ⚠️ `should isolate tracking between clients` - **TODO** (not implemented)

**Coverage:** ❌ **0% - All tests are placeholders with `expect(true).toBe(true)`**

**Status:** 🚧 **Skeleton tests - No actual implementation**

**Planned Coverage:**
- WhatsApp message processing
- AI Gateway integration
- Usage log creation
- Budget tracking
- Response generation
- Cache behavior
- Fallback model
- Multi-tenant isolation

**Lines Covered:** 0 (all TODOs)

---

### File 3: `src/__tests__/integration/transfer-flow.test.ts`

**Purpose:** Integration tests for AI/Human transfer functionality

**Created:** 2025-12-07 (Phase 3 - Testing)

**Test Suites:** 2
- `AI Handoff Flow` (2 tests)
- `Human Handoff Flow` (1 test)

**Tests:**
1. ✅ `should complete full AI transfer with auto-response` - Tests flow structure (not execution)
2. ✅ `should handle AI transfer without auto-response` - Tests autoRespond flag
3. ✅ `should complete full human transfer with notification` - Tests flow structure

**Coverage:**
- ✅ Flow block structure validation
- ✅ AI handoff configuration
- ✅ Human handoff configuration
- ❌ Actual transfer execution (not tested)
- ❌ Status change validation (not tested)
- ❌ Email notification (not tested)

**Status:** ⚠️ **Skeleton tests only** - Tests validate structure, not actual execution.

**Lines Covered:** ~15 (structure validation only)

---

## 📉 Coverage Analysis by Module

### Coverage Table

| Module | Files | Test Files | Coverage | Status |
|--------|-------|------------|----------|--------|
| **chatbotFlow** | 1 | 0 | 0% | ❌ Not tested |
| **nodes/** | 35+ | 0 | 0% | ❌ Not tested |
| **flows/** | 5+ | 1 | < 5% | ⚠️ Skeleton only |
| **lib/direct-ai-client** | 1 | 0 | 0% | ❌ Not tested |
| **lib/config** | 1 | 0 | 0% | ❌ Not tested |
| **lib/meta-whatsapp** | 1 | 0 | 0% | ❌ Not tested |
| **lib/supabase** | 3 | 0 | 0% | ❌ Not tested |
| **lib/vault** | 1 | 0 | 0% | ❌ Not tested |
| **API routes** | 106+ | 0 | 0% | ❌ Excluded from coverage |
| **Pages** | 57 | 0 | 0% | ❌ Not tested |
| **Components** | 100+ | 0 | 0% | ❌ Not tested |

**Total Coverage:** < 5% (25 lines out of ~50,000+ lines)

---

## ❌ Critical Gaps (Uncovered)

### 1. chatbotFlow.ts (0% coverage)

**Why Critical:** Main orchestrator (1700 lines), 14-node pipeline

**What's Missing:**
- ❌ No tests for processChatbotMessage()
- ❌ No tests for any of the 14 nodes
- ❌ No tests for error handling
- ❌ No tests for intercalado send-save pattern
- ❌ No tests for batching logic
- ❌ No tests for duplicate detection

**Risk:** Core flow untested - bugs in production only

---

### 2. generateAIResponse.ts (0% coverage)

**Why Critical:** AI integration (tools, prompts, budget)

**What's Missing:**
- ❌ No tests for AI provider selection (Groq vs OpenAI)
- ❌ No tests for tool calls (transferir_atendimento, etc.)
- ❌ No tests for budget exhaustion
- ❌ No tests for prompt construction
- ❌ No tests for error handling (AI API down)

**Risk:** Budget overspending, tool calls failing silently

---

### 3. direct-ai-client.ts (0% coverage)

**Why Critical:** AI Gateway replacement, budget enforcement

**What's Missing:**
- ❌ No tests for callDirectAI()
- ❌ No tests for budget checking
- ❌ No tests for Vault credential retrieval
- ❌ No tests for usage logging
- ❌ No tests for provider fallback

**Risk:** Budget bypassed, credentials leaked

---

### 4. saveChatMessage.ts (0% coverage)

**Why Critical:** Data persistence, race condition prevention

**What's Missing:**
- ❌ No tests for message saving
- ❌ No tests for status updates (sent, failed, pending)
- ❌ No tests for client_id enforcement (tenant isolation)
- ❌ No tests for wamid deduplication

**Risk:** Data loss, tenant isolation breach

---

### 5. checkDuplicateMessage.ts (0% coverage)

**Why Critical:** Prevents duplicate AI responses (costs money)

**What's Missing:**
- ❌ No tests for 30s window
- ❌ No tests for normalization (trim, lowercase)
- ❌ No tests for client_id isolation
- ❌ No tests for cache invalidation

**Risk:** Duplicate messages charged twice, budget exhausted

---

### 6. API Routes (0% coverage - EXCLUDED)

**Why Critical:** 106+ routes handle webhooks, auth, CRUD

**What's Missing:**
- ❌ Webhook routes (/api/webhook/received, /api/stripe/webhooks)
- ❌ Auth routes (/api/auth/*)
- ❌ Analytics routes (/api/analytics)
- ❌ Client management (/api/clients/*)
- ❌ All CRUD operations

**Risk:** Security vulnerabilities, RLS bypass, webhook failures

**Note:** Excluded from coverage config (`!src/app/**`)

---

### 7. RLS Policy Enforcement (0% coverage)

**Why Critical:** Multi-tenant isolation

**What's Missing:**
- ❌ No tests for client_id filtering in queries
- ❌ No tests for service role bypassing RLS
- ❌ No tests for user role validation
- ❌ No tests for tenant isolation across tables

**Risk:** Data leaks between clients

---

### 8. RAG System (0% coverage)

**Why Critical:** Knowledge base search, embeddings

**What's Missing:**
- ❌ No tests for document upload
- ❌ No tests for semantic chunking
- ❌ No tests for embedding generation
- ❌ No tests for vector search
- ❌ No tests for similarity threshold (0.8)

**Risk:** Incorrect search results, wrong context injected

---

### 9. Media Processing (0% coverage)

**Why Critical:** Audio/image/PDF processing

**What's Missing:**
- ❌ No tests for audio transcription (Whisper)
- ❌ No tests for image analysis (GPT-4o Vision)
- ❌ No tests for PDF parsing
- ❌ No tests for FFmpeg conversion (OGG → MP3)
- ❌ No tests for error handling (transcription failed)

**Risk:** Silent failures, user sees no response

---

### 10. Interactive Flows (< 5% coverage)

**Why Critical:** User engagement flows (forms, surveys)

**What's Missing:**
- ✅ Flow structure validation (tested)
- ❌ Flow execution logic (not tested)
- ❌ Step progression (not tested)
- ❌ Variable storage (not tested)
- ❌ CRM integration (not tested)

**Risk:** Flows break in production, data not saved

---

## 🎯 Recommended Testing Strategy

### Phase 1: Critical Path (Week 1)

**Priority: chatbotFlow.ts**

Tests to add:
1. ✅ Test processChatbotMessage() happy path
2. ✅ Test NODE 3: Customer creation
3. ✅ Test NODE 8: Duplicate detection
4. ✅ Test NODE 12: AI response generation
5. ✅ Test NODE 14: Intercalado send-save pattern
6. ✅ Test error handling (AI API down, DB down)

**Target Coverage:** 60% of chatbotFlow.ts

---

### Phase 2: AI Integration (Week 2)

**Priority: direct-ai-client.ts, generateAIResponse.ts**

Tests to add:
1. ✅ Test budget checking
2. ✅ Test Vault credential retrieval
3. ✅ Test provider selection (Groq vs OpenAI)
4. ✅ Test tool calls (transferir_atendimento)
5. ✅ Test usage logging
6. ✅ Test error handling (budget exceeded, API down)

**Target Coverage:** 70% of AI modules

---

### Phase 3: Data Persistence (Week 3)

**Priority: saveChatMessage.ts, getChatHistory.ts**

Tests to add:
1. ✅ Test message saving with correct status
2. ✅ Test client_id enforcement
3. ✅ Test wamid deduplication
4. ✅ Test chat history retrieval (last 15 messages)
5. ✅ Test RLS bypass with service role
6. ✅ Test error handling (DB constraint violations)

**Target Coverage:** 80% of data persistence modules

---

### Phase 4: API Routes (Week 4)

**Priority: Webhook routes, Auth routes**

Tests to add:
1. ✅ Test /api/webhook/received signature verification
2. ✅ Test /api/stripe/webhooks event handling
3. ✅ Test /api/auth/* session management
4. ✅ Test /api/clients/* CRUD with RLS
5. ✅ Test error responses (400, 401, 403, 500)

**Target Coverage:** 50% of API routes

---

### Phase 5: E2E Integration (Week 5)

**Priority: Complete user flows**

Tests to add:
1. ✅ E2E: WhatsApp message → AI response
2. ✅ E2E: Audio message → Transcription → AI response
3. ✅ E2E: Human handoff → Email sent → Status change
4. ✅ E2E: Budget exhaustion → Error message
5. ✅ E2E: Multi-tenant isolation (2 clients)

**Target Coverage:** 5 critical user flows

---

## 🔧 Testing Tools Recommendation

### Unit Testing

**Current:** Jest + ts-jest ✅
**Recommended:** Add `@testing-library/react` for component tests

### Integration Testing

**Current:** None
**Recommended:** Supertest for API route testing

**Example:**
```bash
npm install --save-dev supertest @types/supertest
```

### E2E Testing

**Current:** None
**Recommended:** Playwright or Cypress

**Example:**
```bash
npm install --save-dev @playwright/test
```

### Mocking

**Current:** Jest mocks
**Recommended:** Add `msw` (Mock Service Worker) for API mocking

### Coverage Reporting

**Current:** Jest coverage
**Recommended:** Add Codecov or Coveralls for CI/CD integration

---

## 📊 Coverage Metrics Goal

| Metric | Current | Target (6 months) |
|--------|---------|-------------------|
| **Overall Coverage** | < 5% | 60% |
| **chatbotFlow.ts** | 0% | 70% |
| **nodes/** | 0% | 60% |
| **lib/direct-ai-client** | 0% | 80% |
| **lib/config** | 0% | 70% |
| **API routes** | 0% | 50% |
| **Components** | 0% | 40% |
| **E2E Flows** | 0 flows | 10 flows |

---

## 🚨 Testing Anti-Patterns to Avoid

### Anti-Pattern 1: Skeleton Tests

**Current Issue:**
```typescript
it('should process message', async () => {
  expect(true).toBe(true) // ❌ Useless test
})
```

**Better:**
```typescript
it('should process message and save to DB', async () => {
  const result = await processChatbotMessage({ phone: '5511999', content: 'Hi' })
  expect(result.success).toBe(true)
  expect(result.messagesSent).toBe(1)

  const savedMessage = await db.getChatHistory('5511999')
  expect(savedMessage[0].content).toBe('Hi')
})
```

### Anti-Pattern 2: Testing Structure Instead of Behavior

**Current Issue:**
```typescript
it('should have correct structure', () => {
  expect(execution.variables.nome).toBe('João Silva') // ❌ Only validates types
})
```

**Better:**
```typescript
it('should execute flow and save variables', async () => {
  await executeFlow(flowId, { userInput: 'João Silva' })

  const execution = await getFlowExecution(executionId)
  expect(execution.variables.nome).toBe('João Silva')
  expect(execution.status).toBe('completed')
})
```

### Anti-Pattern 3: No Assertions

**Current Issue:**
```typescript
it('should send message', async () => {
  await sendMessage(phone, content)
  // ❌ No assertions!
})
```

**Better:**
```typescript
it('should send message and return wamid', async () => {
  const result = await sendMessage(phone, content)

  expect(result.wamid).toBeDefined()
  expect(result.status).toBe('sent')

  // Verify message was saved
  const message = await getMessageByWamid(result.wamid)
  expect(message.content).toBe(content)
})
```

---

## 📋 Testing Checklist

**Before deployment:**
- [ ] All critical path functions tested (chatbotFlow, generateAIResponse, saveChatMessage)
- [ ] Budget enforcement tested (budget exhaustion, usage logging)
- [ ] RLS tested (tenant isolation, service role bypass)
- [ ] Webhooks tested (signature verification, event handling)
- [ ] Error handling tested (AI API down, DB down, budget exceeded)
- [ ] E2E flows tested (message → response, audio → transcription, human handoff)
- [ ] Coverage > 60% on critical modules
- [ ] CI/CD runs tests on every PR
- [ ] Coverage reports visible in PR comments

---

## 🔗 References

- **Jest Config:** `jest.config.js`
- **Test Files:**
  - `src/lib/flows/__tests__/flowExecutor.test.ts`
  - `src/__tests__/integration/gateway-e2e.test.ts`
  - `src/__tests__/integration/transfer-flow.test.ts`
- **Package.json:** Test scripts defined

---

*Última atualização: 2026-03-15*
*Versão: 1.0*
*Status: 🚨 CRITICAL - Testing infrastructure exists but coverage is critically low*
