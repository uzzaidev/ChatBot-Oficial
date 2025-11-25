# ✅ Setup Completo para FREE Tier

Este projeto está **100% funcional no plano FREE do Supabase**!

## 🎯 O que funciona no FREE tier:

### ✅ Polling Inteligente (ao invés de Realtime)

Como o plano FREE não tem acesso à página de **Database > Replication** necessária para `postgres_changes`, usamos **polling otimizado**:

- 🔄 Atualização automática a cada **3 segundos**
- 📱 Funciona em Web + Mobile (Capacitor)
- ⚡ Percepção de "tempo real" (delay de 3s é imperceptível)
- 🔋 Otimizado para não sobrecarregar o servidor

### Como funciona:

1. **Tentativa de Realtime primeiro** (caso upgrade para Pro no futuro)
2. **Fallback automático para polling** após 3s se realtime não conectar
3. **Polling contínuo** até desmontar componente

---

## 📋 Configuração Atual:

### Tabelas configuradas:

✅ `n8n_chat_histories`
- REPLICA IDENTITY: FULL
- RLS policies: SELECT para authenticated/anon
- Polling: A cada 3s

✅ `clientes_whatsapp`
- REPLICA IDENTITY: FULL
- RLS policies: SELECT para authenticated/anon
- Polling: A cada 3s

---

## 🚀 Se quiser Realtime (Upgrade para Pro):

### Passo 1: Upgrade para Pro ($25/mês)
- https://supabase.com/pricing

### Passo 2: Habilitar Replication
- Dashboard > Database > Replication
- Enable para ambas as tabelas

### Passo 3: Pronto!
- O sistema detecta automaticamente e para de usar polling
- Realtime instantâneo (< 1s) ativa automaticamente

---

## 🔧 Customizar Intervalo de Polling:

Se quiser mudar de 3s para outro valor:

```typescript
// src/hooks/useConversations.ts - linha ~140
const pollInterval = setInterval(() => {
  fetchConversations(true)
}, 3000) // ← Mudar aqui (em ms)
```

**Recomendações:**
- ⚠️ 1s = Muito rápido (pode exceder limites de API FREE)
- ✅ 3s = Ideal (parece tempo real, não excede limites)
- ⚠️ 10s+ = Muito lento (usuário percebe delay)

---

## 📊 Limites do FREE Tier:

| Recurso | Limite FREE | Nosso Uso |
|---------|-------------|-----------|
| API Requests | 500 req/min | ~20 req/min (polling 3s) |
| Database Size | 500 MB | Variável |
| Bandwidth | 5 GB/month | Baixo |
| Realtime | Sim, mas sem replication | Polling como fallback ✅ |

**Status:** ✅ Dentro dos limites!

---

## ✨ Funcionalidades Implementadas:

- ✅ Mensagens atualizam a cada 3s
- ✅ Optimistic updates (mensagem aparece instantaneamente ao enviar)
- ✅ Smart scroll (só faz scroll se usuário no fim)
- ✅ Badge de novas mensagens
- ✅ Suporte mobile completo (Capacitor)
- ✅ Retry automático em caso de erro
- ✅ Logging detalhado para debug

---

## 🐛 Troubleshooting:

### Mensagens não atualizam?

1. **Abra o Console do navegador** (F12)
2. Procure por: `[Polling] Starting polling`
3. Deve ver logs a cada 3s: `🔄 [useConversations] Polling for updates...`

Se NÃO ver os logs:
- Verifique se `enableRealtime: true` em `useConversations`
- Verifique se não há erros de autenticação
- Verifique `.env.local` (NEXT_PUBLIC_SUPABASE_URL e ANON_KEY)

### Polling muito lento/rápido?

Ajuste o intervalo em `src/hooks/useConversations.ts` (linha ~140)

---

## 🎉 Conclusão:

O sistema está **funcionando perfeitamente no FREE tier** com polling otimizado!

Upgrade para Pro é opcional e apenas oferece:
- Realtime instantâneo (< 1s ao invés de 3s)
- Menos requisições API
- Mais limites (storage, bandwidth)

Para a maioria dos casos, **polling de 3s é suficiente e imperceptível**! ✅
