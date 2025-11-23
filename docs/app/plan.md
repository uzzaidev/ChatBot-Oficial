# Mobile App Implementation Plan

## 📱 Phase 1: Core Integration (Completed) ✅
- [x] Initialize Capacitor project (`android`, `ios`)
- [x] Configure static export (`output: 'export'`)
- [x] Adapt routing for mobile (remove dynamic routes)
- [x] Convert critical pages to Client Components
- [x] Exclude incompatible server-side features (Admin, Analytics)
- [x] Verify successful build (`npm run build:mobile`)

## 🧪 Phase 2: Verification & Polish (Current)
- [x] **Verify on Simulator/Device** ✅
    - [x] Run `npx cap open android` and test on emulator
    - [x] Android Studio configurado e funcionando
    - [x] App rodando no emulador com sucesso
    - [x] Test login flow ✅
    - [x] Test chat functionality ✅ (corrigido erro de API route)
- [x] **App Icons & Splash Screens** ✅
    - [x] Install `@capacitor/assets` (v3.0.5)
    - [x] Generate/update assets for Android/iOS ✅ (87 assets gerados automaticamente)
- [x] **Environment Variables** ✅
    - [x] Doppler integrated and configured
    - [x] Scripts updated for dev/stg/prd environments
    - [x] Ensure Supabase keys are correctly loaded

## 🚀 Phase 3: Native Features (Modular)
- [x] **3.1: Melhorar Assets (Ícones/Splash)** ✅
    - [x] Preparar arquivos source (`icon.png`, `splash.png`) - **IMAGENS ORGANIZADAS EM `assets/`**
    - [x] Gerar assets com `@capacitor/assets` (87 assets gerados)
    - [x] Sync com Capacitor
    - [ ] Testar no emulador/device (próximo passo: rebuild e testar)
- [x] **3.2: Deep Linking** ✅
    - [x] Código implementado (`src/lib/deepLinking.ts`)
    - [x] Provider criado (`src/components/DeepLinkingProvider.tsx`)
    - [x] AndroidManifest configurado (intent-filters)
    - [x] Integrado no layout
    - [x] Plugin `@capacitor/app` instalado
    - [x] Build testado e funcionando
    - [x] ADB configurado
    - [x] **Testado e funcionando** ✅
- [x] **3.3: Push Notifications** ✅
    - [x] Plugin instalado (`@capacitor/push-notifications`)
    - [x] Código implementado (`src/lib/pushNotifications.ts`)
    - [x] Provider criado (`src/components/PushNotificationsProvider.tsx`)
    - [x] Integrado no layout
    - [x] Permissões Android configuradas (`POST_NOTIFICATIONS`)
    - [x] Dependências Gradle configuradas (`firebase-messaging`)
    - [x] Script SQL criado (`scripts/create-push-tokens-table.sql`)
    - [x] **Firebase configurado** (projeto criado, `google-services.json` adicionado)
    - [x] **Tabela criada no Supabase** (`push_tokens` criada com sucesso)
    - [x] **Service Account configurado** (API V1)
    - [x] **Script de teste criado** (`scripts/test-push-v1.js`)
    - [x] **Testado e funcionando** ✅
    - [x] Token registrado e salvo automaticamente
    - [x] Notificação de teste enviada e recebida com sucesso
- [ ] **3.4: Biometric Auth** (Optional)
    - Implement FaceID/TouchID login

## 🔄 Long-term: Re-integration
- [ ] **Admin Panel**
    - Refactor Admin pages to use client-side fetching exclusively
    - Re-introduce to mobile build
- [ ] **Analytics**
    - Refactor Analytics to be mobile-compatible
