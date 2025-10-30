# Real-time Conversation Notifications

## Visão Geral

O dashboard agora possui notificações em tempo real para novas mensagens, mesmo quando você está visualizando outra conversa.

## Como Funciona

### 1. Detecção de Novas Mensagens
- O sistema monitora a tabela `n8n_chat_histories` usando Supabase Realtime
- Quando uma nova mensagem é inserida, o evento é capturado imediatamente
- O `session_id` (telefone) é extraído para identificar qual conversa recebeu a mensagem

### 2. Indicadores Visuais

Quando uma nova mensagem chega em uma conversa que **NÃO** está aberta:

- **Fundo Azul Claro**: A conversa fica com fundo `bg-blue-50`
- **Texto em Negrito**: Nome e prévia da mensagem ficam em negrito
- **Indicador de Bolinha**: Aparece uma bolinha azul (`•`) no lado direito
- **Animação Pulse**: Por 2 segundos após receber a mensagem, a conversa pulsa suavemente

### 3. Limpeza Automática

O indicador de "não lido" é automaticamente removido quando:
- Você clica na conversa
- A conversa se torna ativa no painel direito

## Arquitetura Técnica

### Componentes Modificados

#### `src/hooks/useConversations.ts`
```typescript
// Retorna lastUpdatePhone para rastrear última conversa atualizada
return {
  conversations,
  loading,
  error,
  total,
  refetch: fetchConversations,
  lastUpdatePhone, // ← NOVO
}
```

#### `src/components/ConversationList.tsx`
```typescript
// Estado para rastrear conversas não lidas
const [unreadConversations, setUnreadConversations] = useState<Set<string>>(new Set())
const [recentlyUpdated, setRecentlyUpdated] = useState<string | null>(null)

// Efeito que detecta nova mensagem
useEffect(() => {
  if (lastUpdatePhone && lastUpdatePhone !== currentPhone) {
    setUnreadConversations(prev => new Set(prev).add(lastUpdatePhone))
    setRecentlyUpdated(lastUpdatePhone) // Animação pulse
  }
}, [lastUpdatePhone, currentPhone])
```

### Fluxo de Dados

```
1. WhatsApp → Meta API → /api/webhook
                ↓
2. chatbotFlow.ts processa mensagem
                ↓
3. saveChatMessage salva em n8n_chat_histories
                ↓
4. Supabase Realtime emite evento INSERT
                ↓
5. useConversations detecta e extrai session_id
                ↓
6. setLastUpdatePhone(session_id)
                ↓
7. ConversationList recebe lastUpdatePhone
                ↓
8. Adiciona à Set de unreadConversations
                ↓
9. Renderiza indicadores visuais
```

## Configuração Necessária

### Supabase Realtime

Certifique-se que a replicação está habilitada para a tabela `n8n_chat_histories`:

1. Acesse: https://app.supabase.com/project/_/database/replication
2. Selecione a tabela `n8n_chat_histories`
3. Ative a opção "Realtime"
4. Aguarde 1-2 minutos para propagar

### Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Necessário para Realtime no cliente
```

## Testando a Feature

### Teste Manual

1. Abra o dashboard: http://localhost:3000/dashboard
2. Clique em uma conversa (ex: Cliente A)
3. Envie uma mensagem de WhatsApp de outro número (Cliente B)
4. Observe a lista de conversas à esquerda:
   - Cliente B deve aparecer com fundo azul
   - Texto em negrito
   - Bolinha azul à direita
   - Animação pulse por 2 segundos

### Teste de Limpeza

1. Com Cliente B mostrando indicador de não lido
2. Clique na conversa de Cliente B
3. Indicador deve desaparecer imediatamente

## Limitações Conhecidas

1. **Apenas Indicador Visual**: Não há contador numérico de mensagens (mostra apenas `•`)
2. **Sem Persistência**: Se você recarregar a página, os indicadores de não lido são perdidos
3. **Sem Som**: Não há notificação sonora quando nova mensagem chega

## Melhorias Futuras

- [ ] Adicionar contador numérico de mensagens não lidas
- [ ] Persistir estado de não lido no `localStorage`
- [ ] Adicionar notificação sonora (opcional, configurável)
- [ ] Adicionar notificação do navegador (Web Notifications API)
- [ ] Ordenar conversas com não lidos no topo
- [ ] Badge no título da aba do navegador (`(1) ChatBot`)

## Troubleshooting

### Indicadores não aparecem

**Problema**: Nova mensagem chega, mas indicador não aparece

**Verificar**:
1. Console do navegador: `[Realtime] Nova mensagem detectada`
2. Console do navegador: `[ConversationList] Nova mensagem de: ...`
3. Supabase Realtime está habilitado?
4. Conexão WebSocket está ativa? (veja Network tab → WS)

### Indicadores não limpam

**Problema**: Clicou na conversa mas indicador não sumiu

**Verificar**:
1. `currentPhone` está sendo passado corretamente?
2. Veja console: deve mostrar limpeza automática
3. Recarregue a página (vai limpar tudo)

## Referências

- [Supabase Realtime Docs](https://supabase.com/docs/guides/realtime)
- [React useState with Set](https://react.dev/learn/updating-objects-in-state)
- [Tailwind Animations](https://tailwindcss.com/docs/animation)
