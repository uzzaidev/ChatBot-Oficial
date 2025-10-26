# 🚀 Quick Start - Debug Dashboard

## 3 Passos para Começar

### 1️⃣ Rodar Migration no Supabase

1. Acesse: https://app.supabase.com/project/YOUR_PROJECT/sql
2. Abra o arquivo: `migrations/002_execution_logs.sql`
3. Copie todo o conteúdo
4. Cole no SQL Editor do Supabase
5. Clique em "Run"

**✅ Pronto!** A tabela `execution_logs` foi criada.

---

### 2️⃣ Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

Aguarde até ver:
```
✓ Ready in 3s
○ Local:   http://localhost:3000
```

---

### 3️⃣ Testar o Debug Dashboard

**Opção A: Via Interface Web** (Mais Fácil)

1. Abra: http://localhost:3000/dashboard/debug
2. No painel "🧪 Enviar Mensagem de Teste":
   - Telefone: `5511999999999`
   - Mensagem: `Olá, teste!`
3. Clique em **"Enviar Mensagem de Teste"**
4. Aguarde 2 segundos → página recarrega
5. Veja a execução aparecer! 🎉

**Opção B: Via Script de Teste**

```bash
node scripts/test-debug.js
```

Isso envia 3 mensagens de teste automaticamente!

**Opção C: Via cURL**

```bash
curl -X POST http://localhost:3000/api/test/send-message \
  -H "Content-Type: application/json" \
  -d '{"from":"5511999999999","text":"Teste via cURL","name":"Test User"}'
```

---

## 🎯 O que Você Vai Ver

### Dashboard Debug (http://localhost:3000/dashboard/debug)

```
┌─────────────────────────────────────────────────────┐
│  🧪 Enviar Mensagem de Teste                         │
│  [Telefone: 5511999999999] [Mensagem: Olá, teste!] │
│  [Enviar Mensagem de Teste]                         │
├─────────────┬───────────────────────────────────────┤
│ Execuções   │  Timeline de Nodes                     │
│             │                                        │
│ ● abc123... │  ⚫ _START (0ms)                       │
│   success   │  ⚫ filterStatusUpdates (3ms)          │
│   14:30:45  │  ⚫ parseMessage (8ms)                 │
│   📱 5511.. │  ⚫ checkOrCreateCustomer (42ms)       │
│             │  ⚫ normalizeMessage (2ms)             │
│ ● def456... │  ⚫ pushToRedis (15ms)                 │
│   running   │  ⚫ batchMessages (10050ms)            │
│   14:28:12  │  ⚫ getChatHistory (28ms)              │
│   📱 5511.. │  ⚫ getRAGContext (120ms)              │
│             │  ⚫ generateAIResponse (1850ms)        │
│ ● ghi789... │  ⚫ formatResponse (5ms)               │
│   error     │  ⚫ sendWhatsAppMessage (180ms)        │
│   14:25:30  │  ⚫ _END (0ms)                         │
│   📱 5511.. │                                        │
└─────────────┴───────────────────────────────────────┘
```

---

## 🔍 Como Usar

### Ver Detalhes de uma Execução

1. Clique em qualquer execução na lista da esquerda
2. À direita aparece a **timeline completa**
3. Cada node mostra:
   - 📥 **Input**: Dados que recebeu
   - 📤 **Output**: Dados que retornou
   - ⏱️ **Duração**: Tempo que demorou
   - ❌ **Erro**: Se falhou, mostra o erro completo

### Identificar Problemas

**Execução com badge vermelho** = Deu erro!
- Clique nela
- Procure o node com ❌
- Leia o erro detalhado

**Execução muito lenta?**
- Veja qual node demorou mais
- Otimize aquele node específico

---

## ✅ Checklist

- [ ] Migration `002_execution_logs.sql` rodada no Supabase
- [ ] `npm run dev` rodando sem erros
- [ ] Dashboard abrindo em http://localhost:3000/dashboard/debug
- [ ] Mensagem de teste enviada com sucesso
- [ ] Execução aparecendo na lista
- [ ] Timeline mostrando todos os nodes

---

## ❓ Problemas?

### "Table execution_logs does not exist"

→ Você esqueceu de rodar a migration! Volte ao passo 1️⃣

### "Missing NEXT_PUBLIC_SUPABASE_URL"

→ Crie o arquivo `.env.local` (copie de `.env.example`)

### "Nenhuma execução encontrada"

→ Tente enviar uma mensagem de teste primeiro

---

## 📚 Documentação Completa

Para detalhes avançados, veja: `DEBUG-DASHBOARD.md`

---

**🎉 Pronto para debugar!** Qualquer dúvida, consulte `DEBUG-DASHBOARD.md`
