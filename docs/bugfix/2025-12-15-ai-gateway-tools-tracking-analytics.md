# AI Gateway + Tracking/Analytics – Fixes (2025-12-15)

Este documento resume as mudanças feitas para estabilizar o **AI Gateway**, corrigir **tool calling** (Vercel AI SDK v5), resolver erros de **tracking** e melhorar **analytics** (tokens/units), além de reduzir logs barulhentos em produção.

## Problemas observados em PRD

- **AI Gateway não encontrava config compartilhada** (`shared_gateway_config`) em chamadas server-to-server/webhook.
  - Sintoma: PostgREST `PGRST116` (0 rows em `.single()`), seguido de fallback confuso.
  - Causa raiz: leitura de config via Supabase client baseado em sessão/cookie; em webhook não há sessão → RLS/ausência de auth → 0 linhas.

- **Tool calling quebrando em providers strict (ex.: OpenAI)**
  - Sintoma: erro de schema do tipo “Invalid schema for function … got type None” e o modelo respondendo com texto tipo `<function>buscar_documento</function>` (sem toolCalls executáveis).
  - Causa raiz: tools estavam sendo passadas no formato errado para `ai@5.x` (usava `parameters` em vez de `inputSchema`).

- **Tracking falhando com constraint no banco**
  - Sintoma: SQLSTATE `23514` em `gateway_usage_logs_api_type_check` ao tentar gravar `api_type='tts'`.
  - Causa raiz: CHECK constraint antiga não incluía `tts`.

- **Analytics sem tokens/units para whisper/vision**
  - Causa raiz: endpoint agregava requests/cost, mas não somava `total_tokens` e `input_units/output_units`.

## Mudanças principais

### 1) AI Gateway: leitura de config mais robusta

- Ajustes para leitura de `shared_gateway_config` usarem **service role** (quando apropriado) e não dependerem de sessão.
- Uso de `.maybeSingle()` para evitar crashes quando 0 linhas (tratando o “config não existe” como erro acionável).

### 2) Tool calling: compatibilidade com Vercel AI SDK v5

- Tools agora usam **`inputSchema`** (e não `parameters`) conforme o contrato do `ai@5.x`.
- Foi adicionada uma normalização defensiva no gateway: se alguma tool ainda vier com `parameters`, ela é convertida para `inputSchema` antes da chamada.

### 3) Unified Tracking: fallback para constraint + migration definitiva

- Adicionado fallback no inserto de tracking: ao detectar `23514` (check constraint do `api_type`), faz retry **sem `api_type`** e registra um marcador em `metadata` (ex.: `api_type_fallback`).
- Criada migration para corrigir a constraint e aceitar `tts`:
  - `supabase/migrations/20251215_fix_gateway_usage_logs_api_type_add_tts.sql`

### 4) Analytics: tokens/units no backend + UI

- Endpoint `/api/analytics/unified` passou a retornar:
  - `gatewayMetrics.totalTokens`
  - `gatewayMetrics.totalUnits`
  - `gatewayMetrics.byApiType[].tokens`
  - `gatewayMetrics.byApiType[].units`
- UI de analytics foi ajustada para exibir tokens/units e incluir filtros adicionais (`tts`, `image-gen`).

### 5) Redução de logs em produção (flags)

Logs informativos foram colocados atrás de env vars para evitar ruído:

- `UNIFIED_ANALYTICS_DEBUG=true` → habilita logs informativos do endpoint `/api/analytics/unified`.
- `UNIFIED_TRACKING_DEBUG=true` → habilita logs informativos do unified tracking.
- `USAGE_TRACKING_DEBUG=true` → habilita logs informativos do usage tracking do gateway.
- `CURRENCY_DEBUG=true` → habilita logs informativos do cache/fetch de câmbio.
- `AI_GATEWAY_DEBUG_TOOLS=true` → mostra debug de tools (quantidade, nomes, se possuem `inputSchema`).

## Como aplicar em PRD

1) **Aplicar a migration** que adiciona `tts` na CHECK constraint:
   - `supabase/migrations/20251215_fix_gateway_usage_logs_api_type_add_tts.sql`

2) (Opcional) Habilitar debug temporário apenas durante validação:
   - `UNIFIED_ANALYTICS_DEBUG=true`
   - `AI_GATEWAY_DEBUG_TOOLS=true`

3) Validar:
   - Requests TTS não geram mais `23514` no tracking.
   - Filtros `whisper`/`vision`/`tts` no analytics exibem tokens/units.

## Notas

- O fallback de tracking (retry sem `api_type`) é apenas um “airbag” para não quebrar enquanto a migration não está aplicada.
- A correção real e definitiva do erro `23514` é a migration acima.
