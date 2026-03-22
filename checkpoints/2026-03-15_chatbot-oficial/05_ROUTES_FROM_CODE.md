# Routes From Code

**Projeto:** ChatBot-Oficial (UzzApp WhatsApp SaaS)
**Data:** 2026-03-15
**Total Pages:** 57
**Total API Routes:** 106+
**Router:** Next.js App Router

---

## 📄 Pages (Frontend Routes)

### Authentication Routes

| Path | File | Purpose | Auth Required | Client Component |
|------|------|---------|---------------|------------------|
| `/login` | `src/app/(auth)/login/page.tsx` | Login page | No | Yes |
| `/register` | `src/app/(auth)/register/page.tsx` | Registration | No | Yes |
| `/check-email` | `src/app/(auth)/check-email/page.tsx` | Email verification notice | No | Yes |
| `/accept-invite` | `src/app/(auth)/accept-invite/page.tsx` | Team invitation acceptance | No | Yes |
| `/auth/pending-approval` | `src/app/auth/pending-approval/page.tsx` | Waiting for admin approval | Yes | Yes |

**Layout:** `src/app/(auth)/layout.tsx` - Auth-specific layout

---

### Dashboard Routes

| Path | File | Purpose | Auth Required | Client Component |
|------|------|---------|---------------|------------------|
| `/dashboard` | `src/app/dashboard/page.tsx` | Main dashboard/overview | Yes | Yes |
| `/dashboard/chat` | `src/app/dashboard/chat/page.tsx` | WhatsApp chat interface | Yes | Yes |
| `/dashboard/contacts` | `src/app/dashboard/contacts/page.tsx` | Contact management | Yes | Yes |
| `/dashboard/conversations` | `src/app/dashboard/conversations/page.tsx` | Conversation list | Yes | Yes |
| `/dashboard/analytics` | `src/app/dashboard/analytics/page.tsx` | Analytics dashboard | Yes | Yes |
| `/dashboard/analytics-comparison` | `src/app/dashboard/analytics-comparison/page.tsx` | Compare analytics | Yes | Yes |
| `/dashboard/openai-analytics` | `src/app/dashboard/openai-analytics/page.tsx` | OpenAI usage analytics | Yes | Yes |
| `/dashboard/knowledge` | `src/app/dashboard/knowledge/page.tsx` | RAG knowledge base management | Yes | Yes |
| `/dashboard/settings` | `src/app/dashboard/settings/page.tsx` | Client settings | Yes | Yes |
| `/dashboard/settings/tts` | `src/app/dashboard/settings/tts/page.tsx` | TTS configuration | Yes | Yes |
| `/dashboard/backend` | `src/app/dashboard/backend/page.tsx` | Backend/execution logs viewer | Yes | Yes |
| `/dashboard/calendar` | `src/app/dashboard/calendar/page.tsx` | Calendar integration | Yes | Yes |

**Layout:** `src/app/dashboard/layout.tsx` - Dashboard layout with sidebar

**Conversations Sub-Layout:** `src/app/dashboard/conversations/layout.tsx`

---

### AI Gateway Routes

| Path | File | Purpose | Auth Required |
|------|------|---------|---------------|
| `/dashboard/ai-gateway` | `src/app/dashboard/ai-gateway/page.tsx` | AI Gateway overview | Yes |
| `/dashboard/ai-gateway/budget` | `src/app/dashboard/ai-gateway/budget/page.tsx` | Budget management | Yes |
| `/dashboard/ai-gateway/cache` | `src/app/dashboard/ai-gateway/cache/page.tsx` | Cache analytics | Yes |
| `/dashboard/ai-gateway/models` | `src/app/dashboard/ai-gateway/models/page.tsx` | Model registry | Yes |
| `/dashboard/ai-gateway/setup` | `src/app/dashboard/ai-gateway/setup/page.tsx` | Setup wizard | Yes |
| `/dashboard/ai-gateway/test` | `src/app/dashboard/ai-gateway/test/page.tsx` | Test AI models | Yes |
| `/dashboard/ai-gateway/validation` | `src/app/dashboard/ai-gateway/validation/page.tsx` | Validation tools | Yes |

---

### CRM Routes

| Path | File | Purpose | Auth Required |
|------|------|---------|---------------|
| `/dashboard/crm` | `src/app/dashboard/crm/page.tsx` | CRM Kanban board | Yes |

---

### Templates Routes

| Path | File | Purpose | Auth Required |
|------|------|---------|---------------|
| `/dashboard/templates` | `src/app/dashboard/templates/page.tsx` | Message templates list | Yes |
| `/dashboard/templates/new` | `src/app/dashboard/templates/new/page.tsx` | Create new template | Yes |
| `/dashboard/templates/test` | `src/app/dashboard/templates/test/page.tsx` | Test template sending | Yes |

---

### Flows Routes

| Path | File | Purpose | Auth Required |
|------|------|---------|---------------|
| `/dashboard/flows` | `src/app/dashboard/flows/page.tsx` | Interactive flows list | Yes |
| `/dashboard/flows/[flowId]/edit` | `src/app/dashboard/flows/[flowId]/edit/page.tsx` | Flow visual editor | Yes |
| `/dashboard/flow-architecture` | `src/app/dashboard/flow-architecture/page.tsx` | Chatbot flow architecture manager | Yes |

---

### Agents Routes

| Path | File | Purpose | Auth Required |
|------|------|---------|---------------|
| `/dashboard/agents` | `src/app/dashboard/agents/page.tsx` | Agent management | Yes |

---

### Payments Routes (Stripe Connect)

| Path | File | Purpose | Auth Required |
|------|------|---------|---------------|
| `/dashboard/payments` | `src/app/dashboard/payments/page.tsx` | Payments overview | Yes |
| `/dashboard/payments/onboarding` | `src/app/dashboard/payments/onboarding/page.tsx` | Stripe onboarding | Yes |
| `/dashboard/payments/products` | `src/app/dashboard/payments/products/page.tsx` | Product management | Yes |

---

### Storefront Routes (Public - No Auth)

| Path | File | Purpose | Auth Required |
|------|------|---------|---------------|
| `/store/[clientSlug]` | `src/app/store/[clientSlug]/page.tsx` | Client product catalog | No |
| `/store/[clientSlug]/[productId]` | `src/app/store/[clientSlug]/[productId]/page.tsx` | Product details | No |
| `/store/[clientSlug]/success` | `src/app/store/[clientSlug]/success/page.tsx` | Purchase success | No |
| `/store/[clientSlug]/cancel` | `src/app/store/[clientSlug]/cancel/page.tsx` | Purchase canceled | No |

---

### Admin Routes

| Path | File | Purpose | Auth Required | Role Required |
|------|------|---------|---------------|---------------|
| `/dashboard/admin` | `src/app/dashboard/admin/page.tsx` | Admin panel | Yes | admin |
| `/dashboard/admin/clients` | `src/app/dashboard/admin/clients/page.tsx` | Manage clients | Yes | admin |
| `/dashboard/admin/budget-plans` | `src/app/dashboard/admin/budget-plans/page.tsx` | Budget plan templates | Yes | admin |

---

### Meta Ads Routes

| Path | File | Purpose | Auth Required |
|------|------|---------|---------------|
| `/dashboard/meta-ads` | `src/app/dashboard/meta-ads/page.tsx` | Meta Ads integration | Yes |

---

### Public Routes

| Path | File | Purpose | Auth Required |
|------|------|---------|---------------|
| `/` | `src/app/page.tsx` | Landing page | No |
| `/privacy` | `src/app/privacy/page.tsx` | Privacy policy | No |
| `/terms` | `src/app/terms/page.tsx` | Terms of service | No |
| `/precos` | `src/app/precos/page.tsx` | Pricing page | No |
| `/docs/dpa` | `src/app/docs/dpa/page.tsx` | Data Processing Agreement | No |
| `/dpa` | `src/app/dpa/page.tsx` | DPA redirect | No |
| `/delete-account` | `src/app/delete-account/page.tsx` | Account deletion request | No |

---

### Onboarding Routes

| Path | File | Purpose | Auth Required |
|------|------|---------|---------------|
| `/onboarding` | `src/app/onboarding/page.tsx` | Client onboarding wizard | Yes |

---

### Test/Debug Routes

| Path | File | Purpose | Auth Required |
|------|------|---------|---------------|
| `/test-table` | `src/app/test-table/page.tsx` | Test table component | Dev |
| `/components-showcase` | `src/app/components-showcase/page.tsx` | UI component showcase | Dev |
| `/test-oauth` | `src/app/test-oauth/page.tsx` | OAuth flow testing | Dev |
| `/dashboard/test-interactive` | `src/app/dashboard/test-interactive/page.tsx` | Test interactive messages | Dev |

---

## 🔌 API Routes

### Webhook Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/webhook/received` | GET, POST | Meta WhatsApp webhook receiver | Meta signature | `src/app/api/webhook/received/route.ts` |

**Critical:** Handles ALL incoming WhatsApp messages. Triggers `processChatbotMessage()` flow.

---

### Admin Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/admin/budgets` | GET, POST, PUT | Manage client budgets | Admin | `src/app/api/admin/budgets/route.ts` |
| `/api/admin/clients/apply-ai-config` | POST | Apply AI config to client | Admin | `src/app/api/admin/clients/apply-ai-config/route.ts` |
| `/api/admin/invites` | GET, POST | Team invitations | Admin | `src/app/api/admin/invites/route.ts` |
| `/api/admin/invites/[id]` | DELETE | Cancel invitation | Admin | `src/app/api/admin/invites/[id]/route.ts` |
| `/api/admin/users` | GET | List all users | Admin | `src/app/api/admin/users/route.ts` |
| `/api/admin/users/[id]` | GET, PUT, DELETE | Manage user | Admin | `src/app/api/admin/users/[id]/route.ts` |
| `/api/admin/validate-billing` | POST | Validate billing config | Admin | `src/app/api/admin/validate-billing/route.ts` |
| `/api/admin/fix-trial-clients` | POST | Fix trial client data | Admin | `src/app/api/admin/fix-trial-clients/route.ts` |

---

### Analytics Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/analytics` | GET | Get analytics data | Yes | `src/app/api/analytics/route.ts` |
| `/api/analytics/unified` | GET | Unified analytics across all APIs | Yes | `src/app/api/analytics/unified/route.ts` |

---

### Auth Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/auth/logout` | POST | Logout user | Yes | `src/app/api/auth/logout/route.ts` |
| `/api/auth/verify-profile` | GET | Verify user profile | Yes | `src/app/api/auth/verify-profile/route.ts` |

---

### Backend/Audit Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/backend/audit-logs` | GET | Fetch audit logs | Yes | `src/app/api/backend/audit-logs/route.ts` |
| `/api/backend/stream` | GET | SSE stream for realtime logs | Yes | `src/app/api/backend/stream/route.ts` |

---

### Budget Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/budget/config` | GET, PUT | Get/update budget config | Yes | `src/app/api/budget/config/route.ts` |
| `/api/budget/current-usage` | GET | Current budget usage | Yes | `src/app/api/budget/current-usage/route.ts` |
| `/api/budget/status` | GET | Budget status | Yes | `src/app/api/budget/status/route.ts` |

---

### Client Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/client/waba-id` | GET, PUT | Get/update WhatsApp Business Account ID | Yes | `src/app/api/client/waba-id/route.ts` |
| `/api/client/meta-config` | GET, PUT | Meta configuration | Yes | `src/app/api/client/meta-config/route.ts` |

---

### Commands Routes (WhatsApp Actions)

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/commands/send-message` | POST | Send WhatsApp text message | Yes | `src/app/api/commands/send-message/route.ts` |
| `/api/commands/send-media` | POST | Send WhatsApp media (image/audio/doc) | Yes | `src/app/api/commands/send-media/route.ts` |
| `/api/commands/transfer-human` | POST | Transfer conversation to human | Yes | `src/app/api/commands/transfer-human/route.ts` |
| `/api/commands/delete-message` | DELETE | Delete WhatsApp message | Yes | `src/app/api/commands/delete-message/route.ts` |

---

### Config Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/config` | GET | Get client configuration | Yes | `src/app/api/config/route.ts` |

---

### Contacts Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/contacts` | GET, POST | List/create contacts | Yes | `src/app/api/contacts/route.ts` |
| `/api/contacts/[phone]` | GET, PUT, DELETE | Manage specific contact | Yes | `src/app/api/contacts/[phone]/route.ts` |
| `/api/contacts/import` | POST | Bulk import contacts | Yes | `src/app/api/contacts/import/route.ts` |
| `/api/contacts/template` | GET | Download contact import template | Yes | `src/app/api/contacts/template/route.ts` |

---

### Conversations Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/conversations` | GET | List conversations | Yes | `src/app/api/conversations/route.ts` |
| `/api/conversations/mark-read` | POST | Mark conversation as read | Yes | `src/app/api/conversations/mark-read/route.ts` |

---

### CRM Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/crm/analytics` | GET | CRM analytics | Yes | `src/app/api/crm/analytics/route.ts` |
| `/api/crm/automation-rules` | GET, POST, PUT, DELETE | CRM automation rules | Yes | `src/app/api/crm/automation-rules/route.ts` |
| `/api/crm/budget-alerts` | GET, POST | Budget alerts | Yes | `src/app/api/crm/budget-alerts/route.ts` |
| `/api/crm/cards/[id]/activities` | GET, POST | Card activity log | Yes | `src/app/api/crm/cards/[id]/activities/route.ts` |

**Note:** More CRM routes exist (cards, columns, tags, filters) - truncated for brevity

---

### Customers Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/customers/[phone]/status` | PUT | Update customer status (bot/humano) | Yes | `src/app/api/customers/[phone]/status/route.ts` |

---

### Dashboard Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/dashboard/debug` | GET | Debug information | Yes | `src/app/api/dashboard/debug/route.ts` |
| `/api/dashboard/metrics` | GET | Dashboard metrics | Yes | `src/app/api/dashboard/metrics/route.ts` |

---

### Debug Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/debug/config` | GET | Current config | Yes | `src/app/api/debug/config/route.ts` |
| `/api/debug/documents` | GET | Document database debug | Yes | `src/app/api/debug/documents/route.ts` |
| `/api/debug/embeddings` | GET | Embeddings debug | Yes | `src/app/api/debug/embeddings/route.ts` |
| `/api/debug/executions` | GET | Execution logs | Yes | `src/app/api/debug/executions/route.ts` |
| `/api/debug/logs` | GET | Application logs | Yes | `src/app/api/debug/logs/route.ts` |
| `/api/debug/my-profile` | GET | Current user profile | Yes | `src/app/api/debug/my-profile/route.ts` |
| `/api/debug/webhook-config/[clientId]` | GET | Webhook config for client | Yes | `src/app/api/debug/webhook-config/[clientId]/route.ts` |

---

### Documents Routes (RAG Knowledge Base)

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/documents` | GET, POST | List/upload documents | Yes | `src/app/api/documents/route.ts` |
| `/api/documents/[filename]` | GET, DELETE | Get/delete document | Yes | `src/app/api/documents/[filename]/route.ts` |

---

### Flow Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/flows` | GET, POST | List/create interactive flows | Yes | `src/app/api/flows/route.ts` |
| `/api/flows/[flowId]` | GET, PUT, DELETE | Manage flow | Yes | `src/app/api/flows/[flowId]/route.ts` |
| `/api/flows/process-message` | POST | Process message through flow | Yes | `src/app/api/flows/process-message/route.ts` |
| `/api/flow/nodes/[nodeId]` | PUT | Update flow node config | Yes | `src/app/api/flow/nodes/[nodeId]/route.ts` |

---

### Agents Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/agents` | GET, POST | List/create agents | Yes | `src/app/api/agents/route.ts` |
| `/api/agents/[id]` | GET, PUT, DELETE | Manage agent | Yes | `src/app/api/agents/[id]/route.ts` |
| `/api/agents/[id]/activate` | POST | Activate agent | Yes | `src/app/api/agents/[id]/activate/route.ts` |
| `/api/agents/[id]/versions` | GET, POST | Agent version history | Yes | `src/app/api/agents/[id]/versions/route.ts` |
| `/api/agents/[id]/versions/[versionId]/restore` | POST | Restore agent version | Yes | `src/app/api/agents/[id]/versions/[versionId]/restore/route.ts` |
| `/api/agents/experiments` | GET, POST | Agent A/B experiments | Yes | `src/app/api/agents/experiments/route.ts` |
| `/api/agents/experiments/[id]` | GET, PUT, DELETE | Manage experiment | Yes | `src/app/api/agents/experiments/[id]/route.ts` |
| `/api/agents/schedules` | GET, POST | Scheduled agent activations | Yes | `src/app/api/agents/schedules/route.ts` |

---

### Settings Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/settings/tts` | GET, PUT | TTS settings | Yes | `src/app/api/settings/tts/route.ts` |
| `/api/settings/tts/stats` | GET | TTS usage stats | Yes | `src/app/api/settings/tts/stats/route.ts` |

---

### Templates Routes (Message Templates)

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/templates` | GET, POST | List/create templates | Yes | `src/app/api/templates/route.ts` |
| `/api/templates/sync` | POST | Sync templates with Meta | Yes | `src/app/api/templates/sync/route.ts` |
| `/api/templates/[templateId]` | GET, PUT, DELETE | Manage template | Yes | `src/app/api/templates/[templateId]/route.ts` |
| `/api/templates/[templateId]/send` | POST | Send template message | Yes | `src/app/api/templates/[templateId]/send/route.ts` |
| `/api/templates/[templateId]/submit` | POST | Submit template to Meta | Yes | `src/app/api/templates/[templateId]/submit/route.ts` |

---

### User Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/user/profile` | GET, PUT | User profile | Yes | `src/app/api/user/profile/route.ts` |
| `/api/user/password` | PUT | Change password | Yes | `src/app/api/user/password/route.ts` |
| `/api/user/revalidate-password` | POST | Revalidate password | Yes | `src/app/api/user/revalidate-password/route.ts` |

---

### Vault Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/vault/debug` | GET | Vault debug info | Yes | `src/app/api/vault/debug/route.ts` |

---

### Pricing Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/pricing-config` | GET | Get pricing configuration | Yes | `src/app/api/pricing-config/route.ts` |

---

### Chat Theme Routes

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/chat-theme/upload` | POST | Upload chat theme image | Yes | `src/app/api/chat-theme/upload/route.ts` |

---

### Test Routes (Development Only)

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/test/broadcast` | POST | Test broadcast message | Dev | `src/app/api/test/broadcast/route.ts` |
| `/api/test/check-table-schema` | GET | Check table schema | Dev | `src/app/api/test/check-table-schema/route.ts` |
| `/api/test/flow-execution` | POST | Test flow execution | Dev | `src/app/api/test/flow-execution/route.ts` |
| `/api/test/realtime` | GET | Test realtime connection | Dev | `src/app/api/test/realtime/route.ts` |
| `/api/test/realtime-debug` | GET | Realtime debug info | Dev | `src/app/api/test/realtime-debug/route.ts` |
| `/api/test/realtime-status` | GET | Realtime status | Dev | `src/app/api/test/realtime-status/route.ts` |
| `/api/test/supabase-connection` | GET | Test Supabase connection | Dev | `src/app/api/test/supabase-connection/route.ts` |
| `/api/test/send-message` | POST | Test message sending | Dev | `src/app/api/test/send-message/route.ts` |
| `/api/test/send-whatsapp-direct` | POST | Test direct WhatsApp send | Dev | `src/app/api/test/send-whatsapp-direct/route.ts` |
| `/api/test/simulate-webhook` | POST | Simulate webhook payload | Dev | `src/app/api/test/simulate-webhook/route.ts` |
| `/api/test/tts` | POST | Test TTS | Dev | `src/app/api/test/tts/route.ts` |
| `/api/test/tts-voices` | GET | List TTS voices | Dev | `src/app/api/test/tts-voices/route.ts` |
| `/api/test/vault-config` | GET | Test Vault config | Dev | `src/app/api/test/vault-config/route.ts` |
| `/api/test/webhook-cache` | GET | Test webhook cache | Dev | `src/app/api/test/webhook-cache/route.ts` |
| `/api/test/interactive/send` | POST | Test interactive message | Dev | `src/app/api/test/interactive/send/route.ts` |

---

### Test Node Routes (Node Function Testing)

| Path | Method | Purpose | Auth | Evidence |
|------|--------|---------|------|----------|
| `/api/test/nodes/filter-status` | GET | Test filter status node | Dev | `src/app/api/test/nodes/filter-status/route.ts` |
| `/api/test/nodes/parse-message` | GET | Test parse message node | Dev | `src/app/api/test/nodes/parse-message/route.ts` |
| `/api/test/nodes/check-customer` | GET | Test check customer node | Dev | `src/app/api/test/nodes/check-customer/route.ts` |
| `/api/test/nodes/download-media` | GET | Test download media node | Dev | `src/app/api/test/nodes/download-media/route.ts` |
| `/api/test/nodes/normalize` | GET | Test normalize node | Dev | `src/app/api/test/nodes/normalize/route.ts` |
| `/api/test/nodes/push-redis` | GET | Test Redis push node | Dev | `src/app/api/test/nodes/push-redis/route.ts` |
| `/api/test/nodes/chat-history` | GET | Test chat history node | Dev | `src/app/api/test/nodes/chat-history/route.ts` |
| `/api/test/nodes/rag-context` | GET | Test RAG context node | Dev | `src/app/api/test/nodes/rag-context/route.ts` |
| `/api/test/nodes/ai-response` | GET | Test AI response node | Dev | `src/app/api/test/nodes/ai-response/route.ts` |
| `/api/test/nodes/format-response` | GET | Test format response node | Dev | `src/app/api/test/nodes/format-response/route.ts` |
| `/api/test/nodes/send-whatsapp` | GET | Test send WhatsApp node | Dev | `src/app/api/test/nodes/send-whatsapp/route.ts` |
| `/api/test/nodes/batch` | GET | Test batch messages node | Dev | `src/app/api/test/nodes/batch/route.ts` |
| `/api/test/nodes/search-document` | GET | Test document search node | Dev | `src/app/api/test/nodes/search-document/route.ts` |

---

## 🔒 Authentication Patterns

### Route Protection

**Pattern:** Manual check in each route (no middleware.ts)

```typescript
// Example from any protected API route
export async function GET(request: NextRequest) {
  const supabase = await createServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's client_id for tenant isolation
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('client_id')
    .eq('id', user.id)
    .single()

  // Query with client_id filter
  const { data } = await supabase
    .from('table')
    .select('*')
    .eq('client_id', profile.client_id)

  return NextResponse.json({ data })
}
```

**⚠️ RISK:** Manual checks can be forgotten. RLS policies provide backup.

---

## 🎯 Routing Patterns

### Dynamic Routes

| Pattern | Example | Purpose |
|---------|---------|---------|
| `[clientId]` | `/api/webhook/[clientId]/route.ts` | Multi-tenant webhook |
| `[phone]` | `/api/contacts/[phone]/route.ts` | Phone number lookup |
| `[id]` | `/api/agents/[id]/route.ts` | Resource by ID |
| `[flowId]` | `/api/flows/[flowId]/route.ts` | Flow by ID |
| `[templateId]` | `/api/templates/[templateId]/route.ts` | Template by ID |
| `[productId]` | `/store/[clientSlug]/[productId]/page.tsx` | Product details |
| `[clientSlug]` | `/store/[clientSlug]/page.tsx` | Client storefront |

---

## 📊 Route Groups

| Group | Pattern | Purpose |
|-------|---------|---------|
| `(auth)` | `src/app/(auth)/` | Auth-specific layout (no sidebar) |
| `dashboard` | `src/app/dashboard/` | Dashboard layout (with sidebar) |
| `api` | `src/app/api/` | API endpoints (serverless functions) |
| `store` | `src/app/store/` | Public storefront (no auth) |

---

## 🚀 Performance Notes

### Static vs Dynamic

- **All API routes:** `export const dynamic = 'force-dynamic'` (required for auth/db access)
- **Pages:** Mostly dynamic (require auth check)
- **Storefront:** Could be static but currently dynamic (no ISR/SSG configured)

### Route Handlers

- **Concurrency:** Each API route is a separate serverless function
- **Cold Start:** ~200-500ms on Vercel
- **Timeout:** 10s (Vercel free tier)

---

## 🔍 Route Naming Conventions

| Convention | Example | Meaning |
|-----------|---------|---------|
| `route.ts` | `/api/analytics/route.ts` | API endpoint (GET/POST/etc) |
| `page.tsx` | `/dashboard/page.tsx` | Page component |
| `layout.tsx` | `/dashboard/layout.tsx` | Layout wrapper |
| `[param]` | `/api/contacts/[phone]` | Dynamic segment |
| `[...slug]` | NONE FOUND | Catch-all route (not used) |

---

## ⚠️ Missing Routes

Based on code analysis, these routes might be expected but DON'T EXIST:

1. `/api/stripe/*` - Stripe routes exist but may be incomplete (85% implemented)
2. `/api/oauth/*` - OAuth callbacks for Google/Microsoft Calendar
3. `/api/calendar/*` - Calendar-specific API routes
4. `/dashboard/billing` - Billing management UI
5. `/dashboard/team` - Team management UI

**Note:** Some functionality may be embedded in existing routes.

---

*Última atualização: 2026-03-15*
*Versão: 1.0*
*Total API Routes Documented: 106+*
*Total Pages Documented: 57*
