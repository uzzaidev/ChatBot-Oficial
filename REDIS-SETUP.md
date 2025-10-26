# 🔴 Configuração do Redis

## 📋 O que é o Redis?

O Redis é usado no projeto para **message batching** - agrupa mensagens rápidas do usuário antes de processar com a IA.

---

## 🎯 Opções de Configuração

### **Opção 1: Upstash Redis** (RECOMENDADO para Produção) ☁️

**Vantagens:**
- ✅ Serverless (sem servidor para gerenciar)
- ✅ Free tier generoso (10.000 comandos/dia)
- ✅ SSL/TLS nativo
- ✅ Baixa latência global
- ✅ Perfeito para Vercel/Next.js

#### Como configurar:

**1. Criar conta:**
```
https://upstash.com/
```

**2. Criar Database:**
- Clicar em **"Create Database"**
- Nome: `chatbot-redis`
- Região: **US East (Ohio)** ou mais próxima
- Type: **Regional** (Free)
- Clicar em **Create**

**3. Copiar URL:**
- Na página do database
- Seção **"REST API"** → **"Redis URL"**
- Copiar URL completa (começa com `rediss://`)

**Formato:**
```
rediss://default:AbCdEf123456@us1-example-12345.upstash.io:6379
```

**4. Colar no `.env.local`:**
```env
REDIS_URL=rediss://default:AbCdEf123456@us1-example-12345.upstash.io:6379
```

---

### **Opção 2: Redis Local** (Docker) 🐳

**Para desenvolvimento local.**

#### Passo a passo:

**1. Instalar Docker:**
```
https://www.docker.com/get-started
```

**2. Rodar Redis com Docker:**
```bash
docker run -d \
  --name chatbot-redis \
  -p 6379:6379 \
  redis:alpine
```

**3. Verificar se está rodando:**
```bash
docker ps
```

**4. Configurar `.env.local`:**
```env
REDIS_URL=redis://localhost:6379
```

#### Redis com senha (mais seguro):

```bash
docker run -d \
  --name chatbot-redis \
  -p 6379:6379 \
  redis:alpine \
  redis-server --requirepass minha_senha_123
```

**Configurar `.env.local`:**
```env
REDIS_URL=redis://:minha_senha_123@localhost:6379
```

---

### **Opção 3: Redis Cloud** (Alternativa ao Upstash) ☁️

**Se preferir Redis oficial.**

#### Como configurar:

**1. Criar conta:**
```
https://redis.com/try-free/
```

**2. Criar Database:**
- Clicar em **"New Database"**
- Subscription: **Free**
- Cloud Provider: **AWS**
- Region: Escolher mais próxima
- Database Name: `chatbot-redis`

**3. Copiar credenciais:**
- Endpoint: `redis-12345.c123.us-east-1.aws.cloud.redislabs.com:12345`
- Password: `AbCdEf123456`

**4. Montar URL:**
```env
REDIS_URL=redis://default:AbCdEf123456@redis-12345.c123.us-east-1.aws.cloud.redislabs.com:12345
```

---

## 📝 Formato da URL

### Estrutura Completa:
```
redis://[username]:[password]@[host]:[port]/[database]
```

### Componentes:

| Parte | Descrição | Exemplo |
|-------|-----------|---------|
| **Protocolo** | `redis://` ou `rediss://` (SSL) | `rediss://` |
| **Username** | Usuário (geralmente `default`) | `default` |
| **Password** | Senha do Redis | `AbCdEf123456` |
| **Host** | Endereço do servidor | `us1-example.upstash.io` |
| **Port** | Porta (padrão: 6379) | `6379` |
| **Database** | Número do database (opcional) | `/0` |

### Exemplos:

**Upstash (com SSL):**
```
rediss://default:AbCdEf123456@us1-example.upstash.io:6379
```

**Local sem senha:**
```
redis://localhost:6379
```

**Local com senha:**
```
redis://:minha_senha@localhost:6379
```

**Redis Cloud:**
```
redis://default:senha123@redis-12345.cloud.redislabs.com:12345
```

---

## 🧪 Testar Conexão

### Método 1: Node.js Script

Criar arquivo `test-redis.js`:
```javascript
const { createClient } = require('redis')

async function testRedis() {
  const client = createClient({
    url: process.env.REDIS_URL
  })

  try {
    await client.connect()
    console.log('✅ Conectado ao Redis!')

    // Testar SET/GET
    await client.set('test-key', 'Hello Redis!')
    const value = await client.get('test-key')
    console.log('✅ Teste SET/GET:', value)

    // Limpar
    await client.del('test-key')
    await client.disconnect()
    console.log('✅ Redis funcionando perfeitamente!')
  } catch (error) {
    console.error('❌ Erro ao conectar:', error)
  }
}

testRedis()
```

**Executar:**
```bash
REDIS_URL=sua_url_aqui node test-redis.js
```

---

### Método 2: Redis CLI (Local)

**Se estiver usando Redis local:**

```bash
# Conectar
redis-cli

# Testar
SET test "Hello"
GET test
DEL test
EXIT
```

**Com senha:**
```bash
redis-cli
AUTH minha_senha
SET test "Hello"
```

---

## 🚀 Deploy (Vercel)

### 1. Adicionar Variável no Vercel:

```
Vercel Dashboard → Projeto → Settings → Environment Variables
```

**Adicionar:**
```
REDIS_URL = rediss://default:xxxxx@us1-example.upstash.io:6379
```

### 2. Redeployar:

```bash
git push origin main
```

OU no dashboard Vercel:
```
Deployments → ... → Redeploy
```

---

## 📊 Comparação de Opções

| Feature | Upstash | Redis Cloud | Redis Local |
|---------|---------|-------------|-------------|
| **Custo** | Free (10k cmds/dia) | Free (30MB) | Grátis |
| **Setup** | 2 minutos | 5 minutos | 5 minutos |
| **Serverless** | ✅ Sim | ✅ Sim | ❌ Não |
| **SSL/TLS** | ✅ Sim | ✅ Sim | ❌ Não |
| **Produção** | ✅ Perfeito | ✅ Bom | ❌ Não |
| **Latência** | Baixa | Baixa | Muito baixa |
| **Ideal para** | Vercel/Next.js | Apps tradicionais | Desenvolvimento |

---

## 🎯 Recomendações

### **Desenvolvimento:**
```env
REDIS_URL=redis://localhost:6379
```
- Docker: `docker run -d -p 6379:6379 redis:alpine`

### **Produção (Vercel):**
```env
REDIS_URL=rediss://default:xxxxx@us1-example.upstash.io:6379
```
- Usar **Upstash** (serverless, perfeito para Vercel)

---

## ❓ FAQ

### **Preciso de Redis separado por ambiente?**

Sim, recomendado:
- **Dev:** Redis local (Docker)
- **Prod:** Upstash/Redis Cloud

### **Posso usar o mesmo Redis do n8n?**

Sim, mas **não recomendado**. Pode haver conflito de keys.

Se quiser usar, adicione prefixo:
```typescript
// src/lib/redis.ts
const key = `nextjs:messages:${phone}` // Prefixo "nextjs:"
```

### **Quanto custa Upstash?**

**Free tier:**
- 10.000 comandos/dia
- 256 MB storage
- Suficiente para ~500 conversas/dia

**Paid:**
- A partir de $0.2 por 100k comandos

### **Redis é obrigatório?**

Sim, para o **message batching**. Sem ele:
- Cada mensagem rápida vira uma resposta da IA
- UX ruim (bot responde múltiplas vezes)

---

## 🛠️ Troubleshooting

### **Erro: "ECONNREFUSED localhost:6379"**

**Causa:** Redis local não está rodando

**Solução:**
```bash
docker ps  # Verificar containers
docker start chatbot-redis  # Iniciar Redis
```

---

### **Erro: "Authentication required"**

**Causa:** Senha incorreta ou ausente

**Solução:**
```env
# Adicionar senha na URL
REDIS_URL=redis://:senha_correta@host:6379
```

---

### **Erro: "Connection timeout"**

**Causa:** Redis Cloud/Upstash inacessível

**Solução:**
1. Verificar URL está correta
2. Verificar firewall/VPN
3. Testar com `curl`:
```bash
curl https://us1-example.upstash.io:6379
```

---

## ✅ Checklist

- [ ] Redis configurado (Upstash/Cloud/Local)
- [ ] `REDIS_URL` copiada para `.env.local`
- [ ] Testado conexão com script Node.js
- [ ] (Produção) Variável adicionada no Vercel
- [ ] Deploy realizado com sucesso
- [ ] Testado batching de mensagens

---

## 📚 Referências

- [Upstash Documentation](https://docs.upstash.com/redis)
- [Redis Node.js Guide](https://redis.io/docs/clients/nodejs/)
- [Redis Cloud Getting Started](https://redis.com/try-free/)
- [Docker Redis Image](https://hub.docker.com/_/redis)
