# Twin Development Plan (Econômico)
Generated: 2026-02-17
Task: Onboarding page + DPA page

## Análise Rápida

Callback OAuth cria `clients` com `status=pending_setup` e redireciona para `/onboarding?step=ai-config&client_id=...`, mas essa página não existe. Precisamos criar o wizard de onboarding e a página DPA. Ambos ficam fora dos grupos `(auth)` e `(dashboard)` para não herdar layouts.

## Arquivos a Criar

- `src/app/onboarding/page.tsx` - Multi-step wizard (4 steps)
- `src/app/api/onboarding/get-client/route.ts` - GET client público (step inicial)
- `src/app/api/onboarding/configure-ai/route.ts` - POST salva keys + ativa client
- `src/app/dpa/page.tsx` - Data Processing Agreement estático

## Passos

1. Criar `GET /api/onboarding/get-client` — retorna name, meta_display_phone para step whatsapp-connected
2. Criar `POST /api/onboarding/configure-ai` — valida pending_setup, atualiza vault secrets, muda status para active
3. Criar `/onboarding/page.tsx` — wizard 4 steps consumindo as APIs
4. Criar `/dpa/page.tsx` — página estática copiando padrão de /terms

## Riscos

- `configure-ai` é endpoint público → validar `status=pending_setup` antes de aceitar
- Vault pode precisar de updateSecret (verificar vault.ts)
- RLS: UPDATE em clients requer service role (`createServiceClient()`)

## Próximo Passo

ok
