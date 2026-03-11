# Migrations Stripe - Registro Completo

## Migration: stripe_connect
- Arquivo: `supabase/migrations/20260311130500_stripe_connect.sql`
- Aplicada em: 11/03/2026
- Status: implementada no codigo (pendente executar `supabase db push` no ambiente alvo)

## Tabelas criadas
- `stripe_accounts` - mapeia `client_id -> stripe_account_id`
- `stripe_products` - catalogo dos produtos da conta conectada
- `stripe_subscriptions` - estado das assinaturas sincronizado por webhook
- `stripe_orders` - pedidos de checkout de pagamento unico
- `webhook_events` - idempotencia para V1/V2

## Relacionamentos
- `stripe_accounts.client_id -> clients.id`
- `stripe_products.client_id -> clients.id`
- `stripe_subscriptions.client_id -> clients.id`
- `stripe_orders.client_id -> clients.id`
- `stripe_subscriptions.product_id -> stripe_products.id`
- `stripe_orders.product_id -> stripe_products.id`

## RLS configurada
- `authenticated`: leitura/escrita apenas do proprio `client_id`
- `anon`: leitura de `stripe_products` ativos (storefront publico)
- `service_role`: acesso total (webhooks e sincronizacao server-side)

## Triggers e indices
- Trigger `update_updated_at_column` em:
  - `stripe_accounts`
  - `stripe_products`
  - `stripe_subscriptions`
  - `stripe_orders`
- Indices para `client_id`, `status`, `active`, `stripe_account_id` e `stripe_event_id`

## Rollback (cuidado: destrutivo)
```sql
DROP TABLE IF EXISTS public.webhook_events;
DROP TABLE IF EXISTS public.stripe_orders;
DROP TABLE IF EXISTS public.stripe_subscriptions;
DROP TABLE IF EXISTS public.stripe_products;
DROP TABLE IF EXISTS public.stripe_accounts;
```

