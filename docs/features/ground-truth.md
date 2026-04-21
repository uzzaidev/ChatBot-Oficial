# Ground Truth

Este módulo cria e mantém o gabarito por cliente para avaliação de qualidade.

## Objetivo

- Registrar pares `pergunta do usuário -> resposta esperada`.
- Versionar alterações sem editar histórico (imutabilidade).
- Permitir busca semântica via pgvector para o matcher do Sprint 3.

## Estrutura

- Tabela: `public.ground_truth`
- Migração: `supabase/migrations/20260429120000_create_ground_truth.sql`
- RPC: `public.match_ground_truth(query_embedding, match_threshold, match_count, filter_client_id)`

## APIs

- `GET /api/ground-truth`
  - Lista paginada com filtros `category`, `active`, `search`, `limit`, `offset`.
- `POST /api/ground-truth`
  - Cria uma entrada e gera embedding de `user_query`.
- `PATCH /api/ground-truth/[id]`
  - Cria nova versão da entrada e marca a antiga como inativa.
- `DELETE /api/ground-truth/[id]`
  - Soft delete (`is_active=false`).
- `POST /api/ground-truth/[id]/validate`
  - Registra validação do operador (adiciona em `validated_by`).
- `POST /api/ground-truth/from-trace`
  - Promove um `message_trace` para `ground_truth`.

## UI

- Página: `/dashboard/quality/ground-truth`
- Componente: `src/components/quality/GroundTruthManager.tsx`
- Hook: `src/hooks/useGroundTruth.ts`

## Segurança

- RLS habilitado.
- Isolamento por tenant via:
  - `user_profiles` quando disponível.
  - fallback `company_members + uzzapp_clients` quando aplicável.
- `service_role` com bypass para automações backend.
