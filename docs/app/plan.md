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
    - [ ] Test login flow
    - [ ] Test chat functionality
- [x] **App Icons & Splash Screens** ✅
    - [x] Install `@capacitor/assets` (v3.0.5)
    - [ ] Generate/update assets for Android/iOS (assets existem, mas podem precisar atualização)
- [x] **Environment Variables** ✅
    - [x] Doppler integrated and configured
    - [x] Scripts updated for dev/stg/prd environments
    - [x] Ensure Supabase keys are correctly loaded

## 🚀 Phase 3: Native Features
- [ ] **Push Notifications**
    - Integrate `@capacitor/push-notifications`
    - Configure Firebase (Android) and APNs (iOS)
- [ ] **Deep Linking**
    - Configure App Links / Universal Links
    - Handle deep links in `App.tsx` or `layout.tsx`
- [ ] **Biometric Auth** (Optional)
    - Implement FaceID/TouchID login

## 🔄 Long-term: Re-integration
- [ ] **Admin Panel**
    - Refactor Admin pages to use client-side fetching exclusively
    - Re-introduce to mobile build
- [ ] **Analytics**
    - Refactor Analytics to be mobile-compatible
