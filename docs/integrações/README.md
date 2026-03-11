# 📚 Documentação de Integrações - ChatBot WhatsApp

Este diretório contém documentação sobre integrações com sistemas externos.

---

## 📋 Documentos Disponíveis

### 🏋️ Tecnofit Integration

- **[TECNOFIT_INTEGRATION_PLAN.md](./TECNOFIT_INTEGRATION_PLAN.md)**  
  Plano completo passo a passo para implementar integração com API da Tecnofit.  
  Inclui: configuração, cliente HTTP, adapter, migrations, API routes, UI e testes.

- **[TECNOFIT_API_DETAILS.md](./TECNOFIT_API_DETAILS.md)**  
  Detalhes técnicos da API Tecnofit: endpoints, autenticação JWT, parâmetros, respostas e rate limits.

- **[ANALISE_CRITICA_DOCUMENTACAO.md](./ANALISE_CRITICA_DOCUMENTACAO.md)**  
  Análise crítica da documentação inicial fornecida, identificando erros e adaptações necessárias para a arquitetura do projeto.

---

## 🎯 Como Usar

1. **Leia primeiro** `ANALISE_CRITICA_DOCUMENTACAO.md` para entender o que foi corrigido
2. **Siga o plano** em `TECNOFIT_INTEGRATION_PLAN.md` passo a passo
3. **Consulte as referências** mencionadas no plano para entender padrões existentes

---

## 📖 Padrões de Integração do Projeto

Este projeto segue padrões específicos para integrações:

### Estrutura de Arquivos
```
src/lib/
  tecnofit.ts          # Cliente HTTP (axios)
  tecnofit-adapter.ts  # Adapter (mapeia dados externos → CRM)
src/app/api/
  integrations/tecnofit/
    sync/route.ts      # Endpoint de sincronização
    status/route.ts   # Endpoint de status
src/app/dashboard/
  tecnofit/page.tsx   # UI no dashboard
```

### Secrets (Vault)
- ✅ **SEMPRE** usar Supabase Vault para API keys
- ✅ Secrets armazenados por `client_id` (multi-tenant)
- ✅ Configuração via Dashboard `/dashboard/settings`
- ❌ **NUNCA** colocar secrets em `.env.local`

### Autenticação
- ✅ Todas as rotas protegidas com `getClientIdFromSession()`
- ✅ Rate limiting com `withRateLimit()` wrapper
- ✅ RBAC: verificar role do usuário quando necessário

### Banco de Dados
- ✅ Todas as tabelas têm `client_id` (multi-tenant)
- ✅ IDs externos em `custom_fields` JSONB ou colunas específicas
- ✅ RLS policies para isolamento por cliente

### HTTP Client
- ✅ Usar `axios` (padrão do projeto)
- ✅ Rate limiting: delay entre requisições + retry para 429
- ✅ Timeout: 15s por requisição

### Cache
- ✅ Redis (Upstash) para dados estáticos
- ✅ TTL: 1 hora para produtos/funcionários
- ✅ Reutilizar `getRedisClient()` existente

---

## 🔗 Referências

- **Meta Ads Integration**: `docs/META_ADS_INTEGRATION.md`, `docs/META_ADS_CHECKLIST.md`
- **Arquitetura**: `README.md` (raiz do projeto)
- **Vault**: `docs/security/MULTI_TENANT_API_KEY_ISOLATION.md`

---

**Última atualização:** 2026-02-01

