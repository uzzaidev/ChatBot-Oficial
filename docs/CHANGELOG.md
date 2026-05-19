# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

---

## [Não Lançado] - Em Desenvolvimento

### Fixed

- **Busca de Documentos RAG Não Encontrava Resultados** (2025-12-04)

  - Corrigido bug crítico onde busca semântica retornava 0 resultados apesar de documentos existirem
  - Causa raiz: Filtro de tipo de documento muito restritivo rejeitava resultados válidos
    - Exemplo: Imagem marcada como "catalog" era rejeitada ao buscar tipo "image"
    - Busca retornava chunk com similarity = 0.302, mas filtro descartava por incompatibilidade de tipo
  - Solução: Removido filtro de tipo, confiando na busca semântica para encontrar documentos relevantes
  - Impacto: Feature agora funciona 100%, AI consegue enviar documentos via WhatsApp
  - Arquivo: `src/nodes/searchDocumentInKnowledge.ts`
  - Documentação: `docs/bugfix/DOCUMENT_SEARCH_NULL_SIMILARITY_FIX.md`

- **TTS: Mensagens Não Salvas no Banco e Enviadas em Duplicata** (2025-12-04)
  - Corrigido bug crítico onde handler TTS perguntava e enviava texto imediatamente sem esperar resposta
  - Problema: Handler enviava 2 mensagens (pergunta + texto) mas NÃO salvava no banco
  - Frontend não exibia mensagens, backend monitor mostrava `_END` incorretamente
  - **REFATORAÇÃO COMPLETA DA ARQUITETURA TTS**:
    - Tool `enviar_resposta_em_audio` agora **sem parâmetros** (antes tinha `texto_para_audio`)
    - Handler recebe `aiResponseText` do chatbotFlow (texto que AI já gerou)
    - AI gera resposta uma vez, handler apenas converte para áudio
    - Removida lógica de "perguntar antes" do código (deve estar no prompt do sistema)
  - Impacto: Arquitetura mais simples, eficiente (menos tokens) e sem bugs de duplicação
  - Arquivos: `src/handlers/handleAudioToolCall.ts`, `src/flows/chatbotFlow.ts`, `src/nodes/generateAIResponse.ts`

### Added

- **Logs de Debug Aprimorados para Busca de Documentos** (2025-12-04)
  - Adicionado validação de magnitude do embedding (deve ser ≈ 1.0)
  - Adicionado logging de resposta RPC completa
  - Adicionado primeiros 5 valores do embedding para debugging
  - Adicionado detecção de embeddings vazios (todos zeros)
  - Facilita diagnóstico de problemas futuros em busca vetorial

### Changed

- **Arquitetura TTS Refatorada** (2025-12-04)
  - Tool `enviar_resposta_em_audio` não requer mais argumentos
  - Lógica de "quando usar áudio" movida 100% para prompt do sistema (configurável via frontend)
  - Handler sempre salva mensagens no banco (texto ou áudio)
  - Logging detalhado em cada etapa do processo TTS

---

## [3.1.0] - 2025-12-03 ✅ PRODUÇÃO

### 🎉 Minor: Sistema de Envio de Documentos RAG via WhatsApp

Sistema completo de busca semântica e envio automático de documentos/imagens da base de conhecimento diretamente via WhatsApp.

#### Added

- **Tool `buscar_documento`** - AI pode buscar e enviar documentos autonomamente quando solicitado pelo usuário
- **Node `searchDocumentInKnowledge`** - Busca semântica com pgvector, agrupamento por arquivo e ranking por similaridade
- **Node `handleDocumentSearchToolCall`** - Processa tool call e envia documentos via WhatsApp API
- **Storage de arquivos originais** - Bucket `knowledge-documents` no Supabase Storage para manter PDFs/imagens originais
- **Colunas de metadata** na tabela `documents`:
  - `original_file_url`: URL pública do arquivo no Storage
  - `original_file_path`: Path do arquivo no bucket
  - `original_file_size`: Tamanho em bytes
  - `original_mime_type`: MIME type (PDF, JPEG, PNG, WEBP)
- **Configuração no Flow Architecture** - Node "Search & Send Documents" configurável com:
  - Similarity threshold (0.0 - 1.0, padrão: 0.7)
  - Max results (1-10, padrão: 3)
  - Max file size MB (padrão: 10)
  - Toggle habilitar/desabilitar
- **Seção no Settings** - "Envio de Documentos RAG" com status ativo/inativo e configurações
- **Link "Ver arquivo"** no DocumentList para preview de documentos originais
- **Rate limiting** - 1 segundo de delay entre envios múltiplos de documentos
- **Suporte a múltiplos formatos**:
  - PDFs enviados como documento (download)
  - Imagens (JPG, PNG, WEBP) enviadas como mídia (zoom)
- **Endpoint de teste** - `/api/test/nodes/search-document` para validação isolada

#### Changed

- Upload API (`/api/documents/upload`) agora salva arquivo original no Storage antes do chunking
- `processDocumentWithChunking` inclui metadata do arquivo original em cada chunk
- `listDocuments` retorna `originalFileUrl` para cada documento
- Flow Metadata (`flowMetadata.ts`) com novo node na categoria "auxiliary"
- API de configuração de nodes (`/api/flow/nodes/[nodeId]`) suporta `search_document`

#### Technical Details

- **Pipeline de execução**:
  1. USER: "me envia o catálogo"
  2. NODE 12 (Generate AI Response): AI detecta necessidade
  3. NODE 15.5 (handleDocumentSearchToolCall):
     - Gera embedding da query (OpenAI)
     - Busca no pgvector (cosine similarity > threshold)
     - Agrupa chunks por filename (1 resultado por arquivo)
     - Envia via `sendImageMessage()` ou `sendDocumentMessage()`
  4. NODE 13-14: Format + Send (mensagem de texto confirmação)
- **Storage público** - Bucket com RLS: SELECT public, INSERT/UPDATE/DELETE service_role
- **Backend Monitor** - NODE 15.5 aparece automaticamente nas execuções
- **Migrations**:
  - `20251203000001_create_knowledge_storage_policies.sql` - RLS policies
  - `20251203000002_add_original_file_metadata.sql` - Novas colunas + indexes

#### Documentation

- `docs/features/knowledge-media/PLANO_ENVIO_DOCUMENTOS_RAG.md` - Plano completo da implementação (5 fases)
- `docs/features/knowledge-media/OPERACAO_ENVIO_DOCUMENTOS.md` - Guia operacional completo:
  - Fluxo visual do sistema
  - Pré-requisitos e validação
  - Teste passo a passo (20 minutos)
  - Troubleshooting de 8 problemas comuns
  - Debug checklist em 4 níveis
  - Métricas SQL para KPIs
  - Tabela de erros (onde aparecem e significado)

#### Fixes

- pdf-parse import corrigido para compatibilidade TypeScript em serverless
- Unescaped quotes em JSX substituídas por `&quot;`
- Build de produção completo sem erros

---

## [3.0.1] - 2025-11-25

### 🎉 Minor: Browser Notifications System

Sistema completo de notificações no navegador para novas mensagens.

#### Added

- **Browser Notifications API** integrada ao dashboard
- Notificações aparecem apenas para conversas NÃO abertas no momento
- Sistema de singleton callback para evitar múltiplas instâncias
- Busca automática do nome do cliente via API
- Suporte a variações de telefone (com/sem código do país)
- Formato de notificação: "💬 [Nome do Cliente]" + "Mensagem: [texto]"
- Tentativa de reprodução de som (sujeito a políticas do navegador)
- Click na notificação redireciona para a conversa

#### Changed

- Hook `useGlobalRealtimeNotifications` com padrão singleton para callback global
- `NotificationManager` busca nome do cliente de forma inteligente (API + fallback Supabase)
- Refs utilizadas para evitar loops infinitos de useEffect

#### Fixed

- Sistema de unread messages usando coluna `last_read_at` do banco de dados
- Removido estado manual de unread count (100% realtime agora)
- Limpeza completa de console.logs desnecessários de debug

#### Technical Details

- Singleton pattern: `globalCallback` em nível de módulo
- Phone matching com 3 variações (55xxx, xxx, 55555xxx)
- Extração de JSON de mensagens n8n (`{"type":"human","content":"..."}`)
- Silent: false + embedded base64 audio beep (bloqueado por autoplay policy)
- Manifest.json criado para identificação PWA

#### Documentation

- Logs de debug removidos de 4 arquivos principais (useGlobalRealtimeNotifications, NotificationManager, useRealtimeConversations, useRealtimeMessages)

---

## [3.0.0] - 2025-11-22 ✅ PRODUÇÃO

### 🎉 Major: Phase 4 - RBAC + Auth + Admin Panel

Sistema SaaS completo com controle de acesso baseado em roles, autenticação completa e painel administrativo.

#### Added

- Sistema de autenticação com Supabase Auth
- RBAC (Role-Based Access Control) com 3 níveis:
  - `admin`: Acesso total ao sistema e gestão de todos os clientes
  - `client_admin`: Gestão de configurações e usuários do próprio cliente
  - `user`: Acesso a conversas e analytics do próprio cliente
- Admin Panel para gerenciamento:
  - Criação e edição de clientes
  - Gestão de usuários e permissões
  - Sistema de convites por email
  - Visualização de audit logs
- Middleware de autenticação em todas as rotas do dashboard
- Tabela `user_profiles` com relação `client_id`
- Tabela `invitations` para gestão de convites
- Auto-seleção de cliente baseado no usuário logado
- Isolamento de dados via Row Level Security (RLS)

#### Changed

- Removido `DEFAULT_CLIENT_ID` de todas as API routes de produção
- Dashboard agora requer login obrigatório
- Configurações do Vault agora por usuário autenticado
- Settings page com controles de permissão por role

#### Security

- Implementação completa de RLS em 8 tabelas principais
- Políticas de segurança granulares por role
- Auditoria de ações administrativas
- Isolamento total de dados entre clientes

---

## [2.5.2] - 2025-11-22

### Fixed

- **Audio Recording**: Removido logging desnecessário de chunks de áudio e criação de arquivos
- Melhorias de performance no componente `AudioRecorder`

---

## [2.5.1] - 2025-11-22

### Added

- Função `delete_secret` no Supabase Vault para remoção de segredos
- Coluna `media_metadata` na tabela `messages` para metadata de mídia

### Fixed

- Função `update_secret` alternativa para compatibilidade com Vault
- Normalização de valores de status nas tabelas
- Campos de human handoff (`handoff_status`, `agent_id`, etc.)

---

## [2.5.0] - 2025-11-07

### 🎉 Minor: Bot Configuration System

Sistema de configuração dinâmica do bot com suporte a múltiplas funcionalidades.

#### Added

- Tabela `bot_configurations` para configurações por cliente
- **Phase 1 - Continuity & States**:
  - Node `checkContinuity.ts` para detecção de conversas novas vs continuações
  - Saudações personalizadas para clientes novos e recorrentes
  - Threshold configurável para nova conversa (padrão: 24h)
- **Phase 2 - Intent Classification**:
  - Node `classifyIntent.ts` com suporte a LLM e regex
  - Classificação inteligente de intenções do usuário
  - 9 categorias de intent configuráveis (saudação, dúvida técnica, orçamento, etc.)
- **Phase 3 - Custom Tool Calling**:
  - Sistema de sub-agentes configurável
  - Tool calls dinâmicos baseados em configuração
  - Integração com agentes especializados

#### Documentation

- `BOT_CONFIGURATION_INFRASTRUCTURE.md`: Infraestrutura do sistema
- `BOT_CONFIGURATION_USAGE.md`: Guia de uso completo
- `BOT_CONFIGURATION_IMPLEMENTATION_COMPLETE.md`: Detalhes de implementação
- `PHASE_1_3_IMPLEMENTATION.md`: Documentação das 3 fases

---

## [2.1.0] - 2025-10-29

### 🎉 Minor: Supabase Vault Migration (Vault-Only)

Migração completa para Supabase Vault sem fallbacks de `.env`.

#### Added

- Suporte exclusivo a Supabase Vault para todas as credenciais
- Settings page (`/dashboard/settings`) para configuração de API keys
- Mensagens de erro claras quando credenciais não estão no Vault

#### Changed

- **BREAKING**: Removido fallback para variáveis `.env`
- **BREAKING**: Webhook legacy (`/api/webhook`) retorna HTTP 410 Gone
- Webhook multi-tenant (`/api/webhook/[clientId]`) como padrão
- Todas as credenciais devem ser configuradas via Dashboard

#### Removed

- Fallbacks para `OPENAI_API_KEY`, `GROQ_API_KEY`, etc. de `.env`
- Suporte ao webhook sem `clientId` explícito

#### Documentation

- `VAULT_ONLY_MIGRATION.md`: Guia completo de migração

---

## [2.0.0] - 2025-10-28

### 🎉 Major: Phase 2.5 - Complete Migration to Next.js

Migração completa do n8n para Next.js com arquitetura serverless.

#### Added

- Pipeline completo de 12 nodes em TypeScript:
  1. `filterStatusUpdates`: Filtro de status updates
  2. `parseMessage`: Parser de mensagens WhatsApp
  3. `checkOrCreateCustomer`: Gestão de clientes
  4. `checkMediaType`: Detecção de tipo de mídia
  5. `processAudio`: Transcrição de áudio com Whisper
  6. `processImage`: OCR com Tesseract + análise GPT-4o Vision
  7. `processDocument`: Extração de texto de PDFs
  8. `getChatHistory`: Recuperação de histórico
  9. `performRAG`: Busca semântica com embeddings
  10. `generateAIResponse`: Geração de resposta com Groq/OpenAI
  11. `saveToSupabase`: Persistência de mensagens
  12. `sendWhatsAppMessage`: Envio via Meta API

#### Changed

- Todos os fluxos n8n migrados para código TypeScript
- Arquitetura de nodes modular e testável
- Processamento serverless no Vercel

#### Documentation

- `CHATBOT_FLOW_ARCHITECTURE.md`: Arquitetura completa dos 12 nodes
- `CHATBOT_FLOW_INTEGRATION.md`: Guia de integração
- `setup/ARCHITECTURE.md`: Documentação técnica detalhada

---

## [1.5.0] - 2025-10-28

### 🎉 Minor: Real-time Notifications

Notificações em tempo real de novas mensagens no dashboard.

#### Added

- Indicadores visuais para conversas com novas mensagens:
  - Fundo azul (bg-blue-50)
  - Texto em negrito
  - Bullet indicator
  - Animação de pulso
- Hook `useConversations` com suporte a realtime
- Supabase Realtime subscription em `n8n_chat_histories`
- Estado de "unread" por conversa

#### Changed

- Componente `ConversationList` refatorado com estado de unread
- Auto-remoção de indicador ao selecionar conversa
- Timeout de 2s para animação de pulso

#### Documentation

- `REALTIME_NOTIFICATIONS.md`: Documentação técnica (160 linhas)
- `VISUAL_GUIDE_REALTIME.md`: Guia visual (206 linhas)

---

## [1.4.0] - 2025-10-28

### 🎉 Minor: Multi-Tenant Architecture

Implementação de arquitetura multi-tenant com isolamento de dados.

#### Added

- Webhook por cliente: `/api/webhook/[clientId]`
- Função helper `getClientIdFromSession()` para autenticação
- RLS (Row Level Security) em 8 tabelas:
  - `clients`
  - `conversations`
  - `messages`
  - `usage_logs`
  - `clientes_whatsapp`
  - `n8n_chat_histories`
  - `documents`
  - `user_profiles`
- Políticas RLS para 3 roles: `admin`, `client_admin`, `user`
- Trigger `handle_new_user()` para auto-criação de perfil

#### Changed

- API routes de teste agora requerem `clientId` explícito
- Node `checkOrCreateCustomer` com `clientId` obrigatório
- Backward compatibility mantida em webhook principal

#### Documentation

- `migrations/RLS.sql`: 450+ linhas de políticas RLS
- `IMPLEMENTATION_SUMMARY.md`: Resumo completo da migração
- `SECURITY_FIX_CLIENT_ID.md`: Correções de segurança
- `TESTING_PLAN_CLIENT_ID.md`: Plano de testes

---

## [1.3.0] - 2025-10-27

### Added

- Supabase Vault para armazenamento seguro de API keys
- Helper `getClientConfigFromVault()` para recuperação de secrets
- Tabela `vault.decrypted_secrets` com pgsodium
- Encryption at rest de todas as credenciais

#### Documentation

- `VAULT_MEDIA_FIX.md`: Correção de mídia com Vault

---

## [1.2.0] - 2025-10-26

### Added

- Analytics dashboard com métricas de uso:
  - Total de mensagens (enviadas/recebidas)
  - Conversas ativas
  - Tempo médio de resposta
  - Custos estimados (OpenAI/Groq)
- Componente `MetricsDashboard` com gráficos Recharts
- Tracking de custos por mensagem em `usage_logs`

#### Documentation

- `ANALYTICS_GUIDE.md`: Guia completo de analytics
- `OPENAI_USAGE_TRACKING.md`: Tracking de custos OpenAI

---

## [1.1.0] - 2025-10-25

### Added

- Sistema de pricing configurável por cliente
- Tabela `pricing_configurations` com modelos de cobrança
- Cálculo automático de custos baseado em tokens
- Dashboard de custos e receitas

#### Documentation

- `PRICING_CONFIG_GUIDE.md`: Guia de configuração
- `PRICING_IMPLEMENTATION_SUMMARY.md`: Detalhes de implementação

---

## [1.0.0] - 2025-10-20

### 🎉 Major: Phase 2 - Next.js Dashboard

Primeiro lançamento do dashboard Next.js integrado com n8n backend.

#### Added

- Dashboard Next.js 14 com App Router
- Listagem de conversas em tempo real
- Visualização de histórico de mensagens
- Componentes UI com shadcn/ui:
  - `ConversationList`
  - `ConversationDetail`
  - `MessageBubble`
  - `SendMessageForm`
- Hooks customizados:
  - `useConversations`: Fetch de conversas
  - `useMessages`: Fetch de mensagens
  - `useRealtimeMessages`: Supabase realtime
- API Routes para leitura:
  - `/api/conversations`: Lista conversas
  - `/api/messages/[phone]`: Mensagens por telefone

#### Changed

- Integração híbrida: n8n (processamento) + Next.js (UI)
- Leitura direta do Supabase (sem proxy n8n)

#### Documentation

- `README.md`: Documentação completa do projeto
- `QUICK_START.md`: Guia de instalação 5 minutos
- `CLAUDE.md`: Guia arquitetural para Claude
- `docs/setup/`: Guias de configuração detalhados

---

## [0.9.0] - 2025-10-15 (Legacy)

### Phase 1 - n8n Workflow Only

Sistema funcionando 100% em n8n (antes da migração Next.js).

#### Features (n8n)

- Webhook Meta WhatsApp
- Processamento de mensagens com OpenAI
- RAG com Supabase Vector Store
- Histórico em `n8n_chat_histories`
- Envio de respostas via Meta API
- Persistência em PostgreSQL

#### Documentation

- `historical/plano_de_arquitetura_saa_s_whats_app_resumao_n_8_n_→_next.md`: Plano completo de migração n8n → Next.js
- `historical/WORKFLOW-LOGIC.md`: Lógica do workflow n8n

---

## Convenções de Versionamento

### Major (X.0.0)

- Mudanças que quebram compatibilidade (breaking changes)
- Migrações de arquitetura completas (n8n → Next.js, Vault-only, RBAC)
- Novas phases do projeto

### Minor (0.X.0)

- Novas funcionalidades significativas
- Novos sistemas (Analytics, Pricing, Configurations)
- Features que não quebram compatibilidade

### Patch (0.0.X)

- Bug fixes
- Melhorias de performance
- Ajustes de documentação
- Correções de segurança menores

---

## Roadmap - Phase 5 (Futuro) 📋

### Planejado

- [ ] Sistema de filas avançado (BullMQ com dashboard e DLQ)
- [ ] Integração com CRMs (Pipedrive, HubSpot)
- [ ] Análise de sentimento em mensagens
- [ ] Dashboard de logs de execução
- [ ] Sistema de backup automático
- [ ] Testes automatizados (E2E + Unit)
- [ ] Monitoramento de uptime e SLA
- [ ] Melhorias de UI/UX no dashboard
- [ ] Suporte a WhatsApp Business oficial (não Cloud API)

### Concluído

- [✅] Webhooks customizados por cliente (implementado em v1.4.0)
- [✅] Sistema de filas para processamento assíncrono (Redis batching implementado em v2.0.0)

---

## Notas de Migração

### De v2.x para v3.0.0 (RBAC)

1. Executar migrations de RLS: `supabase db push`
2. Criar usuários no Supabase Auth
3. Associar usuários a clientes em `user_profiles`
4. Configurar roles apropriadas
5. Remover `DEFAULT_CLIENT_ID` de scripts personalizados

### De v1.x para v2.0.0 (Next.js Full)

1. Migrar configurações de n8n para Dashboard
2. Atualizar webhooks Meta para `/api/webhook/[clientId]`
3. Configurar credenciais no Supabase Vault
4. Desabilitar workflows n8n (opcional, para backup)

### De v0.x para v1.0.0 (Dashboard)

1. Instalar dependências Next.js: `npm install`
2. Configurar `.env.local` com credenciais Supabase
3. Executar migrations: `supabase db push`
4. Manter n8n rodando em paralelo (fase híbrida)

---

## Links Úteis

- **Produção**: https://uzzap.uzzai.com
- **Repositório**: https://github.com/uzzaidev/ChatBot-Oficial
- **Documentação Completa**: Ver pasta `/docs`
- **Issues**: https://github.com/uzzaidev/ChatBot-Oficial/issues

---

## Manutenção deste Arquivo

Este CHANGELOG deve ser atualizado sempre que:

- Uma nova feature for implementada (minor)
- Um bug significativo for corrigido (patch)
- Houver uma mudança de arquitetura (major)
- Migrações de banco de dados forem criadas
- Breaking changes forem introduzidas

**Template para novas entradas**:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- Nova funcionalidade A
- Nova funcionalidade B

### Changed

- Mudança em X
- Mudança em Y

### Fixed

- Correção de bug A
- Correção de bug B

### Removed

- Funcionalidade removida A

### Security

- Correção de segurança A
```
