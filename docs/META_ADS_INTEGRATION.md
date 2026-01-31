# Meta Ads Integration - WhatsApp Chatbot

## Resumo

Este documento descreve a integração atual com Meta Ads via WhatsApp webhook e possíveis integrações futuras com a Meta Marketing API e Conversions API.

---

## 📍 Status Atual: Implementado ✅

### Captura de Click-to-WhatsApp Ads (CTWA)

Quando um usuário clica em um anúncio "Click-to-WhatsApp" no Facebook/Instagram, a Meta envia dados adicionais no webhook do WhatsApp. **Essa funcionalidade já está implementada.**

#### Fluxo Atual

```
[Usuário clica no anúncio]
    → [WhatsApp abre com mensagem]
    → [Webhook recebe mensagem + referral object]
    → [parseMessage.ts extrai dados do referral]
    → [captureLeadSource.ts salva em lead_sources]
    → [CRM Analytics mostra origem dos leads]
```

#### Arquivos Implementados

| Arquivo                                                                     | Função                            |
| --------------------------------------------------------------------------- | --------------------------------- |
| [src/nodes/parseMessage.ts](../src/nodes/parseMessage.ts#L91-L109)          | Extrai dados do `referral` object |
| [src/nodes/captureLeadSource.ts](../src/nodes/captureLeadSource.ts)         | Salva lead_source no banco        |
| [src/flows/chatbotFlow.ts](../src/flows/chatbotFlow.ts#L222)                | Chama captureLeadSource           |
| [src/app/api/crm/analytics/route.ts](../src/app/api/crm/analytics/route.ts) | Agrega dados por origem           |

#### Estrutura do Referral Object (WhatsApp Webhook)

```json
{
  "referral": {
    "source_url": "https://fb.me/AAAAA",
    "source_type": "ad",
    "source_id": "1234567890",
    "headline": "Nossa Promoção",
    "body": "Conheça nossos produtos",
    "media_type": "image",
    "ctwa_clid": "ARAkLkA8rmlFeiCktEJQ-QTwRiyYHAFDLMNDBH0CD3qpjd..."
  }
}
```

#### Dados Capturados

| Campo         | Descrição            | Uso                                |
| ------------- | -------------------- | ---------------------------------- |
| `source_type` | Tipo da fonte ("ad") | Identificar que veio de anúncio    |
| `source_id`   | ID do Ad Set         | Agrupar por campanha               |
| `source_url`  | URL do Facebook      | Link para o anúncio                |
| `headline`    | Título do anúncio    | Contexto visual                    |
| `body`        | Corpo do anúncio     | Contexto visual                    |
| `ctwa_clid`   | Click ID único       | **Essencial para Conversions API** |

---

## 🚀 Integrações Futuras

### 1. Conversions API for Business Messaging

**Objetivo**: Enviar eventos de conversão de volta para a Meta para otimizar campanhas.

A [Conversions API for Business Messaging](https://developers.facebook.com/docs/marketing-api/conversions-api/business-messaging) permite enviar eventos como "Lead", "Purchase", "QualifiedLead" quando eles acontecem no WhatsApp.

#### Por que implementar?

1. **Otimização de Campanhas**: A Meta pode otimizar anúncios para pessoas mais propensas a converter
2. **Atribuição Precisa**: Conectar conversões offline/WhatsApp ao anúncio que gerou
3. **Melhor ROI**: Entender verdadeiro custo por lead/venda

#### Pré-requisitos

- Facebook Developer App configurado
- Permissões:
  - `whatsapp_business_management`
  - `whatsapp_business_manage_events`
- "Ads Management Standard Access" (1500+ chamadas à API com <10% erro)
- Token de acesso com escopo adequado

#### Implementação Proposta

##### Passo 1: Criar Dataset

```bash
POST https://graph.facebook.com/v20.0/{WHATSAPP_BUSINESS_ACCOUNT_ID}/dataset
Authorization: Bearer {ACCESS_TOKEN}
```

##### Passo 2: Armazenar ctwa_clid

O `ctwa_clid` **já é extraído** em `parseMessage.ts` e salvo em `lead_sources.raw_data`.

```typescript
// Já implementado em parseMessage.ts (linha 103)
ctwa_clid: ref.ctwa_clid,
```

##### Passo 3: Criar Node para Enviar Eventos

```typescript
// src/nodes/sendConversionEvent.ts (PROPOSTO)
import { createServiceRoleClient } from "@/lib/supabase";

interface ConversionEvent {
  clientId: string;
  phone: number;
  eventName: "Lead" | "Purchase" | "QualifiedLead" | "InitiateCheckout";
  eventTime?: number;
  customData?: {
    value?: number;
    currency?: string;
  };
}

export async function sendConversionEvent(event: ConversionEvent) {
  const supabase = createServiceRoleClient();

  // 1. Buscar ctwa_clid da lead_source
  const { data: leadSource } = await supabase
    .from("lead_sources")
    .select("raw_data")
    .eq("client_id", event.clientId)
    .eq("phone", event.phone)
    .eq("source_type", "ad")
    .single();

  const ctwaClid = leadSource?.raw_data?.ctwa_clid;
  if (!ctwaClid) {
    console.log("[CAPI] No ctwa_clid found, skipping");
    return null;
  }

  // 2. Buscar configuração Meta do cliente
  const { data: client } = await supabase
    .from("clients")
    .select("meta_dataset_id, meta_waba_id, meta_access_token")
    .eq("id", event.clientId)
    .single();

  if (!client?.meta_dataset_id) {
    console.log("[CAPI] Meta dataset not configured");
    return null;
  }

  // 3. Enviar evento para Conversions API
  const response = await fetch(
    `https://graph.facebook.com/v20.0/${client.meta_dataset_id}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${client.meta_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [
          {
            event_name: event.eventName,
            event_time: event.eventTime || Math.floor(Date.now() / 1000),
            action_source: "business_messaging",
            messaging_channel: "whatsapp",
            user_data: {
              whatsapp_business_account_id: client.meta_waba_id,
              ctwa_clid: ctwaClid,
            },
            custom_data: event.customData,
          },
        ],
        partner_agent: "uzzbot",
      }),
    },
  );

  return response.json();
}
```

##### Passo 4: Integrar com CRM

Quando card muda de coluna (ex: "Novo" → "Fechado"):

```typescript
// Em handleMoveCard (useCRMCards.ts) - PROPOSTO
if (newColumn.slug === "fechado") {
  await sendConversionEvent({
    clientId,
    phone: card.phone,
    eventName: "Purchase",
    customData: {
      value: card.estimated_value,
      currency: "BRL",
    },
  });
}
```

#### Eventos Suportados

| Evento             | Quando Enviar                   |
| ------------------ | ------------------------------- |
| `Lead`             | Card criado automaticamente     |
| `QualifiedLead`    | Card movido para "Qualificando" |
| `InitiateCheckout` | Card movido para "Proposta"     |
| `Purchase`         | Card movido para "Fechado"      |

---

### 2. Marketing API Insights

**Objetivo**: Puxar métricas de campanhas para exibir no dashboard.

A [Marketing API](https://developers.facebook.com/docs/marketing-api/insights) permite consultar métricas como:

- Impressões
- Cliques
- Gastos
- CPM / CPC / CPA

#### Implementação Proposta

```typescript
// src/app/api/crm/meta-insights/route.ts (PROPOSTO)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("client_id");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  // 1. Buscar IDs de campanhas do lead_sources
  const supabase = createServiceRoleClient();
  const { data: sources } = await supabase
    .from("lead_sources")
    .select("raw_data->source_id")
    .eq("client_id", clientId)
    .eq("source_type", "ad");

  const adSetIds = [...new Set(sources?.map((s) => s.source_id))];

  // 2. Buscar insights da Marketing API
  const { data: client } = await supabase
    .from("clients")
    .select("meta_ad_account_id, meta_access_token")
    .eq("id", clientId)
    .single();

  const insights = await fetch(
    `https://graph.facebook.com/v20.0/act_${client.meta_ad_account_id}/insights?` +
      `fields=campaign_name,spend,impressions,clicks,actions&` +
      `time_range={"since":"${dateFrom}","until":"${dateTo}"}&` +
      `filtering=[{"field":"adset.id","operator":"IN","value":${JSON.stringify(
        adSetIds,
      )}}]`,
    {
      headers: {
        Authorization: `Bearer ${client.meta_access_token}`,
      },
    },
  );

  return NextResponse.json(await insights.json());
}
```

#### Dashboard de ROI

Com os dados combinados, seria possível mostrar:

| Campanha     | Gasto   | Leads | Vendas | CPL      | CPA    | ROI  |
| ------------ | ------- | ----- | ------ | -------- | ------ | ---- |
| Promo Verão  | R$ 500  | 50    | 5      | R$ 10    | R$ 100 | 200% |
| Black Friday | R$ 1000 | 80    | 12     | R$ 12.50 | R$ 83  | 350% |

---

## 📊 Roadmap de Implementação

### Curto Prazo (Já Feito) ✅

- [x] Captura de referral no webhook
- [x] Salvamento em lead_sources
- [x] Analytics de origem no CRM

### Médio Prazo (v2.1)

- [ ] Configuração de Dataset por cliente
- [ ] Node sendConversionEvent
- [ ] Trigger automático ao mover card
- [ ] Logs de eventos enviados

### Longo Prazo (v3.0)

- [ ] Marketing API Insights
- [ ] Dashboard de ROI por campanha
- [ ] Alertas de performance
- [ ] Auto-pause de campanhas com CPL alto

---

## 🔧 Configuração Necessária (Futura)

### Novas Variáveis de Ambiente

```env
# Para Conversions API (por cliente, via banco)
# Armazenado em clients table, não em .env
```

### Novas Colunas na Tabela clients

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta_waba_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta_dataset_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta_ad_account_id TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS meta_access_token TEXT; -- Criptografado
```

### Nova Tabela (Opcional)

```sql
CREATE TABLE IF NOT EXISTS conversion_events_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id),
  phone NUMERIC NOT NULL,
  event_name TEXT NOT NULL,
  ctwa_clid TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  response JSONB,
  status TEXT DEFAULT 'sent'
);
```

---

## 📚 Referências

- [Conversions API for Business Messaging](https://developers.facebook.com/docs/marketing-api/conversions-api/business-messaging)
- [WhatsApp Cloud API Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components)
- [Marketing API Insights](https://developers.facebook.com/docs/marketing-api/insights)
- [Click-to-WhatsApp Ads](https://developers.facebook.com/docs/whatsapp/business-management-api/click-to-whatsapp)

---

## Autor

Documentação criada em Janeiro 2025 como parte do módulo CRM do WhatsApp Chatbot.
