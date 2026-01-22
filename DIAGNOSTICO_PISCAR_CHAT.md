# 🔍 Diagnóstico: Problema de "Piscar" no Chat

## 📋 Contexto
Aplicação React + Next.js. O painel de conversa "pisca" (reseta e volta, aparece "Carregando mensagens..." e o chat some).

---

## 🎯 Arquivos Críticos Identificados

### 1. **`src/hooks/useMessages.ts`** - Hook principal de fetch
### 2. **`src/components/ConversationDetail.tsx`** - Componente que renderiza o chat

---

## 🐛 PROBLEMAS IDENTIFICADOS

### ❌ **PROBLEMA #1: `setLoading(true)` em TODOS os fetches** (CRÍTICO)
**Arquivo:** `src/hooks/useMessages.ts`  
**Linha:** 31

```29:59:src/hooks/useMessages.ts
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true)  // ⚠️ PROBLEMA: Limpa UI a cada fetch (inclusive polling)
      setError(null)

      // ... fetch code ...
      
      setMessages(data.messages || [])
      setTotal(data.total || 0)
    } catch (err) {
      // ...
    } finally {
      setLoading(false)
    }
  }, [phone])
```

**Impacto:** Toda vez que `fetchMessages` roda (inclusive polling), `loading` vira `true` e a UI some, mostrando "Carregando mensagens...". Isso causa o piscar.

**Solução esperada:** Não setar `loading = true` em refetches/polling, apenas no fetch inicial.

---

### ❌ **PROBLEMA #2: useEffect com dependência instável**
**Arquivo:** `src/hooks/useMessages.ts`  
**Linhas:** 62-66, 68-76

```62:76:src/hooks/useMessages.ts
  useEffect(() => {
    if (phone) {
      fetchMessages()
    }
  }, [phone, fetchMessages])  // ⚠️ fetchMessages pode mudar

  useEffect(() => {
    if (refreshInterval > 0 && phone) {
      const interval = setInterval(() => {
        fetchMessages()
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [refreshInterval, phone, fetchMessages])  // ⚠️ fetchMessages pode mudar
```

**Impacto:** Se `fetchMessages` mudar (mesmo que seja `useCallback`), os effects rodam de novo, podendo criar múltiplos intervals ou fetches duplicados.

---

### ❌ **PROBLEMA #3: UI desaparece completamente quando loading**
**Arquivo:** `src/components/ConversationDetail.tsx`  
**Linha:** 633

```632:641:src/components/ConversationDetail.tsx
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-sm text-muted-foreground">Carregando mensagens...</span>
          </div>
        ) : messages.length === 0 ? (
          // ...
        ) : (
          <ScrollArea ref={scrollAreaRef} className="h-full px-2 md:px-4">
```

**Impacto:** Quando `loading = true`, a lista inteira some. Se isso acontece durante polling, causa o piscar.

**Solução esperada:** Manter a lista visível e mostrar loading como overlay/skeleton, não substituindo a UI.

---

## ✅ O QUE ESTÁ CORRETO

- ✅ Keys dos componentes são estáveis (`item.message.id`, `date-${index}`)
- ✅ Cleanup de intervals está presente (`clearInterval`)
- ✅ Não há `setMessages([])` explícito antes do fetch
- ✅ Polling só roda se `refreshInterval > 0` (e está como 0 no `ConversationDetail`)

---

## 🔧 CORREÇÕES SUGERIDAS

### Correção #1: Separar loading inicial de refetch
```typescript
const [initialLoading, setInitialLoading] = useState(true)
const [isRefetching, setIsRefetching] = useState(false)

const fetchMessages = useCallback(async (isInitial = false) => {
  try {
    if (isInitial) {
      setInitialLoading(true)
    } else {
      setIsRefetching(true) // Não limpa UI
    }
    // ... fetch ...
  } finally {
    if (isInitial) {
      setInitialLoading(false)
    } else {
      setIsRefetching(false)
    }
  }
}, [phone])
```

### Correção #2: Remover `fetchMessages` das dependências
```typescript
useEffect(() => {
  if (phone) {
    fetchMessages(true) // Passa flag de initial
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [phone]) // Só phone, não fetchMessages

useEffect(() => {
  if (refreshInterval > 0 && phone) {
    const interval = setInterval(() => {
      fetchMessages(false) // Refetch sem loading
    }, refreshInterval)
    return () => clearInterval(interval)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [refreshInterval, phone]) // Só refreshInterval e phone
```

### Correção #3: UI com overlay de loading
```typescript
{initialLoading ? (
  <div>Carregando mensagens...</div>
) : (
  <ScrollArea>
    {/* Lista sempre visível */}
    {isRefetching && <LoadingOverlay />}
    {messages.map(...)}
  </ScrollArea>
)}
```

---

## 🧪 COMO TESTAR

1. **DevTools → Network:**
   - Marque "Preserve log"
   - Reproduza o piscar
   - Verifique se aparecem múltiplas requisições `/api/messages/${phone}` simultâneas

2. **DevTools → Console:**
   - Adicione `console.count("fetchMessages")` no início de `fetchMessages`
   - Adicione `console.count("ChatView render")` no início de `ConversationDetail`
   - Se os contadores disparam sem parar → loop confirmado

3. **Verificar se é StrictMode:**
   - Se pisca só em dev → pode ser React 18 StrictMode executando effects 2x
   - Teste em produção build para confirmar

---

## 📝 RESUMO PARA OUTRA IA

**Problema:** Chat pisca (UI some e volta) mostrando "Carregando mensagens...".

**Causa raiz:** `setLoading(true)` é chamado em TODOS os fetches (inclusive polling), fazendo a UI desaparecer.

**Arquivos:**
- `src/hooks/useMessages.ts` (linha 31)
- `src/components/ConversationDetail.tsx` (linha 633)

**Solução mínima:** Separar `initialLoading` de `isRefetching`, não limpar UI durante refetch/polling.

