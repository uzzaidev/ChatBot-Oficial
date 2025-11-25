# Plano: Atualização em Tempo Real de Mensagens

**Status:** 🔍 Análise e Planejamento
**Objetivo:** Atualizar mensagens em tempo real sem refresh da tela, similar ao WhatsApp
**Data:** 2025-01-25

---

## 📊 Situação Atual

### ✅ O que já existe

1. **Infraestrutura de Realtime**
   - `useRealtimeMessages` - Hook para mensagens de conversa específica
   - `useGlobalRealtimeNotifications` - Hook global para notificações
   - `ConversationDetail` - Combina mensagens fetchadas + realtime
   - Sistema de deduplicação de mensagens

2. **Componentes preparados**
   - `ConversationDetail.tsx` - Já usa `useRealtimeMessages`
   - `ConversationsIndexClient.tsx` - Usa polling como fallback
   - Toast de notificação implementado

### ❌ Problemas identificados

1. **Mensagens não atualizam em tempo real**
   - Possível: Supabase Realtime não habilitado nas tabelas
   - Possível: RLS bloqueando subscriptions
   - Possível: Filtros incorretos

2. **Lista de conversas pode não atualizar**
   - Usa polling (5s) como fallback
   - Pode ter delay perceptível

3. **Performance**
   - Múltiplas subscriptions simultâneas
   - Possível duplicação de eventos

---

## 🔧 Checklist de Configuração Supabase

### 1. Habilitar Realtime nas Tabelas

**Tabelas que precisam de Realtime:**
- ✅ `n8n_chat_histories` (mensagens)
- ✅ `clientes_whatsapp` (conversas)
- ⚠️ `messages` (se usado)

**Como verificar/habilitar:**
```sql
-- No Supabase Dashboard > Database > Replication
-- Ou via SQL:
ALTER TABLE n8n_chat_histories REPLICA IDENTITY FULL;
ALTER TABLE clientes_whatsapp REPLICA IDENTITY FULL;

-- Habilitar replicação (via Dashboard)
-- Database > Replication > Enable for tables
```

### 2. Configurar RLS para Realtime

**Problema:** RLS pode bloquear `postgres_changes` subscriptions

**Solução:**
```sql
-- Permitir SELECT para realtime (já autenticado)
CREATE POLICY "realtime_select_n8n_chat_histories"
ON n8n_chat_histories
FOR SELECT
TO authenticated
USING (
  -- Verifica se o client_id do usuário tem acesso
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.client_id = n8n_chat_histories.client_id
  )
);

CREATE POLICY "realtime_select_clientes_whatsapp"
ON clientes_whatsapp
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.client_id = clientes_whatsapp.client_id
  )
);
```

### 3. Verificar Filtros de Subscription

**Atual:**
```typescript
// useRealtimeMessages.ts
filter: `session_id=eq.${phone}`
```

**Problema potencial:** Se `session_id` não existe ou tem formato diferente

**Verificar:**
```sql
-- Confirmar estrutura da tabela
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'n8n_chat_histories';

-- Verificar dados reais
SELECT session_id, message, created_at
FROM n8n_chat_histories
LIMIT 5;
```

---

## 🎯 Plano de Implementação

### FASE 1: Diagnóstico (1-2 horas)

**Objetivo:** Entender por que realtime não funciona

#### 1.1 Verificar Supabase Dashboard
- [ ] Database > Replication > Verificar se `n8n_chat_histories` está habilitada
- [ ] Database > Replication > Verificar se `clientes_whatsapp` está habilitada
- [ ] Settings > API > Verificar se Realtime está enabled

#### 1.2 Testar Connection no Console
```typescript
// Criar arquivo: src/app/api/test/realtime/route.ts
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const channel = supabase
    .channel('test-channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'n8n_chat_histories',
      },
      (payload) => {
        console.log('✅ Realtime funcionando:', payload)
      }
    )
    .subscribe((status) => {
      console.log('📡 Status:', status)
    })

  return Response.json({ message: 'Teste iniciado. Check console logs.' })
}
```

#### 1.3 Adicionar Logs Detalhados
- [ ] Adicionar `console.log` em `useRealtimeMessages` para debug
- [ ] Verificar se `SUBSCRIBED` está sendo alcançado
- [ ] Verificar se eventos estão sendo recebidos

### FASE 2: Correções (2-3 horas)

#### 2.1 Corrigir Configuração Supabase
- [ ] Habilitar Realtime nas tabelas necessárias
- [ ] Atualizar RLS policies se necessário
- [ ] Verificar filtros de subscription

#### 2.2 Melhorar `useRealtimeMessages`
**Problemas a corrigir:**
- [ ] Verificar se `client_id` está sendo filtrado corretamente
- [ ] Adicionar retry em caso de erro
- [ ] Melhorar handling de reconnection

**Código melhorado:**
```typescript
// src/hooks/useRealtimeMessages.ts
export const useRealtimeMessages = ({
  clientId,
  phone,
  onNewMessage,
}: UseRealtimeMessagesOptions) => {
  const [isConnected, setIsConnected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const onNewMessageRef = useRef(onNewMessage)

  useEffect(() => {
    onNewMessageRef.current = onNewMessage
  }, [onNewMessage])

  useEffect(() => {
    if (!clientId || !phone) return

    const supabase = createClientBrowser()
    let channel: RealtimeChannel
    let reconnectTimeout: NodeJS.Timeout

    const setupSubscription = () => {
      console.log(`📡 [Realtime] Connecting to channel: ${phone}`)

      channel = supabase
        .channel(`chat:${clientId}:${phone}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'n8n_chat_histories',
            filter: `session_id=eq.${phone}`,
          },
          (payload) => {
            console.log('✅ [Realtime] New message:', payload)

            // Processar mensagem...
            const newMessage = transformPayloadToMessage(payload.new)

            if (onNewMessageRef.current) {
              onNewMessageRef.current(newMessage)
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`📡 [Realtime] Status: ${status}`, err)

          if (status === 'SUBSCRIBED') {
            setIsConnected(true)
            setRetryCount(0)
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false)

            // Retry with exponential backoff
            if (retryCount < 5) {
              const delay = Math.min(1000 * Math.pow(2, retryCount), 30000)
              console.log(`🔄 [Realtime] Retrying in ${delay}ms...`)

              reconnectTimeout = setTimeout(() => {
                setRetryCount(prev => prev + 1)
                supabase.removeChannel(channel)
                setupSubscription()
              }, delay)
            }
          }
        })
    }

    setupSubscription()

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (channel) supabase.removeChannel(channel)
      setIsConnected(false)
    }
  }, [clientId, phone, retryCount])

  return { isConnected, retryCount }
}
```

#### 2.3 Melhorar Lista de Conversas (Real-time)
**Problema:** Polling de 5s pode ser lento

**Solução:** Usar Realtime para atualizar lista
```typescript
// Novo hook: src/hooks/useRealtimeConversations.ts
export const useRealtimeConversations = ({
  clientId,
  onConversationUpdate,
}: UseRealtimeConversationsOptions) => {
  useEffect(() => {
    if (!clientId) return

    const supabase = createClientBrowser()

    const channel = supabase
      .channel(`conversations:${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'clientes_whatsapp',
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          console.log('✅ [Realtime] Conversation updated:', payload)
          onConversationUpdate(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clientId])
}
```

### FASE 3: Otimizações (1-2 horas)

#### 3.1 Optimistic Updates
**Quando enviar mensagem:**
- Adicionar imediatamente à lista (sem esperar servidor)
- Marcar como "sending"
- Atualizar para "sent" quando confirmar

```typescript
// src/components/SendMessageForm.tsx
const handleSendMessage = async () => {
  // 1. Adicionar mensagem otimisticamente
  const optimisticMessage: Message = {
    id: `temp-${Date.now()}`,
    content: content,
    direction: 'outgoing',
    status: 'sending',
    timestamp: new Date().toISOString(),
    // ...
  }

  onOptimisticMessage?.(optimisticMessage)

  try {
    // 2. Enviar para API
    const response = await apiFetch('/api/commands/send-message', {
      method: 'POST',
      body: JSON.stringify({ phone, content }),
    })

    const data = await response.json()

    // 3. Atualizar com ID real do servidor
    onMessageSent?.(data.message)
  } catch (error) {
    // 4. Reverter em caso de erro
    onMessageError?.(optimisticMessage.id)
  }
}
```

#### 3.2 Scroll Inteligente
**Problema:** Auto-scroll pode ser irritante

**Solução:** Scroll automático APENAS se usuário está no fim
```typescript
// src/components/ConversationDetail.tsx
const isUserAtBottom = () => {
  const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
  if (!scrollElement) return false

  const threshold = 100 // 100px do fim
  return scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight < threshold
}

useEffect(() => {
  if (messages.length > 0 && isUserAtBottom()) {
    scrollToBottom()
  }
}, [messages])
```

#### 3.3 Notificações Visuais Suaves
**Ao invés de toast em toda mensagem:**
- Badge discreto com contador
- Som suave (opcional)
- Vibração no mobile (opcional)

```typescript
// Mostrar badge ao invés de toast
const [newMessagesCount, setNewMessagesCount] = useState(0)

const handleNewMessage = useCallback((newMessage: Message) => {
  setRealtimeMessages(prev => [...prev, newMessage])

  // Se usuário NÃO está no fim, incrementa badge
  if (!isUserAtBottom()) {
    setNewMessagesCount(prev => prev + 1)
  }
}, [])

// Badge UI
{newMessagesCount > 0 && (
  <div className="absolute bottom-20 right-4 bg-mint-500 text-white px-3 py-2 rounded-full shadow-lg cursor-pointer"
       onClick={scrollToBottomAndClearBadge}>
    {newMessagesCount} nova{newMessagesCount > 1 ? 's' : ''} mensagem{newMessagesCount > 1 ? 's' : ''}
  </div>
)}
```

### FASE 4: Performance (1 hora)

#### 4.1 Debounce de Updates
**Problema:** Muitos updates simultâneos causam re-renders

```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

const debouncedMessages = useDebouncedValue(realtimeMessages, 300)
```

#### 4.2 Memoização
```typescript
const memoizedMessages = useMemo(() => {
  return [...fetchedMessages, ...realtimeMessages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}, [fetchedMessages, realtimeMessages])
```

#### 4.3 Cleanup de Channels
**Garantir que channels antigos são removidos:**
```typescript
useEffect(() => {
  // Cleanup ao desmontar
  return () => {
    if (channel) {
      console.log('🧹 [Realtime] Cleaning up channel')
      supabase.removeChannel(channel)
    }
  }
}, [])
```

---

## 📝 Checklist de Implementação

### Diagnóstico
- [ ] Verificar Supabase Realtime habilitado
- [ ] Verificar RLS policies
- [ ] Testar connection manual
- [ ] Adicionar logs de debug

### Correções
- [ ] Atualizar configuração Supabase
- [ ] Melhorar `useRealtimeMessages` com retry
- [ ] Implementar `useRealtimeConversations`
- [ ] Corrigir filtros se necessário

### Otimizações
- [ ] Implementar optimistic updates
- [ ] Scroll inteligente (só se no fim)
- [ ] Badge ao invés de toast
- [ ] Debounce de updates
- [ ] Memoização de mensagens

### Testes
- [ ] Enviar mensagem de outro dispositivo
- [ ] Verificar atualização instantânea
- [ ] Testar com conexão lenta
- [ ] Testar reconexão após perda de internet
- [ ] Verificar performance com muitas mensagens

---

## 🎨 UX Esperada

### Receber mensagem
1. ✅ Mensagem aparece instantaneamente (< 1s)
2. ✅ SEM refresh da tela
3. ✅ SEM piscar
4. ✅ Scroll automático SE usuário está no fim
5. ✅ Badge se usuário scrollou pra cima

### Enviar mensagem
1. ✅ Mensagem aparece imediatamente (optimistic)
2. ✅ Status "enviando..." → "enviado"
3. ✅ Sem delay perceptível

### Lista de conversas
1. ✅ Nova conversa aparece instantaneamente
2. ✅ Última mensagem atualiza em tempo real
3. ✅ Badge de não lidas atualiza
4. ✅ Ordem reordena automaticamente

---

## 🐛 Troubleshooting

### Realtime não conecta (CHANNEL_ERROR)

**Causas possíveis:**
1. Replication não habilitada na tabela
2. RLS bloqueando SELECT
3. Filtro incorreto

**Debug:**
```typescript
// Adicionar em useRealtimeMessages
.subscribe((status, err) => {
  console.log('Status:', status)
  console.log('Error:', err)

  if (status === 'CHANNEL_ERROR') {
    console.error('❌ Verifique:')
    console.error('1. Database > Replication > n8n_chat_histories enabled?')
    console.error('2. RLS policies permitindo SELECT?')
    console.error('3. Filter correto?', `session_id=eq.${phone}`)
  }
})
```

### Mensagens duplicadas

**Causa:** Subscription + Polling simultâneos

**Solução:** Desabilitar polling quando realtime conectado
```typescript
const refreshInterval = isConnected ? 0 : 5000
```

### Performance ruim

**Causa:** Muitas subscriptions abertas

**Solução:**
1. Usar canal global + filtro client-side
2. Fechar channels de conversas antigas
3. Debounce de updates

---

## 📱 Compatibilidade Capacitor/Mobile (Android/iOS)

### ✅ SIM, funciona em todos os ambientes!

**Supabase Realtime usa WebSocket**, que funciona perfeitamente em:
- ✅ Web Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Web Mobile (navegadores mobile)
- ✅ **Capacitor Android** (static export)
- ✅ **Capacitor iOS** (static export)

### 🔧 Considerações Especiais para Mobile

#### 1. App Lifecycle (Pause/Resume)

**Problema:** Quando app vai para background, conexão WebSocket pode ser fechada

**Solução:** Reconectar quando app retorna ao foreground

```typescript
// src/hooks/useRealtimeMessages.ts
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export const useRealtimeMessages = ({ clientId, phone, onNewMessage }) => {
  // ... código existente

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    // Listener de app lifecycle (mobile apenas)
    const appStateListener = App.addListener('appStateChange', (state) => {
      console.log('📱 [App State]:', state.isActive ? 'FOREGROUND' : 'BACKGROUND')

      if (state.isActive) {
        // App voltou ao foreground - reconectar
        console.log('🔄 [Realtime] Reconnecting after resume...')

        // Force reconnection
        if (channel) {
          supabase.removeChannel(channel)
        }
        setupSubscription()
      } else {
        // App foi para background - cleanup (opcional)
        console.log('💤 [Realtime] App in background, keeping connection')
        // Pode manter conexão ou fechar para economizar bateria
      }
    })

    return () => {
      appStateListener.remove()
    }
  }, [clientId, phone])

  // ... resto do código
}
```

#### 2. Network Changes (WiFi ↔ 4G)

**Problema:** Trocar de WiFi para 4G pode derrubar conexão

**Solução:** Detectar mudanças de rede e reconectar

```typescript
import { Network } from '@capacitor/network'

useEffect(() => {
  if (!Capacitor.isNativePlatform()) return

  const networkListener = Network.addListener('networkStatusChange', (status) => {
    console.log('📶 [Network]:', status.connected ? 'CONNECTED' : 'DISCONNECTED')
    console.log('📶 [Network Type]:', status.connectionType)

    if (status.connected && channel) {
      // Rede voltou - verificar se conexão ainda está ativa
      const channelState = channel.state

      if (channelState !== 'joined') {
        console.log('🔄 [Realtime] Network changed, reconnecting...')
        supabase.removeChannel(channel)
        setupSubscription()
      }
    }
  })

  return () => {
    networkListener.remove()
  }
}, [clientId, phone])
```

#### 3. Battery Optimization (Android)

**Problema:** Android pode matar WebSocket para economizar bateria

**Solução:**
- Usar `heartbeat` do Supabase Realtime
- Configurar `keepalive`

```typescript
const channel = supabase
  .channel(`chat:${clientId}:${phone}`, {
    config: {
      broadcast: { self: false },
      presence: { key: '' },
    },
  })
  .on('postgres_changes', { ... }, handler)
  .subscribe((status) => {
    console.log('Status:', status)

    // Supabase envia heartbeat automático a cada 30s
    // Se não receber, reconecta automaticamente
  })
```

#### 4. Permissions (iOS)

**iOS** pode restringir background connections.

**Solução:** Adicionar ao `Info.plist` (se necessário)
```xml
<!-- ios/App/App/Info.plist -->
<key>UIBackgroundModes</key>
<array>
  <string>fetch</string>
  <string>remote-notification</string>
</array>
```

### 📦 Instalação de Plugins Necessários

```bash
# Network plugin (detectar mudanças de rede)
npm install @capacitor/network

# App plugin (lifecycle events) - JÁ INSTALADO
npm install @capacitor/app

# Sync com projetos nativos
npx cap sync
```

### 🧪 Testes Específicos Mobile

#### Cenários a testar:

1. **App em foreground**
   - [ ] Receber mensagem → atualiza instantaneamente

2. **App vai para background e volta**
   - [ ] Conexão reconecta automaticamente
   - [ ] Mensagens recebidas enquanto em background aparecem ao voltar

3. **Trocar WiFi ↔ 4G**
   - [ ] Reconexão automática
   - [ ] Sem perda de mensagens

4. **Perda total de internet**
   - [ ] App não trava
   - [ ] Ao voltar internet, reconecta automaticamente

5. **Battery Saver Mode (Android)**
   - [ ] Conexão persiste ou reconecta rapidamente

### 📝 Configuração Final para Mobile

```typescript
// src/hooks/useRealtimeMessages.ts (versão completa)
import { useEffect, useState, useRef } from 'react'
import { createClientBrowser } from '@/lib/supabase'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Network } from '@capacitor/network'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const useRealtimeMessages = ({ clientId, phone, onNewMessage }) => {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const isMobile = Capacitor.isNativePlatform()

  const setupSubscription = useCallback(() => {
    const supabase = createClientBrowser()

    const channel = supabase
      .channel(`chat:${clientId}:${phone}`, {
        config: {
          broadcast: { self: false },
          presence: { key: '' },
        },
      })
      .on('postgres_changes', { ... }, handler)
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel
  }, [clientId, phone])

  // Setup inicial
  useEffect(() => {
    if (!clientId || !phone) return
    setupSubscription()

    return () => {
      if (channelRef.current) {
        createClientBrowser().removeChannel(channelRef.current)
      }
    }
  }, [clientId, phone, setupSubscription])

  // Mobile: App lifecycle
  useEffect(() => {
    if (!isMobile) return

    const listener = App.addListener('appStateChange', (state) => {
      if (state.isActive && channelRef.current) {
        // Verificar estado da conexão
        if (channelRef.current.state !== 'joined') {
          console.log('🔄 Reconnecting after resume')
          setupSubscription()
        }
      }
    })

    return () => listener.remove()
  }, [isMobile, setupSubscription])

  // Mobile: Network changes
  useEffect(() => {
    if (!isMobile) return

    const listener = Network.addListener('networkStatusChange', (status) => {
      if (status.connected && channelRef.current) {
        if (channelRef.current.state !== 'joined') {
          console.log('🔄 Reconnecting after network change')
          setupSubscription()
        }
      }
    })

    return () => listener.remove()
  }, [isMobile, setupSubscription])

  return { isConnected }
}
```

---

## 📚 Referências

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [RLS e Realtime](https://supabase.com/docs/guides/realtime/row-level-security)
- [Capacitor App Plugin](https://capacitorjs.com/docs/apis/app)
- [Capacitor Network Plugin](https://capacitorjs.com/docs/apis/network)

---

## 🎯 Resultado Esperado

Após implementação completa:
- ✅ Mensagens atualizam em < 1 segundo
- ✅ Zero refresh/piscar de tela
- ✅ UX similar ao WhatsApp
- ✅ Performance otimizada
- ✅ Funciona offline → online (reconexão automática)
- ✅ **Funciona em Web Desktop**
- ✅ **Funciona em Capacitor Android**
- ✅ **Funciona em Capacitor iOS**
- ✅ **Reconexão automática ao voltar do background (mobile)**
- ✅ **Reconexão automática ao trocar rede (WiFi ↔ 4G)**
