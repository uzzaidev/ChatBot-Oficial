# Guia de Configuração do Webhook Meta WhatsApp

## 📍 URLs do Webhook

### **Produção (Vercel):**
```
https://chat.luisfboff.com/api/webhook
```

### **Desenvolvimento Local (com Ngrok):**
```
1. Instalar Ngrok: https://ngrok.com/download
2. Expor porta local: ngrok http 3000
3. URL gerada: https://abc123.ngrok-free.app/api/webhook
```

---

## 🔐 Variável de Ambiente

### **META_VERIFY_TOKEN**

Este é um token secreto que **você escolhe** para validar que as requisições vêm da Meta.

**No `.env.local`:**
```env
META_VERIFY_TOKEN=meu_token_secreto_12345
```

**⚠️ IMPORTANTE:**
- Escolha uma string aleatória segura (ex: `whatsapp_webhook_2024_abc123xyz`)
- NÃO compartilhe publicamente
- Use o MESMO token no painel da Meta

---

## 📋 Passo a Passo - Configurar Webhook na Meta

### **1. Acessar Meta for Developers**

1. Ir para: https://developers.facebook.com/
2. Login com sua conta Facebook
3. Acessar: **Meus Aplicativos** → Selecionar seu app WhatsApp Business

### **2. Configurar Webhook**

1. No menu lateral: **WhatsApp** → **Configuração**
2. Seção **Webhook**
3. Clicar em **Configurar Webhook** ou **Editar**

### **3. Preencher Campos:**

**URL de Retorno de Chamada (Callback URL):**
```
https://chat.luisfboff.com/api/webhook
```

**Token de Verificação (Verify Token):**
```
meu_token_secreto_12345
```
*(Use o MESMO valor do seu .env.local)*

### **4. Clicar em "Verificar e Salvar"**

A Meta vai fazer uma requisição GET:
```
GET https://chat.luisfboff.com/api/webhook?hub.mode=subscribe&hub.verify_token=meu_token_secreto_12345&hub.challenge=1234567890
```

Seu código vai:
1. Verificar se `hub.verify_token` === `META_VERIFY_TOKEN`
2. Se sim, retornar `hub.challenge`
3. Meta valida e ativa o webhook ✅

### **5. Selecionar Eventos (Webhook Fields)**

Marcar os eventos que deseja receber:
- ✅ **messages** (obrigatório - receber mensagens)
- ✅ **message_status** (opcional - status de entrega)

Clicar em **Salvar**.

---

## 🧪 Teste de Validação

### **Teste 1: Verificar Webhook (GET)**

**Requisição que a Meta faz:**
```bash
curl "https://chat.luisfboff.com/api/webhook?hub.mode=subscribe&hub.verify_token=meu_token_secreto_12345&hub.challenge=TEST123"
```

**Resposta esperada:**
```
TEST123
```
*(Retorna exatamente o challenge recebido)*

**Status:** `200 OK`

---

### **Teste 2: Receber Mensagem (POST)**

**Simulação de mensagem recebida:**
```bash
curl -X POST https://chat.luisfboff.com/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "5554999999999",
            "text": { "body": "Olá!" }
          }]
        }
      }]
    }]
  }'
```

**Resposta esperada:**
```
EVENT_RECEIVED
```

**Status:** `200 OK`

**Verificar logs:**
```bash
# No terminal do Next.js:
📩 Webhook recebido: { entry: [...] }
```

---

## 🚀 Deploy para Produção

### **1. Deploy no Vercel**

```bash
# Push para GitHub
git add .
git commit -m "feat: webhook configurado"
git push origin main

# Vercel detecta e faz deploy automático
```

### **2. Configurar Variáveis de Ambiente no Vercel**

1. Acessar: https://vercel.com/seu-projeto/settings/environment-variables
2. Adicionar:

```
META_VERIFY_TOKEN=meu_token_secreto_12345
META_ACCESS_TOKEN=seu_token_meta_aqui
META_PHONE_NUMBER_ID=899639703222013
REDIS_URL=...
OPENAI_API_KEY=...
GROQ_API_KEY=...
# ... todas as outras variáveis
```

3. **Redeployar** o projeto

### **3. Configurar Domínio Customizado**

1. Vercel → **Settings** → **Domains**
2. Adicionar: `chat.luisfboff.com`
3. Configurar DNS:
   - Tipo: `CNAME`
   - Nome: `chat`
   - Valor: `cname.vercel-dns.com`

4. Aguardar propagação (1-24h)

### **4. Atualizar Webhook na Meta**

1. Voltar ao painel Meta for Developers
2. Editar webhook
3. Atualizar URL para: `https://chat.luisfboff.com/api/webhook`
4. Clicar em **Verificar e Salvar**

---

## 🔍 Troubleshooting

### **❌ Erro: "Falha na verificação do webhook"**

**Causa:** Token não confere

**Solução:**
1. Verificar que `META_VERIFY_TOKEN` no `.env.local` é EXATAMENTE igual ao token no painel Meta
2. Reiniciar servidor Next.js: `npm run dev`
3. Tentar novamente

---

### **❌ Erro: "Timeout ao verificar webhook"**

**Causa:** URL inacessível

**Solução:**
1. Verificar se app está rodando: `http://localhost:3000`
2. Verificar se Ngrok está ativo: `ngrok http 3000`
3. Verificar firewall/rede
4. Testar URL manualmente no navegador

---

### **❌ Erro: "Webhook retorna 500"**

**Causa:** Erro no código

**Solução:**
1. Verificar logs do Next.js
2. Verificar se todas variáveis de ambiente estão definidas
3. Verificar TypeScript: `npx tsc --noEmit`

---

## 📊 Monitoramento

### **Logs em Produção (Vercel):**

```bash
# Ver logs em tempo real
vercel logs --follow

# Ou no dashboard Vercel:
https://vercel.com/seu-projeto/deployments → Ver logs
```

### **Verificar Webhooks na Meta:**

1. Painel Meta for Developers
2. **WhatsApp** → **Configuração**
3. Seção **Teste de Webhook**
4. Ver histórico de requisições

---

## 🔗 Integração com o Flow

Atualmente, o webhook apenas **recebe e loga** as mensagens.

### **Próximo Passo: Processar Mensagens**

```typescript
// src/app/api/webhook/route.ts
import { processChatbotMessage } from '@/flows/chatbotFlow'

export async function POST(req: NextRequest) {
  const body = await req.json()

  // Processar mensagem com nosso flow
  const result = await processChatbotMessage(body)

  return new NextResponse("EVENT_RECEIVED", { status: 200 })
}
```

Quando estiver pronto para migrar 100% do n8n, descomentar esta integração.

---

## ✅ Checklist de Deploy

- [ ] Variáveis de ambiente configuradas no `.env.local`
- [ ] `META_VERIFY_TOKEN` definido (string aleatória segura)
- [ ] Deploy no Vercel concluído
- [ ] Domínio `chat.luisfboff.com` configurado
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Webhook configurado no painel Meta
- [ ] Webhook verificado com sucesso (✅ status ativo)
- [ ] Teste de mensagem enviado e recebido
- [ ] Logs funcionando corretamente

---

## 📚 Referências

- [Meta WhatsApp Business API](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Vercel Deployment](https://vercel.com/docs/deployments/overview)
- [Ngrok Documentation](https://ngrok.com/docs)
