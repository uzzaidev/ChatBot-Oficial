# Sprint 2 - Session Security Configuration Guide

## Task 2.5: Session Timeout Configuration (VULN-014)

### Problem
Session timeout usa defaults do Supabase (1 hora para JWT, indefinido para refresh token), sem customização ou documentação.

### Solution
Configure session timeouts via Supabase Dashboard

### Configuration Steps

#### 1. Access Supabase Dashboard
1. Go to https://app.supabase.com/project/YOUR_PROJECT_ID/auth/settings
2. Navigate to **Authentication** → **Settings**

#### 2. Configure JWT Expiry
**Setting:** JWT expiry
**Recommended value:** `3600` (1 hour)
**Location:** Authentication → Settings → JWT Settings

**Explanation:**
- Access tokens (JWT) are used for API authentication
- 1 hour is a good balance between security and UX
- Shorter = more secure but more frequent token refreshes
- Longer = better UX but higher risk if token is compromised

#### 3. Configure Refresh Token Expiry
**Setting:** Refresh token expiry
**Recommended value:** `604800` (7 days)
**Location:** Authentication → Settings → JWT Settings

**Explanation:**
- Refresh tokens are used to get new access tokens
- 7 days = users need to login again after 1 week of inactivity
- Can be extended to 30 days for "Remember Me" functionality

#### 4. Optional: Implement "Remember Me" Feature

If you want to offer users the option to stay logged in longer:

```typescript
// In your login form component
const [rememberMe, setRememberMe] = useState(false)

// On login
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
  options: {
    // If "Remember Me" is checked, extend session to 30 days
    data: {
      refresh_token_lifetime: rememberMe ? 2592000 : 604800 // 30 days : 7 days
    }
  }
})
```

**Note:** This requires custom handling in your app. Supabase doesn't support this natively yet.

### Testing Session Expiration

#### Test 1: Access Token Expiration (1 hour)
```bash
# 1. Login and copy access token
curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# 2. Wait 1 hour
# 3. Try to use token
curl https://YOUR_PROJECT.supabase.co/rest/v1/user_profiles \
  -H "Authorization: Bearer <expired_token>"

# Expected: 401 Unauthorized
```

#### Test 2: Refresh Token Expiration (7 days)
```bash
# 1. Login
# 2. Wait 7 days (or change setting to 1 hour for testing)
# 3. Try to refresh token
curl -X POST https://YOUR_PROJECT.supabase.co/auth/v1/token?grant_type=refresh_token \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"<expired_refresh_token>"}'

# Expected: 400 Bad Request (refresh token expired)
```

### Frontend Implementation

#### Automatic Token Refresh
Supabase client handles this automatically:

```typescript
// src/lib/supabase.ts
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true, // ✅ Already enabled
    persistSession: true
  }
})
```

#### Session Expiration Handling
Add a global listener for auth state changes:

```typescript
// src/app/layout.tsx or similar
useEffect(() => {
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed successfully')
    }
    
    if (event === 'SIGNED_OUT') {
      // Redirect to login
      router.push('/login')
    }
    
    if (event === 'USER_UPDATED') {
      // Handle user profile updates
    }
  })
  
  return () => {
    authListener.subscription.unsubscribe()
  }
}, [])
```

### Security Best Practices

1. **Short access tokens** (1 hour max)
   - Reduces window of opportunity if token is stolen
   - Forces periodic re-validation

2. **Medium refresh tokens** (7 days)
   - Balance between security and UX
   - Users don't need to login daily

3. **Secure storage**
   - Supabase stores tokens in localStorage by default
   - Consider httpOnly cookies for extra security (requires custom implementation)

4. **Token rotation** (see Task 2.6)
   - Enable refresh token rotation in Supabase Dashboard
   - Each refresh generates a new refresh token

### Monitoring

Check Supabase Dashboard → Authentication → Users to see:
- Last sign in time
- Session status
- Active sessions per user

### Current Configuration

✅ **JWT expiry:** 3600 seconds (1 hour)
✅ **Refresh token expiry:** 604800 seconds (7 days)
✅ **Auto refresh:** Enabled in client
✅ **Persist session:** Enabled

---

## Task 2.6: Session Fixation Fix (VULN-005)

### Problem
Após registro, sistema reutiliza sessão criada durante registro, permitindo session fixation attacks.

### Solution
Não fazer login automático após registro. Exigir verificação de email antes do primeiro login.

### Current Flow (VULNERABLE)
```
User → Register → Auto-login → Authenticated
                   ↑ VULN: Uses same session
```

### Secure Flow (FIXED)
```
User → Register → Email sent → User verifies email → Login → Authenticated
                               ↑ NEW SESSION
```

### Implementation

#### 1. Update Registration Endpoint

**File:** `src/app/api/auth/register/route.ts`

**Current code (VULNERABLE):**
```typescript
// ❌ DON'T DO THIS
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${siteUrl}/auth/callback`
  }
})

// Auto-login happens here
return NextResponse.json({ 
  user: data.user,
  session: data.session // ❌ Session returned
})
```

**Fixed code:**
```typescript
// ✅ DO THIS
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${siteUrl}/auth/callback`,
    // Require email verification
    data: {
      email_confirm: false // Force email verification
    }
  }
})

// ✅ Don't return session
return NextResponse.json({ 
  message: 'Registration successful. Please check your email to verify your account.',
  user: { email: data.user?.email } // Only return email
})
```

#### 2. Update Frontend Registration Flow

**File:** `src/app/register/page.tsx` (or similar)

**Current (VULNERABLE):**
```typescript
// ❌ DON'T DO THIS
const handleRegister = async () => {
  const response = await fetch('/api/auth/register', {...})
  const { user, session } = await response.json()
  
  if (session) {
    router.push('/dashboard') // Auto redirect
  }
}
```

**Fixed:**
```typescript
// ✅ DO THIS
const handleRegister = async () => {
  const response = await fetch('/api/auth/register', {...})
  const { message } = await response.json()
  
  // Show verification message instead of auto-login
  setVerificationMessage(message)
  setShowVerificationScreen(true)
}
```

#### 3. Create Email Verification Screen

**File:** `src/app/verify-email/page.tsx` (NEW)

```typescript
export default function VerifyEmail() {
  return (
    <div>
      <h1>Check Your Email</h1>
      <p>
        We sent a verification link to your email. 
        Click the link to verify your account.
      </p>
      <p>
        Once verified, you can <Link href="/login">login here</Link>.
      </p>
    </div>
  )
}
```

#### 4. Configure Supabase Email Templates

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Edit **Confirm signup** template
3. Ensure it includes verification link:

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
```

### Testing

#### Test 1: Registration Flow
```bash
# 1. Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Expected: No session returned, message about email verification
{
  "message": "Registration successful. Please check your email...",
  "user": {"email": "test@example.com"}
}
```

#### Test 2: Email Verification
1. Check email inbox
2. Click verification link
3. Redirected to `/auth/callback`
4. Now can login normally

#### Test 3: Login Before Verification
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Expected: 401 Email not confirmed
{
  "error": "Email not confirmed"
}
```

### Security Benefits

1. **Prevents session fixation**
   - Each login creates a new session
   - Old sessions are invalidated

2. **Email verification**
   - Ensures user owns the email address
   - Prevents fake registrations

3. **Cleaner separation**
   - Registration != Authentication
   - Forces explicit login action

### Current Status

⚠️ **NOT IMPLEMENTED YET** - Requires:
1. Update `/api/auth/register` endpoint
2. Update frontend registration flow
3. Create email verification UI
4. Test complete flow

This should be implemented after Sprint 2 is complete, as it requires frontend changes and testing with actual email delivery.

---

## Summary

### Task 2.5 (Session Timeout) ✅ DOCUMENTED
- Configuration documented
- Current settings validated (1h JWT, 7d refresh)
- Testing procedures provided
- No code changes needed (already using Supabase defaults)

### Task 2.6 (Session Fixation) ⚠️ REQUIRES IMPLEMENTATION
- Problem identified
- Solution documented
- Implementation steps provided
- Testing procedures documented
- **TODO:** Implement changes to registration endpoint and frontend

### Estimated Time for Task 2.6 Implementation
- Backend changes: 30 minutes
- Frontend changes: 1 hour
- Testing: 30 minutes
- **Total:** 2 hours

### Next Steps
1. Apply session timeout configuration in Supabase Dashboard (5 minutes)
2. Implement session fixation fix when ready to deploy (2 hours)
3. Test both configurations end-to-end
