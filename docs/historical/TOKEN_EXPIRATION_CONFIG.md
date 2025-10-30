# Configuração de Expiração de Token (10 horas)

## Objetivo

Configurar o JWT token do Supabase Auth para expirar em **10 horas** (36000 segundos) em vez do padrão de 1 hora.

---

## ⚙️ Como Configurar no Supabase Dashboard

### 1. Acessar Configurações de Autenticação

1. Ir para o **Supabase Dashboard**: https://app.supabase.com
2. Selecionar o projeto
3. No menu lateral, clicar em **Authentication** → **Configuration** → **Settings**

### 2. Configurar JWT Expiry

Procurar por **JWT Expiry** e configurar:

```
JWT Expiry (seconds): 36000
```

**Cálculo**:
- 1 hora = 3600 segundos
- 10 horas = 36000 segundos

### 3. Salvar Configurações

Clicar em **Save** no final da página.

---

## 🔄 Comportamento Após Expiração

### Fluxo de Expiração

1. **Usuário faz login** → Token válido por 10 horas
2. **Passa 10 horas** → Token expira
3. **Usuário tenta acessar dashboard** → Middleware detecta token inválido
4. **Redirect para `/login`** → Usuário precisa fazer login novamente

### Middleware Behavior

O middleware (`middleware.ts`) valida em **TODAS** as requisições para `/dashboard/*`:

```typescript
// 1. Verificar se usuário está autenticado
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  // Token expirado ou inválido → Redirect para /login
  return NextResponse.redirect(new URL('/login', request.url))
}

// 2. Verificar se user_profile existe
const { data: profile } = await supabase
  .from('user_profiles')
  .select('client_id, role')
  .eq('id', user.id)
  .single()

if (!profile) {
  // Profile inválido → Fazer logout e redirect
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/login', request.url))
}
```

---

## 🔐 Refresh Token

O Supabase usa **Refresh Tokens** para renovar o Access Token automaticamente.

### Como Funciona

1. **Access Token** (JWT): Expira em 10 horas
2. **Refresh Token**: Expira em 60 dias (padrão)
3. **Auto-Refresh**: Supabase client renova automaticamente o Access Token usando o Refresh Token

### Configurar Refresh Token Expiry (Opcional)

Se quiser alterar a duração do Refresh Token:

1. No Supabase Dashboard → **Authentication** → **Settings**
2. Procurar **Refresh Token Expiry (seconds)**
3. Padrão: `5184000` (60 dias)
4. Para 30 dias: `2592000`

---

## 🧪 Testar Expiração

### Método 1: Alterar Tempo Temporariamente

Para testar rapidamente:

1. Configurar JWT Expiry para **60 segundos** (1 minuto)
2. Fazer login
3. Esperar 1 minuto
4. Tentar acessar `/dashboard`
5. Deve redirecionar para `/login`
6. **Reverter** para 36000 segundos após teste

### Método 2: Inspecionar Token

1. Fazer login
2. Abrir DevTools → Application → Cookies
3. Procurar cookie `sb-access-token` ou similar
4. Decodificar JWT em: https://jwt.io
5. Verificar campo `exp` (timestamp de expiração)

```json
{
  "aud": "authenticated",
  "exp": 1730000000,  // ← Timestamp de expiração
  "iat": 1729964000,  // ← Timestamp de criação
  "sub": "user-uuid"
}
```

**Cálculo**:
```javascript
const expiresAt = new Date(exp * 1000)
const duration = (exp - iat) / 3600 // horas
```

---

## 📋 Checklist de Configuração

### No Supabase Dashboard

- [ ] Acessar Authentication → Configuration → Settings
- [ ] Configurar **JWT Expiry** para `36000` (10 horas)
- [ ] Salvar configurações
- [ ] (Opcional) Configurar **Refresh Token Expiry** se necessário

### No Código

- [x] Middleware valida token em todas as requisições
- [x] Middleware redireciona para `/login` se token inválido
- [x] Middleware faz logout se profile inválido
- [x] Supabase client usa cookies (auto-refresh habilitado)

### Testar

- [ ] Fazer login
- [ ] Verificar que dashboard funciona
- [ ] (Opcional) Alterar JWT Expiry para 60s e testar expiração
- [ ] Verificar redirect para /login após expiração
- [ ] Fazer login novamente e confirmar que funciona

---

## ⚠️ Notas Importantes

### 1. Session vs JWT

- **Access Token (JWT)**: Expira em 10 horas
- **Session Cookie**: Gerenciado pelo Supabase client
- **Refresh Token**: Usado para renovar Access Token

### 2. Auto-Refresh

O Supabase client (`@supabase/ssr`) renova **automaticamente** o Access Token quando:
- Access Token está próximo de expirar (< 60 segundos)
- Refresh Token ainda é válido

Se o **Refresh Token** expirar (após 60 dias), usuário **deve fazer login novamente**.

### 3. Logout Manual

Usuário pode fazer logout manualmente:
- Clicar em "Sair" no dashboard
- Limpa **todos** os tokens (Access + Refresh)

### 4. Segurança

**Por que 10 horas?**
- Equilíbrio entre conveniência e segurança
- Usuário não precisa fazer login a cada hora
- Mas não fica logado indefinidamente

**Recomendações**:
- Para ambientes críticos: usar 1-2 horas
- Para conveniência: até 24 horas
- Nunca usar > 7 dias no Access Token

---

## 🔧 Troubleshooting

### Token não está expirando

**Possível causa**: Refresh Token está renovando automaticamente

**Solução**: Desabilitar auto-refresh temporariamente para testar:
```typescript
const supabase = createBrowserClient({
  auth: {
    autoRefreshToken: false, // Apenas para teste!
  }
})
```

### Usuário deslogado antes de 10 horas

**Possíveis causas**:
1. Cookies foram limpos manualmente
2. Navegador fechou (se cookies não são persistentes)
3. RLS policy bloqueou acesso

**Debug**:
```bash
# Ver logs do middleware
console.log('[middleware] Token válido:', user.id)
console.log('[middleware] Profile válido:', profile.client_id)
```

### Redirect infinito

**Causa**: Middleware não consegue validar sessão

**Solução**:
1. Limpar cookies do navegador
2. Fazer logout manual via `/api/auth/logout`
3. Registrar novamente via `/register`

---

## 📚 Referências

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [JWT Token Configuration](https://supabase.com/docs/guides/auth/sessions)
- [Refresh Tokens](https://supabase.com/docs/guides/auth/sessions#refresh-tokens)

---

**Última atualização**: 2025-10-29
**Configuração recomendada**: JWT Expiry = 36000 segundos (10 horas)
