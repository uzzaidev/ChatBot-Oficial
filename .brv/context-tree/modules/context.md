# MÓDULOS E ARQUIVOS-CHAVE — ChatBot-Oficial

**Checkpoint:** 2026-04-16

---

## Entry Points Críticos

| Tarefa | Arquivo |
|--------|---------|
| Webhook WhatsApp | `src/app/api/webhook/[clientId]/route.ts` |
| Orquestrador pipeline | `src/flows/chatbotFlow.ts` |
| Config multi-tenant (Vault) | `src/lib/config.ts` → `getClientConfig()` |
| Cliente AI direto | `src/lib/direct-ai-client.ts` → `callDirectAI()` |
| Geração de resposta AI + tools | `src/nodes/generateAIResponse.ts` |
| Credenciais Vault | `src/lib/vault.ts` → `getClientVaultCredentials()` |
| RAG retrieval | `src/nodes/getRAGContext.ts` |
| Auth middleware | `src/middleware.ts` |
| Interfaces TypeScript | `src/lib/types.ts` |
| Schema DB (parcial) | `docs/tables/tabelas.md` |

## Módulos Ativos do Sistema

| Módulo | Localização | Status |
|--------|------------|--------|
| Pipeline 14-nós | `src/flows/chatbotFlow.ts` | ✅ Ativo |
| RAG Knowledge Base | `src/nodes/getRAGContext.ts` | ✅ Ativo |
| Human Handoff | `src/nodes/handleHumanHandoff.ts` | ✅ Ativo |
| CRM Kanban | `src/app/dashboard/crm/` | ✅ Ativo |
| CRM Automation Engine | `src/lib/crm-automation-engine.ts` | ✅ Ativo |
| Interactive Flows | `src/lib/flowExecutor.ts` | ✅ Ativo |
| Calendar Integration | `src/app/api/calendar/` | ✅ Ativo |
| Agents + A/B Testing | `src/app/dashboard/agents/` | ✅ Ativo |
| TTS (voz) | `src/nodes/convertTextToSpeech.ts` | ✅ Ativo |
| Stripe Connect | `src/app/api/stripe/` | ✅ Ativo |
| Push Notifications (FCM) | `src/lib/pushNotifications.ts` | ✅ Ativo |
| Mobile (Capacitor) | `capacitor.config.ts` | ✅ Ativo |
| Supabase Vault | `src/lib/vault.ts` | ✅ Ativo |
| Fast Track Router (FAQ) | `src/nodes/fastTrackRouter.ts` | ✅ Ativo |
| Intent Classifier | `src/nodes/classifyIntent.ts` | ✅ Ativo |
| Budget Enforcement | `src/lib/unified-tracking.ts` | ✅ Ativo |
| Usage Tracking | `src/lib/direct-ai-tracking.ts` | ✅ Ativo |

## Nodes (`src/nodes/`)

```
filterStatusUpdates.ts
parseMessage.ts
checkOrCreateCustomer.ts
processMedia.ts
downloadMetaMedia.ts
transcribeAudio.ts
analyzeImage.ts
analyzeDocument.ts
normalizeMessage.ts
checkHumanHandoffStatus.ts
pushToRedis.ts
checkDuplicateMessage.ts
saveChatMessage.ts
batchMessages.ts
fastTrackRouter.ts
getChatHistory.ts
getRAGContext.ts
checkContinuity.ts
classifyIntent.ts
generateAIResponse.ts
detectRepetition.ts
handleHumanHandoff.ts
handleDocumentSearchToolCall.ts
updateContactMetadata.ts
formatResponse.ts
sendTextMessage.ts
convertTextToSpeech.ts
```

## Dashboard Routes Principais (`/dashboard/`)

| Rota | Função |
|------|--------|
| `/dashboard` | Overview / métricas |
| `/dashboard/conversations` | Inbox de conversas |
| `/dashboard/contacts` | Contatos WhatsApp |
| `/dashboard/crm` | Kanban CRM |
| `/dashboard/knowledge` | Upload RAG (PDF/TXT) |
| `/dashboard/agents` | Configuração de agentes AI |
| `/dashboard/flow-architecture` | Diagrama Mermaid do pipeline |
| `/dashboard/flows` | Interactive flow builder |
| `/dashboard/calendar` | Configuração OAuth calendário |
| `/dashboard/settings` | Config do cliente |
| `/dashboard/debug` | Logs de execução |
| `/dashboard/billing` | Uso AI + budget |
