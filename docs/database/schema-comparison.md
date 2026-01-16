# 🔍 Relatório Comparativo: Banco de Dados vs Migrations

**Gerado em:** 16/01/2026, 17:14:49

---

## 📊 Resumo

| Métrica | Banco de Dados | Migrations | Status |
|---------|----------------|------------|--------|
| **Tabelas** | 28 | 28 | ⚠️ Desincronizado |
| **Funções** | 202 | 64 | ⚠️ Desincronizado |
| **Arquivos de Migration** | - | 89 | - |

## ⚠️ Tabelas nas Migrations mas NÃO no Banco

**Total:** 6

Estas tabelas estão definidas nas migrations mas não existem no banco:

- `budget_plan_templates` - ⚠️ **PRECISA SER CRIADA**
- `client_budget_limits` - ⚠️ **PRECISA SER CRIADA**
- `clientes_whatsapp_backup` - ⚠️ **PRECISA SER CRIADA**
- `documents_backup` - ⚠️ **PRECISA SER CRIADA**
- `gateway_configurations` - ⚠️ **PRECISA SER CRIADA**
- `n8n_chat_histories_backup` - ⚠️ **PRECISA SER CRIADA**

**Ação:** Execute as migrations pendentes ou crie manualmente.

## ⚠️ Tabelas no Banco mas NÃO nas Migrations

**Total:** 6

Estas tabelas existem no banco mas não estão documentadas nas migrations:

- `Clientes WhatsApp_backup` - ⚠️ **PRECISA SER DOCUMENTADA**
- `audit_logs_backup_poker_system` - ⚠️ **PRECISA SER DOCUMENTADA**
- `clientes_whatsapp` - ⚠️ **PRECISA SER DOCUMENTADA**
- `documents` - ⚠️ **PRECISA SER DOCUMENTADA**
- `n8n_chat_histories` - ⚠️ **PRECISA SER DOCUMENTADA**
- `push_tokens` - ⚠️ **PRECISA SER DOCUMENTADA**

**Ação:** Crie uma migration para documentar ou remova se não for necessária.

## ✅ Tabelas Sincronizadas

**Total:** 22

Estas tabelas existem tanto no banco quanto nas migrations:

- `ai_models_registry` ✅
- `audit_logs` ✅
- `bot_configurations` ✅
- `client_budgets` ✅
- `clients` ✅
- `conversations` ✅
- `execution_logs` ✅
- `flow_executions` ✅
- `gateway_cache_performance` ✅
- `gateway_usage_logs` ✅
- `interactive_flows` ✅
- `message_templates` ✅
- `messages` ✅
- `plan_budgets` ✅
- `pricing_config` ✅
- `shared_gateway_config` ✅
- `tts_cache` ✅
- `tts_usage_logs` ✅
- `usage_logs` ✅
- `user_invites` ✅
- `user_profiles` ✅
- `webhook_dedup` ✅

## ⚠️ Funções nas Migrations mas NÃO no Banco

- `auth` - ⚠️ **PRECISA SER CRIADA**
- `clientes_whatsapp_view_delete` - ⚠️ **PRECISA SER CRIADA**
- `get_embedding_dimensions` - ⚠️ **PRECISA SER CRIADA**
- `initialize_client_budget` - ⚠️ **PRECISA SER CRIADA**
- `notify_conversation_change` - ⚠️ **PRECISA SER CRIADA**
- `notify_message_change` - ⚠️ **PRECISA SER CRIADA**
- `reset_monthly_budgets` - ⚠️ **PRECISA SER CRIADA**
- `to` - ⚠️ **PRECISA SER CRIADA**
- `update_budget_updated_at` - ⚠️ **PRECISA SER CRIADA**
- `update_client_secret_v2` - ⚠️ **PRECISA SER CRIADA**

## ⚠️ Funções no Banco mas NÃO nas Migrations

- `array_to_halfvec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `array_to_halfvec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `array_to_halfvec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `array_to_halfvec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `array_to_sparsevec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `array_to_sparsevec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `array_to_sparsevec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `array_to_sparsevec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `array_to_vector` - ⚠️ **PRECISA SER DOCUMENTADA**
- `array_to_vector` - ⚠️ **PRECISA SER DOCUMENTADA**
- `array_to_vector` - ⚠️ **PRECISA SER DOCUMENTADA**
- `array_to_vector` - ⚠️ **PRECISA SER DOCUMENTADA**
- `binary_quantize` - ⚠️ **PRECISA SER DOCUMENTADA**
- `binary_quantize` - ⚠️ **PRECISA SER DOCUMENTADA**
- `cosine_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `cosine_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `cosine_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `get_user_tenant_id` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gin_extract_query_trgm` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gin_extract_value_trgm` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gin_trgm_consistent` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gin_trgm_triconsistent` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gtrgm_compress` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gtrgm_consistent` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gtrgm_decompress` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gtrgm_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gtrgm_in` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gtrgm_options` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gtrgm_out` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gtrgm_penalty` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gtrgm_picksplit` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gtrgm_same` - ⚠️ **PRECISA SER DOCUMENTADA**
- `gtrgm_union` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_accum` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_add` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_avg` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_cmp` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_combine` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_concat` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_eq` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_ge` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_gt` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_in` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_l2_squared_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_le` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_lt` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_mul` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_ne` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_negative_inner_product` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_out` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_recv` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_send` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_spherical_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_sub` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_to_float4` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_to_sparsevec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_to_vector` - ⚠️ **PRECISA SER DOCUMENTADA**
- `halfvec_typmod_in` - ⚠️ **PRECISA SER DOCUMENTADA**
- `hamming_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `hnsw_bit_support` - ⚠️ **PRECISA SER DOCUMENTADA**
- `hnsw_halfvec_support` - ⚠️ **PRECISA SER DOCUMENTADA**
- `hnsw_sparsevec_support` - ⚠️ **PRECISA SER DOCUMENTADA**
- `hnswhandler` - ⚠️ **PRECISA SER DOCUMENTADA**
- `inner_product` - ⚠️ **PRECISA SER DOCUMENTADA**
- `inner_product` - ⚠️ **PRECISA SER DOCUMENTADA**
- `inner_product` - ⚠️ **PRECISA SER DOCUMENTADA**
- `ivfflat_bit_support` - ⚠️ **PRECISA SER DOCUMENTADA**
- `ivfflat_halfvec_support` - ⚠️ **PRECISA SER DOCUMENTADA**
- `ivfflathandler` - ⚠️ **PRECISA SER DOCUMENTADA**
- `jaccard_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `l1_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `l1_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `l1_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `l2_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `l2_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `l2_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `l2_norm` - ⚠️ **PRECISA SER DOCUMENTADA**
- `l2_norm` - ⚠️ **PRECISA SER DOCUMENTADA**
- `l2_normalize` - ⚠️ **PRECISA SER DOCUMENTADA**
- `l2_normalize` - ⚠️ **PRECISA SER DOCUMENTADA**
- `l2_normalize` - ⚠️ **PRECISA SER DOCUMENTADA**
- `set_limit` - ⚠️ **PRECISA SER DOCUMENTADA**
- `show_limit` - ⚠️ **PRECISA SER DOCUMENTADA**
- `show_trgm` - ⚠️ **PRECISA SER DOCUMENTADA**
- `similarity` - ⚠️ **PRECISA SER DOCUMENTADA**
- `similarity_dist` - ⚠️ **PRECISA SER DOCUMENTADA**
- `similarity_op` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_cmp` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_eq` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_ge` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_gt` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_in` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_l2_squared_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_le` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_lt` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_ne` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_negative_inner_product` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_out` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_recv` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_send` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_to_halfvec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_to_vector` - ⚠️ **PRECISA SER DOCUMENTADA**
- `sparsevec_typmod_in` - ⚠️ **PRECISA SER DOCUMENTADA**
- `strict_word_similarity` - ⚠️ **PRECISA SER DOCUMENTADA**
- `strict_word_similarity_commutator_op` - ⚠️ **PRECISA SER DOCUMENTADA**
- `strict_word_similarity_dist_commutator_op` - ⚠️ **PRECISA SER DOCUMENTADA**
- `strict_word_similarity_dist_op` - ⚠️ **PRECISA SER DOCUMENTADA**
- `strict_word_similarity_op` - ⚠️ **PRECISA SER DOCUMENTADA**
- `subvector` - ⚠️ **PRECISA SER DOCUMENTADA**
- `subvector` - ⚠️ **PRECISA SER DOCUMENTADA**
- `try_acquire_webhook_lock` - ⚠️ **PRECISA SER DOCUMENTADA**
- `upsert_customer_safe` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_accum` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_add` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_avg` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_cmp` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_combine` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_concat` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_dims` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_dims` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_eq` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_ge` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_gt` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_in` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_l2_squared_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_le` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_lt` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_mul` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_ne` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_negative_inner_product` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_norm` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_out` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_recv` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_send` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_spherical_distance` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_sub` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_to_float4` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_to_halfvec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_to_sparsevec` - ⚠️ **PRECISA SER DOCUMENTADA**
- `vector_typmod_in` - ⚠️ **PRECISA SER DOCUMENTADA**
- `word_similarity` - ⚠️ **PRECISA SER DOCUMENTADA**
- `word_similarity_commutator_op` - ⚠️ **PRECISA SER DOCUMENTADA**
- `word_similarity_dist_commutator_op` - ⚠️ **PRECISA SER DOCUMENTADA**
- `word_similarity_dist_op` - ⚠️ **PRECISA SER DOCUMENTADA**
- `word_similarity_op` - ⚠️ **PRECISA SER DOCUMENTADA**

## 📁 Arquivos de Migration Analisados

**Total:** 89 arquivos

| Arquivo | Tamanho | Linhas |
|---------|---------|--------|
| `002_execution_logs.sql` | 2.5 KB | 49 |
| `003_performance_indexes.sql` | 2.6 KB | 64 |
| `004_rename_clientes_table.sql` | 5.6 KB | 163 |
| `005_add_client_id_to_n8n_tables.sql` | 9.4 KB | 267 |
| `005_fase1_vault_multi_tenant.sql` | 11.5 KB | 353 |
| `007_add_wamid_to_chat_histories.sql` | 1.2 KB | 34 |
| `007_auth_setup.sql` | 5.5 KB | 138 |
| `008_create_first_user.sql` | 5.4 KB | 164 |
| `008_phase4_admin_roles.sql` | 10.1 KB | 280 |
| `009_fix_multi_tenant_phone_constraint.sql` | 5.7 KB | 148 |
| `010_fix_orphaned_users.sql` | 7.4 KB | 229 |
| `011_analytics_usage_tracking.sql` | 7.0 KB | 218 |
| `012_pricing_config.sql` | 6.9 KB | 253 |
| `013_fix_clientes_whatsapp_pkey.sql` | 4.6 KB | 119 |
| `20250125_check_realtime_status.sql` | 3.9 KB | 122 |
| `20250125_enable_realtime_replication.sql` | 5.5 KB | 152 |
| `20250125_fix_realtime_free_tier.sql` | 4.3 KB | 123 |
| `20250125_realtime_broadcast_clean.sql` | 3.8 KB | 128 |
| `20250125_realtime_broadcast_triggers.sql` | 4.0 KB | 128 |
| `20250125_realtime_broadcast_v2.sql` | 4.2 KB | 131 |
| `20251107_create_bot_configurations.sql` | 5.8 KB | 168 |
| `20251118_add_meta_app_secret.sql` | 1.1 KB | 28 |
| `20251118_create_audit_log_vuln008.sql` | 9.8 KB | 276 |
| `20251118_fix_rls_policies_vuln007.sql` | 6.7 KB | 196 |
| `20251118_webhook_dedup_fallback_vuln006.sql` | 9.1 KB | 283 |
| `20251121_create_match_documents_function.sql` | 3.3 KB | 89 |
| `20251121_fix_audit_logs_multi_tenant.sql` | 11.0 KB | 293 |
| `20251121_fix_execution_logs_multi_tenant.sql` | 8.3 KB | 230 |
| `20251121_strict_execution_logs_tenant_isolation.sql` | 3.7 KB | 93 |
| `20251122162241_create_delete_secret_function.sql` | 1.7 KB | 57 |
| `20251122231930_add_media_metadata_column.sql` | 0.7 KB | 24 |
| `20251122_add_human_handoff_fields.sql` | 1.2 KB | 29 |
| `20251122_fix_update_secret_alternative.sql` | 3.5 KB | 116 |
| `20251122_fix_update_secret_function.sql` | 2.2 KB | 63 |
| `20251122_normalize_status_values.sql` | 1.4 KB | 41 |
| `20251125_add_last_read_at_to_n8n_chat_histories.sql` | 1.3 KB | 32 |
| `20251202_add_updated_at_to_clientes_whatsapp.sql` | 1.8 KB | 51 |
| `20251203000001_create_knowledge_storage_policies.sql` | 3.5 KB | 89 |
| `20251203000002_add_original_file_metadata.sql` | 4.0 KB | 102 |
| `20251204115356_add_original_file_columns_to_documents.sql` | 1.1 KB | 21 |
| `20251204_add_audio_preferences.sql` | 0.8 KB | 14 |
| `20251204_add_audio_to_messages.sql` | 1.1 KB | 26 |
| `20251204_add_original_file_fields_to_match_documents.sql` | 1.5 KB | 56 |
| `20251204_add_tts_config.sql` | 1.0 KB | 17 |
| `20251204_add_tts_model.sql` | 0.4 KB | 9 |
| `20251204_create_tts_cache.sql` | 1.6 KB | 39 |
| `20251204_create_tts_usage_logs.sql` | 2.0 KB | 55 |
| `20251206_add_fluxo_inicial_status.sql` | 1.7 KB | 46 |
| `20251206_create_interactive_flows.sql` | 11.4 KB | 296 |
| `20251207_update_conversations_status.sql` | 0.9 KB | 22 |
| `20251207_update_messages_type.sql` | 0.7 KB | 21 |
| `20251208_create_message_templates.sql` | 6.8 KB | 198 |
| `20251212_create_budget_tables.sql` | 9.7 KB | 297 |
| `20251212_create_gateway_infrastructure.sql` | 11.7 KB | 328 |
| `20251212_modify_existing_tables.sql` | 3.4 KB | 70 |
| `20251212_seed_ai_models_registry.sql` | 7.3 KB | 267 |
| `20251212_simplify_to_shared_gateway_config.sql` | 5.0 KB | 140 |
| `20251213133305_add_vault_rpc_functions.sql` | 2.9 KB | 107 |
| `20251213_budget_plan_templates.sql` | 16.0 KB | 539 |
| `20251213_unified_api_tracking.sql` | 1.8 KB | 37 |
| `20251214_modular_budget_system.sql` | 13.1 KB | 371 |
| `20251215_add_ai_keys_mode_to_clients.sql` | 0.9 KB | 31 |
| `20251215_fix_gateway_usage_logs_api_type_add_tts.sql` | 1.0 KB | 28 |
| `20251215_fix_message_templates.sql` | 8.8 KB | 238 |
| `20251216134414_fix_fast_track_node_enabled.sql` | 4.1 KB | 84 |
| `20251231_fix_duplicate_messages.sql` | 6.3 KB | 198 |
| `20251231_fix_gateway_errors.sql` | 4.6 KB | 143 |
| `20260104130721_add_message_status.sql` | 1.7 KB | 31 |
| `ADD_operation_type_helpers.sql` | 6.1 KB | 176 |
| `DISABLE_trigger.sql` | 1.2 KB | 35 |
| `FIX_pricing_and_analytics.sql` | 4.0 KB | 128 |
| `RLS.sql` | 17.5 KB | 459 |
| `check-ai-gateway-config.sql` | 4.0 KB | 75 |
| `check-fast-track-anywhere.sql` | 4.0 KB | 57 |
| `debug-client-mismatch.sql` | 4.8 KB | 101 |
| `debug-fast-track.sql` | 11.5 KB | 221 |
| `debug-gateway-config.sql` | 5.4 KB | 176 |
| `debug-gateway-final.sql` | 4.6 KB | 76 |
| `debug-gateway-flow.sql` | 3.5 KB | 61 |
| `debug-getBotConfigs.sql` | 6.8 KB | 162 |
| `debug-step-by-step.sql` | 6.8 KB | 124 |
| `diagnostic-fast-track.sql` | 7.4 KB | 139 |
| `fix-fast-track-complete.sql` | 11.1 KB | 269 |
| `fix-router-model.sql` | 0.4 KB | 14 |
| `migration.sql` | 8.0 KB | 223 |
| `setup-gateway-keys-ready.sql` | 2.5 KB | 82 |
| `setup-gateway-keys.sql` | 3.2 KB | 110 |
| `verify-gateway-tables.sql` | 2.3 KB | 78 |
| `verify-vault-rpc-functions.sql` | 3.0 KB | 91 |

---

**Última atualização:** 16/01/2026, 17:14:58
