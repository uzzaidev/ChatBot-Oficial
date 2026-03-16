# Stripe Integration Documentation

**Projeto:** ChatBot-Oficial (UzzAI WhatsApp SaaS)
**Última Atualização:** 15/03/2026
**Status:** ✅ Implementado | ⚠️ Pendente Configuração

---

## 📚 Índice da Documentação

### 🎯 Comece Aqui

#### 1. [EXECUTIVE_SUMMARY.md](./EXECUTIVE_SUMMARY.md)
**Para:** CTOs, Tech Leads, Product Managers
**Conteúdo:** Visão geral executiva em 5 minutos
- Status atual (85% completo)
- Arquitetura implementada
- Próximos passos (resumo)
- Tempo até go-live: 2-4h

**Leia primeiro se você quer:** Entender o status do projeto rapidamente

---

#### 2. [NEXT_STEPS_PRACTICAL_GUIDE.md](./NEXT_STEPS_PRACTICAL_GUIDE.md)
**Para:** Desenvolvedores implementando a configuração
**Conteúdo:** Tutorial passo a passo (600+ linhas)
- Fase 1: Configurar env vars (15 min)
- Fase 2: Criar webhooks no Stripe (30 min)
- Fase 3: Criar produtos (15 min)
- Fase 4: Testes end-to-end (1-2h)
- Fase 5: Ir para produção (30 min)
- Troubleshooting completo

**Leia se você vai:** Configurar o Stripe pela primeira vez

---

#### 3. [STRIPE_AUDIT_REPORT.md](./STRIPE_AUDIT_REPORT.md)
**Para:** Tech leads, revisores de código, auditoria técnica
**Conteúdo:** Relatório técnico completo (800+ linhas)
- Inventário de todos os 23 arquivos Stripe
- Análise detalhada de cada módulo
- Gaps identificados com priorização
- Queries de validação SQL
- Análise de riscos
- Checklist de go-live

**Leia se você precisa:** Entender a implementação técnica em profundidade

---

### 📖 Documentação de Referência

#### 4. [STRIPE_CONNECT_INTEGRATION.md](../STRIPE_CONNECT_INTEGRATION.md)
**Para:** Arquitetos de software, desenvolvedores avançados
**Conteúdo:** Plano técnico completo (1231 linhas)
- Decisão arquitetural (módulo dentro de src/)
- Modelo multi-produto (Platform + Connect)
- Estrutura de pastas definitiva
- Detalhes de cada fase de implementação
- Diagramas Mermaid (fluxos, ER, estados)
- Insights da reunião Stripe (23/02/2026)

**Leia se você precisa:** Entender as decisões arquiteturais

---

#### 5. [STRIPE_EXTRACTION_GUIDE.md](../STRIPE_EXTRACTION_GUIDE.md)
**Para:** Desenvolvedores que vão migrar o módulo Stripe
**Conteúdo:** Guia de extração para repositório próprio
- Lista exata de arquivos a copiar
- Pastas completas vs arquivos individuais
- O que NÃO copiar (código de chatbot)
- Dependências necessárias
- Ajustes pós-cópia

**Leia se você vai:** Criar um repositório separado para o Stripe

---

#### 6. [STRIPE_WEBHOOK_ROLLOUT_PLAYBOOK.md](../STRIPE_WEBHOOK_ROLLOUT_PLAYBOOK.md)
**Para:** DevOps, desenvolvedores configurando webhooks
**Conteúdo:** Matriz oficial de webhooks
- 3 endpoints (V1, V2 Thin, Platform)
- Eventos exatos para cada endpoint
- Comandos Stripe CLI para local dev
- Ordem de execução em produção
- Queries de verificação

**Leia se você precisa:** Configurar webhooks corretamente

---

#### 7. [STRIPE_MIGRATIONS.md](../STRIPE_MIGRATIONS.md)
**Para:** DBAs, desenvolvedores de backend
**Conteúdo:** Registro de migrations
- Migration 1: stripe_connect (5 tabelas)
- Migration 2: platform_billing (2 tabelas)
- Relacionamentos e RLS
- Rollback (cuidado: destrutivo)

**Leia se você precisa:** Aplicar ou reverter migrations

---

## 🗂️ Estrutura de Arquivos Stripe

### Por Categoria

#### Core Libraries (src/lib/)
```
stripe.ts               100 linhas   Singleton client, webhook validation
stripe-connect.ts       549 linhas   Connect operations (accounts, products)
```

#### API Routes (src/app/api/stripe/)
```
webhooks/route.ts                472 linhas   V1 webhook receiver (Connect)
webhooks/connect/route.ts        193 linhas   V2 Thin webhook receiver
platform/webhooks/route.ts       404 linhas   Platform billing webhook

connect/account/route.ts         ~150 linhas  GET/POST account
connect/account-link/route.ts    ~80 linhas   POST account link
connect/products/route.ts        ~120 linhas  GET/POST products
connect/products/[id]/route.ts   ~100 linhas  PUT/DELETE product
connect/subscriptions/route.ts   ~100 linhas  GET subscriptions
connect/subscription-checkout/   ~80 linhas   POST checkout

checkout/route.ts                ~80 linhas   POST storefront checkout
billing-portal/route.ts          ~60 linhas   POST billing portal
platform/subscription/route.ts   ~100 linhas  POST platform subscription
```

#### UI Components (src/components/)
```
StripeOnboardingCard.tsx    219 linhas   Onboarding UI
ProductCard.tsx            ~150 linhas   Product card
ProductForm.tsx            ~200 linhas   Create/edit modal
SubscriptionsList.tsx      ~140 linhas   Subscription list
```

#### Dashboard Pages (src/app/dashboard/payments/)
```
page.tsx              Overview
onboarding/page.tsx   Onboarding flow
products/page.tsx     Product management
```

#### Storefront Pages (src/app/store/)
```
[clientSlug]/page.tsx              List products
[clientSlug]/[productId]/page.tsx  Product details
[clientSlug]/success/page.tsx      Success page
[clientSlug]/cancel/page.tsx       Cancel page
```

#### Migrations (supabase/migrations/)
```
20260311130500_stripe_connect.sql             5 tabelas
20260311200000_platform_client_subscriptions.sql   2 tabelas
```

---

## 🔍 Busca Rápida

### Procurando por...

#### "Como criar uma conta conectada?"
→ `NEXT_STEPS_PRACTICAL_GUIDE.md` - Teste 1: Onboarding

#### "Quais tabelas do banco são do Stripe?"
→ `STRIPE_AUDIT_REPORT.md` - Seção 1.6 Database Migrations

#### "Como funciona o modelo de cobrança dupla?"
→ `EXECUTIVE_SUMMARY.md` - Seção "Arquitetura Implementada"

#### "Quais eventos de webhook devo configurar?"
→ `STRIPE_WEBHOOK_ROLLOUT_PLAYBOOK.md` - Matriz oficial

#### "O que copiar para um repo separado?"
→ `STRIPE_EXTRACTION_GUIDE.md`

#### "Como validar se webhooks estão funcionando?"
→ `STRIPE_AUDIT_REPORT.md` - Seção 8. Queries de Validação

#### "Qual a decisão arquitetural (por que dentro de src/)?"
→ `STRIPE_CONNECT_INTEGRATION.md` - Seção 1

---

## ⚡ Quick Start (5 minutos)

**Para desenvolvedores que querem começar agora:**

1. **Ler:** `EXECUTIVE_SUMMARY.md` (5 min)
2. **Executar:** Fase 1 de `NEXT_STEPS_PRACTICAL_GUIDE.md` (15 min)
3. **Validar:** Queries de `STRIPE_AUDIT_REPORT.md` - Seção 8.1 (2 min)

**Total:** ~22 minutos até primeira validação

---

## 📊 Status por Módulo

| Módulo | Arquivos | Linhas | Status | Documentação |
|--------|----------|--------|--------|--------------|
| Core Library | 2 | 649 | ✅ | STRIPE_CONNECT_INTEGRATION.md §7 |
| API Routes | 12 | ~1500 | ✅ | STRIPE_CONNECT_INTEGRATION.md §8 |
| Webhooks | 3 | 1069 | ✅ | STRIPE_WEBHOOK_ROLLOUT_PLAYBOOK.md |
| UI Components | 4 | ~709 | ✅ | STRIPE_CONNECT_INTEGRATION.md §11 |
| Dashboard | 3 | ~400 | ✅ | STRIPE_CONNECT_INTEGRATION.md §9 |
| Storefront | 4 | ~300 | ✅ | STRIPE_CONNECT_INTEGRATION.md §10 |
| Migrations | 2 | 315 | ⚠️ | STRIPE_MIGRATIONS.md |
| Env Vars | 9 | - | ⚠️ | NEXT_STEPS_PRACTICAL_GUIDE.md - Passo 1.2 |
| Webhooks Config | 3 | - | ⚠️ | NEXT_STEPS_PRACTICAL_GUIDE.md - Fase 2 |
| Testes | 4 | - | ⚠️ | NEXT_STEPS_PRACTICAL_GUIDE.md - Fase 4 |

**Legenda:**
- ✅ Completo e funcional
- ⚠️ Pendente configuração

---

## 🎓 Glossário

| Termo | Significado |
|-------|-------------|
| **Connect** | Stripe Connect - permite clientes terem sua própria conta Stripe |
| **Platform** | Conta principal UzzAI que gerencia as contas conectadas |
| **Application Fee** | Taxa cobrada pela plataforma em cada transação (10%) |
| **V1 Webhook** | Webhook padrão Stripe com payload completo (Snapshot) |
| **V2 Thin Webhook** | Webhook novo Stripe com payload mínimo (busca completo via API) |
| **Idempotência** | Garantir que o mesmo evento não é processado duas vezes |
| **RLS** | Row Level Security - isolamento de dados entre clientes |
| **Onboarding** | Processo KYC/verificação do cliente no Stripe |
| **Connected Account** | Conta Stripe de um cliente (acct_xxx) |
| **KYC** | Know Your Customer - verificação de identidade |

---

## 🔗 Links Externos

### Stripe Resources
- **Dashboard:** https://dashboard.stripe.com
- **API Docs:** https://stripe.com/docs/api
- **Connect Guide:** https://stripe.com/docs/connect
- **Webhooks Guide:** https://stripe.com/docs/webhooks
- **Test Cards:** https://stripe.com/docs/testing

### Supabase Resources
- **Dashboard:** https://app.supabase.com
- **Migrations:** https://supabase.com/docs/guides/cli/local-development#database-migrations
- **RLS:** https://supabase.com/docs/guides/auth/row-level-security

---

## 🐛 Problemas Conhecidos

### 1. Webhook retorna 400 (Invalid signature)
**Causa:** Secret env var incorreto ou desatualizado
**Solução:** `NEXT_STEPS_PRACTICAL_GUIDE.md` - Troubleshooting

### 2. Migration falha: "table already exists"
**Causa:** Migration aplicada parcialmente
**Solução:** `STRIPE_MIGRATIONS.md` - Seção Rollback

### 3. Produto não aparece no storefront
**Causa:** `active = false` ou RLS bloqueando anon
**Solução:** `STRIPE_AUDIT_REPORT.md` - Seção 8.4 Validar Produtos

---

## 📞 Suporte

### Interno (Projeto)
- **Documentação:** Esta pasta (`docs/stripe/`)
- **Código:** Arquivos marcados com `// @stripe-module`
- **Queries:** `STRIPE_AUDIT_REPORT.md` - Seção 8

### Externo (Stripe)
- **Support:** https://support.stripe.com
- **Community:** https://stripe.com/en-br/community
- **Status:** https://status.stripe.com

---

## 📝 Changelog

### 2026-03-15 - Auditoria Completa
- ✅ Criado `STRIPE_AUDIT_REPORT.md` (inventário completo)
- ✅ Criado `NEXT_STEPS_PRACTICAL_GUIDE.md` (tutorial hands-on)
- ✅ Criado `EXECUTIVE_SUMMARY.md` (visão executiva)
- ✅ Criado `README.md` (este arquivo - índice)
- ✅ Validação: 23 arquivos `@stripe-module`, 1.718 linhas, 0 erros TS

### 2026-03-11 - Implementação Core
- ✅ Implementado Stripe Connect (V2 API)
- ✅ Implementado Platform Billing
- ✅ Criadas migrations do banco
- ✅ Implementados 3 webhooks (V1, V2 Thin, Platform)
- ✅ Criado UI completo (Dashboard + Storefront)

### 2026-02-23 - Reunião Stripe
- 📝 Insights registrados em `STRIPE_CONNECT_INTEGRATION.md` §17
- 🎯 Decisões: Stripe Checkout para MVP, PIX one-time only

---

## 🚀 Próxima Atualização Esperada

**Quando:** Após go-live em produção
**Conteúdo:**
- Registro do primeiro cliente real
- Métricas de performance (latência webhooks)
- Relatório de receita (application fees)
- Lições aprendidas

---

*Documentação mantida por: Equipe UzzAI*
*Última revisão: 15/03/2026*
*Versão: 1.0*
