# 11. Webhooks, Jobs e Integrações Externas

> **Data:** 2026-03-15
> **Projeto:** ChatBot-Oficial (WhatsApp SaaS Multi-tenant)
> **Autor:** Análise Completa de Integrações

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Meta WhatsApp Webhook](#1-meta-whatsapp-webhook)
3. [Meta Ads Webhook](#2-meta-ads-webhook)
4. [Stripe Webhooks](#3-stripe-webhooks)
5. [Firebase Push Notifications](#4-firebase-push-notifications)
6. [Google Calendar](#5-google-calendar)
7. [Microsoft Calendar](#6-microsoft-calendar)
8. [Gmail (Human Handoff)](#7-gmail-human-handoff)
9. [Scheduled Jobs](#8-scheduled-jobs)
10. [Rate Limiting](#9-rate-limiting)
11. [Environment Variables](#10-environment-variables)
12. [Security Patterns](#11-security-patterns)
13. [Monitoring & Debugging](#12-monitoring--debugging)

---

## Visão Geral

O projeto integra-se com **7 serviços externos** principais:

| Serviço | Tipo | Status | Criticidade | Fallback |
|---------|------|--------|-------------|----------|
| Meta WhatsApp | Webhook (incoming) | ✅ Produção | CRITICAL | ❌ |
| Meta Ads | Webhook (leads) | ✅ Produção | HIGH | Log + retry |
| Stripe V1 | Webhook (subscriptions) | ✅ Produção | HIGH | Idempotent |
| Stripe Connect | Webhook V2 (accounts) | ✅ Produção | HIGH | Idempotent |
| Stripe Platform | Webhook (billing) | ✅ Produção | HIGH | Idempotent |
| Firebase | Push (outgoing) | ✅ Produção | MEDIUM | Graceful skip |
| Google Calendar | OAuth + API | ✅ Produção | MEDIUM | Auto-refresh |
| Microsoft Calendar | OAuth + Graph API | ✅ Produção | MEDIUM | Auto-refresh |
| Gmail SMTP | Email (handoff) | ✅ Produção | LOW | Graceful skip |

**Características:**
- Todos webhooks validam assinatura HMAC (exceto Meta Ads - opcional)
- Deduplicação via `webhook_events` table (idempotency)
- Multi-tenant: cada cliente tem suas próprias credenciais (Vault)
- Graceful degradation: integrações não-críticas não quebram o flow

---

## 1. Meta WhatsApp Webhook

**Responsabilidade:** Receber mensagens, status updates e reações do WhatsApp

### 1.1 Endpoints

#### GET /api/webhook/[clientId]
**Função:** Verificação de webhook (Meta challenge)

```typescript
// Verificação multi-tenant por cliente
const config = await getClientConfig(clientId)
const expectedToken = config.apiKeys.metaVerifyToken

if (mode === 'subscribe' && token === expectedToken) {
  return new NextResponse(challenge, { status: 200 })
}
```

**Security Features:**
- ✅ Rate limit: 5 requests/hour por IP (VULN-002)
- ✅ Token comparison character-by-character para debug
- ✅ Logs detalhados de verificação

**Rate Limiting:**
```typescript
const identifier = `webhook-verify:${ip}`
// Implementado em src/lib/rate-limit.ts
// 5 requests per hour via Upstash Redis
```

#### POST /api/webhook/[clientId]
**Função:** Processar mensagens, status e reações

**Security Validation (VULN-012):**
```typescript
// 1. Validar assinatura HMAC ANTES de processar
const signature = request.headers.get('X-Hub-Signature-256')
const appSecret = config.apiKeys.metaAppSecret

const expectedSignature = 'sha256=' +
  crypto.createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')

// Timing-safe comparison
crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expectedSignature)
)
```

**Deduplication (VULN-006):**
```typescript
// Redis + PostgreSQL fallback
const dedupResult = await checkDuplicateMessage(clientId, messageId)

if (dedupResult.alreadyProcessed) {
  return new NextResponse('DUPLICATE_MESSAGE_IGNORED', { status: 200 })
}

// Mark in both systems
await markMessageAsProcessed(clientId, messageId, metadata)
```

**Message Processing Flow:**

```mermaid
graph TD
    A[Webhook POST] --> B{Signature Valid?}
    B -->|No| C[403 Forbidden]
    B -->|Yes| D{Message Type?}

    D -->|Status Update| E[processStatusUpdate]
    D -->|Reaction| F[updateMessageReaction]
    D -->|Message| G{Duplicate?}

    G -->|Yes| H[200 DUPLICATE]
    G -->|No| I[processChatbotMessage]

    I --> J{Success?}
    J -->|Yes| K[sendPushNotification]
    J -->|Error| L[Log Error]

    K --> M[200 EVENT_RECEIVED]
    L --> M
```

**Special Cases:**

1. **Status Updates:**
```typescript
if (statuses && statuses.length > 0) {
  for (const status of statuses) {
    await processStatusUpdate({
      statusUpdate: status,
      clientId
    })
  }
  return new NextResponse('STATUS_UPDATE_PROCESSED', { status: 200 })
}
```

2. **Reactions:**
```typescript
if (message.type === 'reaction' && message.reaction) {
  await updateMessageReaction({
    targetWamid: reaction.message_id,
    emoji: reaction.emoji || '',
    reactorPhone,
    clientId
  })
  return new NextResponse('REACTION_PROCESSED', { status: 200 })
}
```

3. **Referrals (Meta Ads):**
```typescript
if (message.referral) {
  console.log('🎯 [REFERRAL] Lead came from Meta Ad:', {
    source_type: message.referral.source_type,
    ctwa_clid: message.referral.ctwa_clid,
    ad_id: message.referral.ad_id,
    campaign_id: message.referral.campaign_id
  })
  // Auto-saved in message metadata
}
```

### 1.2 Configuration

**Per-Client Settings (Vault):**
```typescript
{
  metaVerifyToken: 'your-unique-token',     // GET verification
  metaAppSecret: 'your-app-secret',         // HMAC signature
  metaAccessToken: 'EAA...',                // Send messages
  metaPhoneNumberId: '899639703222013'      // WhatsApp Business ID
}
```

**Webhook URL Format:**
```
https://chat.luisfboff.com/api/webhook/{clientId}
```

### 1.3 Monitoring

**Cache System:**
```typescript
// In-memory cache of last 100 messages
addWebhookMessage({
  id: messageId,
  timestamp: new Date().toISOString(),
  from: message.from,
  type: message.type,
  content: extractedContent
})

// View: GET /api/webhook/received
```

---

## 2. Meta Ads Webhook

**Responsabilidade:** Capturar leads de Lead Ads e criar cards no CRM

### 2.1 Endpoint

**URL:** `/api/webhook/meta-ads`

**Subscription Types:**
- `ad_account` → leadgen, campaigns, ads
- `page` → leadgen (alternative delivery)

### 2.2 Implementation

```typescript
// GET - Verification
if (mode === 'subscribe' && token === expectedToken) {
  return new NextResponse(challenge, { status: 200 })
}

// POST - Process events
const signature = request.headers.get('x-hub-signature-256')
const appSecret = process.env.META_APP_SECRET

// Optional but recommended signature verification
if (appSecret && signature) {
  if (!verifySignature(rawBody, signature, appSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }
}
```

### 2.3 Lead Processing Flow

```mermaid
graph TD
    A[Leadgen Event] --> B[Identify Client]
    B -->|ad_account_id| C[Query clients]
    B -->|page_id| C

    C -->|Found| D[Fetch Lead Details]
    C -->|Not Found| E[Log to lead_ads_events]

    D --> F[Parse Lead Data]
    F --> G{Phone Exists?}

    G -->|Yes| H[Return Existing Card]
    G -->|No| I[Create CRM Card]

    I --> J[Log to lead_sources]
    I --> K[Log to lead_ads_events]
```

**Lead Fetching:**
```typescript
const leadData = await fetchLeadDetails(value.leadgen_id, accessToken)
// Returns: { id, created_time, field_data[], ad_id, campaign_id, ... }

const parsedLead = parseLeadData(leadData)
// Maps: phone_number, email, full_name, custom_fields
```

**Field Mapping:**
| Meta Field | Parsed Field | Normalization |
|-----------|-------------|---------------|
| `phone_number`, `telefone`, `celular` | `phone` | +55 prefix if 10-11 digits |
| `email`, `e-mail` | `email` | - |
| `full_name`, `nome` | `full_name` | - |
| `city`, `cidade` | `city` | - |
| Custom fields | `custom_fields{}` | JSON |

**CRM Integration:**
```typescript
const result = await createCardFromLead(clientId, parsedLead)

// Creates:
// 1. crm_cards entry (first column)
// 2. lead_sources entry (attribution tracking)
// 3. lead_ads_events entry (audit log)
```

### 2.4 Environment Variables

```bash
META_ADS_VERIFY_TOKEN=your-verify-token  # Or fallback to META_VERIFY_TOKEN
META_APP_SECRET=your-app-secret          # For signature verification
```

### 2.5 Client Configuration

```typescript
// Stored in Vault per client
{
  metaAccessToken: 'EAA...',           // Fetch lead details
  metaAdAccountId: '123456789',        // For client lookup
  metaPageId: '987654321'              // Alternative lookup
}
```

---

## 3. Stripe Webhooks

**Sistema de 3 webhooks independentes para diferentes contextos de pagamento**

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    STRIPE WEBHOOKS                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  V1 (Standard)          Connect (V2)         Platform      │
│  ┌──────────────┐      ┌──────────────┐    ┌──────────┐   │
│  │ Subscriptions│      │ Connected    │    │ UzzAI    │   │
│  │ Orders       │      │ Accounts     │    │ Billing  │   │
│  │ (Client→End) │      │ (Onboarding) │    │ (UzzAI→  │   │
│  │              │      │              │    │  Client) │   │
│  └──────────────┘      └──────────────┘    └──────────┘   │
│        ↓                      ↓                  ↓         │
│  stripe_subscriptions  stripe_accounts  platform_client_  │
│  stripe_orders         (sync status)    subscriptions     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3.2 Webhook V1 (Standard)

**Endpoint:** `/api/stripe/webhooks/route.ts`

**Eventos Tratados:**
```typescript
switch (event.type) {
  case 'checkout.session.completed':
    await handleCheckoutCompleted(session, eventAccount)
    break

  case 'customer.subscription.created':
  case 'customer.subscription.updated':
    await handleSubscriptionUpdated(subscription, eventAccount)
    break

  case 'customer.subscription.deleted':
    await handleSubscriptionDeleted(subscription, eventAccount)
    break

  case 'invoice.paid':
  case 'invoice.payment_succeeded':
    await handleInvoicePaid(invoice)
    break

  case 'invoice.payment_failed':
    await handleInvoicePaymentFailed(invoice)
    break

  // Billing Portal events (passive - no action)
  case 'payment_method.attached':
  case 'customer.updated':
  case 'billing_portal.session.created':
    break
}
```

**Deduplication:**
```typescript
// Check if already processed
if (await isWebhookEventAlreadyProcessed(event.id)) {
  return NextResponse.json({ received: true, duplicate: true })
}

// Insert with unique constraint race condition handling
const created = await createWebhookEventRecord(event.id, event.type)
if (!created) {
  // Lost race condition
  return NextResponse.json({ received: true, duplicate: true })
}
```

**Database Updates:**

1. **Subscriptions:**
```typescript
await supabase.from('stripe_subscriptions').upsert({
  client_id: clientId,
  stripe_subscription_id: subscription.id,
  stripe_price_id: stripePriceId,
  status: subscription.status,
  current_period_start: unixToIso(subscription.current_period_start),
  current_period_end: unixToIso(subscription.current_period_end),
  cancel_at_period_end: Boolean(subscription.cancel_at_period_end)
}, { onConflict: 'stripe_subscription_id' })
```

2. **Orders (One-time payments):**
```typescript
await supabase.from('stripe_orders').upsert({
  stripe_payment_intent_id: paymentIntentId,
  stripe_session_id: session.id,
  product_id: productId,
  status: session.payment_status,
  amount: session.amount_total,
  application_fee_amount: applicationFeeAmount
}, { onConflict: 'stripe_payment_intent_id' })
```

**Client Mapping:**
```typescript
// Find client by Stripe Account ID
const findClientByStripeAccount = async (stripeAccountId: string) => {
  const { data } = await supabase
    .from('stripe_accounts')
    .select('client_id')
    .eq('stripe_account_id', stripeAccountId)
    .single()

  return data?.client_id ?? null
}
```

### 3.3 Webhook Connect (V2 Thin Events)

**Endpoint:** `/api/stripe/webhooks/connect/route.ts`

**Purpose:** Monitor Connected Account onboarding status

**Eventos Tratados:**
```typescript
const isRequirementsUpdate = event.type === 'v2.core.account[requirements].updated'
const isCapabilityUpdate = event.type.endsWith('.capability_status_updated')

if (isRequirementsUpdate || isCapabilityUpdate) {
  const stripeAccountId = getAccountIdFromEvent(event)
  await syncAccountFromStripe(stripeAccountId)
}
```

**Thin Event Pattern:**
```typescript
// Step 1: Parse thin notification (signature verification)
const notification = parseConnectEventNotification(rawBody, signature, webhookSecret)

// Step 2: Fetch full event data
const event = typeof notification.fetchEvent === 'function'
  ? await notification.fetchEvent()
  : await getStripeClient().v2.core.events.retrieve(eventId)

// Step 3: Process
await syncAccountFromStripe(stripeAccountId)
```

**Account Sync:**
```typescript
// Updates: stripe_accounts table
await supabase.from('stripe_accounts').update({
  charges_enabled: account.charges_enabled,
  payouts_enabled: account.payouts_enabled,
  requirements_currently_due: account.requirements.currently_due,
  requirements_eventually_due: account.requirements.eventually_due,
  updated_at: new Date().toISOString()
})
```

### 3.4 Webhook Platform

**Endpoint:** `/api/stripe/platform/webhooks/route.ts`

**Purpose:** Billing UzzAI → Clients (SaaS subscription)

**Eventos Tratados:**
```typescript
switch (event.type) {
  case 'customer.subscription.created':
  case 'customer.subscription.updated':
  case 'customer.subscription.resumed':
  case 'customer.subscription.trial_will_end':
    await upsertPlatformSubscription(subscription)
    break

  case 'customer.subscription.deleted':
    await upsertPlatformSubscription(subscription, 'canceled')
    break

  case 'invoice.paid':
  case 'invoice.payment_succeeded':
    await upsertInvoiceHistory(invoice)
    break

  case 'invoice.payment_failed':
    await upsertInvoiceHistory(invoice)
    await setClientPlanStatusByCustomer(customerId, 'past_due')
    break
}
```

**Database Updates:**

1. **Platform Subscriptions:**
```typescript
await supabase.from('platform_client_subscriptions').upsert({
  client_id: clientId,
  stripe_customer_id: stripeCustomerId,
  stripe_subscription_id: subscription.id,
  plan_name: 'pro',
  status: normalizedStatus,
  trial_end: unixToIso(subscription.trial_end),
  current_period_end: unixToIso(currentPeriodEnd)
}, { onConflict: 'client_id' })

// Also update clients table
await supabase.from('clients').update({
  plan_name: 'pro',
  plan_status: clientPlanStatus
}).eq('id', clientId)
```

2. **Payment History:**
```typescript
await supabase.from('platform_payment_history').upsert({
  client_id: clientId,
  stripe_invoice_id: invoice.id,
  amount: invoice.amount_paid,
  status: invoice.status,
  paid_at: paidAt,
  invoice_url: invoice.hosted_invoice_url
}, { onConflict: 'stripe_invoice_id' })
```

### 3.5 Environment Variables

```bash
# Webhook Secrets
STRIPE_WEBHOOK_SECRET=whsec_...           # V1 Standard
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...   # V2 Connect
STRIPE_PLATFORM_WEBHOOK_SECRET=whsec_...  # Platform billing

# API Keys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Platform Config
STRIPE_APPLICATION_FEE_PERCENT=10
STRIPE_PLATFORM_PRICE_ID=price_...
STRIPE_PLATFORM_PRODUCT_ID=prod_...
```

### 3.6 Security & Best Practices

**Signature Verification:**
```typescript
const event = constructWebhookEvent(rawBody, signature, webhookSecret)
// Uses Stripe SDK's constructEvent (HMAC validation)
```

**Idempotency:**
```typescript
// webhook_events table with UNIQUE constraint on stripe_event_id
const UNIQUE_VIOLATION_CODE = '23505'

const { error } = await supabase.from('webhook_events').insert({
  stripe_event_id: eventId,
  event_scope: WEBHOOK_SCOPE,
  event_type: eventType,
  status: 'processing'
})

if (error?.code === UNIQUE_VIOLATION_CODE) {
  return { duplicate: true }
}
```

**Error Handling:**
```typescript
// ALWAYS return 200 after logging error (prevent aggressive retries)
try {
  await processEvent(event)
  await markWebhookEventDone(event.id)
} catch (error) {
  await markWebhookEventFailed(event.id, error.message)
}
return NextResponse.json({ received: true })
```

**Status Tracking:**
```sql
CREATE TABLE webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_scope TEXT,           -- 'v1', 'v2_connect', 'v1_platform'
  event_type TEXT,
  status TEXT,                -- 'processing', 'processed', 'failed'
  error_message TEXT,
  processed_at TIMESTAMPTZ
);
```

---

## 4. Firebase Push Notifications

**Responsabilidade:** Enviar notificações push para usuários mobile quando mensagens chegam

### 4.1 Architecture

```typescript
// Webhook flow:
processChatbotMessage()
  → sendIncomingMessagePushWithTimeout()
    → sendIncomingMessagePush()
      → Firebase Cloud Messaging
```

### 4.2 Implementation

**Initialization (src/lib/firebase-admin.ts):**
```typescript
const getFirebaseMessaging = (): admin.messaging.Messaging | null => {
  if (admin.apps.length > 0) {
    return admin.messaging()
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })

  return admin.messaging()
}
```

**Push Dispatch (src/lib/push-dispatch.ts):**
```typescript
export const sendIncomingMessagePush = async ({
  clientId,
  phone,
  customerName,
  messagePreview
}: IncomingPushParams) => {
  // 1. Get active users for client
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('client_id', clientId)
    .eq('is_active', true)

  // 2. Get push tokens
  const { data: pushTokens } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', userIds)

  // 3. Send multicast
  const response = await messaging.sendEachForMulticast({
    tokens: uniqueTokens,
    notification: {
      title: customerName ? `Nova mensagem de ${customerName}` : 'Nova mensagem',
      body: messagePreview.slice(0, 140)
    },
    data: { type: 'message', phone },
    android: { priority: 'high' },
    apns: { headers: { 'apns-priority': '10' } }
  })

  // 4. Remove invalid tokens
  await removeInvalidTokens(failedTokens)
}
```

**Timeout Wrapper:**
```typescript
// Non-blocking: race with 1800ms timeout
await sendIncomingMessagePushWithTimeout(params, 1800)
```

### 4.3 Database Schema

```sql
CREATE TABLE push_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id),
  token TEXT UNIQUE,
  platform TEXT,  -- 'android', 'ios', 'web'
  created_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);
```

### 4.4 Environment Variables

```bash
# Option 1: Individual fields
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Option 2: JSON blob
FIREBASE_SERVICE_ACCOUNT_JSON='{...}'
```

### 4.5 Error Handling

**Graceful Degradation:**
```typescript
// If Firebase not configured, skip silently
if (!messaging) {
  console.warn('[push] Firebase messaging unavailable')
  return
}

// If push fails, don't break webhook
try {
  await sendPush(...)
} catch (pushError) {
  console.warn('[push] Failed to send', pushError)
  // Continue - webhook still returns 200
}
```

**Invalid Token Cleanup:**
```typescript
const invalidTokens: string[] = []

response.responses.forEach((result, index) => {
  if (!result.success) {
    const code = result.error?.code || ''
    if (code.includes('registration-token-not-registered') ||
        code.includes('invalid-registration-token')) {
      invalidTokens.push(uniqueTokens[index])
    }
  }
})

await supabase.from('push_tokens').delete().in('token', invalidTokens)
```

---

## 5. Google Calendar

**Responsabilidade:** Integração OAuth2 + API para ler/criar eventos

### 5.1 OAuth Flow

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Google
    participant Vault

    User->>App: Click "Connect Google Calendar"
    App->>App: Generate state (random:clientId)
    App->>Google: Redirect to OAuth URL
    Google->>User: Login & Consent
    Google->>App: Callback with code + state
    App->>App: Verify state, extract clientId
    App->>Google: Exchange code for tokens
    Google->>App: access_token + refresh_token
    App->>Vault: Store tokens (encrypted)
    App->>User: Success ✅
```

**OAuth URL Generation:**
```typescript
const getGoogleCalendarOAuthURL = (state: string): string => {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',  // Get refresh token
    prompt: 'consent'        // Always show consent (ensures refresh token)
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}
```

**Token Exchange:**
```typescript
const { accessToken, refreshToken, userEmail, expiresIn } =
  await exchangeGoogleCodeForTokens(code)

// Store in Vault
const secretId = await storeCalendarTokens(clientId, 'google', {
  accessToken,
  refreshToken,
  userEmail
})
```

### 5.2 API Client

**Auto-Refresh Pattern:**
```typescript
const withRefresh = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn()
  } catch (err: any) {
    if (err?.code === 401 || err?.status === 401) {
      console.log('[GoogleCalendar] Token expired, refreshing...')
      await doRefresh()
      return await fn()  // Retry
    }
    throw err
  }
}
```

**Refresh Implementation:**
```typescript
const doRefresh = async (): Promise<void> => {
  const { accessToken: newToken } =
    await refreshGoogleAccessToken(refreshToken)

  oauth2Client.setCredentials({ access_token: newToken })

  // Update Vault
  await updateCalendarToken(secretId, newToken)
}
```

**API Operations:**
```typescript
// List Events
const events = await calendar.events.list({
  calendarId: 'primary',
  timeMin: start.toISOString(),
  timeMax: end.toISOString(),
  singleEvents: true,
  orderBy: 'startTime',
  maxResults: 50
})

// Create Event
const event = await calendar.events.insert({
  calendarId: 'primary',
  requestBody: {
    summary: title,
    description,
    start: { dateTime: startDateTime },
    end: { dateTime: endDateTime },
    attendees: attendees.map(email => ({ email }))
  }
})

// Check Availability
const busyResponse = await calendar.freebusy.query({
  requestBody: {
    timeMin: start.toISOString(),
    timeMax: end.toISOString(),
    items: [{ id: 'primary' }]
  }
})
const available = busyResponse.data.calendars?.['primary']?.busy?.length === 0
```

### 5.3 Environment Variables

```bash
GOOGLE_CALENDAR_CLIENT_ID=123456789.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-...
NEXT_PUBLIC_URL=https://uzzapp.uzzai.com.br  # For redirect URI
```

### 5.4 Security

**State Parameter (CSRF Protection):**
```typescript
// Generate: random:clientId
const state = generateCalendarOAuthState(clientId)

// Verify callback:
const extractedClientId = extractClientIdFromState(state)
if (!extractedClientId) {
  return new NextResponse('Invalid state', { status: 400 })
}
```

**Token Storage:**
- Access tokens in Vault (encrypted)
- Refresh tokens in Vault (encrypted)
- Tokens tied to `clients.google_calendar_token_secret_id`

---

## 6. Microsoft Calendar

**Responsabilidade:** Integração OAuth2 + Graph API para Outlook/Office 365

### 6.1 OAuth Flow

**URL Generation:**
```typescript
const getMicrosoftCalendarOAuthURL = (state: string): string => {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'Calendars.ReadWrite offline_access User.Read',
    response_mode: 'query',
    prompt: 'consent'
  })

  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params}`
}
```

**Token Exchange:**
```typescript
const tokenRes = await fetch(
  `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
  {
    method: 'POST',
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      scope: 'Calendars.ReadWrite offline_access User.Read'
    })
  }
)

// Fetch user email
const userInfo = await fetch('https://graph.microsoft.com/v1.0/me', {
  headers: { Authorization: `Bearer ${accessToken}` }
})
```

### 6.2 Graph API Client

**Implementation Pattern:**
```typescript
const graphFetch = async (url: string, options?: RequestInit) => {
  const doFetch = async () => {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!res.ok) {
      const error = new Error(`Graph API error: ${res.status}`)
      error.status = res.status
      throw error
    }

    return res.json()
  }

  try {
    return await doFetch()
  } catch (err: any) {
    if (err?.status === 401) {
      await doRefresh()
      return await doFetch()  // Retry
    }
    throw err
  }
}
```

**API Operations:**
```typescript
// List Events (Calendar View)
const params = new URLSearchParams({
  startDateTime: start.toISOString(),
  endDateTime: end.toISOString(),
  $orderby: 'start/dateTime',
  $top: '50',
  $select: 'id,subject,start,end,bodyPreview,location,attendees'
})

const data = await graphFetch(
  `https://graph.microsoft.com/v1.0/me/calendarView?${params}`
)

// Create Event
await graphFetch('https://graph.microsoft.com/v1.0/me/events', {
  method: 'POST',
  body: JSON.stringify({
    subject: title,
    start: { dateTime: startDateTime, timeZone: 'UTC' },
    end: { dateTime: endDateTime, timeZone: 'UTC' },
    attendees: attendees.map(email => ({
      emailAddress: { address: email },
      type: 'required'
    }))
  })
})
```

### 6.3 Environment Variables

```bash
MICROSOFT_CALENDAR_CLIENT_ID=12345678-abcd-...
MICROSOFT_CALENDAR_CLIENT_SECRET=abc~...
MICROSOFT_CALENDAR_TENANT_ID=common  # Or specific tenant
NEXT_PUBLIC_URL=https://uzzapp.uzzai.com.br
```

### 6.4 Differences from Google

| Feature | Google | Microsoft |
|---------|--------|-----------|
| SDK | `googleapis` package | Raw `fetch` calls |
| API Base | `https://www.googleapis.com` | `https://graph.microsoft.com` |
| Auth Endpoint | `accounts.google.com` | `login.microsoftonline.com` |
| Datetime Format | ISO with `Z` suffix | ISO without suffix + timezone field |
| Tenant | Single | Multi-tenant support |

---

## 7. Gmail (Human Handoff)

**Responsabilidade:** Enviar email quando bot transfere para humano

### 7.1 Implementation

```typescript
// Triggered by AI tool call
if (toolCall.function.name === 'transferir_atendimento') {
  await handleHumanHandoff({
    phone,
    customerName,
    config,
    reason: toolCall.function.arguments?.motivo
  })
}
```

**Handoff Flow:**
```typescript
export const handleHumanHandoff = async ({
  phone,
  customerName,
  config,
  reason
}: HandleHumanHandoffInput) => {
  // 1. Update customer status (CRITICAL)
  await query(
    'UPDATE clientes_whatsapp SET status = $1 WHERE telefone = $2',
    ['transferido', phone]
  )

  // 2. Send email (OPTIONAL - graceful fail)
  try {
    const notificationEmail = config.notificationEmail || process.env.GMAIL_USER

    if (notificationEmail && process.env.GMAIL_APP_PASSWORD) {
      await sendEmail(
        notificationEmail,
        'Novo Lead aguardando contato',
        `Nome: ${customerName}\nTelefone: ${phone}\n${reason || ''}`
      )
    }
  } catch (emailError) {
    // Don't throw - handoff should succeed even if email fails
  }
}
```

### 7.2 SMTP Configuration

```typescript
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD  // NOT regular password
  }
})

await transporter.sendMail({
  from: gmailUser,
  to,
  subject,
  html
})
```

### 7.3 Environment Variables

```bash
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop  # 16-char app password
```

**Generate App Password:**
1. Google Account → Security → 2-Step Verification
2. App passwords → Generate
3. Copy 16-character password

### 7.4 Per-Client Notification

```typescript
// Priority: client config > env fallback
const notificationEmail = config.notificationEmail || process.env.GMAIL_USER
```

---

## 8. Scheduled Jobs

### 8.1 Scheduled Messages Cron

**Endpoint:** `/api/cron/scheduled-messages`

**Purpose:** Send WhatsApp messages scheduled in advance

**Trigger Options:**
1. **Vercel Cron** (recommended for production)
2. **GitHub Actions** (alternative)
3. **Manual POST** (testing)

**Implementation:**
```typescript
export const maxDuration = 60  // 60 seconds max

export async function POST(request: NextRequest) {
  // 1. Verify authorization
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Fetch pending messages
  const { data: pendingMessages } = await supabase
    .from('scheduled_messages')
    .select(`
      id, client_id, phone, message_type, content,
      client:clients!scheduled_messages_client_id_fkey(
        whatsapp_phone_id, whatsapp_token
      )
    `)
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .limit(50)

  // 3. Send via WhatsApp API
  for (const msg of pendingMessages) {
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: String(msg.phone),
          type: msg.message_type,
          text: { body: msg.content }
        })
      }
    )

    // 4. Update status
    await supabase.from('scheduled_messages').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      wamid: whatsappResponse.messages[0].id
    }).eq('id', msg.id)

    // 5. Log to messages table
    await supabase.from('messages').insert({
      client_id: msg.client_id,
      phone: String(msg.phone),
      direction: 'outgoing',
      content: msg.content,
      wamid: wamid,
      status: 'sent'
    })
  }
}
```

**Health Check:**
```typescript
export async function GET() {
  const { count: pendingCount } = await supabase
    .from('scheduled_messages')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const { count: dueCount } = await supabase
    .from('scheduled_messages')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())

  return NextResponse.json({
    status: 'healthy',
    pending_messages: pendingCount,
    due_messages: dueCount
  })
}
```

### 8.2 Vercel Cron Configuration

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/scheduled-messages",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Note:** Não existe `vercel.json` no projeto atualmente (não encontrado no scan)

### 8.3 Environment Variables

```bash
CRON_SECRET=your-secret-token  # For authentication
```

### 8.4 Database Schema

```sql
CREATE TABLE scheduled_messages (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  phone TEXT,
  message_type TEXT,           -- 'text', 'template'
  content TEXT,
  template_id TEXT,
  template_params JSONB,
  scheduled_for TIMESTAMPTZ,
  status TEXT,                  -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMPTZ,
  wamid TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

CREATE INDEX idx_scheduled_messages_status ON scheduled_messages(status, scheduled_for);
```

---

## 9. Rate Limiting

**Sistema de proteção contra abuso usando Upstash Redis**

### 9.1 Implementation

**Library:** `@upstash/ratelimit` + `@upstash/redis`

**Limiters:**
```typescript
// VULN-002: Webhook verification (prevent brute force)
export const webhookVerifyLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'),  // 5 requests/hour
  analytics: true,
  prefix: 'ratelimit:webhook:verify'
})

// VULN-017: General API (per user)
export const apiUserLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),  // 100 requests/min
  analytics: true,
  prefix: 'ratelimit:api:user'
})

// VULN-017: Admin API (more strict)
export const apiAdminLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(50, '1 m'),
  analytics: true,
  prefix: 'ratelimit:api:admin'
})

// VULN-017: IP-based backstop
export const ipLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, '1 m'),
  analytics: true,
  prefix: 'ratelimit:ip'
})
```

### 9.2 Usage Patterns

**Manual Check:**
```typescript
const rateLimitResponse = await checkRateLimit(
  request,
  webhookVerifyLimiter,
  identifier
)

if (rateLimitResponse) {
  return rateLimitResponse  // 429 Too Many Requests
}
```

**Wrapper (Decorator):**
```typescript
export const GET = withRateLimit(
  apiUserLimiter,
  async (request) => {
    return NextResponse.json({ data: 'protected' })
  }
)
```

**IP-based Quick Wrapper:**
```typescript
export const POST = withIpRateLimit(async (request) => {
  // Handler code
})
```

### 9.3 Response Headers

```typescript
{
  'X-RateLimit-Limit': '100',
  'X-RateLimit-Remaining': '87',
  'X-RateLimit-Reset': '2026-03-15T14:23:00.000Z',
  'Retry-After': '45'  // seconds
}
```

### 9.4 Environment Variables

```bash
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXX...
```

### 9.5 Graceful Degradation

```typescript
// If Redis not configured, allow all requests
if (!redis) {
  console.warn('[rate-limit] Redis not configured, skipping')
  return null
}

// If Redis fails at runtime, allow request
try {
  const result = await limiter.limit(identifier)
  // ...
} catch (error) {
  console.error('[rate-limit] Redis error, allowing request')
  return null
}
```

---

## 10. Environment Variables

### 10.1 Complete List

```bash
# =============================================================================
# SUPABASE (REQUIRED)
# =============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# =============================================================================
# META WHATSAPP (CRITICAL - Multi-tenant via Vault)
# =============================================================================
# Default fallbacks (stored per-client in Vault)
META_ACCESS_TOKEN=EAA...
META_PHONE_NUMBER_ID=899639703222013
META_VERIFY_TOKEN=your-unique-token
META_APP_SECRET=your-app-secret

# Webhook base URL
WEBHOOK_BASE_URL=https://chat.luisfboff.com

# =============================================================================
# META ADS (OPTIONAL - Lead capture)
# =============================================================================
META_ADS_VERIFY_TOKEN=your-verify-token  # Or use META_VERIFY_TOKEN
META_APP_SECRET=your-app-secret          # Shared with WhatsApp

# =============================================================================
# AI SERVICES (REQUIRED - Multi-tenant via Vault)
# =============================================================================
OPENAI_API_KEY=sk-...      # Whisper, GPT-4o Vision, Embeddings
GROQ_API_KEY=gsk_...       # Llama 3.3 70B

# =============================================================================
# STRIPE (REQUIRED for payments)
# =============================================================================
# API Keys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Webhook Secrets
STRIPE_WEBHOOK_SECRET=whsec_...           # V1 Standard
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...   # V2 Connect
STRIPE_PLATFORM_WEBHOOK_SECRET=whsec_...  # Platform billing

# Platform Config
STRIPE_APPLICATION_FEE_PERCENT=10
STRIPE_PLATFORM_PRICE_ID=price_...
STRIPE_PLATFORM_PRODUCT_ID=prod_...
STRIPE_PLATFORM_SETUP_FEE_PRICE_ID=price_...
UZZAI_PLATFORM_CLIENT_ID=00000000-0000-0000-0000-000000000099

# =============================================================================
# FIREBASE (OPTIONAL - Push Notifications)
# =============================================================================
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Alternative: JSON blob
FIREBASE_SERVICE_ACCOUNT_JSON='{...}'

# =============================================================================
# GOOGLE CALENDAR (OPTIONAL)
# =============================================================================
GOOGLE_CALENDAR_CLIENT_ID=123...apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-...

# =============================================================================
# MICROSOFT CALENDAR (OPTIONAL)
# =============================================================================
MICROSOFT_CALENDAR_CLIENT_ID=12345678-abcd-...
MICROSOFT_CALENDAR_CLIENT_SECRET=abc~...
MICROSOFT_CALENDAR_TENANT_ID=common

# =============================================================================
# GMAIL (OPTIONAL - Human handoff emails)
# =============================================================================
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

# =============================================================================
# REDIS (OPTIONAL - Message batching)
# =============================================================================
REDIS_URL=redis://localhost:6379

# =============================================================================
# UPSTASH REDIS (OPTIONAL - Rate limiting)
# =============================================================================
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXX...

# =============================================================================
# DATABASE (REQUIRED)
# =============================================================================
DATABASE_URL=postgresql://...

# =============================================================================
# CRON JOBS (OPTIONAL)
# =============================================================================
CRON_SECRET=your-secret-token

# =============================================================================
# APP CONFIGURATION
# =============================================================================
NEXT_PUBLIC_URL=https://uzzapp.uzzai.com.br
NEXT_PUBLIC_APP_URL=https://uzzapp.uzzai.com.br
NEXT_PUBLIC_ENV=production
```

### 10.2 Multi-Tenant Vault Variables

**Stored per-client in Supabase Vault (encrypted):**

```typescript
interface ClientAPIKeys {
  // WhatsApp
  metaAccessToken: string
  metaPhoneNumberId: string
  metaVerifyToken: string
  metaAppSecret: string

  // AI
  openaiApiKey: string
  groqApiKey: string

  // Calendar
  googleCalendarToken?: string      // Stored separately
  microsoftCalendarToken?: string   // Stored separately
}
```

**Access Pattern:**
```typescript
const config = await getClientConfig(clientId)
// Returns: { apiKeys, notificationEmail, ... }
```

---

## 11. Security Patterns

### 11.1 Webhook Signature Verification

**Meta WhatsApp (HMAC SHA-256):**
```typescript
const signature = request.headers.get('X-Hub-Signature-256')
const appSecret = config.apiKeys.metaAppSecret

const expectedSignature = 'sha256=' +
  crypto.createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')

// Timing-safe comparison
if (
  signatureBuffer.length !== expectedBuffer.length ||
  !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
) {
  return new NextResponse('Invalid signature', { status: 403 })
}
```

**Stripe (SDK-based):**
```typescript
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  webhookSecret
)
// Throws error if invalid
```

### 11.2 Idempotency

**Database-Backed:**
```sql
CREATE TABLE webhook_events (
  stripe_event_id TEXT PRIMARY KEY,  -- or message_id
  event_scope TEXT,
  status TEXT,
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_webhook_events_event_id
  ON webhook_events(stripe_event_id);
```

**Pattern:**
```typescript
// Check
if (await isAlreadyProcessed(eventId)) {
  return { duplicate: true }
}

// Insert (race-safe)
try {
  await insert({ eventId, status: 'processing' })
} catch (error) {
  if (error.code === '23505') {  // Unique violation
    return { duplicate: true }
  }
  throw error
}

// Process
await handleEvent(event)
await update({ eventId, status: 'processed' })
```

### 11.3 Rate Limiting

**Per-Endpoint Limits:**

| Endpoint | Limit | Identifier | Prevention |
|----------|-------|------------|------------|
| `GET /api/webhook/[clientId]` | 5/hour | IP | Brute force token |
| `POST /api/*` (user) | 100/min | User ID | API abuse |
| `POST /api/admin/*` | 50/min | User ID | Admin abuse |
| `*` (global) | 1000/min | IP | DDoS |

### 11.4 Sensitive Data Handling

**Vault Storage:**
- API keys encrypted at rest (Supabase Vault)
- Calendar tokens encrypted separately
- No credentials in code or logs

**CSRF Protection:**
- OAuth state parameter: `{random}:{clientId}`
- Cryptographically secure random (32 bytes)

**Token Rotation:**
- Calendar access tokens auto-refresh on 401
- Refresh tokens stored in Vault
- Invalid push tokens auto-deleted

---

## 12. Monitoring & Debugging

### 12.1 Webhook Cache

**In-Memory Debug Cache:**
```typescript
// Circular buffer of last 100 webhook messages
addWebhookMessage({
  id: messageId,
  timestamp: new Date().toISOString(),
  from: message.from,
  type: message.type,
  content: extractedContent,
  raw: body
})

// View: GET /api/webhook/received
```

### 12.2 Database Logs

**Webhook Events:**
```sql
SELECT
  stripe_event_id,
  event_scope,
  event_type,
  status,
  error_message,
  processed_at
FROM webhook_events
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 50;
```

**Push Notifications:**
```sql
-- No built-in tracking table
-- Logs via console only
```

**Scheduled Messages:**
```sql
SELECT
  id,
  phone,
  scheduled_for,
  status,
  sent_at,
  error_message
FROM scheduled_messages
WHERE status = 'failed'
ORDER BY scheduled_for DESC;
```

### 12.3 Debug Endpoints

**Webhook Health:**
```bash
GET /api/webhook/received
# Returns: { messages: [...], count: 100 }

GET /api/cron/scheduled-messages
# Returns: { pending_messages: 5, due_messages: 2 }
```

**Config Verification:**
```bash
GET /api/debug/webhook-config/[clientId]
# Returns client webhook config (sanitized)
```

### 12.4 Console Logs

**Structured Logging:**
```typescript
console.log('🎯 [META-ADS-WEBHOOK] Event received')
console.log('  Leadgen ID:', value.leadgen_id)
console.log('  Client:', client.name)

console.log('[push] Multicast processed', {
  clientId,
  tokens: uniqueTokens.length,
  successCount: response.successCount,
  failureCount: response.failureCount
})
```

---

## Summary

### Integration Status Matrix

| Integration | Webhook | OAuth | API Calls | Signature | Dedup | Rate Limit | Fallback |
|------------|---------|-------|-----------|-----------|-------|------------|----------|
| Meta WhatsApp | ✅ | ❌ | ✅ | ✅ HMAC | ✅ Redis+DB | ✅ 5/h | ❌ |
| Meta Ads | ✅ | ❌ | ✅ | ⚠️ Optional | ✅ DB | ❌ | ✅ Log |
| Stripe V1 | ✅ | ❌ | ✅ | ✅ SDK | ✅ DB | ❌ | ✅ 200 |
| Stripe Connect | ✅ | ❌ | ✅ | ✅ SDK | ✅ DB | ❌ | ✅ 200 |
| Stripe Platform | ✅ | ❌ | ✅ | ✅ SDK | ✅ DB | ❌ | ✅ 200 |
| Firebase | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ Skip |
| Google Calendar | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ 401 |
| Microsoft Calendar | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ 401 |
| Gmail | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ Skip |

### Key Takeaways

**Security:**
- All webhooks validate signatures (except Meta Ads - optional)
- Rate limiting on critical endpoints (webhook verify, APIs)
- Multi-tenant credential isolation via Vault
- Timing-safe comparisons for secrets

**Reliability:**
- Idempotency via database unique constraints
- Graceful degradation for non-critical services
- Auto-refresh for expired calendar tokens
- Always return 200 to prevent aggressive retries

**Scalability:**
- Redis for message batching (30s default)
- Upstash Redis for distributed rate limiting
- Firebase multicast for push (1000 tokens/batch)
- Scheduled jobs with 60s max duration

**Multi-Tenancy:**
- Per-client webhook URLs (`/api/webhook/[clientId]`)
- Vault-stored credentials per client
- Client-specific notification emails
- Isolated database records

### Missing Components

**No cron configuration found:**
- `vercel.json` not present in project
- Scheduled messages endpoint exists but not triggered automatically
- Recommendation: Add Vercel Cron or GitHub Actions workflow

**No centralized monitoring:**
- Webhook events logged to database
- Push notifications only console logs
- Recommendation: Add Sentry or DataDog integration

**No retry mechanism:**
- Webhooks always return 200 (prevent retries)
- Failed scheduled messages marked but not auto-retried
- Recommendation: Add exponential backoff retry queue

---

**Document End**
