# 🔔 Sistema de Notificações

Sistema completo de notificações para o ChatBot WhatsApp SaaS Dashboard.

## 📋 Funcionalidades Implementadas

### ✅ Fase 1 - Browser Notifications (IMPLEMENTADO)

- **Browser Notifications API**
  - Notificações nativas do sistema operacional
  - Funciona mesmo com aba em background
  - Som customizável
  - Auto-fecha após 5 segundos
  - Clique na notificação abre a conversa

- **Gerenciamento Inteligente**
  - Solicita permissão automaticamente (com delay de 2s)
  - Apenas notifica conversas que NÃO estão abertas
  - Filtra apenas mensagens de usuário (não bot)
  - Trunca mensagens longas (max 50 caracteres)

- **Fallback System**
  - Se notificações bloqueadas → Toast dentro do app
  - Se navegador não suporta → Toast dentro do app
  - Se erro ao mostrar → Toast dentro do app

- **UI Components**
  - Botão toggle no header (Bell/BellOff icon)
  - Estado visual (verde = ativado, cinza = desativado)
  - Tooltip informativo

### 🚧 Fase 2 - Push Notifications Mobile (FUTURO)

Requer:
- Firebase Cloud Messaging (FCM) para Android
- Apple Push Notification Service (APNS) para iOS
- Backend service para enviar notificações (n8n pode fazer)
- Tokens de dispositivo armazenados no banco

## 🏗️ Arquitetura

### Componentes

```
src/
├── hooks/
│   ├── useNotifications.ts              # Hook de notificações (Browser API)
│   └── useGlobalRealtimeNotifications.ts # Hook de realtime (Supabase)
│
├── components/
│   └── NotificationManager.tsx          # Gerenciador global + Toggle UI
│
└── app/
    └── layout.tsx                       # NotificationManager adicionado aqui
```

### Fluxo de Dados

```
Nova mensagem no WhatsApp
    ↓
n8n insere em n8n_chat_histories
    ↓
Supabase Realtime notifica (INSERT event)
    ↓
useGlobalRealtimeNotifications captura
    ↓
NotificationManager verifica se conversa está aberta
    ↓
Se NÃO aberta → useNotifications.notify()
    ↓
Browser mostra notificação + toca som
```

## 🎯 Como Usar

### 1. Ativar Notificações

**Automático:**
- Sistema solicita permissão automaticamente após 2 segundos

**Manual:**
- Clique no ícone de sino (🔔) no header do dashboard
- Aceite a permissão no navegador

### 2. Adicionar Som de Notificação

**Opção A - Baixar Som Gratuito (RECOMENDADO)**

1. Acesse: https://notificationsounds.com/ ou https://mixkit.co/
2. Baixe um som curto (1-2 segundos)
3. Renomeie para `notification.mp3`
4. Coloque em `/public/notification.mp3`

**Opção B - Usar Som do WhatsApp**

1. Grave o som do WhatsApp Web usando software de captura
2. Salve como `notification.mp3`
3. Coloque em `/public/notification.mp3`

**Opção C - Sem Som**

Se não adicionar arquivo, o sistema funciona normalmente mas sem som.

### 3. Testar

1. Abra o dashboard em uma aba
2. Aceite permissão de notificações
3. Envie uma mensagem para um número via WhatsApp
4. Deve aparecer notificação + som (se configurado)

**Importante:** 
- Notificação só aparece se você NÃO estiver vendo a conversa
- Se estiver na conversa, não notifica (evita spam)

## ⚙️ Configuração

### Desabilitar Notificações Globalmente

```tsx
// src/app/layout.tsx
<NotificationManager enabled={false} />
```

### Customizar Som

```tsx
// src/components/NotificationManager.tsx
const { notify } = useNotifications({
  enabled: true,
  sound: true,
  soundUrl: '/custom-sound.mp3', // Seu som customizado
})
```

### Customizar Delay de Solicitação

```tsx
// src/components/NotificationManager.tsx
setTimeout(() => {
  requestPermission()
}, 5000) // 5 segundos em vez de 2
```

### Remover Auto-Request de Permissão

```tsx
// src/components/NotificationManager.tsx
// Comente ou remova o useEffect que chama requestPermission()
```

## 🐛 Troubleshooting

### Notificações não aparecem

**1. Verifique permissões do navegador**
- Chrome: Settings → Privacy and security → Site settings → Notifications
- Firefox: Settings → Privacy & Security → Permissions → Notifications
- Safari: Preferences → Websites → Notifications

**2. Verifique console do navegador**
```javascript
// Abra DevTools (F12) e digite:
Notification.permission
// Deve retornar: "granted", "denied" ou "default"
```

**3. Teste manualmente**
```javascript
// No console do navegador:
new Notification('Teste', { body: 'Funcionou!' })
```

### Som não toca

**1. Verifique se arquivo existe**
- Acesse: http://localhost:3000/notification.mp3
- Deve tocar o som ou dar erro 404

**2. Formato suportado**
- Use MP3 (suporte universal)
- Evite WAV (arquivo grande)
- Evite OGG (suporte limitado)

**3. Volume do sistema**
- Verifique se volume não está mutado
- Som é tocado com 50% do volume

### Notificações não aparecem no mobile

**Browser Notifications não funcionam bem em mobile browsers**
- Chrome mobile: ❌ Limitado
- Safari iOS: ❌ Não suporta
- Firefox mobile: ⚠️ Parcial

**Solução:** Implementar Push Notifications (Fase 2)

## 🔒 Segurança

### Permissões

- Sistema NUNCA força permissão
- Usuário pode negar a qualquer momento
- Se negado, sistema respeita e usa Toast

### Privacidade

- Mensagens truncadas (max 50 caracteres)
- Sem envio de dados para servidores externos
- Tudo processado no browser

## 📊 Performance

### Otimizações

- Debounce de 300ms para evitar múltiplas notificações
- Auto-fecha após 5 segundos (evita acúmulo)
- Tag única por conversa (substitui notificação antiga)
- Som em cache (não recarrega)

### Consumo

- **Memória:** ~2MB (áudio em cache)
- **CPU:** Mínimo (apenas em eventos realtime)
- **Bateria:** Desprezível

## 🚀 Próximos Passos (Fase 2)

### Push Notifications Mobile

**Backend (n8n):**
```javascript
// Quando nova mensagem chega:
POST https://fcm.googleapis.com/fcm/send
Headers:
  Authorization: key=YOUR_FCM_SERVER_KEY
  Content-Type: application/json
Body:
{
  "to": "device_token_from_database",
  "notification": {
    "title": "Nova mensagem WhatsApp",
    "body": "João: Olá, tudo bem?"
  },
  "data": {
    "phone": "+5511999999999",
    "url": "/conversations/5511999999999"
  }
}
```

**Frontend (Capacitor):**
```typescript
import { PushNotifications } from '@capacitor/push-notifications'

// Solicitar permissão
await PushNotifications.requestPermissions()

// Registrar token
PushNotifications.addListener('registration', async (token) => {
  // Salvar token.value no banco (user_profiles ou nova tabela)
  await supabase.from('device_tokens').insert({
    user_id: user.id,
    token: token.value,
    platform: Capacitor.getPlatform()
  })
})

// Receber notificação
PushNotifications.addListener('pushNotificationReceived', (notification) => {
  // Atualizar UI
})
```

**Banco de Dados:**
```sql
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);
```

## 📚 Referências

- [Notifications API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [Push API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

## ✅ Status

- ✅ Browser Notifications API
- ✅ Som customizável
- ✅ Toast fallback
- ✅ UI toggle button
- ✅ Auto-request permissão
- ✅ Filtro por conversa aberta
- ⏳ Push Notifications Mobile (Fase 2)
- ⏳ Badge no ícone do app (Fase 2)
- ⏳ Backend service (Fase 2)
