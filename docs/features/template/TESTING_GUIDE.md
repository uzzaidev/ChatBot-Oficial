# Template System - Testing Guide

## 🎯 Overview

This guide provides step-by-step instructions for testing the WhatsApp Template System implementation. The system allows creating, submitting to Meta for approval, and sending pre-approved template messages via WhatsApp.

---

## ✅ Prerequisites

Before testing, ensure you have:

1. **Database Migration Applied**
   ```sql
   -- Run in Supabase SQL Editor
   -- File: supabase/migrations/20251208_create_message_templates.sql
   ```

2. **Valid Meta Credentials**
   - Meta Access Token configured in client settings
   - WhatsApp Business Account ID (WABA ID)
   - Phone Number ID for sending messages

3. **Development Environment**
   ```bash
   npm install
   npm run dev
   ```
   Server should be running on http://localhost:3000

---

## 🧪 Test Scenarios

### Test 1: View Templates List

**URL**: `/dashboard/templates`

**Steps**:
1. Navigate to Dashboard → Templates (sidebar)
2. Verify the page loads without errors

**Expected Results**:
- ✅ Page displays "Templates de Mensagem" header
- ✅ If no templates exist: "Nenhum template encontrado" message
- ✅ "Novo Template" and "Sincronizar" buttons visible
- ✅ No JavaScript errors in console

**Error Previously Fixed**:
- ❌ `TypeError: Cannot read properties of undefined (reading 'length')` - **RESOLVED**

---

### Test 2: Create New Template (DRAFT)

**URL**: `/dashboard/templates/new`

**Steps**:
1. Click "Novo Template" button
2. Fill in the form:
   - **Name**: `test_order_confirmation` (lowercase, underscores only)
   - **Category**: Select "Utilidade" (UTILITY)
   - **Language**: Select "Português (Brasil)"
   - **WABA ID**: Enter your WhatsApp Business Account ID
3. **Body** (required):
   - Text: `Olá {{1}}, seu pedido #{{2}} foi confirmado!`
   - Example: `João, 12345`
4. **Optional**: Add Header, Footer, Buttons
5. Click "Criar Template"

**Expected Results**:
- ✅ Form validates input (shows errors for invalid names)
- ✅ Preview updates (if implemented)
- ✅ Template created with status: `DRAFT`
- ✅ Redirected to `/dashboard/templates`
- ✅ New template appears in the list
- ✅ Toast notification: "Template Criado"

**Validation Tests**:
- ❌ Empty name → Error: "Nome é obrigatório"
- ❌ Invalid characters in name → Error: "Nome deve conter apenas letras minúsculas..."
- ❌ Missing body text → Error: "Texto do corpo é obrigatório"
- ❌ Variables without examples → Error: "Forneça N valor(es) de exemplo..."

---

### Test 3: Submit Template to Meta (PENDING)

**Prerequisites**: Valid Meta Access Token configured

**Steps**:
1. In templates list, find a DRAFT template
2. Click "⋮" (three dots menu)
3. Select "Submeter para Aprovação"
4. Confirm the action

**Expected Results**:
- ✅ API call to Meta successful
- ✅ Template status changes to: `PENDING`
- ✅ `meta_template_id` populated in database
- ✅ Toast notification: "Template Submetido"
- ✅ Template no longer editable

**Possible Errors**:
- ❌ "Meta Access Token not configured" → Add credentials
- ❌ "Invalid WABA ID" → Verify WABA ID is correct
- ❌ Meta API error → Check Meta error details in response

---

### Test 4: Sync Template Status

**Prerequisites**: Template submitted to Meta (PENDING status)

**Steps**:
1. Wait 5-10 minutes (Meta approval time)
2. Click "Sincronizar" button
3. Wait for sync to complete

**Expected Results**:
- ✅ API fetches current status from Meta
- ✅ Template status updates to: `APPROVED` or `REJECTED`
- ✅ If rejected: `rejection_reason` field populated
- ✅ Toast notification: "Templates Sincronizados"

**Meta Approval Timeline**:
- Usually: 1-24 hours
- English templates: ~4 hours average
- Portuguese templates: may take longer

---

### Test 5: Send Template Message

**Prerequisites**: 
- Template with status: `APPROVED`
- Valid recipient phone number

**URL**: `/dashboard/templates/test`

**Steps**:
1. Navigate to "Testar Envio de Template"
2. Select an APPROVED template from the list
3. Enter recipient phone number: `5511999999999` (country code + number)
4. Fill in template variables (if any):
   - Variable `{{1}}`: "João"
   - Variable `{{2}}`: "12345"
5. Click "Enviar Template"

**Expected Results**:
- ✅ Preview shows message with variables replaced
- ✅ Message sent via Meta API
- ✅ Success message with WhatsApp Message ID
- ✅ Message appears in recipient's WhatsApp
- ✅ Message logged in `messages` table

**Possible Errors**:
- ❌ "Template not APPROVED" → Only approved templates can be sent
- ❌ "Invalid phone number" → Use format: `5511999999999` (digits only)
- ❌ "Missing parameters" → Fill all template variables
- ❌ Meta API error → Check credentials and rate limits

---

### Test 6: Edit Template (DRAFT only)

**Steps**:
1. Find a DRAFT template
2. Click "⋮" → "Editar"
3. Modify the template
4. Save changes

**Expected Results**:
- ✅ Only DRAFT templates are editable
- ✅ PENDING/APPROVED templates show: "Only DRAFT templates can be edited"
- ✅ Changes saved successfully

---

### Test 7: Delete Template (DRAFT only)

**Steps**:
1. Find a DRAFT template
2. Click "⋮" → "Excluir"
3. Confirm deletion

**Expected Results**:
- ✅ Only DRAFT templates can be deleted
- ✅ Template removed from list
- ✅ Toast notification: "Template Excluído"

---

## 🔧 Testing Checklist

### Frontend
- [ ] Templates list page loads
- [ ] Create new template form works
- [ ] Form validation catches errors
- [ ] Template preview displays correctly
- [ ] Test send page functions
- [ ] Navigation links work
- [ ] Toast notifications appear

### Backend
- [ ] GET `/api/templates` returns templates
- [ ] POST `/api/templates` creates DRAFT
- [ ] POST `/api/templates/[id]/submit` submits to Meta
- [ ] POST `/api/templates/[id]/send` sends message
- [ ] POST `/api/templates/sync` syncs status
- [ ] DELETE `/api/templates/[id]` removes DRAFT

### Database
- [ ] `message_templates` table exists
- [ ] Templates stored correctly
- [ ] RLS policies enforced
- [ ] Status updates persist
- [ ] Timestamps auto-update

### Integration
- [ ] Meta API authentication works
- [ ] Template submission successful
- [ ] Status sync retrieves data
- [ ] Message sending via WhatsApp works
- [ ] Error handling graceful

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot read properties of undefined (reading 'length')"
**Status**: ✅ **FIXED**
**Solution**: Added defensive check in `TemplateList.tsx`

### Issue: Form won't submit
**Causes**:
- Missing required fields
- Invalid name format
- Variables without examples

**Solution**: Check validation errors below form fields

### Issue: "Meta Access Token not configured"
**Solution**: 
1. Go to Dashboard → Settings
2. Add Meta API credentials
3. Save configuration

### Issue: Template stuck in PENDING
**Solution**:
- Wait 1-24 hours for Meta approval
- Click "Sincronizar" to check status
- If rejected, check `rejection_reason` field

### Issue: Cannot send template
**Causes**:
- Template not APPROVED
- Invalid phone number format
- Missing Meta Phone Number ID

**Solution**: Verify prerequisites and credentials

---

## 📊 Expected Database Schema

```sql
-- Templates table structure
CREATE TABLE message_templates (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  meta_template_id TEXT,
  waba_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('UTILITY', 'AUTHENTICATION', 'MARKETING')),
  language TEXT DEFAULT 'pt_BR',
  components JSONB NOT NULL,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

---

## 🎯 Success Criteria

The template system is working correctly if:

1. ✅ All pages load without errors
2. ✅ Templates can be created as DRAFT
3. ✅ DRAFT templates can be submitted to Meta
4. ✅ Status syncs correctly from Meta
5. ✅ APPROVED templates can be sent
6. ✅ Messages delivered via WhatsApp
7. ✅ Error handling graceful throughout

---

## 📝 Test Results Template

```markdown
## Test Results - [Date]

### Environment
- Node version: 18.x
- Database: Supabase (PostgreSQL)
- Meta API version: v18.0

### Tests Executed
- [ ] View templates list
- [ ] Create new template
- [ ] Submit to Meta
- [ ] Sync status
- [ ] Send message
- [ ] Edit template
- [ ] Delete template

### Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Status: Fixed/Pending
   - Notes: [details]

### Recommendations
- [Any improvements or suggestions]

### Overall Status
✅ PASS / ❌ FAIL
```

---

## 🔗 Related Documentation

- [IMPLEMENTATION_PLAN.md](docs/features/template/IMPLEMENTATION_PLAN.md) - Complete implementation details
- [API_REFERENCE.md](docs/features/template/API_REFERENCE.md) - Meta API documentation
- [SUMMARY.md](docs/features/template/SUMMARY.md) - Executive summary

---

**Last Updated**: December 14, 2024
**Version**: 1.0
**Status**: ✅ Ready for Testing
