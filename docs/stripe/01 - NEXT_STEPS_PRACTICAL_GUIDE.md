# Stripe - Guia Prático de Próximos Passos

> **Data:** 15/03/2026
> **Objetivo:** Configurar Stripe do zero até primeiro pagamento funcional
> **Tempo estimado:** 2-4 horas
> **Pré-requisito:** Conta Stripe criada (https://dashboard.stripe.com)

---

## Status Atual

✅ **Código:** 100% implementado (1.718 linhas, 23 arquivos)
✅ **Migrations:** Arquivos prontos (2 migrations, 7 tabelas)
✅ **Documentação:** Completa
⚠️ **Configuração:** 0% (bloqueante para go-live)

---

## Fase 1: Configuração Inicial (30-45 min)

### Passo 1.1: Obter Chaves do Stripe

1. Acessar: https://dashboard.stripe.com/test/apikeys
2. Modo: **Test mode** (switch no canto superior direito)
3. Copiar:
   - `Publishable key` (começa com `pk_test_`)
   - `Secret key` (clicar "Reveal" e copiar, começa com `sk_test_`)

### Passo 1.2: Criar Arquivo .env.local

Na raiz do projeto, criar/editar `.env.local`:

```env
# ============================================================
# STRIPE - Chaves de API
# ============================================================

# Test mode (trocar para live depois)
STRIPE_SECRET_KEY=sk_test_COLE_SUA_CHAVE_AQUI
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_COLE_SUA_CHAVE_AQUI

# Webhooks (deixar vazio por enquanto, será preenchido no Passo 2)
STRIPE_WEBHOOK_SECRET=
STRIPE_CONNECT_WEBHOOK_SECRET=
STRIPE_PLATFORM_WEBHOOK_SECRET=

# Configuração
STRIPE_APPLICATION_FEE_PERCENT=10
NEXT_PUBLIC_APP_URL=https://uzzapp.uzzai.com.br
```

**Validação:**
```bash
# Verificar se env vars foram carregadas (após restart)
echo $STRIPE_SECRET_KEY
# Deve mostrar: sk_test_...
```

### Passo 1.3: Aplicar Migrations no Banco

```bash
# 1. Verificar migrations pendentes
supabase db diff

# 2. Aplicar migrations
supabase db push

# 3. Validar (no Supabase SQL Editor ou via comando)
# SQL:
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE 'stripe_%' OR table_name LIKE 'platform_%' OR table_name = 'webhook_events')
ORDER BY table_name;
```

**Resultado esperado (7 tabelas):**
```
platform_client_subscriptions
platform_payment_history
stripe_accounts
stripe_orders
stripe_products
stripe_subscriptions
webhook_events
```

### Passo 1.4: Fazer Deploy/Restart

```bash
# Se local (Next.js dev server)
npm run dev

# Se Vercel
vercel --prod
# Ou via dashboard: Settings → Redeploy

# Aguardar deploy concluir (2-3 min)
```

---

## Fase 2: Configurar Webhooks (30 min)

### Passo 2.1: Criar Endpoint 1 (Connect V1)

1. Acessar: https://dashboard.stripe.com/test/webhooks
2. Clicar: **Add endpoint**
3. Preencher:
   - **Endpoint URL:** `https://uzzapp.uzzai.com.br/api/stripe/webhooks`
   - **Description:** Connect V1 - Checkout and subscriptions
   - **Version:** Latest API version
   - **Events to send:** Clicar "Select events"

4. Selecionar eventos (aba "Events on connected accounts"):
   ```
   ☑ checkout.session.completed
   ☑ customer.subscription.created
   ☑ customer.subscription.updated
   ☑ customer.subscription.deleted
   ☑ invoice.payment_succeeded
   ☑ invoice.paid
   ☑ invoice.payment_failed
   ☑ payment_method.attached
   ☑ payment_method.detached
   ☑ customer.updated
   ☑ billing_portal.session.created
   ```

5. Clicar: **Add endpoint**
6. Copiar o **Signing secret** (começa com `whsec_`)
7. Adicionar ao `.env.local`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_COLE_O_SECRET_AQUI
   ```

### Passo 2.2: Criar Endpoint 2 (Connect V2 Thin)

1. Mesmo dashboard: **Add endpoint**
2. Preencher:
   - **Endpoint URL:** `https://uzzapp.uzzai.com.br/api/stripe/webhooks/connect`
   - **Description:** Connect V2 Thin - Account updates
   - **Listen to:** Events on connected accounts
   - **Payload style:** ⚠️ **Thin (v2 events)**

3. Selecionar eventos (aba "V2 Events"):
   ```
   ☑ v2.core.account[requirements].updated
   ☑ v2.core.account[configuration.merchant].capability_status_updated
   ☑ v2.core.account[configuration.customer].capability_status_updated
   ☑ v2.core.account[configuration.recipient].capability_status_updated
   ```

4. Clicar: **Add endpoint**
5. Copiar o **Signing secret**
6. Adicionar ao `.env.local`:
   ```env
   STRIPE_CONNECT_WEBHOOK_SECRET=whsec_COLE_O_SECRET_AQUI
   ```

### Passo 2.3: Criar Endpoint 3 (Platform)

1. Mesmo dashboard: **Add endpoint**
2. Preencher:
   - **Endpoint URL:** `https://uzzapp.uzzai.com.br/api/stripe/platform/webhooks`
   - **Description:** Platform Billing - UzzAI subscriptions
   - **Listen to:** Events on your account

3. Selecionar eventos:
   ```
   ☑ customer.subscription.created
   ☑ customer.subscription.updated
   ☑ customer.subscription.deleted
   ☑ customer.subscription.resumed
   ☑ customer.subscription.trial_will_end
   ☑ invoice.paid
   ☑ invoice.payment_succeeded
   ☑ invoice.payment_failed
   ```

4. Clicar: **Add endpoint**
5. Copiar o **Signing secret**
6. Adicionar ao `.env.local`:
   ```env
   STRIPE_PLATFORM_WEBHOOK_SECRET=whsec_COLE_O_SECRET_AQUI
   ```

### Passo 2.4: Fazer Redeploy

```bash
# Redeploy com os 3 secrets configurados
vercel --prod

# Ou restart local
npm run dev
```

### Passo 2.5: Testar Webhooks

1. No Stripe Dashboard, para cada endpoint:
   - Clicar no endpoint
   - Clicar "Send test event"
   - Escolher um evento (ex: `checkout.session.completed`)
   - Clicar "Send test event"
   - Verificar: **Response: 200 OK**

2. Validar no banco:
```sql
-- No Supabase SQL Editor
SELECT event_scope, event_type, status, created_at
FROM webhook_events
ORDER BY created_at DESC
LIMIT 10;
```

**Resultado esperado:**
```
v1          | checkout.session.completed | processed | 2026-03-15 ...
v2_connect  | v2.core.account[requirements].updated | processed | 2026-03-15 ...
v1_platform | customer.subscription.created | processed | 2026-03-15 ...
```

Se a tabela estiver vazia: ⚠️ verificar logs do servidor, URL do webhook, ou secrets incorretos.

---

## Fase 3: Criar Produtos da Plataforma (15 min)

### Passo 3.1: Produto 1 - Assinatura Mensal

1. Acessar: https://dashboard.stripe.com/test/products
2. Clicar: **Add product**
3. Preencher:
   - **Name:** UzzAI Platform Subscription
   - **Description:** Acesso mensal à plataforma UzzAI
   - **Pricing model:** Standard pricing
   - **Price:** R$ 249,00
   - **Billing period:** Monthly
   - **Currency:** BRL (Brazilian Real)

4. Clicar: **Save product**
5. Copiar o **Price ID** (começa com `price_`)
6. Copiar o **Product ID** (começa com `prod_`)
7. Adicionar ao `.env.local`:
   ```env
   STRIPE_PLATFORM_PRICE_ID=price_COLE_AQUI
   STRIPE_PLATFORM_PRODUCT_ID=prod_COLE_AQUI
   ```

### Passo 3.2: Produto 2 - Setup Fee (Opcional)

1. **Add product**
2. Preencher:
   - **Name:** UzzAI Setup Fee
   - **Description:** Taxa única de configuração
   - **Pricing model:** One time
   - **Price:** R$ 99,00
   - **Currency:** BRL

3. **Save product**
4. Copiar IDs e adicionar ao `.env.local`:
   ```env
   STRIPE_PLATFORM_SETUP_FEE_PRICE_ID=price_COLE_AQUI
   STRIPE_PLATFORM_SETUP_FEE_PRODUCT_ID=prod_COLE_AQUI
   ```

### Passo 3.3: Redeploy Final

```bash
vercel --prod
# Ou restart local
```

---

## Fase 4: Testes End-to-End (1-2 horas)

### Teste 1: Onboarding Stripe Connect (Cliente cria conta)

**Objetivo:** Cliente conecta sua conta Stripe para receber pagamentos.

1. **Login no dashboard**
   ```
   URL: https://uzzapp.uzzai.com.br/dashboard/payments/onboarding
   Login com usuário de teste
   ```

2. **Iniciar onboarding**
   - Preencher:
     - **Email:** seu-email@teste.com
     - **Business name:** Loja de Teste
   - Clicar: **Conectar ao Stripe**

3. **Redirecionamento Stripe**
   - Aguardar redirect para `connect.stripe.com`
   - Preencher formulário KYC (use dados de teste)
   - Clicar "Finish"

4. **Validar retorno**
   - URL deve ser: `/dashboard/payments/onboarding?accountId=acct_xxx`
   - Status deve mostrar: "Onboarding em andamento" ou "Conta ativa"

5. **Validar banco**
   ```sql
   SELECT stripe_account_id, account_status, charges_enabled
   FROM stripe_accounts
   WHERE client_id = 'UUID_DO_SEU_CLIENTE';
   ```
   - Resultado esperado: 1 linha com `account_status` = `"active"` ou `"onboarding"`

**✅ Sucesso:** Conta conectada criada
**❌ Erro comum:** URL de webhook incorreta → verificar `.env.local`

---

### Teste 2: Criar Produto

**Objetivo:** Cliente cria produto para vender.

1. **Acessar produtos**
   ```
   URL: https://uzzapp.uzzai.com.br/dashboard/payments/products
   ```

2. **Criar produto**
   - Clicar: **Criar produto**
   - Preencher:
     - **Nome:** Camiseta Teste
     - **Descrição:** Produto de teste
     - **Preço:** R$ 50,00
     - **Tipo:** Pagamento único (one_time)
     - **Moeda:** BRL
   - Clicar: **Salvar**

3. **Validar banco**
   ```sql
   SELECT
     name,
     stripe_product_id,
     stripe_price_id,
     amount,
     active
   FROM stripe_products
   WHERE client_id = 'UUID_DO_SEU_CLIENTE'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Resultado esperado: 1 produto com `stripe_product_id` preenchido (começa com `prod_`)

**✅ Sucesso:** Produto sincronizado com Stripe
**❌ Erro comum:** Conta não ativa → completar onboarding primeiro

---

### Teste 3: Checkout Público (Compra de Produto)

**Objetivo:** Cliente final compra produto no storefront.

1. **Buscar slug do cliente**
   ```sql
   SELECT slug FROM clients WHERE id = 'UUID_DO_SEU_CLIENTE';
   ```

2. **Acessar storefront**
   ```
   URL: https://uzzapp.uzzai.com.br/store/SEU_SLUG
   ```
   - Deve listar produtos ativos

3. **Clicar em produto** → **Comprar**
   - Redireciona para `checkout.stripe.com`

4. **Preencher checkout (Stripe test mode)**
   - **Email:** comprador@teste.com
   - **Card number:** `4242 4242 4242 4242`
   - **Expiry:** 12/34
   - **CVC:** 123
   - **ZIP:** 12345
   - Clicar: **Pay**

5. **Validar redirecionamento**
   - URL: `/store/SEU_SLUG/success?session_id=cs_xxx`

6. **Validar webhook**
   ```sql
   SELECT event_type, status, created_at
   FROM webhook_events
   WHERE event_type = 'checkout.session.completed'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Status deve ser: `"processed"`

7. **Validar pedido**
   ```sql
   SELECT
     stripe_payment_intent_id,
     status,
     amount,
     application_fee_amount
   FROM stripe_orders
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Resultado esperado:
     - `status` = "paid"
     - `amount` = 5000 (R$ 50,00 em centavos)
     - `application_fee_amount` = 500 (10% = R$ 5,00)

**✅ Sucesso:** Checkout funcionando + webhook processado
**❌ Erro comum:** Webhook secret incorreto → verificar logs

---

### Teste 4: Idempotência de Webhook

**Objetivo:** Garantir que eventos duplicados não causem ações duplicadas.

1. **Acessar Stripe Dashboard**
   ```
   URL: https://dashboard.stripe.com/test/webhooks
   ```

2. **Selecionar endpoint V1**
3. **Enviar evento de teste 3 vezes**
   - Clicar: "Send test event"
   - Escolher: `checkout.session.completed`
   - Clicar: "Send test event" → aguardar
   - Repetir 2 vezes

4. **Validar no banco**
   ```sql
   SELECT stripe_event_id, COUNT(*) as count
   FROM webhook_events
   WHERE stripe_event_id LIKE 'evt_%'
   GROUP BY stripe_event_id
   HAVING COUNT(*) > 1;
   ```
   - Resultado esperado: **0 linhas** (nenhum evento duplicado)

**✅ Sucesso:** Idempotência funcionando
**❌ Erro:** Se COUNT > 1, verificar constraint UNIQUE em `stripe_event_id`

---

## Fase 5: Ir para Produção (30 min)

### Passo 5.1: Trocar para Live Mode

1. **Stripe Dashboard:** Desligar "Test mode" (switch superior direito)
2. **Obter chaves live:**
   - Acessar: https://dashboard.stripe.com/apikeys
   - Copiar `pk_live_...` e `sk_live_...`

3. **Atualizar `.env.local` (ou Vercel env vars):**
   ```env
   STRIPE_SECRET_KEY=sk_live_SUA_CHAVE_LIVE
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_SUA_CHAVE_LIVE
   ```

### Passo 5.2: Recriar Webhooks em Live Mode

⚠️ **IMPORTANTE:** Webhooks de test mode NÃO funcionam em live mode!

1. Repetir **Fase 2** (Passo 2.1, 2.2, 2.3) em **live mode**
2. Obter novos `whsec_...` (live)
3. Atualizar env vars com secrets de live
4. Redeploy

### Passo 5.3: Recriar Produtos da Plataforma em Live

1. Repetir **Fase 3** em live mode
2. Atualizar `STRIPE_PLATFORM_PRICE_ID` etc. com IDs de live

### Passo 5.4: Primeiro Cliente Real

1. Onboarding real (dados reais de KYC)
2. Criar produto real
3. Testar compra de R$ 1,00 (teste mínimo)
4. Validar webhook live
5. Validar recebimento da application fee

---

## Troubleshooting

### Problema: Webhook retorna 400

**Causa:** Secret incorreto ou URL errada

**Solução:**
1. Verificar URL: `https://uzzapp.uzzai.com.br/api/stripe/webhooks` (sem trailing slash)
2. Verificar env var `STRIPE_WEBHOOK_SECRET` exata (copiar do Dashboard)
3. Redeploy após alterar env var
4. Testar novamente

### Problema: Migration falha com "table already exists"

**Causa:** Migration já foi aplicada parcialmente

**Solução:**
```sql
-- Verificar quais tabelas existem
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'stripe_%';

-- Se necessário, dropar e reaplicar (⚠️ perde dados):
DROP TABLE IF EXISTS webhook_events, stripe_orders, stripe_subscriptions, stripe_products, stripe_accounts CASCADE;
```

Depois executar: `supabase db push`

### Problema: Produto não aparece no storefront

**Causa:** Produto não ativo ou RLS bloqueando

**Solução:**
1. Verificar `active = true` em `stripe_products`
2. Verificar RLS policy "Anon can read active products"
3. Query de teste:
   ```sql
   SELECT * FROM stripe_products WHERE active = true;
   ```

---

## Checklist Final de Go-Live

Antes de liberar para clientes reais:

- [ ] ✅ Chaves live configuradas
- [ ] ✅ 3 webhooks criados em live mode
- [ ] ✅ Secrets de webhook configurados
- [ ] ✅ Migrations aplicadas em produção
- [ ] ✅ Produtos da plataforma criados em live
- [ ] ✅ Teste de onboarding completo (live)
- [ ] ✅ Teste de criação de produto (live)
- [ ] ✅ Teste de checkout R$ 1,00 (live)
- [ ] ✅ Webhook de live processado com sucesso
- [ ] ✅ Application fee coletada (validar no Stripe Dashboard)
- [ ] ✅ Idempotência testada (live)
- [ ] ✅ Smart Retries configurado (Dashboard → Settings → Billing)

---

## Recursos

### Comandos Úteis

```bash
# Verificar env vars
echo $STRIPE_SECRET_KEY

# Ver logs de webhook (local)
npm run dev
# Monitorar console para logs: [stripe:webhooks:v1]

# Testar via Stripe CLI (opcional)
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhooks
```

### Queries Úteis

```sql
-- Status das contas conectadas
SELECT c.name, sa.account_status, sa.charges_enabled
FROM stripe_accounts sa
JOIN clients c ON sa.client_id = c.id;

-- Produtos ativos
SELECT c.name, sp.name, sp.amount / 100.0 as price
FROM stripe_products sp
JOIN clients c ON sp.client_id = c.id
WHERE sp.active = true;

-- Pedidos recentes
SELECT c.name, so.amount / 100.0 as value, so.status
FROM stripe_orders so
JOIN clients c ON so.client_id = c.id
ORDER BY so.created_at DESC
LIMIT 10;

-- Webhooks processados (últimas 24h)
SELECT event_scope, event_type, COUNT(*)
FROM webhook_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_scope, event_type;
```

---

## Próximos Passos Após Go-Live

1. **Monitoramento:**
   - Configurar alertas para webhooks falhados
   - Dashboard de receita (application fees)
   - Relatório mensal de clientes ativos

2. **Features Futuras:**
   - Portal de assinatura (já implementado: `createBillingPortalSession`)
   - Múltiplas moedas (USD, EUR)
   - Cupons e descontos
   - Planos Pro/Enterprise

3. **Extração para Repositório Próprio:**
   - Consultar: `docs/STRIPE_EXTRACTION_GUIDE.md`
   - Copiar 23 arquivos `@stripe-module`
   - Criar novo projeto Next.js
   - Aplicar migrations

---

*Última atualização: 15/03/2026*
*Versão: 1.0*
*Dúvidas: consultar `docs/stripe/STRIPE_AUDIT_REPORT.md`*
