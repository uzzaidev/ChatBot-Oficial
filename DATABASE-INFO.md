# 🗄️ Banco de Dados - PostgreSQL via Supabase

## ✅ Já está configurado!

Você **NÃO precisa** configurar variáveis adicionais de PostgreSQL porque está usando **Supabase**, que abstrai toda a conexão.

---

## 🎯 Variáveis Atuais (Suficientes)

```env
# Supabase (já configurado)
NEXT_PUBLIC_SUPABASE_URL=https://jhodhxvvhohygijqcxbo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

---

## 🔍 Por que não precisa de HOST, USER, PASSWORD?

### **PostgreSQL Tradicional** (precisa de tudo):
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=senha123
POSTGRES_DATABASE=chatbot
```

### **Supabase** (abstrai tudo):
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

**O Supabase:**
- ✅ Gerencia a conexão PostgreSQL
- ✅ Fornece API REST (não precisa de driver PostgreSQL)
- ✅ Fornece Realtime (WebSockets automático)
- ✅ Inclui Auth, Storage, Functions

---

## 📊 O que está por trás

### Internamente, Supabase usa:
```
PostgreSQL 15.x
Host: db.jhodhxvvhohygijqcxbo.supabase.co
Port: 5432
SSL: Required
```

**Mas você não precisa dessas informações!** O SDK do Supabase cuida disso.

---

## 🔐 Tipos de Chaves Supabase

### **1. NEXT_PUBLIC_SUPABASE_URL**
- URL pública da API
- Pode ser exposta no frontend
- Exemplo: `https://xxx.supabase.co`

### **2. NEXT_PUBLIC_SUPABASE_ANON_KEY**
- Chave anônima (pública)
- Usa RLS (Row Level Security) do Supabase
- Pode ser exposta no frontend
- Permissões limitadas por RLS

### **3. SUPABASE_SERVICE_ROLE_KEY** ⚠️
- Chave de serviço (privada)
- **NUNCA expor no frontend!**
- Ignora RLS (acesso total)
- Usar apenas no backend (API routes, Server Components)

---

## 🎯 Quando usar cada chave

### **Frontend (Client Components):**
```typescript
import { createClientBrowser } from '@/lib/supabase'

// Usa NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClientBrowser()
```

### **Backend (API Routes):**
```typescript
import { createServerClient } from '@/lib/supabase'

// Usa SUPABASE_SERVICE_ROLE_KEY
const supabase = createServerClient()
```

---

## 🗂️ Tabelas no Supabase

### **1. Clientes WhatsApp**
```sql
CREATE TABLE "Clientes WhatsApp" (
  telefone NUMERIC NOT NULL PRIMARY KEY,
  nome TEXT NULL,
  status TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### **2. n8n_chat_histories**
```sql
CREATE TABLE n8n_chat_histories (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  message JSONB NOT NULL,  -- { "type": "human"|"ai", "content": "..." }
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### **3. documents** (Vector Store para RAG)
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),  -- OpenAI embeddings
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

---

## 🔄 Como acessar PostgreSQL diretamente (se precisar)

### **Opção 1: Supabase SQL Editor**
```
Dashboard → SQL Editor → New Query
```

### **Opção 2: Connection String (psql)**

**Obter string de conexão:**
```
Supabase Dashboard → Settings → Database → Connection String
```

**Formato:**
```
postgresql://postgres.xxx:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Conectar via psql:**
```bash
psql "postgresql://postgres.xxx:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
```

**⚠️ Mas não precisa!** O SDK Supabase faz tudo via API.

---

## 🧪 Testar Conexão Supabase

Criar `test-supabase.js`:
```javascript
const { createClient } = require('@supabase/supabase-js')

async function testSupabase() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    // Testar query
    const { data, error } = await supabase
      .from('Clientes WhatsApp')
      .select('*')
      .limit(5)

    if (error) throw error

    console.log('✅ Conectado ao Supabase!')
    console.log('✅ Total de clientes:', data.length)
    console.log('Clientes:', data)
  } catch (error) {
    console.error('❌ Erro:', error)
  }
}

testSupabase()
```

**Executar:**
```bash
NEXT_PUBLIC_SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx node test-supabase.js
```

---

## 📊 Comparação: PostgreSQL vs Supabase

| Feature | PostgreSQL Direto | Supabase |
|---------|------------------|----------|
| **Configuração** | HOST, USER, PASS, DB | URL + KEY |
| **Conexão** | Driver pg/psycopg | API REST |
| **Realtime** | Manual (triggers) | Automático |
| **Auth** | Manual | Integrado |
| **Storage** | Separado | Integrado |
| **RLS** | Manual | Automático |
| **SDK** | SQL puro | JavaScript |

---

## ✅ Resumo

### **PostgreSQL Tradicional:**
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=senha
POSTGRES_DATABASE=chatbot
```

### **Supabase (o que você tem):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

**Conclusão:** Você **NÃO precisa** de variáveis adicionais! ✅

---

## 🎯 Checklist

- [x] `NEXT_PUBLIC_SUPABASE_URL` configurada
- [x] `SUPABASE_SERVICE_ROLE_KEY` configurada
- [x] Tabelas existem (Clientes WhatsApp, n8n_chat_histories)
- [x] Realtime ativado nas tabelas
- [ ] (Opcional) Testar conexão com script

---

## 📚 Referências

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL vs Supabase](https://supabase.com/docs/guides/database)
