# Scripts Directory

This directory contains utility scripts for the WhatsApp Chatbot project.

## Available Scripts

### `validate-performance.js`

Validates that database performance optimizations are correctly applied.

**Purpose**: Checks that all database indexes, constraints, and optimized queries are working after applying the performance migration.

**Prerequisites**:
1. Database migration `migrations/003_performance_indexes.sql` must be applied
2. `POSTGRES_URL_NON_POOLING` environment variable must be set in `.env.local`

**Usage**:
```bash
node scripts/validate-performance.js
```

**What it checks**:
- ✅ All required indexes exist
- ✅ UNIQUE constraint on `telefone` column exists
- ✅ Optimized conversations query executes quickly (<500ms ideal)
- ✅ UPSERT pattern works correctly

**Expected output**:
```
============================================================
Performance Optimization Validation Script
============================================================

📊 Validating Database Indexes...

✅ Index exists: idx_chat_histories_session_id
✅ Index exists: idx_chat_histories_created_at
✅ Index exists: idx_chat_histories_session_created
✅ Index exists: idx_clientes_telefone
✅ Index exists: idx_clientes_status

🔒 Validating UNIQUE Constraint...

✅ UNIQUE constraint exists on telefone column

⚡ Testing Optimized Conversations Query...

✅ Query executed in 127ms
📝 Found 15 conversations
✨ Excellent query performance!

🔄 Testing UPSERT Pattern...

✅ UPSERT (insert) executed in 45ms
✅ UPSERT (update) executed in 38ms
🧹 Test data cleaned up

============================================================
Validation Summary
============================================================
Indexes:         ✅ PASS
UNIQUE Constraint: ✅ PASS
Optimized Query:   ✅ PASS
UPSERT Pattern:    ✅ PASS
============================================================

✅ All validations passed! Performance optimizations are working.
```

**Troubleshooting**:

If validation fails:

1. **Indexes missing**: Run `migrations/003_performance_indexes.sql` in Supabase SQL Editor
2. **UNIQUE constraint missing**: Included in the migration, re-run it
3. **Query too slow**: Run `ANALYZE n8n_chat_histories; ANALYZE "Clientes WhatsApp";` in SQL Editor
4. **Connection error**: Check `POSTGRES_URL_NON_POOLING` in `.env.local`

## Adding New Scripts

When adding new utility scripts:

1. Create the script in this directory
2. Make it executable: `chmod +x scripts/your-script.js`
3. Add a shebang line: `#!/usr/bin/env node`
4. Document it in this README
5. Follow the existing error handling patterns
