# UzzOPS WhatsApp Bridge (NODE 2.2)

UzzAI partners who message the UzzAI WhatsApp number (+55 54 99284-1942) talk to the **UzzOPS Copiloto**, not the sales bot. UzzOPS works out who the person is, what they can do and what to answer. The UzzApp side only carries messages.

- **Code:** `src/lib/uzzops-bridge.ts`, plus the 2.2 block in `src/flows/chatbotFlow.ts`.
- **Tests:** `src/lib/__tests__/uzzops-bridge.test.ts`.
- **Contract:** "Contrato UzzApp → UzzOPS R00" (16/11/2026). UzzOPS route: `src/app/api/agent/whatsapp/route.ts` in the UzzOPS repo.

```
partner → UzzAI number → webhook → parse → 2.1 financeiro → 2.2 UzzOPS → 2.5 business hours → sales bot
```

## Behaviour

| Partner sends | What happens |
|---|---|
| text | forwarded to UzzOPS |
| button tap | forwarded as `button_id` |
| audio | transcribed here (Whisper, client key) → `kind: "audio_transcript"` |
| image / document | "Por enquanto o Copiloto entende texto e áudio." |
| reaction | ignored |
| `#bot ...` | goes to the sales bot (lets partners test it from their own phones) |

Bridged messages are not saved to the UzzApp inbox, are not batched and spend no UzzApp tokens.

## Environment (Vercel → `chat-bot-oficial` → Production)

All four are required. If any is empty, the bridge is off and the flow is unchanged.

| Variable | Value |
|---|---|
| `UZZOPS_AGENT_URL` | `https://uzzops.uzzai.com.br/api/agent/whatsapp` |
| `UZZOPS_AGENT_SECRET` | the **same** value as `UZZAPP_AGENT_SECRET` in the UzzOPS Vercel project (≥ 32 chars) |
| `UZZOPS_MEMBER_NUMBERS` | comma-separated partner numbers, digits with 55; the mobile 9 is optional |
| `UZZOPS_CLIENT_ID` | `clients.id` of the UzzAI number: `8ea56079-a47d-4f9c-aab9-ce265208b31b` |

- Doppler `uzzapp/prd` is **not** synced to Vercel Production, so set these in Vercel.
- After changing a variable, **redeploy**. A commit with no file changes is skipped by `vercel.json` `ignoreCommand`.

**Signature:** hex HMAC-SHA256 of `${x-uzzapp-ts}.${rawBody}`, with `ts` in ms and a 5 min window. Both sides trim the secret.

**Errors:**
- 400/401/404 from UzzOPS are configuration errors: nothing is sent to the partner and the reason is logged.
- Timeout, network failure or 5xx: the partner gets "Não consegui falar com o Copiloto agora…".

## Diagnosing a message that got no reply

Run in the Supabase SQL editor (read-only). It shows whether the webhook arrived and what each node did:

```sql
select * from (
  select 'webhook' as fonte, e.received_at as quando, e.processing_status as status,
         left(coalesce(e.payload->'entry'->0->'changes'->0->'value'->'messages'->0->>'type', e.webhook_field, ''), 120) as detalhe,
         left(coalesce(e.error_message, ''), 200) as erro
  from meta_webhook_events e
  where e.waba_id = (select meta_waba_id from clients where id = '8ea56079-a47d-4f9c-aab9-ce265208b31b')
    and e.received_at > now() - interval '2 hours'
  union all
  select 'fluxo: ' || l.node_name, l."timestamp"::timestamptz, l.status,
         left(coalesce(l.output_data::text, l.input_data::text, ''), 200),
         left(coalesce(l.error::text, ''), 200)
  from execution_logs l
  where l.client_id = '8ea56079-a47d-4f9c-aab9-ce265208b31b'
    and l."timestamp"::timestamptz > now() - interval '2 hours'
) t order by quando;
```

| `2.2. UzzOPS Bridge` shows | Meaning |
|---|---|
| `uzzops_config_error 401: assinatura inválida` | the two secrets differ; set the same value in both Vercels and redeploy both |
| `uzzops_config_error 404: integração desligada` | `UZZAPP_AGENT_SECRET` is missing or too short on UzzOPS |
| `uzzops_config_error 400: pedido inválido` | contract mismatch; fix on this side |
| success with `"outcome":"noop"` | UzzOPS didn't map the phone to a person (Meu Painel → WhatsApp do Copiloto) or saw a duplicate |
| no 2.2 row | the bridge is off: one of the four variables is missing in Production |

Only errors reach the Vercel logs (`[uzzops-bridge]`). `warnSafe` and `infoSafe` in `sanitizedLogger.ts` are no-ops.

## Not done yet

- **Phase 2 (reminders that UzzOPS sends on its own):** needs a new signed route here and a Meta-approved template for messages outside the 24 h window.
- **Echoes** (the owner messaging from the WhatsApp Business app) are not routed.
