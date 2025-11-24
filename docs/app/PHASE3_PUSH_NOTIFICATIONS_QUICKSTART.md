# Phase 3.3: Push Notifications - Quick Start

Guia passo a passo para configurar e testar push notifications no app mobile.

## 🎯 Objetivo

Permitir que o app receba notificações push mesmo quando está fechado.

**Exemplos:**
- "Você tem uma nova mensagem no chat #123"
- "Atendimento transferido para você"
- "Nova conversa iniciada"

---

## ⏱️ Tempo Estimado

**2-4 horas** (depende da experiência com Firebase)

---

## ✅ O Que Já Foi Implementado

1. ✅ **Plugin instalado** (`@capacitor/push-notifications`)
2. ✅ **Código TypeScript** (`src/lib/pushNotifications.ts`)
3. ✅ **Provider React** (`src/components/PushNotificationsProvider.tsx`)
4. ✅ **Integrado no Layout** (`src/app/layout.tsx`)
5. ✅ **Permissões Android** (`AndroidManifest.xml`)
6. ✅ **Dependências Gradle** (`build.gradle`)

---

## 📋 Checklist de Configuração

### Passo 1: Criar Projeto Firebase (15-30 min)

1. **Acesse:** [https://console.firebase.google.com/](https://console.firebase.google.com/)

2. **Criar Projeto:**
   - Clique **"Add project"** ou **"Criar um projeto"**
   - Nome: `ChatBot Oficial` (ou qualquer nome)
   - Google Analytics: **Desabilitar** (opcional, não necessário para push)
   - Clique **"Create project"** / **"Criar projeto"**

3. **Aguardar criação** (1-2 minutos)

---

### Passo 2: Adicionar App Android (5-10 min)

1. **No Firebase Console:**
   - Clique no ícone **Android** (ou **"Adicionar app"** → **Android**)

2. **Configurar App:**
   - **Android package name**: `com.chatbot.app`
     - ⚠️ **IMPORTANTE:** Deve ser exatamente igual ao `applicationId` no `android/app/build.gradle`
   - **App nickname**: `ChatBot Android` (opcional)
   - **Debug signing certificate SHA-1**: (deixar vazio por enquanto)
   - Clique **"Register app"** / **"Registrar app"**

---

### Passo 3: Baixar google-services.json (2 min)

1. **Baixar arquivo:**
   - Firebase vai mostrar um botão para baixar `google-services.json`
   - Clique **"Download google-services.json"**

2. **Mover arquivo:**
   ```powershell
   # No PowerShell (ajuste o caminho se necessário)
   Move-Item ~/Downloads/google-services.json android/app/
   ```

3. **Verificar:**
   ```powershell
   # Verificar se arquivo existe
   Test-Path android/app/google-services.json
   # Deve retornar: True
   ```

---

### Passo 4: Criar Tabela no Supabase (5-10 min)

1. **Acesse Supabase Dashboard:**
   - Vá para: [https://app.supabase.com](https://app.supabase.com)
   - Selecione seu projeto

2. **SQL Editor:**
   - Clique em **"SQL Editor"** no menu lateral
   - Clique **"New query"**

3. **Executar SQL:**
   ```sql
   -- Criar tabela para armazenar tokens de push
   CREATE TABLE IF NOT EXISTS push_tokens (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     token TEXT NOT NULL UNIQUE,
     platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   -- Índices para performance
   CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
   CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

   -- RLS (Row Level Security): Permitir usuários lerem apenas seus próprios tokens
   ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

   -- Policy: Usuários podem ler seus próprios tokens
   CREATE POLICY "Users can read own tokens"
     ON push_tokens
     FOR SELECT
     USING (auth.uid() = user_id);

   -- Policy: Usuários podem inserir seus próprios tokens
   CREATE POLICY "Users can insert own tokens"
     ON push_tokens
     FOR INSERT
     WITH CHECK (auth.uid() = user_id);

   -- Policy: Usuários podem atualizar seus próprios tokens
   CREATE POLICY "Users can update own tokens"
     ON push_tokens
     FOR UPDATE
     USING (auth.uid() = user_id);
   ```

4. **Executar:**
   - Clique **"Run"** ou pressione `Ctrl+Enter`
   - Deve mostrar: "Success. No rows returned"

---

### Passo 5: Rebuild e Testar (10-15 min)

1. **Sync Capacitor:**
   ```bash
   npx cap sync android
   ```

2. **Build:**
   ```bash
   npm run build:mobile
   ```

3. **Abrir Android Studio:**
   ```bash
   npm run cap:open:android
   ```

4. **No Android Studio:**
   - Aguardar Gradle sync (pode demorar 1-2 min na primeira vez)
   - Se aparecer erro sobre `google-services.json`, verifique se arquivo está em `android/app/`
   - Clique **Run** (▶️) ou `Shift + F10`

5. **No Emulador/Device:**
   - App deve abrir
   - Fazer login
   - **Verificar console (Chrome DevTools):**
     - Abrir: `chrome://inspect`
     - Clicar **Inspect** no app
     - Aba **Console**
     - Procurar: `[Push Notifications] Token registrado: ...`
     - Se aparecer → ✅ **Funcionou!**

---

## 🧪 Como Testar

### Teste 1: Verificar Token no Supabase

1. **Supabase Dashboard:**
   - **Table Editor** → `push_tokens`
   - Deve aparecer uma linha com seu `user_id` e `token`

2. **Se não aparecer:**
   - Verificar console do app (logs de erro)
   - Verificar se usuário está autenticado
   - Verificar se tabela foi criada corretamente

---

### Teste 2: Enviar Notificação de Teste (Firebase Console)

1. **Firebase Console:**
   - **Cloud Messaging** → **"Send test message"** / **"Enviar mensagem de teste"**

2. **Configurar:**
   - **FCM registration token**: Copiar do Supabase (`push_tokens.token`)
   - **Notification title**: `Teste Push`
   - **Notification text**: `Esta é uma notificação de teste`
   - Clique **"Test"** / **"Testar"**

3. **No Device:**
   - Notificação deve aparecer
   - Clicar na notificação → App deve abrir

---

## 🐛 Troubleshooting

### ❌ Erro: "google-services.json not found"

**Solução:**
- Verificar se arquivo está em `android/app/google-services.json`
- Verificar se nome do arquivo está correto (sem espaços)
- Fazer `npx cap sync android` novamente

---

### ❌ Erro: "Permission denied" no console

**Solução:**
- Android 13+ requer permissão explícita
- Verificar se `POST_NOTIFICATIONS` está no `AndroidManifest.xml`
- Desinstalar app e reinstalar (permissões são solicitadas na primeira vez)

---

### ❌ Token não aparece no Supabase

**Possíveis causas:**
1. Usuário não está autenticado
2. Tabela `push_tokens` não existe
3. RLS (Row Level Security) bloqueando inserção

**Solução:**
- Verificar console do app (logs)
- Verificar se tabela foi criada
- Verificar policies do RLS

---

### ❌ Notificação não aparece

**Possíveis causas:**
1. Token não está registrado
2. App está em foreground (Android não mostra automaticamente)
3. Permissão negada

**Solução:**
- Fechar app completamente
- Enviar notificação de teste
- Verificar se permissão foi concedida

---

## 📝 Próximos Passos

Após testar push notifications:

1. ✅ Marcar como completo no `plan.md`
2. 🔔 **Backend:** Criar função para enviar notificações quando nova mensagem chegar
3. 🔔 **Backend:** Integrar com sistema de mensagens existente

---

## 📚 Referências

- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)

---

**Status:** ✅ Código implementado, aguardando configuração Firebase

