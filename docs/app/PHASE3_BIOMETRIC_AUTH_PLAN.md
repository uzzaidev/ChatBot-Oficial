# Phase 3.4: Biometric Auth (FaceID/TouchID) - Planejamento Completo

## 🎯 Objetivo

Implementar autenticação biométrica (FaceID/TouchID) no app mobile para permitir login rápido e seguro sem precisar digitar senha toda vez.

---

## 📊 Análise de Impacto

### ✅ **ZERO Impacto no Dev Senior**

**Por quê:**
- ✅ **Mobile-only**: Funciona apenas no app nativo (não afeta web)
- ✅ **Isolado**: Usa plugin do Capacitor (`@capacitor/local-authentication`)
- ✅ **Não mexe com:**
  - API routes
  - Backend/Supabase
  - Flows/nodes
  - Webhooks
  - Lógica de negócio compartilhada
- ✅ **Apenas adiciona:**
  - Plugin do Capacitor
  - Código client-side no mobile
  - Verificação de biometria antes do login

**Risco:** 🟢 **BAIXO** — Completamente isolado no mobile

---

## 🏗️ Arquitetura Proposta

### Fluxo de Autenticação Biométrica

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuário abre app (mobile)                                │
│    ↓                                                         │
│ 2. Verificar se biometria está disponível                  │
│    ↓                                                         │
│ 3. Verificar se usuário já fez login antes (tem sessão)    │
│    ↓                                                         │
│ 4. Se SIM: Mostrar botão "Entrar com Biometria"            │
│    Se NÃO: Mostrar formulário normal                        │
│    ↓                                                         │
│ 5. Usuário clica "Entrar com Biometria"                    │
│    ↓                                                         │
│ 6. Solicitar autenticação biométrica (FaceID/TouchID)       │
│    ↓                                                         │
│ 7. Se sucesso: Restaurar sessão do Supabase                │
│    Se falha: Mostrar erro ou opção de login manual          │
│    ↓                                                         │
│ 8. Redirecionar para dashboard                              │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Arquivos

```
src/
├── lib/
│   └── biometricAuth.ts          ← Nova (lógica de biometria)
├── components/
│   └── BiometricAuthButton.tsx   ← Nova (botão de biometria)
└── app/(auth)/login/
    └── page.tsx                  ← Modificar (adicionar opção biométrica)
```

---

## 📋 Checklist de Implementação

### Passo 1: Instalar Plugin
- [ ] Instalar `@capacitor/local-authentication`
- [ ] Verificar versão compatível com Capacitor 7

### Passo 2: Criar Biblioteca de Biometria
- [ ] Criar `src/lib/biometricAuth.ts`
- [ ] Implementar funções:
  - `checkBiometricAvailability()` - Verificar se biometria está disponível
  - `authenticateWithBiometric()` - Solicitar autenticação biométrica
  - `saveBiometricPreference()` - Salvar preferência do usuário (localStorage)
  - `getBiometricPreference()` - Verificar se usuário habilitou biometria

### Passo 3: Criar Componente de Botão
- [ ] Criar `src/components/BiometricAuthButton.tsx`
- [ ] Implementar:
  - Botão visual (ícone de biometria)
  - Loading state
  - Error handling
  - Fallback para login manual

### Passo 4: Integrar no Login
- [ ] Modificar `src/app/(auth)/login/page.tsx`
- [ ] Adicionar:
  - Verificação se biometria está disponível
  - Verificação se usuário já fez login antes
  - Botão "Entrar com Biometria" (se disponível)
  - Lógica para restaurar sessão após biometria

### Passo 5: Configurar Android
- [ ] Verificar permissões no `AndroidManifest.xml`
- [ ] Testar no emulador/device físico

### Passo 6: Testar
- [ ] Testar fluxo completo
- [ ] Testar fallback (biometria não disponível)
- [ ] Testar erro de autenticação
- [ ] Testar primeiro login (sem biometria)

---

## 🔧 Detalhes Técnicos

### Plugin: `@capacitor/local-authentication`

**Documentação:** https://capacitorjs.com/docs/apis/local-authentication

**Funcionalidades:**
- Verificar disponibilidade de biometria
- Solicitar autenticação biométrica
- Verificar tipo de biometria disponível (FaceID, TouchID, Fingerprint)

**Exemplo de uso:**
```typescript
import { LocalAuthentication } from '@capacitor/local-authentication'

// Verificar disponibilidade
const result = await LocalAuthentication.checkBiometry()

// Solicitar autenticação
const authResult = await LocalAuthentication.authenticate({
  reason: 'Autentique-se para acessar o app',
  title: 'Autenticação Biométrica',
  subtitle: 'Use sua biometria para fazer login',
  description: 'Toque no sensor ou olhe para a câmera',
})
```

### Armazenamento de Sessão

**Estratégia:**
- Usar `localStorage` para salvar preferência do usuário
- Usar Supabase session storage (já existe)
- **NÃO** salvar senha ou tokens sensíveis
- Apenas verificar se usuário já tem sessão válida

**Fluxo:**
1. Primeiro login: usuário faz login normal (email/senha)
2. Após login bem-sucedido: perguntar se quer habilitar biometria
3. Se SIM: salvar preferência em `localStorage`
4. Próximos logins: mostrar botão de biometria
5. Biometria bem-sucedida: restaurar sessão do Supabase

---

## 🎨 UX/UI

### Tela de Login (Mobile)

**Cenário 1: Primeiro Login (sem biometria habilitada)**
```
┌─────────────────────────────┐
│   UzzApp Dashboard          │
│                             │
│   Email: [____________]     │
│   Senha: [____________]     │
│                             │
│   [  Entrar  ]              │
│                             │
│   Não tem conta?            │
│   Crie uma conta            │
└─────────────────────────────┘
```

**Cenário 2: Login com Biometria Habilitada**
```
┌─────────────────────────────┐
│   UzzApp Dashboard          │
│                             │
│   ┌─────────────────────┐  │
│   │  👤 Entrar com       │  │
│   │     Biometria        │  │
│   └─────────────────────┘  │
│                             │
│   ou                        │
│                             │
│   Email: [____________]     │
│   Senha: [____________]  │
│                             │
│   [  Entrar  ]              │
└─────────────────────────────┘
```

**Cenário 3: Biometria Não Disponível**
```
┌─────────────────────────────┐
│   UzzApp Dashboard          │
│                             │
│   Email: [____________]     │
│   Senha: [____________]     │
│                             │
│   [  Entrar  ]              │
│                             │
│   (Sem opção de biometria)  │
└─────────────────────────────┘
```

---

## 🔒 Segurança

### Boas Práticas

1. **Não armazenar senha**
   - Biometria apenas restaura sessão existente
   - Se sessão expirou, usuário precisa fazer login manual

2. **Verificar sessão válida**
   - Antes de mostrar botão de biometria, verificar se há sessão válida
   - Se não houver, não mostrar opção de biometria

3. **Fallback sempre disponível**
   - Se biometria falhar, sempre permitir login manual
   - Nunca bloquear usuário se biometria não funcionar

4. **Permissões**
   - Android: Verificar se `USE_BIOMETRIC` está configurado
   - iOS: Verificar se FaceID/TouchID está disponível

---

## 📝 Implementação Passo a Passo

### Passo 1: Instalar Plugin

```bash
npm install @capacitor/local-authentication
npx cap sync android
```

### Passo 2: Criar `src/lib/biometricAuth.ts`

```typescript
'use client'

import { LocalAuthentication } from '@capacitor/local-authentication'
import { Capacitor } from '@capacitor/core'

/**
 * Verifica se biometria está disponível no device
 */
export async function checkBiometricAvailability(): Promise<{
  available: boolean
  type?: 'face' | 'fingerprint' | 'iris'
}> {
  if (!Capacitor.isNativePlatform()) {
    return { available: false }
  }

  try {
    const result = await LocalAuthentication.checkBiometry()
    return {
      available: result.isAvailable,
      type: result.biometryType as 'face' | 'fingerprint' | 'iris',
    }
  } catch (error) {
    console.error('[Biometric Auth] Erro ao verificar disponibilidade:', error)
    return { available: false }
  }
}

/**
 * Solicita autenticação biométrica
 */
export async function authenticateWithBiometric(): Promise<{
  success: boolean
  error?: string
}> {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: 'Apenas disponível em mobile' }
  }

  try {
    const result = await LocalAuthentication.authenticate({
      reason: 'Autentique-se para acessar o UzzApp',
      title: 'Autenticação Biométrica',
      subtitle: 'Use sua biometria para fazer login',
      description: 'Toque no sensor ou olhe para a câmera',
    })

    return { success: result.succeeded }
  } catch (error: any) {
    console.error('[Biometric Auth] Erro na autenticação:', error)
    return {
      success: false,
      error: error.message || 'Erro ao autenticar',
    }
  }
}

/**
 * Salva preferência do usuário (habilitar biometria)
 */
export function saveBiometricPreference(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('biometric_enabled', String(enabled))
  }
}

/**
 * Verifica se usuário habilitou biometria
 */
export function getBiometricPreference(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('biometric_enabled') === 'true'
  }
  return false
}
```

### Passo 3: Criar `src/components/BiometricAuthButton.tsx`

```typescript
'use client'

import { useState } from 'react'
import {
  checkBiometricAvailability,
  authenticateWithBiometric,
} from '@/lib/biometricAuth'

interface BiometricAuthButtonProps {
  onSuccess: () => void
  onError?: (error: string) => void
}

export function BiometricAuthButton({
  onSuccess,
  onError,
}: BiometricAuthButtonProps) {
  const [loading, setLoading] = useState(false)
  const [available, setAvailable] = useState(false)

  // Verificar disponibilidade ao montar componente
  useState(() => {
    checkBiometricAvailability().then((result) => {
      setAvailable(result.available)
    })
  }, [])

  const handleBiometricAuth = async () => {
    setLoading(true)

    try {
      const result = await authenticateWithBiometric()

      if (result.success) {
        onSuccess()
      } else {
        onError?.(result.error || 'Autenticação biométrica falhou')
      }
    } catch (error: any) {
      onError?.(error.message || 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  if (!available) {
    return null // Não mostrar botão se biometria não estiver disponível
  }

  return (
    <button
      onClick={handleBiometricAuth}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 bg-mint-500 hover:bg-mint-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:bg-mint-300 disabled:cursor-not-allowed shadow-glow"
    >
      {loading ? (
        <>
          <span className="animate-spin">⏳</span>
          <span>Autenticando...</span>
        </>
      ) : (
        <>
          <span>👤</span>
          <span>Entrar com Biometria</span>
        </>
      )}
    </button>
  )
}
```

### Passo 4: Modificar `src/app/(auth)/login/page.tsx`

**Adicionar:**
- Import do `BiometricAuthButton`
- Verificação de sessão existente
- Lógica para restaurar sessão após biometria
- Perguntar se quer habilitar biometria após primeiro login

---

## 🧪 Testes

### Cenários de Teste

1. **Primeiro Login (sem biometria)**
   - [ ] Login normal funciona
   - [ ] Após login, pergunta se quer habilitar biometria
   - [ ] Se SIM, salva preferência
   - [ ] Se NÃO, não salva preferência

2. **Login com Biometria Habilitada**
   - [ ] Botão de biometria aparece
   - [ ] Clicar no botão solicita autenticação
   - [ ] Biometria bem-sucedida restaura sessão
   - [ ] Redireciona para dashboard

3. **Biometria Não Disponível**
   - [ ] Botão de biometria não aparece
   - [ ] Login manual funciona normalmente

4. **Erro na Biometria**
   - [ ] Se usuário cancela, mostra erro amigável
   - [ ] Se falha, permite login manual
   - [ ] Fallback sempre disponível

5. **Sessão Expirada**
   - [ ] Se sessão expirou, não mostra botão de biometria
   - [ ] Usuário precisa fazer login manual

---

## 📚 Recursos

- **Documentação Capacitor:** https://capacitorjs.com/docs/apis/local-authentication
- **Android Biometric:** https://developer.android.com/training/sign-in/biometric-auth
- **iOS FaceID/TouchID:** https://developer.apple.com/documentation/localauthentication

---

## ⏱️ Tempo Estimado

- **Instalação e setup:** 15 minutos
- **Implementação:** 1-2 horas
- **Testes:** 30 minutos
- **Total:** 2-3 horas

---

## ✅ Próximos Passos

1. Revisar este planejamento
2. Aprovar arquitetura proposta
3. Iniciar implementação passo a passo
4. Testar em device físico (biometria não funciona em emulador)

---

**Status:** 🟢 Implementação completa, aguardando testes em device físico

**Última atualização:** 2025-11-23

---

## ✅ Implementação Concluída

### Arquivos Criados/Modificados

1. **`src/lib/biometricAuth.ts`** ✅
   - Funções para verificar disponibilidade de biometria
   - Função para autenticação biométrica
   - Funções para gerenciar preferências (localStorage)

2. **`src/components/BiometricAuthButton.tsx`** ✅
   - Componente React para botão de biometria
   - Verifica disponibilidade automaticamente
   - Mostra apenas se biometria disponível e habilitada

3. **`src/app/(auth)/login/page.tsx`** ✅
   - Integração do BiometricAuthButton
   - Lógica para restaurar sessão após biometria
   - Prompt para habilitar biometria após primeiro login
   - Verificação de sessão válida antes de mostrar botão

### Plugin Instalado

- **`@aparajita/capacitor-biometric-auth@9.1.2`** ✅
  - Compatível com Capacitor 7+
  - Suporta FaceID, TouchID, Fingerprint
  - Permissões gerenciadas automaticamente

### Próximos Passos

1. **Testar em device físico** (biometria não funciona em emulador)
2. **Verificar fluxo completo:**
   - Primeiro login → habilitar biometria
   - Próximo login → usar biometria
   - Sessão expirada → login manual
   - Biometria cancelada → fallback para login manual

