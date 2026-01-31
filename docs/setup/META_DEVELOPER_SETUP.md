# Meta Developer Setup Guide

Complete guide to configure Meta Developer Console for WhatsApp SaaS Chatbot integration with Conversions API and Marketing API.

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Option A: Add to Existing App](#option-a-add-to-existing-whatsapp-app-recommended)
4. [Option B: Create New App](#option-b-create-new-app)
5. [Configure Permissions](#configure-permissions)
6. [Setup Webhooks](#setup-webhooks)
7. [Generate System User Token](#generate-system-user-token)
8. [Configure Database](#configure-database)
9. [Create Dataset (CAPI)](#create-conversions-api-dataset)
10. [Verification & Testing](#verification--testing)
11. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                    META DEVELOPER CONSOLE                          │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────┐       ┌─────────────────────┐            │
│  │  WhatsApp Business  │       │    Marketing API    │            │
│  │        API          │       │                     │            │
│  │  ✅ CONFIGURED      │       │  ❓ TO CONFIGURE    │            │
│  │                     │       │                     │            │
│  │  • Send messages    │       │  • ads_read         │            │
│  │  • Receive webhooks │       │  • ads_management   │            │
│  │  • Media handling   │       │  • leads_retrieval  │            │
│  └─────────────────────┘       └─────────────────────┘            │
│                                                                    │
│  ┌─────────────────────┐       ┌─────────────────────┐            │
│  │   Conversions API   │       │  Ad Account Webhook │            │
│  │    (Business Msg)   │       │                     │            │
│  │  ❓ TO CONFIGURE    │       │  ❓ TO CONFIGURE    │            │
│  │                     │       │                     │            │
│  │  • whatsapp_busi... │       │  • leadgen events   │            │
│  │    _manage_events   │       │  • campaign changes │            │
│  │  • Dataset creation │       │  • ad account events│            │
│  └─────────────────────┘       └─────────────────────┘            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│                     NOSSA APLICAÇÃO                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  /api/webhook/[clientId]          ← WhatsApp messages (existing)   │
│  /api/webhook/meta-ads            ← Ad Account events (NEW)        │
│  /api/crm/meta-insights           ← Marketing API queries (NEW)    │
│                                                                    │
│  src/nodes/sendConversionEvent.ts ← CAPI events (NEW)              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Prerequisites

Before starting, ensure you have:

| Item                             | Where to Find                                              | Required For       |
| -------------------------------- | ---------------------------------------------------------- | ------------------ |
| **Facebook Business Account**    | [business.facebook.com](https://business.facebook.com)     | All features       |
| **Meta Developer Account**       | [developers.facebook.com](https://developers.facebook.com) | All features       |
| **Existing WhatsApp App**        | Meta Developer Console                                     | Using existing app |
| **WhatsApp Business Account ID** | Business Settings → WhatsApp Accounts                      | Conversions API    |
| **Ad Account ID**                | Business Settings → Ad Accounts                            | Marketing API      |
| **Business Verification**        | Business Settings → Business Info                          | Advanced Access    |

### IDs You'll Need

```
┌─────────────────────────────────────────────────────────────────┐
│ WhatsApp Business Account ID (WABA):  1234567890123456          │
│ Ad Account ID:                        act_9876543210            │
│ Phone Number ID:                      112233445566778899        │
│ App ID:                               123456789012345           │
│ App Secret:                           abcdef123456...           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Option A: Add to Existing WhatsApp App (Recommended)

If you already have a WhatsApp Business API app configured, add new use cases to it.

### Step 1: Access App Dashboard

1. Go to [Meta Developer Console](https://developers.facebook.com/apps)
2. Select your existing WhatsApp app
3. Click **App Dashboard** in sidebar

### Step 2: Add Marketing API Use Case

1. In sidebar, click **Add Product**
2. Find **Marketing API** and click **Set Up**
3. Select use case: **"Measure ad performance data with Marketing API"**
4. Click **Create Use Case**

### Step 3: Add Conversions API Permission

1. Go to **App Review** → **Permissions and Features**
2. Search for `whatsapp_business_manage_events`
3. Click **Request** (or it may auto-approve for Standard Access)

### Step 4: Add Webhooks for Ad Account

1. In sidebar, click **Webhooks**
2. From dropdown, select **Ad Account**
3. Click **Subscribe** for:
   - `leadgen` - Lead form submissions
   - `campaigns` - Campaign status changes
   - `ad_accounts` - Account-level events

---

## 🆕 Option B: Create New App

Only if you need a completely separate app for ads management.

### Step 1: Create App

1. Go to [Create New App](https://developers.facebook.com/apps/create/)
2. Select **Business** as app type
3. Enter app name: `WhatsApp CRM - Meta Ads`
4. Select your Business Account
5. Click **Create App**

### Step 2: Add Use Cases

1. Click **Set Up** on **Marketing API**
2. Add use cases:
   - "Measure ad performance data with Marketing API"
   - "Capture & manage ad leads with Marketing API"

### Step 3: Connect WhatsApp (Optional)

If you want this app to also handle WhatsApp:

1. Click **Add Product** → **WhatsApp**
2. Complete WhatsApp setup wizard

---

## 🔐 Configure Permissions

### Required Permissions

| Permission                        | Purpose                        | Access Level    |
| --------------------------------- | ------------------------------ | --------------- |
| `whatsapp_business_messaging`     | Send/receive WhatsApp messages | ✅ Already have |
| `whatsapp_business_management`    | Manage WhatsApp settings       | ✅ Already have |
| `whatsapp_business_manage_events` | Send Conversions API events    | 🔶 Request      |
| `ads_read`                        | Read campaign metrics          | 🔶 Request      |
| `ads_management`                  | Manage campaigns (optional)    | 🔶 Request      |
| `leads_retrieval`                 | Get Lead Ad form data          | 🔶 Request      |

### Request Advanced Access

1. Go to **App Review** → **Permissions and Features**
2. For each permission:
   - Click **Request**
   - Provide use case description
   - Submit for review (usually auto-approved for Standard Access)

### Business Verification

For production use, complete Business Verification:

1. Go to [Business Settings](https://business.facebook.com/settings)
2. Click **Business Info** → **Start Verification**
3. Provide:
   - Legal business name
   - Business address
   - Business documents (registration, utility bill)
4. Wait for verification (1-5 business days)

---

## 🔗 Setup Webhooks

### WhatsApp Webhook (Already Configured)

Your existing webhook at `/api/webhook/[clientId]` handles WhatsApp messages.

### Ad Account Webhook (New)

Configure a new webhook for Ad Account events:

1. In Meta Developer Console, go to **Webhooks**
2. Select **Ad Account** from dropdown
3. Click **Edit Subscription**

**Callback URL:**

```
https://your-domain.com/api/webhook/meta-ads
```

**Verify Token:**

```
Use the same as WhatsApp or create a new one: META_ADS_VERIFY_TOKEN
```

4. Click **Verify and Save**

5. Subscribe to events:
   - ✅ `leadgen` - Lead Ads form submissions
   - ✅ `campaigns` - Campaign changes
   - ✅ `ad_accounts` - Account events

### Environment Variables

Add to your `.env.local` or Doppler:

```env
# Meta Ads Webhook (can be same as WhatsApp)
META_ADS_VERIFY_TOKEN=your-verify-token

# Meta App Secret (for signature verification)
META_APP_SECRET=your-app-secret
```

---

## 🔑 Generate System User Token

For server-to-server API calls, create a System User token.

### Step 1: Create System User

1. Go to [Business Settings](https://business.facebook.com/settings)
2. Click **Users** → **System Users**
3. Click **Add**
4. Enter name: `WhatsApp CRM Bot`
5. Select role: **Admin** (or Employee with required permissions)
6. Click **Create System User**

### Step 2: Assign Assets

1. Click on the System User
2. Click **Add Assets**
3. Select:
   - **Apps** → Your WhatsApp app → Full Control
   - **Ad Accounts** → Your Ad Account → Manage campaigns
   - **WhatsApp Accounts** → Your WABA → Manage WhatsApp
4. Click **Save Changes**

### Step 3: Generate Token

1. Click **Generate New Token**
2. Select your App
3. Select permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `whatsapp_business_manage_events`
   - `ads_read`
   - `ads_management` (if needed)
   - `leads_retrieval` (if using Lead Ads)
4. Set expiration: **Never** (for production) or specific time
5. Click **Generate Token**
6. **COPY AND SAVE** the token immediately (shown only once!)

### Step 4: Store Token in Vault

```sql
-- In Supabase SQL Editor
SELECT vault.create_secret(
  'meta_access_token',
  'YOUR_SYSTEM_USER_TOKEN',
  'Meta System User access token'
);
```

Or via API (if you have vault endpoint):

```bash
curl -X POST https://your-supabase.co/rest/v1/rpc/create_vault_secret \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"secret_name": "meta_access_token", "secret_value": "YOUR_TOKEN", "client_id": "YOUR_CLIENT_ID"}'
```

---

## 🗄️ Configure Database

Run the migration to add Meta Ads columns:

```sql
-- File: supabase/migrations/20260131_add_meta_ads_integration.sql

-- Already creates:
-- - clients.meta_waba_id
-- - clients.meta_dataset_id
-- - clients.meta_ad_account_id
-- - conversion_events_log table
-- - crm_column_event_mapping table
```

### Update Client Record

```sql
-- Add Meta configuration to your client
UPDATE clients
SET
  meta_waba_id = '1234567890123456',        -- WhatsApp Business Account ID
  meta_ad_account_id = '9876543210',        -- Ad Account ID (without 'act_' prefix)
  meta_dataset_id = NULL                     -- Will be set after creating dataset
WHERE id = 'YOUR_CLIENT_UUID';
```

---

## 📊 Create Conversions API Dataset

A Dataset is required to receive Conversions API events for Business Messaging.

### Option 1: Create via API

```bash
# Create dataset
curl -X POST "https://graph.facebook.com/v20.0/{WABA_ID}/dataset" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d "partner_agent=uzzbot-whatsapp-crm"
```

Response:

```json
{
  "id": "123456789012345" // This is your dataset_id
}
```

### Option 2: Create via Events Manager

1. Go to [Events Manager](https://business.facebook.com/events_manager)
2. Click **Connect Data Sources**
3. Select **Business Messaging**
4. Select your WhatsApp Business Account
5. Complete setup wizard
6. Copy the Dataset ID

### Update Database with Dataset ID

```sql
UPDATE clients
SET meta_dataset_id = '123456789012345'  -- Your dataset ID
WHERE id = 'YOUR_CLIENT_UUID';
```

---

## ✅ Verification & Testing

### 1. Test Webhook Verification

```bash
# Test GET endpoint
curl "https://your-domain.com/api/webhook/meta-ads?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"

# Expected response: test123
```

### 2. Test Conversion Event

```bash
# In your app, move a card to "Fechado" column
# Check logs for:
# [CAPI] Sending Purchase event for phone 5511999999999...
# [CAPI] ✅ Successfully sent Purchase event
```

### 3. Verify in Events Manager

1. Go to [Events Manager](https://business.facebook.com/events_manager)
2. Select your Business Messaging dataset
3. Click **Test Events**
4. You should see your test events

### 4. Test Marketing API

```bash
# Test insights endpoint
curl "https://your-domain.com/api/crm/meta-insights?date_from=2025-01-01&date_to=2025-01-31" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

---

## 🔧 Troubleshooting

### "No ctwa_clid found"

**Cause:** Lead didn't come from a Meta Ad (Click-to-WhatsApp)

**Solution:** This is expected. Conversions API only works for leads that have a ctwa_clid, which is only present when someone clicks a CTWA ad.

### "Meta Ads not configured"

**Cause:** Missing `meta_waba_id` or `meta_dataset_id` in clients table

**Solution:**

```sql
SELECT id, meta_waba_id, meta_dataset_id, meta_ad_account_id
FROM clients WHERE id = 'YOUR_CLIENT_ID';
```

Ensure all three values are set.

### "No access token configured"

**Cause:** Token not in vault

**Solution:**

```sql
-- Check if token exists
SELECT * FROM vault.decrypted_secrets
WHERE name = 'meta_access_token';

-- If missing, create it
SELECT vault.create_secret(
  'meta_access_token',
  'YOUR_TOKEN',
  'Meta access token'
);
```

### Webhook Not Receiving Events

1. **Check URL is publicly accessible**
2. **Verify SSL certificate is valid**
3. **Check Meta Developer Console** for webhook errors
4. **Verify subscription** is active for correct events

### "Ads Management Standard Access" Required

For Marketing API, you need:

1. 1500+ API calls with <10% error rate
2. Or complete Business Verification
3. Or request access in App Review

---

## 📚 References

- [Conversions API for Business Messaging](https://developers.facebook.com/docs/marketing-api/conversions-api/business-messaging)
- [Marketing API Insights](https://developers.facebook.com/docs/marketing-api/insights)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta Webhooks](https://developers.facebook.com/docs/graph-api/webhooks)
- [System Users](https://developers.facebook.com/docs/marketing-api/system-users)

---

_Last updated: January 2026_
