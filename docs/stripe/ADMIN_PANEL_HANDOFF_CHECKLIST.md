# Admin Panel Handoff Checklist

## Status atual (feito por Codex)
- Webhook Connect V1 reforcado (`/api/stripe/webhooks`):
  - deduplicacao com protecao de race condition.
  - logs operacionais por evento.
  - suporte a `invoice.paid` alem de `invoice.payment_succeeded`.
- Webhook Connect V2 Thin reforcado (`/api/stripe/webhooks/connect`):
  - deduplicacao com protecao de race condition.
  - logs operacionais por evento.
  - sincronizacao de conta para requirements/capability updates.
- Webhook Platform reforcado (`/api/stripe/platform/webhooks`):
  - deduplicacao com protecao de race condition.
  - logs operacionais por evento.
  - suporte adicional a `customer.subscription.resumed` e `customer.subscription.trial_will_end`.
- Mapeamento de status Stripe normalizado:
  - `trialing -> trial`
  - `paused -> suspended`
  - `unpaid -> past_due`
  - `incomplete_expired -> canceled`
  - evita violacao de constraint em `clients.plan_status`.
- Lint do projeto corrigido para Next 16:
  - migrado para `eslint.config.mjs` (flat config).
  - removido `.eslintrc.json`.
  - `npm run lint` volta a rodar sem erro de configuracao circular.

## O que voce faz agora (externo ao codigo)
1. Configurar variaveis de ambiente no servidor:
   - `NEXT_PUBLIC_APP_URL`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_CONNECT_WEBHOOK_SECRET`
   - `STRIPE_PLATFORM_WEBHOOK_SECRET`
   - `STRIPE_PLATFORM_PRICE_ID`
   - `STRIPE_PLATFORM_PRODUCT_ID`
   - `STRIPE_PLATFORM_SETUP_FEE_PRICE_ID`
   - `STRIPE_PLATFORM_SETUP_FEE_PRODUCT_ID`
2. Registrar 3 webhook endpoints no Stripe Dashboard:
   - `https://uzzapp.uzzai.com.br/api/stripe/webhooks` (Connect V1)
   - `https://uzzapp.uzzai.com.br/api/stripe/webhooks/connect` (Connect V2 Thin)
   - `https://uzzapp.uzzai.com.br/api/stripe/platform/webhooks` (Platform)
3. Fazer redeploy da aplicacao com as novas envs.
4. Validar usuario admin real (`role='admin'`, `is_active=true`).
5. Executar teste ponta a ponta no painel admin:
   - clicar `Ativar` em cliente.
   - validar gravacoes em `platform_client_subscriptions`.
   - validar `clients.plan_status`.
6. Simular eventos de pagamento/falha em modo de teste.

## Guia operacional de webhook
- Use este playbook para configurar Dashboard + CLI + validacao SQL:
- `docs/STRIPE_WEBHOOK_ROLLOUT_PLAYBOOK.md`

## Queries de verificacao (voce roda no Supabase)
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

## Quando me chamar de novo
- Logo apos voce concluir os passos externos acima e coletar:
  - screenshot da configuracao dos 3 webhooks.
  - resultado das 3 queries acima.
  - qualquer erro de webhook no Stripe Dashboard (Delivery logs).

## O que fica pendente para Codex depois disso
- Ajustar rapidamente qualquer evento que nao esteja mapeado nos handlers, com base nos logs reais.
- Endurecer regras de lint gradualmente (opcional) sem quebrar o fluxo de deploy.
- Fechar documentacao final de rollout com evidencias de teste.
