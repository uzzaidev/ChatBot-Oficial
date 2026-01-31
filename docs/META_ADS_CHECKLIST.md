# Meta Ads Integration Checklist

Step-by-step implementation checklist for Meta Ads integration with the WhatsApp CRM.

**Last Updated:** January 31, 2026

---

## Phase 1: Database Setup ✅ DONE

### Migration

- [x] Review migration file: `supabase/migrations/20260131_add_meta_ads_integration.sql`
- [x] Apply migration to Supabase
- [x] Verify new columns exist in `clients` table:
  - `meta_waba_id`
  - `meta_dataset_id`
  - `meta_ad_account_id`
- [x] Verify new tables exist:
  - `conversion_events_log`
  - `crm_column_event_mapping`
  - `lead_sources.conversion_event_sent` column

### Settings UI ✅ DONE

- [x] Added Meta Ads section in `/dashboard/settings`
- [x] Field: Meta Dataset ID (Conversions API)
- [x] Field: Meta Ad Account ID (Marketing API)
- [x] API: `/api/client/meta-config` for saving configs
- [x] API: `/api/vault/secrets` returns new fields

---

## Phase 2: Code Implementation ✅ DONE

### Files Created

- [x] `supabase/migrations/20260131_add_meta_ads_integration.sql`
- [x] `src/nodes/sendConversionEvent.ts` - Conversions API integration
- [x] `src/app/api/webhook/meta-ads/route.ts` - Webhook for Ad Account events
- [x] `src/app/api/crm/meta-insights/route.ts` - Marketing API insights
- [x] `src/app/api/crm/conversion-events/route.ts` - Conversion events log API
- [x] `src/app/api/client/meta-config/route.ts` - Settings API
- [x] `src/app/dashboard/meta-ads/page.tsx` - **Dedicated Meta Ads page**
- [x] `docs/setup/META_DEVELOPER_SETUP.md` - Setup guide

### Files Modified

- [x] `src/app/api/crm/cards/[id]/move/route.ts` - Triggers CAPI on card move
- [x] `src/app/dashboard/settings/page.tsx` - Added Meta Ads fields
- [x] `src/app/api/vault/secrets/route.ts` - Returns Meta Ads config
- [x] `src/components/DashboardNavigation.tsx` - Added Meta Ads nav link
- [x] `src/lib/utils.ts` - Added `formatNumber` and `formatPercent`

### Safety Guarantees

- [x] `sendConversionEvent` returns `success: true` when not configured
- [x] All CAPI calls are async with `.catch()` - don't block card moves
- [x] Node is 100% optional - system works without Meta Ads configured
- [x] All errors are logged but don't break the flow

---

## Phase 2.5: Dashboard Page ✅ DONE

### `/dashboard/meta-ads` - Página Dedicada

- [x] **Tab Visão Geral**: KPIs (Gasto, Leads, CPL, ROI, Conversões, CTR)
- [x] **Tab Campanhas**: Tabela completa com métricas por campanha
- [x] **Tab Eventos CAPI**: Log de eventos enviados para Meta
- [x] **Tab Configuração**: Status da integração e guia de setup
- [x] Filtro por período (data início/fim)
- [x] Navigation link na sidebar

### Métricas Disponíveis (quando configurado)

| Origem     | Métricas                                    |
| ---------- | ------------------------------------------- |
| Meta API   | Spend, Impressions, Clicks, Reach, CPM, CPC |
| CRM        | Leads, Conversions, Revenue                 |
| Calculadas | CPL, CPA, ROI, CTR, Lead-to-Conversion Rate |

---

## Phase 3: Meta Developer Console ⏳ PENDING

### Prerequisites (You need to do this)

- [ ] Log into [Meta Developer Console](https://developers.facebook.com/apps)
- [ ] Select your WhatsApp app

### Permissions

- [ ] Go to **App Review** → **Permissions and Features**
- [ ] Request permission: `whatsapp_business_manage_events`
- [ ] Request permission: `ads_read`
- [ ] Request permission: `leads_retrieval` (optional, for Lead Ads)

### System User Token (if not already done)

> **Note:** If you already have a System User token with WhatsApp permissions, just add the new permissions to it.

- [ ] Go to [Business Settings](https://business.facebook.com/settings)
- [ ] Go to Users → System Users
- [ ] Edit existing System User (or create new)
- [ ] Add permissions:
  - [x] `whatsapp_business_messaging` (already have)
  - [x] `whatsapp_business_management` (already have)
  - [ ] `whatsapp_business_manage_events` ← **ADD THIS**
  - [ ] `ads_read` ← **ADD THIS**
- [ ] Regenerate token if needed
- [ ] Update token in Vault (Settings → Meta Access Token)

---

## Phase 4: Conversions API Dataset ⏳ PENDING

### Create Dataset

Choose ONE option:

**Option A - Via Events Manager (Recommended):**

- [ ] Go to [Events Manager](https://business.facebook.com/events_manager)
- [ ] Click **Connect Data Sources**
- [ ] Select **Business Messaging**
- [ ] Select your WhatsApp Business Account
- [ ] Complete the wizard
- [ ] Copy the Dataset ID

**Option B - Via API:**

```bash
curl -X POST "https://graph.facebook.com/v20.0/{WABA_ID}/dataset" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d "partner_agent=uzzbot-whatsapp-crm"
```

### Configure in Dashboard

- [ ] Go to `/dashboard/settings`
- [ ] Find "Meta Ads Integration" section
- [ ] Enter the Dataset ID in "Meta Dataset ID" field
- [ ] Click Save

---

## Phase 5: Webhook Setup (Optional) ⏳ OPTIONAL

> Only needed if you want to receive Lead Ads data or campaign change notifications.

### Configure Webhook

- [ ] Go to [Meta Developer Console](https://developers.facebook.com/apps)
- [ ] Select your app → Webhooks
- [ ] Select **Ad Account** from dropdown
- [ ] Configure:
  - Callback URL: `https://your-domain.com/api/webhook/meta-ads`
  - Verify Token: Same as WhatsApp or create new
- [ ] Subscribe to events:
  - [ ] `leadgen` (for Lead Ads)
  - [ ] `campaigns` (optional)

---

## Phase 6: Testing ⏳ AFTER SETUP

### Basic Test (Without Ads)

1. [ ] Move a card in CRM (Novo → Qualificando)
2. [ ] Check console logs for `[CAPI]` messages
3. [ ] Should see: `[CAPI] Meta Ads not configured for client` or similar

### With CTWA Ads

1. [ ] Create a Click-to-WhatsApp ad in Ads Manager
2. [ ] Click the ad to start conversation
3. [ ] Card should be created in CRM with `ctwa_clid` in `lead_sources`
4. [ ] Move card through columns
5. [ ] Check Events Manager for received events

### Verify Events

```sql
-- Check conversion events log
SELECT * FROM conversion_events_log
ORDER BY created_at DESC LIMIT 10;

-- Check for errors
SELECT * FROM conversion_events_log
WHERE status = 'error'
ORDER BY created_at DESC;
```

---

## 🚀 Next Steps - Melhorias Futuras

### Prioridade Alta (após configurar Meta)

- [ ] **Gráficos de tendência**: Adicionar charts de evolução temporal (spend, leads, ROI ao longo do tempo)
- [ ] **Detalhes por Ad/AdSet**: Expandir para ver métricas por anúncio individual, não só campanha
- [ ] **Attribution Window**: Mostrar janela de atribuição (7d click, 1d view, etc)

### Prioridade Média

- [ ] **Lead Ads Integration**: Receber leads diretamente do Lead Ads (formulários do Facebook)
- [ ] **Audience Sync**: Sincronizar audiências customizadas do CRM para Meta Ads
- [ ] **A/B Test Tracking**: Identificar qual variante de anúncio gera melhor conversão
- [ ] **Budget Alerts**: Alertas quando gasto se aproximar do limite

### Prioridade Baixa (nice to have)

- [ ] **Creative Performance**: Ver qual criativo (imagem/vídeo) performa melhor
- [ ] **Breakdown por Device**: Mobile vs Desktop metrics
- [ ] **Lookalike Audiences**: Criar audiências lookalike baseadas em conversões
- [ ] **Auto-optimize**: Pausar automático de campanhas com ROI negativo

### Dependências Externas

| Feature           | Requer                                       |
| ----------------- | -------------------------------------------- |
| Ver métricas      | `ads_read` permission + Ad Account ID        |
| Enviar conversões | `whatsapp_business_manage_events` + Dataset  |
| Lead Ads          | `leads_retrieval` permission + Webhook       |
| Audience Sync     | `ads_management` permission (não solicitado) |

---

## Quick Reference

### What's Already Configured

| Setting                        | Status         | Location                       |
| ------------------------------ | -------------- | ------------------------------ |
| `meta_access_token`            | ✅ Existing    | Vault (same token as WhatsApp) |
| `whatsapp_business_account_id` | ✅ Existing    | Settings / clients table       |
| `meta_dataset_id`              | ⏳ Need to add | Settings → Meta Ads section    |
| `meta_ad_account_id`           | ⏳ Need to add | Settings → Meta Ads section    |

### Column → Event Mapping (Default)

| CRM Column     | Meta Event       | When Sent                |
| -------------- | ---------------- | ------------------------ |
| `novo`         | Lead             | First time only          |
| `qualificando` | QualifiedLead    | On move                  |
| `proposta`     | InitiateCheckout | On move                  |
| `fechado`      | Purchase         | On move (includes value) |

---

## Rollback Plan

If issues occur:

1. **Disable Conversion Events (easiest):**

   ```sql
   -- Just remove dataset_id - node will skip CAPI gracefully
   UPDATE clients SET meta_dataset_id = NULL WHERE id = 'YOUR_CLIENT_ID';
   ```

2. **Check Errors:**

   ```sql
   SELECT * FROM conversion_events_log
   WHERE status = 'error'
   ORDER BY created_at DESC LIMIT 10;
   ```

3. **Remove Migration (nuclear option):**
   ```sql
   DROP TABLE IF EXISTS conversion_events_log;
   DROP TABLE IF EXISTS crm_column_event_mapping;
   ALTER TABLE clients DROP COLUMN IF EXISTS meta_waba_id;
   ALTER TABLE clients DROP COLUMN IF EXISTS meta_dataset_id;
   ALTER TABLE clients DROP COLUMN IF EXISTS meta_ad_account_id;
   ```

---

## Success Criteria

- [ ] Conversion events appear in Events Manager within 5 minutes
- [ ] No errors in `conversion_events_log`
- [ ] No impact on existing WhatsApp message flow (tested ✅)
- [ ] Cards move normally even without Meta Ads configured (tested ✅)

---

## Support Resources

- [META_DEVELOPER_SETUP.md](./setup/META_DEVELOPER_SETUP.md) - Full setup guide
- [META_ADS_INTEGRATION.md](./META_ADS_INTEGRATION.md) - Technical documentation
- [Meta Conversions API Docs](https://developers.facebook.com/docs/marketing-api/conversions-api/business-messaging)
- [Meta Marketing API Docs](https://developers.facebook.com/docs/marketing-api)

---

_Created: January 2026_
