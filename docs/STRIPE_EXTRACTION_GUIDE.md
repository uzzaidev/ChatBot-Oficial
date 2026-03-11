# Guia de Extracao do Modulo Stripe

Este documento descreve exatamente o que copiar deste repositorio para criar um repositorio independente de pagamentos UzzAI.

## O que copiar

### Pastas completas
- `src/app/api/stripe/`
- `src/app/dashboard/payments/`
- `src/app/store/`

### Arquivos individuais
- `src/lib/stripe.ts`
- `src/lib/stripe-connect.ts`
- `src/components/StripeOnboardingCard.tsx`
- `src/components/ProductCard.tsx`
- `src/components/ProductForm.tsx`
- `src/components/SubscriptionsList.tsx`

### Migration
- `supabase/migrations/20260311130500_stripe_connect.sql`

## O que NAO copiar
- `src/app/api/webhook/` (webhook Meta/WhatsApp)
- `src/flows/` e `src/nodes/` (pipeline de chatbot)
- `src/lib/vault.ts` (segredos de outros modulos)
- Arquivos que nao tenham relacao com `@stripe-module`

## Dependencias necessarias no novo repo
- `stripe`
- `@stripe/stripe-js`
- `next` (App Router)
- `@supabase/supabase-js`

## Variaveis de ambiente necessarias
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `STRIPE_APPLICATION_FEE_PERCENT`
- `NEXT_PUBLIC_APP_URL`
- `STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID` (ou `PRICE_ID`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Ajustes apos copiar
1. Atualizar imports relativos de `@/lib/supabase-server`.
2. Aplicar migration Stripe no novo projeto Supabase.
3. Configurar endpoints de webhook no Stripe Dashboard.
4. Validar onboarding Connect, criacao de produto e checkout.

