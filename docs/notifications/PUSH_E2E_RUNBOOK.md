# Push Notifications E2E Runbook

## 1) List available test targets

If your API is protected (recommended), add header:

```bash
-H "x-push-test-secret: <PUSH_TEST_SECRET>"
```

```bash
curl -X GET "http://localhost:3000/api/test/push/categorized?targets=1"
```

Use one `userId` and `clientId` where `pushTokens > 0`.

Before E2E, apply the JSON indexes migration for better lookup performance:

```bash
supabase db push
```

## 2) Send categorized notification (single user)

```bash
curl -X POST "http://localhost:3000/api/test/push/categorized" \
  -H "x-push-test-secret: <PUSH_TEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "categorized",
    "userId": "<USER_ID>",
    "clientId": "<CLIENT_ID>",
    "category": "critical",
    "title": "Teste Critical",
    "body": "Canal crítico com som custom"
  }'
```

Supported categories: `critical`, `important`, `normal`, `low`, `marketing`.

## 3) Simulate incoming message flow

```bash
curl -X POST "http://localhost:3000/api/test/push/categorized" \
  -H "x-push-test-secret: <PUSH_TEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "incoming",
    "clientId": "<CLIENT_ID>",
    "phone": "5511999999999",
    "customerName": "Teste Incoming",
    "messagePreview": "Mensagem simulada para teste"
  }'
```

## 4) Simulate human handoff (critical)

```bash
curl -X POST "http://localhost:3000/api/test/push/categorized" \
  -H "x-push-test-secret: <PUSH_TEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "handoff",
    "clientId": "<CLIENT_ID>",
    "phone": "5511999999999",
    "customerName": "Cliente Handoff"
  }'
```

## 5) Simulate budget alert (80% or 100%)

```bash
curl -X POST "http://localhost:3000/api/test/push/categorized" \
  -H "x-push-test-secret: <PUSH_TEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "budget",
    "userId": "<USER_ID>",
    "clientId": "<CLIENT_ID>",
    "percentUsed": 85,
    "limitBrl": 100
  }'
```

For critical budget test, set `percentUsed` to `100`.

## 6) Batch push (multiple users)

```bash
curl -X POST "http://localhost:3000/api/test/push/categorized" \
  -H "x-push-test-secret: <PUSH_TEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "batch",
    "clientId": "<CLIENT_ID>",
    "userIds": ["<USER_ID_1>", "<USER_ID_2>"],
    "category": "important",
    "title": "Teste Batch",
    "body": "Envio em lote"
  }'
```

## 7) Validate logs in Supabase

```sql
select
  sent_at,
  user_id,
  client_id,
  category,
  title,
  status,
  failure_reason,
  data
from public.notification_logs
order by sent_at desc
limit 50;
```

## 8) Validate delivered/opened lifecycle

- Keep app in foreground and trigger a test push (`categorized` or `handoff`).
- Check `status` moved to `delivered` in `notification_logs`.
- Tap the notification.
- Check `status` moved to `opened` and `opened_at` was filled.

The app reports lifecycle to:

- `POST /api/notifications/event` (best effort)
- Payload now includes `notification_log_id` for precise log update (with fallback by `category/type/phone`).

## 9) Android custom sound validation

- Open Android app notification settings.
- Check channel `Notificações Urgentes` exists.
- Trigger a `critical` push and confirm custom sound is played.

## 10) DND validation

- Go to `/dashboard/settings/notifications`.
- Enable DND, set a window that includes current time.
- Trigger `normal` / `important`: should be skipped.
- Trigger `critical`: should still be delivered.
