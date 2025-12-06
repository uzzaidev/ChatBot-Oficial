# ⚠️ CRÍTICO: API Routes e Mobile Compatibility

## REGRA OBRIGATÓRIA

**SEMPRE usar `apiFetch()` para chamar API routes. NUNCA usar `fetch()` direto.**

## Por quê?

- **Web**: API routes funcionam localmente (SSR/Serverless)
- **Mobile (Capacitor)**: App é static export - API routes NÃO existem no app
  - Precisa chamar servidor remoto de produção
  - Precisa incluir Bearer token no header

## ❌ ERRADO - Quebra no mobile

```typescript
// Vai FALHAR no Capacitor
const response = await fetch('/api/conversations', {
  method: 'GET',
})
```

## ✅ CORRETO - Funciona em web e mobile

```typescript
import { apiFetch } from '@/lib/api'

const response = await apiFetch('/api/conversations', {
  method: 'GET',
})
```

## Como funciona

### Web (localhost:3000)
```
apiFetch('/api/conversations')
  → URL: http://localhost:3000/api/conversations
  → Chama API route local
  → Autenticação via cookies
```

### Mobile (Capacitor)
```
apiFetch('/api/conversations')
  → URL: https://uzzapp.uzzai.com.br/api/conversations
  → Chama servidor remoto de produção
  → Autenticação via Bearer token no header
```

## Padrão para criar helpers de API

```typescript
// src/lib/api.ts

import { apiFetch } from '@/lib/api'

/**
 * ✅ SEMPRE criar helper usando apiFetch
 */
export async function markConversationAsRead(phone: string) {
  const response = await apiFetch('/api/conversations/mark-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to mark as read')
  }
  
  return await response.json()
}
```

## Checklist ao criar nova API route

1. ✅ Criar API route: `src/app/api/*/route.ts`
2. ✅ Criar helper usando `apiFetch()`
3. ✅ Exportar de `src/lib/api.ts`
4. ✅ Usar helper nos componentes
5. ✅ Testar em web
6. ✅ Testar em mobile (emulador/device)

## Exemplos corretos

### Hook customizado
```typescript
import { apiFetch } from '@/lib/api'

export const useMessages = (phone: string) => {
  const fetchMessages = async () => {
    const response = await apiFetch(`/api/messages/${phone}`)
    const data = await response.json()
    setMessages(data.messages)
  }
}
```

### Componente
```typescript
import { markConversationAsRead } from '@/lib/api'

const handleClick = async () => {
  await markConversationAsRead(phone)
  router.push(`/chat?phone=${phone}`)
}
```

## Casos especiais

### Dentro de API routes (backend)
```typescript
// src/app/api/*/route.ts

// ❌ NÃO usar apiFetch (já está no servidor)
// ✅ Usar Supabase direto

import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()
  const { data } = await supabase.from('conversations').select()
  return NextResponse.json({ data })
}
```

## Configuração necessária

```env
# .env.local ou .env.mobile
NEXT_PUBLIC_API_URL=https://uzzapp.uzzai.com.br
```

## Resumo

| Contexto | Usar |
|---|---|
| Client Component chamando `/api/*` | `apiFetch()` ✅ |
| API Route (backend) | Supabase direto ✅ |
| Direct `fetch('/api/*)` | ❌ NUNCA |

---

> **"Se está chamando `/api/*`, SEMPRE use `apiFetch()`. Caso contrário, vai quebrar no mobile (Capacitor)."**

Esta é uma **regra CRÍTICA** para o projeto funcionar como static export no Capacitor.
