# Stripe Webhook Rollout Playbook

## Escopo
- Este playbook cobre os 3 endpoints de webhook usados no projeto:
- Connect V1 (snapshot)
- Connect V2 Thin (accounts v2)
- Platform Billing (conta da UzzAI)

## Matriz oficial

| Fluxo | Endpoint | Dashboard: Events from | Payload style | Secret env | Eventos |
|---|---|---|---|---|---|
| Connect V1 | `/api/stripe/webhooks` | Connected accounts | Snapshot | `STRIPE_WEBHOOK_SECRET` | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.paid`, `invoice.payment_failed` |
| Connect V2 Thin | `/api/stripe/webhooks/connect` | Connected accounts | Thin | `STRIPE_CONNECT_WEBHOOK_SECRET` | `v2.core.account[requirements].updated`, `v2.core.account[configuration.merchant].capability_status_updated`, `v2.core.account[configuration.customer].capability_status_updated`, `v2.core.account[configuration.recipient].capability_status_updated` |
| Platform Billing | `/api/stripe/platform/webhooks` | Your account | Snapshot | `STRIPE_PLATFORM_WEBHOOK_SECRET` | `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.resumed`, `customer.subscription.trial_will_end`, `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed` |

## Comandos Stripe CLI (local)

### Connect V1
```bash
stripe listen --forward-connect-to localhost:3000/api/stripe/webhooks
```

### Connect V2 Thin
```bash
stripe listen --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.merchant].capability_status_updated,v2.core.account[configuration.customer].capability_status_updated,v2.core.account[configuration.recipient].capability_status_updated' --forward-thin-to localhost:3000/api/stripe/webhooks/connect
```

### Platform
```bash
stripe listen --forward-to localhost:3000/api/stripe/platform/webhooks
```

## Ordem de execução em produção
1. Definir envs no servidor:
   - `NEXT_PUBLIC_APP_URL`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_CONNECT_WEBHOOK_SECRET`
   - `STRIPE_PLATFORM_WEBHOOK_SECRET`
   - `STRIPE_PLATFORM_PRICE_ID`
   - `STRIPE_PLATFORM_PRODUCT_ID`
   - `STRIPE_PLATFORM_SETUP_FEE_PRICE_ID`
   - `STRIPE_PLATFORM_SETUP_FEE_PRODUCT_ID`
2. Fazer deploy.
3. Criar os 3 destinos no Stripe Dashboard conforme a matriz acima.
4. Copiar os 3 `whsec_...` para as envs corretas.
5. Fazer redeploy.
6. Enviar eventos de teste no Dashboard para cada endpoint.

## Verificação pós-configuração (Supabase SQL)
```sql
select event_scope, event_type, status, stripe_event_id, created_at
from public.webhook_events
order by created_at desc
limit 100;
```

```sql
select client_id, stripe_customer_id, stripe_subscription_id, status, last_payment_status, updated_at
from public.platform_client_subscriptions
order by updated_at desc
limit 50;
```

```sql
select client_id, stripe_invoice_id, amount, status, paid_at, created_at
from public.platform_payment_history
order by created_at desc
limit 50;
```

## Critérios de aceite
- Todos os endpoints respondem HTTP 2xx nos test deliveries.
- `webhook_events` registra os 3 escopos: `v1`, `v2_connect`, `v1_platform`.
- Eventos de cobrança da plataforma atualizam:
  - `platform_client_subscriptions.last_payment_*`
  - `platform_payment_history`
  - `clients.plan_status`

## Arquivos relacionados
- `src/app/api/stripe/webhooks/route.ts`
- `src/app/api/stripe/webhooks/connect/route.ts`
- `src/app/api/stripe/platform/webhooks/route.ts`
- `docs/ADMIN_PANEL_HANDOFF_CHECKLIST.md`
- `docs/ADMIN_PANEL_IMPLEMENTATION.md`
