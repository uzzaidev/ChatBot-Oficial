# 🚀 Deploy e Configuração no Vercel

Guia completo para deploy e configuração de variáveis de ambiente no Vercel após implementação multi-tenant com Vault.

---

## 📋 Pré-requisitos

✅ Migrations `005_fase1_vault_multi_tenant.sql` e `006_setup_default_client.sql` executadas
✅ Cliente default criado no banco: `b21b314f-c49a-467d-94b3-a21ed4412227`
✅ Build local funcionando (`npm run build`)
✅ Código commitado no GitHub

---

## 🔧 Variáveis de Ambiente no Vercel

### ⚠️ CRÍTICO: Adicionar DEFAULT_CLIENT_ID

**Por que é necessário?**

O `DEFAULT_CLIENT_ID` é usado em **dois cenários**:

1. **Webhook Único** (`/api/webhook`): Para saber qual cliente processar quando Meta chama sem clientId na URL
2. **Endpoints de Teste**: Para funcionar sem precisar passar `?clientId=xxx` sempre
3. **Compatibilidade Retroativa**: Sistema single-tenant continua funcionando

**Sem essa variável**, você vai ver esses erros:
```json
{
  "error": "Missing clientId",
  "message": "Provide ?clientId=xxx or set DEFAULT_CLIENT_ID in .env.local"
}
```

### Como Adicionar no Vercel Dashboard

#### Passo 1: Acessar Configurações

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto (ex: `chatbot-v2`)
3. Vá em: **Settings** → **Environment Variables**

#### Passo 2: Adicionar DEFAULT_CLIENT_ID

```
Name: DEFAULT_CLIENT_ID
Value: b21b314f-c49a-467d-94b3-a21ed4412227
Environments: ✅ Production ✅ Preview ✅ Development
```

**Importante**: Marque TODOS os ambientes (Production, Preview, Development)

#### Passo 3: Outras Variáveis Necessárias

Certifique-se que **TODAS** essas variáveis estão configuradas no Vercel:

**Supabase**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Redis**:
```env
REDIS_URL=redis://default:password@redis-host:6379
```

**PostgreSQL** (direct connection):
```env
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
```

**Gmail** (human handoff):
```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
```

**Multi-Tenant** (⭐ NOVO):
```env
DEFAULT_CLIENT_ID=b21b314f-c49a-467d-94b3-a21ed4412227
```

**⚠️ Importante**:
- **NÃO adicione** `META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`, `META_VERIFY_TOKEN`, `OPENAI_API_KEY`, `GROQ_API_KEY` no Vercel
- Esses secrets agora vêm do **Vault** (Supabase), não de env vars
- Manter no `.env.local` é opcional (fallback para desenvolvimento)

#### Passo 4: Redeploy

Depois de adicionar `DEFAULT_CLIENT_ID`:

1. Vá em: **Deployments**
2. Clique nos 3 pontinhos do último deploy
3. Clique em: **Redeploy**
4. Aguarde deploy completar (~2 min)

---

## 🎯 Dois Modos de Webhook (Escolha um)

### Modo 1: Webhook Único (Recomendado para Começar)

**URL**: `https://uzzapp.uzzai.com.br/api/webhook`

**Como funciona**:
1. Meta chama `/api/webhook` (sem clientId na URL)
2. Webhook busca `process.env.DEFAULT_CLIENT_ID`
3. Carrega config do Vault para esse cliente
4. Processa mensagem

**Vantagens**:
- ✅ Não precisa reconfigurar Meta Dashboard
- ✅ Compatível com setup antigo
- ✅ Ideal para 1 cliente

**Requisitos**:
- ✅ `DEFAULT_CLIENT_ID` configurado no Vercel
- ✅ Verify Token no Meta = Verify Token no Vault

**Configuração no Meta Dashboard**:
```
Callback URL: https://uzzapp.uzzai.com.br/api/webhook
Verify Token: <o token que você definiu no script 006>
```

---

### Modo 2: Webhook Dinâmico por Cliente (Multi-Tenant Completo)

**URL**: `https://uzzapp.uzzai.com.br/api/webhook/b21b314f-c49a-467d-94b3-a21ed4412227`

**Como funciona**:
1. Meta chama `/api/webhook/[clientId]` (clientId na URL)
2. Webhook extrai clientId da URL: `params.clientId`
3. Carrega config do Vault para esse cliente
4. Processa mensagem

**Vantagens**:
- ✅ Suporta múltiplos clientes
- ✅ Cada cliente tem URL única
- ✅ Isolamento completo de dados

**Requisitos**:
- ✅ Cliente ativo no banco
- ✅ Verify Token no Meta = Verify Token no Vault
- ⚠️ **NÃO depende** de `DEFAULT_CLIENT_ID`

**Configuração no Meta Dashboard**:
```
Callback URL: https://uzzapp.uzzai.com.br/api/webhook/b21b314f-c49a-467d-94b3-a21ed4412227
Verify Token: <o token que você definiu no script 006>
```

---

## 🧪 Testar Configuração

### Teste 1: Verificar se DEFAULT_CLIENT_ID está funcionando

**Endpoint**: `https://uzzapp.uzzai.com.br/api/test/vault-config`

**Sem DEFAULT_CLIENT_ID** (vai dar erro):
```bash
curl https://uzzapp.uzzai.com.br/api/test/vault-config
```

**Resultado esperado ANTES de configurar**:
```json
{
  "error": "Missing clientId",
  "message": "Provide ?clientId=xxx or set DEFAULT_CLIENT_ID in .env.local"
}
```

**Resultado esperado DEPOIS de configurar**:
```json
{
  "success": true,
  "message": "✅ Vault config loaded successfully!",
  "client": {
    "id": "b21b314f-c49a-467d-94b3-a21ed4412227",
    "name": "Luis Fernando Boff",
    "slug": "default-client",
    "status": "active"
  },
  "apiKeys": {
    "metaAccessToken": "EAAUWWYWAXJYBP...",
    "metaPhoneNumberId": "899639703222013"
  }
}
```

### Teste 2: Verificar webhook dinâmico (não depende de DEFAULT_CLIENT_ID)

```bash
curl https://uzzapp.uzzai.com.br/api/test/vault-config?clientId=b21b314f-c49a-467d-94b3-a21ed4412227
```

**Deve funcionar** mesmo sem `DEFAULT_CLIENT_ID` configurado.

### Teste 3: Verificar webhook único

```bash
# Simular chamada GET da Meta (verificação)
curl "https://uzzapp.uzzai.com.br/api/webhook?hub.mode=subscribe&hub.verify_token=SEU_VERIFY_TOKEN&hub.challenge=test123"
```

**Resultado esperado**: `test123` (retorna o challenge)

### Teste 4: Verificar webhook dinâmico

```bash
# Simular chamada GET da Meta (verificação)
curl "https://uzzapp.uzzai.com.br/api/webhook/b21b314f-c49a-467d-94b3-a21ed4412227?hub.mode=subscribe&hub.verify_token=SEU_VERIFY_TOKEN&hub.challenge=test123"
```

**Resultado esperado**: `test123` (retorna o challenge)

---

## 🔐 Autenticação: Quando Precisa e Quando Não Precisa

### 📱 **Webhooks** (Meta → Servidor)

**Tipo de autenticação**: Verify Token (não precisa de login de usuário)

**Como funciona**:
1. Meta chama webhook com `hub.verify_token` no query string
2. Servidor compara com token armazenado no Vault
3. Se bater, retorna `hub.challenge`

**Não precisa de**:
- ❌ Login de usuário
- ❌ Cookies
- ❌ JWT tokens
- ❌ Session

**Motivo**: Meta é o cliente, não um usuário humano

---

### 🖥️ **Dashboard** (Você → Servidor)

**Tipo de autenticação**: Login com usuário/senha (futuro - não implementado ainda)

**Como vai funcionar** (Phase 3):
1. Você faz login com email/senha
2. Sistema gera JWT token e armazena em cookie
3. Toda requisição do dashboard envia JWT
4. Backend valida JWT e sabe qual cliente você é

**Vai precisar de**:
- ✅ Login page
- ✅ Cookies/JWT
- ✅ Session management
- ✅ Middleware de autenticação

**Status atual**: Dashboard é **público** (sem autenticação)

---

### 🧪 **Endpoints de Teste** (Desenvolvimento)

**Tipo de autenticação**: Nenhuma (são públicos temporariamente)

**Como funcionam**:
- Sem autenticação
- Aceitam `?clientId=xxx` na query string
- Usam `DEFAULT_CLIENT_ID` como fallback

**Endpoints**:
- `/api/test/vault-config`
- `/api/test/nodes/*`

**⚠️ Importante**: Esses endpoints devem ser **desabilitados em produção** ou protegidos com autenticação.

---

## 🛠️ Troubleshooting

### Erro: "Missing clientId"

**Causa**: `DEFAULT_CLIENT_ID` não está configurado no Vercel

**Solução**:
1. Adicionar env var no Vercel (ver seção acima)
2. Redeploy
3. Testar: `curl https://uzzapp.uzzai.com.br/api/test/vault-config`

---

### Erro: "Client not found" no webhook dinâmico

**Causa**: UUID do cliente não existe no banco ou está inativo

**Solução**:
```sql
-- Verificar se cliente existe
SELECT id, name, status FROM clients
WHERE id = 'b21b314f-c49a-467d-94b3-a21ed4412227';

-- Resultado esperado:
-- id: b21b314f-c49a-467d-94b3-a21ed4412227
-- name: Luis Fernando Boff
-- status: active
```

Se não existir, rode novamente o script `006_setup_default_client.sql`.

---

### Erro: "Invalid verification token" na configuração do Meta

**Causa**: Verify Token no Meta Dashboard ≠ Verify Token no Vault

**Solução**:
1. Verificar token no Vault:
```sql
SELECT * FROM client_secrets_decrypted
WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227';
```

2. Copiar valor de `meta_verify_token`

3. Usar **exatamente** esse valor no Meta Dashboard → Webhook Configuration

**⚠️ Importante**: Token é case-sensitive!

---

### Webhook não está sendo chamado pela Meta

**Checklist**:
- ✅ URL configurada no Meta está correta
- ✅ Verify Token foi validado com sucesso (checkmark verde no Meta)
- ✅ Eventos `messages` estão subscritos
- ✅ Deploy completou no Vercel (sem erros)
- ✅ `DEFAULT_CLIENT_ID` configurado (se usando webhook único)

**Testar manualmente**:
```bash
# Verificar se webhook responde
curl https://uzzapp.uzzai.com.br/api/webhook
# Resultado esperado: "Webhook is ready"
```

---

## 📝 Checklist de Deploy

Use este checklist para garantir que tudo está configurado:

### Pré-Deploy
- [ ] Migrations `005` e `006` executadas no Supabase
- [ ] Cliente default criado (ID anotado)
- [ ] Build local funcionando (`npm run build`)
- [ ] Código commitado no GitHub

### Configuração Vercel
- [ ] `DEFAULT_CLIENT_ID` adicionado
- [ ] `SUPABASE_SERVICE_ROLE_KEY` adicionado
- [ ] `REDIS_URL` adicionado
- [ ] `DATABASE_URL` adicionado
- [ ] `GMAIL_USER` e `GMAIL_APP_PASSWORD` adicionados
- [ ] Deploy completado com sucesso

### Testes em Produção
- [ ] `/api/test/vault-config` retorna config do cliente
- [ ] Webhook GET retorna challenge
- [ ] Meta Dashboard mostra webhook verificado (✅ checkmark verde)

### Configuração Meta
- [ ] Callback URL configurada
- [ ] Verify Token configurado
- [ ] Webhook verificado com sucesso
- [ ] Eventos `messages` subscritos

### Teste End-to-End
- [ ] Enviar mensagem via WhatsApp
- [ ] Bot responde corretamente
- [ ] Verificar logs no Vercel: config carregado do Vault

---

## 🎯 Próximos Passos (Após Deploy)

1. **Testar sistema em produção** com mensagens reais do WhatsApp
2. **Monitorar logs** no Vercel para confirmar que Vault está funcionando
3. **Documentar Verify Token** (guardar em lugar seguro, ex: 1Password)
4. **Decidir qual modo de webhook usar**:
   - Single-tenant: Continuar com `/api/webhook`
   - Multi-tenant: Migrar para `/api/webhook/[clientId]`

---

## 📞 Dúvidas Comuns

### 1. Preciso adicionar META_ACCESS_TOKEN no Vercel?

**Não!** Agora esses tokens vêm do **Vault** (Supabase), não de env vars.

**Antes** (Phase 1):
```env
META_ACCESS_TOKEN=EAA...
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
```

**Depois** (Phase 2 - agora):
- ✅ Tokens armazenados no Vault (criptografados)
- ✅ Carregados dinamicamente por cliente
- ❌ Não ficam mais em env vars

**Exceção**: Você PODE manter no `.env.local` para desenvolvimento, mas são opcionais (fallback).

### 2. Como adiciono um novo cliente?

1. Criar arquivo SQL baseado no `006_setup_default_client.sql`
2. Trocar valores: `name`, `slug`, tokens, etc
3. Executar no Supabase SQL Editor
4. Anotar o `client_id` retornado
5. Configurar novo webhook no Meta: `/api/webhook/[novo-client-id]`

### 3. Quando implementar login no dashboard?

**Prioridade**: Phase 3 (ainda não é urgente)

**Por quê**:
- Webhooks não precisam de login (Meta chama diretamente)
- Você é o único usuário do dashboard agora
- Dashboard atual é interno (não exposto para clientes)

**Quando implementar**:
- Quando tiver múltiplos clientes usando o dashboard
- Quando precisar que clientes vejam suas próprias conversas

### 4. DEFAULT_CLIENT_ID é obrigatório?

**Depende do modo de webhook**:

- **Webhook Único** (`/api/webhook`): ✅ **Obrigatório**
- **Webhook Dinâmico** (`/api/webhook/[clientId]`): ❌ Opcional

**Recomendação**: Configurar sempre, mesmo usando webhook dinâmico, para endpoints de teste funcionarem.

---

**Data**: 2025-01-28
**Versão**: 1.0
**Status**: ✅ Pronto para produção
