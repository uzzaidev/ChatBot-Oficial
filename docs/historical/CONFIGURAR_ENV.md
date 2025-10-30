# ⚙️ Configurar .env.local

## 📋 Passo a Passo Rápido

### 1. Copiar arquivo de exemplo
```bash
cp .env.example .env.local
```

### 2. Adicionar no seu .env.local:

```bash
# =====================================================
# WEBHOOK (SEMPRE USE A URL DE PRODUÇÃO)
# =====================================================
WEBHOOK_BASE_URL=https://chat.luisfboff.com
META_VERIFY_TOKEN=seu_token_aqui

# =====================================================
# SUPABASE
# =====================================================
NEXT_PUBLIC_SUPABASE_URL=https://jhodhxvvhohygijqcxbo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# =====================================================
# POSTGRESQL (Direct Connection)
# =====================================================
POSTGRES_URL_NON_POOLING=postgresql://postgres.jhodhxvvhohygijqcxbo:senha@aws-0-sa-east-1.pooler.supabase.com:5432/postgres

# =====================================================
# EXTERNAL SERVICES
# =====================================================
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...
META_ACCESS_TOKEN=EAAxxxxx
META_PHONE_NUMBER_ID=899639703222013
GMAIL_USER=luisfboff@hotmail.com
GMAIL_PASSWORD=sua_senha_app_gmail
```

---

## 🎯 Por Que WEBHOOK_BASE_URL Usa Sempre Produção?

### Problema com Localhost:
```
❌ localhost:3000 → Meta não consegue chamar
❌ Precisa de ngrok/túnel → Complicado
❌ URL muda toda vez → Difícil de manter
```

### Solução: Usar Produção em DEV e PROD:
```
✅ https://chat.luisfboff.com → Meta consegue chamar
✅ Sem ngrok/túnel → Simples
✅ URL fixa → Fácil de manter
✅ Testa fluxo completo em dev → Confiável
```

### Como Funciona:

**DESENVOLVIMENTO** (`npm run dev`):
```
1. Webhook da Meta → https://chat.luisfboff.com/api/webhook (PRODUÇÃO)
2. Código no Vercel processa
3. Você vê logs no Vercel
4. Testa mudanças localmente ANTES de fazer deploy
```

**PRODUÇÃO** (Vercel):
```
1. Webhook da Meta → https://chat.luisfboff.com/api/webhook (PRODUÇÃO)
2. Código no Vercel processa
3. Tudo funciona igual ao dev
```

---

## 🔧 Configurar no Vercel

### Dashboard do Vercel → Settings → Environment Variables:

```bash
# Adicione TODAS as variáveis do .env.local
# IMPORTANTE: Use os mesmos valores em dev e prod

WEBHOOK_BASE_URL=https://chat.luisfboff.com
META_VERIFY_TOKEN=mesmo_token_do_env_local
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
POSTGRES_URL_NON_POOLING=...
REDIS_URL=...
OPENAI_API_KEY=...
GROQ_API_KEY=...
META_ACCESS_TOKEN=...
META_PHONE_NUMBER_ID=...
GMAIL_USER=...
GMAIL_PASSWORD=...
```

**DICA**: Marque "Production", "Preview" e "Development" para todas as variáveis.

---

## 🔐 Onde Encontrar as Credenciais

### Supabase:
- URL: https://app.supabase.com/project/_/settings/api
- `NEXT_PUBLIC_SUPABASE_URL`: Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: anon public key
- `SUPABASE_SERVICE_ROLE_KEY`: service_role key (secreto!)
- `POSTGRES_URL_NON_POOLING`: Settings → Database → Connection String (Direct Connection)

### Meta (WhatsApp):
- Dashboard: https://developers.facebook.com/apps
- `META_ACCESS_TOKEN`: WhatsApp → API Setup → Temporary Access Token (ou System User Token permanente)
- `META_PHONE_NUMBER_ID`: WhatsApp → API Setup → Phone Number ID
- `META_VERIFY_TOKEN`: Você cria (qualquer string aleatória)

### OpenAI:
- URL: https://platform.openai.com/api-keys
- `OPENAI_API_KEY`: Criar nova chave

### Groq:
- URL: https://console.groq.com/keys
- `GROQ_API_KEY`: Criar nova chave

### Gmail (App Password):
- URL: https://myaccount.google.com/security
- Ative "Verificação em 2 etapas"
- Vá em "Senhas de app"
- Gerar senha para "Mail" → Copiar

### Redis:
- **Local**: `redis://localhost:6379`
- **Produção**: Upstash Redis (https://upstash.com)

---

## ✅ Testar Configuração

```bash
# 1. Verificar se .env.local existe
ls -la .env.local

# 2. Iniciar servidor
npm run dev

# 3. Verificar logs - deve mostrar:
# [WEBHOOK GET] Webhook URL configurada: https://chat.luisfboff.com/api/webhook

# 4. Testar webhook
curl http://localhost:3000/api/webhook
```

---

## 🚨 Problemas Comuns

### Erro: "WEBHOOK_BASE_URL não configurado"
```bash
# Verifique se está no .env.local (não .env.example!)
grep WEBHOOK_BASE_URL .env.local
```

### Erro: "META_VERIFY_TOKEN não configurado"
```bash
# Adicione no .env.local:
META_VERIFY_TOKEN=qualquer_string_aleatoria_aqui
```

### Erro: "Webhook verification failed"
```bash
# O META_VERIFY_TOKEN no .env.local DEVE ser IGUAL ao configurado no Meta Dashboard
# Verifique: https://developers.facebook.com/apps → WhatsApp → Configuration
```

---

## 📝 Checklist Final

- [ ] Arquivo `.env.local` criado
- [ ] `WEBHOOK_BASE_URL=https://chat.luisfboff.com`
- [ ] `META_VERIFY_TOKEN` configurado (mesmo valor em Meta Dashboard)
- [ ] Todas as credenciais do Supabase
- [ ] `POSTGRES_URL_NON_POOLING` (Direct Connection)
- [ ] Credenciais OpenAI, Groq, Meta
- [ ] Gmail App Password
- [ ] Redis URL
- [ ] `npm run dev` funciona sem erros
- [ ] Mesmas variáveis no Vercel Dashboard

---

## 🎯 Pronto!

Agora você pode:
- ✅ Testar webhooks localmente (apontando para produção)
- ✅ Ver logs no Vercel
- ✅ Desenvolver com confiança
- ✅ Deploy funciona igual ao dev
