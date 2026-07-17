# Changelog

Gerado automaticamente por IA a cada push no `main`.

```

```

```

## 2026-07-17

### fix
- Bloqueado o acesso ao checkout Stripe no app nativo (iOS/Android Capacitor) para cumprir políticas da Google Play e App Store, exibindo aviso customizado em vez da interface de pagamento.
  - Arquivos: `src/app/dashboard/payments/products/page.tsx`, `src/components/PaymentWall.tsx`
  - Evidência: uso de `isNativeCompanionApp()` para condicionalmente substituir UI de checkout por `NativeCompanionGate` em ambos os componentes
  - Confiança: alta

## 2026-07-08

### fix
- Ajustado suporte para aceitar token Bearer nas APIs de flows e agentes, permitindo autenticação via header Authorization em chamadas mobile (Capacitor).
- Modificada criação do cliente Supabase para priorizar token Bearer quando presente, suportando sessões expiradas em iOS/Capacitor com refresh automático.
- Atualizado middleware de autenticação para passar o objeto request na criação do cliente Supabase, garantindo leitura correta do token Bearer.
- Refatorado método de extração do token Bearer para suportar headers do Next.js e requisições nativas.
- Alterado componente de dashboard de flows para usar `apiFetch` com autenticação aprimorada e melhor tratamento de erros.
  - Arquivos: `src/lib/supabase-server.ts`, `src/lib/supabase.ts`, `src/lib/api.ts`, `src/lib/middleware/api-auth.ts`, `src/app/dashboard/flows/page.tsx`
  - Evidência: uso consistente de token Bearer no header Authorization, tratamento de refresh de sessão e passagem do request para leitura do token
  - Confiança: alta

## 2026-07-06

### chore
- Adicionado script para captura automatizada de screenshots para App Store (iPhone 6.5") com Puppeteer, incluindo novas imagens geradas em `docs/ios/screenshots/appstore-6.5in/` e comando npm para execução
  - Arquivos: `scripts/ios-capture-appstore-screenshots.mjs`, `package.json`, `docs/ios/screenshots/appstore-6.5in/*`
  - Confiança: alta

### docs
- Atualizada descrição do produto na página de suporte para refletir plataforma de atendimento e automação com IA
  - Arquivo: `src/app/support/page.tsx`
  - Confiança: alta

## 2026-07-06

### fix
- Ajustado conformidade com a App Store para o app companion nativo iOS, incluindo permissões de acesso à câmera e biblioteca de fotos com descrições específicas no Info.plist.
- Implementado bloqueio de funcionalidades de cadastro, preços, assinatura e pagamentos no app nativo, redirecionando para telas informativas que orientam uso via web.
- Modificadas telas de login, registro, onboarding, dashboard de faturamento e pagamentos para respeitar restrições do app companion nativo.
- Adicionado componente `NativeCompanionGate` para exibir mensagens explicativas e impedir ações não permitidas no app nativo.
- Criados componentes `NativeLandingRedirect` e `NativePrecosGate` para redirecionar ou bloquear acesso a páginas de marketing e preços no app nativo.
- Introduzida função `isNativeCompanionApp` para detectar execução no app nativo via Capacitor.
- Atualizadas mensagens e links para evitar criação de conta e checkout no app nativo, conforme guidelines da Apple.
  - Arquivos: `ios/App/App/Info.plist`, `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`, `src/app/dashboard/billing/page.tsx`, `src/app/dashboard/payments/onboarding/page.tsx`, `src/app/dashboard/payments/page.tsx`, `src/app/onboarding/page.tsx`, `src/app/page.tsx`, `src/app/precos/page.tsx`, `src/components/BillingStatusBanner.tsx`, `src/components/NativeCompanionGate.tsx`, `src/components/NativeLandingRedirect.tsx`, `src/components/NativePrecosRedirect.tsx`, `src/lib/nativeAppCompliance.ts`
  - Evidência: mensagens de commit e diff detalham ajustes para compliance App Store 3.1.1 e 5.1.1(ii), bloqueios e redirecionamentos no app nativo.
  - Confiança: alta

## 2026-07-06

### fix
- Ajustado componente ScrollArea para garantir altura mínima e evitar problemas de layout no modal de edição de filtros
  - Arquivos: `src/components/FilterEditorModal.tsx`
  - Evidência: adição da classe `min-h-0` para manter altura mínima no ScrollArea
  - Confiança: alta

## 2026-07-05

### chore
- Removidos segredos hardcoded dos scripts de backup e restore, substituindo por variáveis de ambiente (`POSTGRES_PASSWORD` e `POSTGRES_URL`)
  - Arquivos: `db/backup-auth.bat`, `db/backup-complete.bat`, `db/backup-postgres.bat`, `db/restore/restore-backup.js`, `db/restore/restore-complete-backup.js`, `db/test-connection.js`
  - Confiança: alta

### chore
- Atualizadas referências da Gateway API Key nos documentos de configuração do AI Gateway para valor redigido (`vck_REDACTED`), removendo chaves expostas
  - Arquivos: `docs/features/ai_gateway/AI_GATEWAY_FIX.md`, `docs/features/ai_gateway/AI_GATEWAY_QUICKSTART.md`, `docs/features/ai_gateway/IMPLEMENTATION_SUMMARY.md`, `docs/features/ai_gateway/QUICK_SETUP.md`, `docs/features/ai_gateway/SETUP_GUIDE.md`, `supabase/migrations/setup-gateway-keys.sql`, `supabase/migrations/setup-gateway-keys-ready.sql`
  - Confiança: alta

### chore
- Ajustado script `scripts/test-rpc.mjs` para usar variável `SUPABASE_URL` com fallback para `NEXT_PUBLIC_SUPABASE_URL` e removida verificação explícita de variáveis de ambiente
  - Arquivo: `scripts/test-rpc.mjs`
  - Confiança: alta

## 2026-07-05

### fix
- Removidos segredos hardcoded expostos em scripts de backup, conexão e documentação, substituindo-os por variáveis de ambiente e placeholders revogados.
- Atualizados exemplos e instruções de API keys no AI Gateway para usar chave revogada e evitar exposição.
- Adicionado aviso para definir variáveis de ambiente obrigatórias em scripts `.bat` e Node.js.
  - Arquivos: `db/backup-auth.bat`, `db/backup-complete.bat`, `db/backup-postgres.bat`, `db/test-connection.js`, `scripts/test-rpc.mjs`, `docs/features/ai_gateway/*`, `supabase/migrations/setup-gateway-keys.sql`, `supabase/migrations/setup-gateway-keys-ready.sql`
  - Evidência: remoção de valores sensíveis fixos e inclusão de validações para variáveis de ambiente
  - Confiança: alta

## 2026-07-04

### fix
- Declarado `ITSAppUsesNonExemptEncryption=false` no `Info.plist` para conformidade com políticas de criptografia iOS
  - Arquivos: `ios/App/App/Info.plist`
  - Evidência: adição da chave `ITSAppUsesNonExemptEncryption` com valor `false` no plist
  - Confiança: alta

## 2026-07-04

### fix
- Atualizado Node para versão 22 no workflow de release iOS, conforme exigência do Capacitor CLI 8.x
  - Arquivos: `.github/workflows/ios-release.yml`
  - Evidência: alteração da versão Node de 20 para 22 no arquivo de workflow
  - Confiança: alta

## 2026-07-04

### fix
- Restaurado script `build:mobile` para gerar fallback estático mínimo exigido pelo Capacitor, evitando conflito com rotas dinâmicas do Next.js
  - Arquivos: `scripts/build-mobile.js`
  - Evidência: script cria pasta `out/` com HTML básico para atender requisito técnico do Capacitor sem exportar app inteiro
  - Confiança: alta

## 2026-07-04

### chore
- Configurado ByteRover local memory com checkpoint de 2026-04-16 para suporte a memória persistente
  - Arquivos: `.brv/context-tree/ai-system/context.md`
  - Confiança: alta

### feat
- Adicionado suporte completo para build e publicação iOS sem Mac físico usando GitHub Actions e fastlane
- Incluído workflow GitHub Actions para bootstrap de certificados iOS (`ios-match-bootstrap.yml`) e release (`ios-release.yml`)
- Criados playbooks detalhados para iOS sem Mac, Firebase push via CLI, App Store review rejeições, screenshots headless, GitHub secrets CLI, Google Play publishing CLI e setup Capacitor para mobile
- Implementadas features nativas para app mobile Capacitor: push notifications via Firebase/APNs, biometria, deep linking, câmera, status bar, rede, haptics e outras integrações nativas para aprovação Apple App Store
- Atualizado projeto Android para versão 2.1.0 com incrementos em `versionCode` e `versionName`, e ajustes em build.gradle e capacitor settings para suporte a novos plugins Firebase e Capacitor
- Ajustado `capacitor.config.ts` para desabilitar plugins CapacitorCookies e CapacitorHttp no iOS para corrigir bug de sessão e relogin, além de configurar FirebaseMessaging nativo
- Adicionados scripts e documentação para setup e automação de CI/CD mobile (iOS e Android)
  - Arquivos principais: `.github/workflows/ios-match-bootstrap.yml`, `.github/workflows/ios-release.yml`, `capacitor.config.ts`, `android/app/build.gradle`, `android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle`, `fastlane/*`, `scripts/setup-ios-ci-secrets.mjs`, `docs/playbooks/**`, `docs/universal-mobile-app/**`, `src/components/NativeBottomTabBar.tsx`, `src/lib/nativeCamera.ts`, `src/lib/pushNotifications.ts`, `src/components/NativeNetworkBanner.tsx`, entre outros
  - Confiança: alta

### docs
- Adicionados e atualizados playbooks e documentação técnica para:
  - Setup Capacitor mobile (Android/iOS)
  - Publicação Google Play via CLI
  - Publicação iOS sem Mac via GitHub Actions + fastlane
  - Firebase Cloud Messaging push via CLI
  - GitHub Actions secrets via CLI
  - Apple App Store review rejeições comuns e soluções
  - Captura headless de screenshots para lojas
  - Features nativas do app Capacitor para aprovação Apple
  - Checklists de lançamento e requisitos de assets para lojas
- Documentação detalhada de arquitetura AI, banco de dados, módulos, pipeline, multi-tenancy, padrões de código e tech debt atualizada com checkpoint 2026-04-16
  - Arquivos: `docs/playbooks/**`, `.brv/context-tree/**`, `MEMORY_POLICY.md`
  - Confiança: alta

## 2026-07-01

### feat
- Implementado componente `ByteLimitedInput` para inputs com limite de bytes UTF-8, considerando acentuação e emojis, com contador visual e truncamento automático.
- Integrado `ByteLimitedInput` nos componentes de propriedades interativas (`InteractiveButtonsProperties`, `InteractiveListProperties`) para garantir limites de bytes conforme especificação Meta.
- Adicionado módulo `byteLimits` com constantes de limites e funções utilitárias para contagem e truncamento de bytes UTF-8.
- Aplicado truncamento defensivo por bytes UTF-8 no executor de fluxos (`flowExecutor.ts`) para evitar envio de campos que excedam limites da API Meta.
  - Arquivos: `src/components/flows/properties/ByteLimitedInput.tsx`, `src/components/flows/properties/InteractiveButtonsProperties.tsx`, `src/components/flows/properties/InteractiveListProperties.tsx`, `src/lib/flows/flowExecutor.ts`, `src/lib/whatsapp/byteLimits.ts`
  - Confiança: alta

## 2026-06-30

### fix
- Atualizado comentário de rollback para maior clareza no script de migração `20260603200000_harden_views_rls_bypass.sql`
  - Arquivos: `supabase/migrations/20260603200000_harden_views_rls_bypass.sql`
  - Evidência: modificação no comentário de rollback no final do arquivo de migração
  - Confiança: alta

## 2026-06-30

### fix
- Ajustado consulta em `captureLeadSource.ts` para evitar erro ao buscar tags de cartão, usando `.maybeSingle()` em vez de `.single()`.
- Corrigidos dois erros recorrentes que geravam muitos logs no banco de dados:
  1) Tornada a coluna `phone` da tabela `usage_logs` nullable para evitar falhas em inserts sem telefone.
  2) Atualizada restrição `message_traces_status_check` para permitir o status `success`, evitando erros e spam de logs.
  - Arquivos: `src/nodes/captureLeadSource.ts`, `supabase/migrations/20260630140000_fix_recurring_log_errors.sql`
  - Evidência: alteração no select para `.maybeSingle()` e migração SQL que altera constraints e coluna nullable para evitar erros de inserção e restrição.
  - Confiança: alta

## 2026-06-30

### fix
- Reforçado controle de acesso em views que ignoravam Row Level Security (RLS), evitando vazamento de dados sensíveis entre tenants. A view `client_secrets_decrypted` teve todos os acessos públicos revogados, restringindo uso apenas ao backend, e outras views foram configuradas para usar `security_invoker=true` e tiveram permissões públicas removidas.
  - Arquivos: `supabase/migrations/20260603200000_harden_views_rls_bypass.sql`
  - Evidência: migração que revoga permissões públicas e ativa `security_invoker` para views específicas, corrigindo exposição de chaves secretas.
  - Confiança: alta

## 2026-06-30

### feat
- Ativado Row Level Security (RLS) em 8 tabelas que estavam sem restrição para evitar acesso cross-tenant não autorizado, incluindo `clients`, `user_profiles`, tabelas internas `crm_*` e `feature_flags`. Políticas foram criadas para restringir leitura e escrita por tenant e permitir acesso admin, mantendo funcionamento normal do backend via service_role que ignora RLS.
  - Arquivos: `supabase/migrations/20260603190000_enable_rls_remaining_tables.sql`
  - Confiança: alta

## 2026-06-20

### feat
- Adicionado script `build_infra_frame.py` para geração automática do diagrama de arquitetura de infraestrutura
- Atualizado arquivo de diagrama `UzzApp-Arquitetura.excalidraw` com nova estrutura visual detalhada da arquitetura de infraestrutura e deploy, incluindo front-end, back-end serverless, banco de dados, nuvem e serviços externos
  - Arquivos: `scripts/build_infra_frame.py`, `UzzApp-Arquitetura.excalidraw`
  - Confiança: alta

## 2026-06-20

### feat
- Atualizado o valor padrão de `reasoning_effort` de "low" para "medium" para agentes novos e existentes sem configuração explícita, visando melhorar o raciocínio interno dos modelos GPT-5.x e reduzir vazamento de chain-of-thought em inglês nas respostas ao cliente.
- Implementada filtragem defensiva para remover trechos de raciocínio em inglês vazados nas respostas, mantendo apenas o conteúdo válido em português brasileiro.
- Ajustada a formatação das respostas para evitar exposição de raciocínio interno e melhorar a clareza do texto enviado ao cliente.
- Atualizado arquivo de arquitetura (`UzzApp-Arquitetura.excalidraw`) com nova estrutura de frames.
  - Arquivos: `src/app/api/agents/[id]/versions/[versionId]/restore/route.ts`, `src/app/api/agents/route.ts`, `src/components/agents/AgentEditor.tsx`, `src/components/agents/AgentEditorModal.tsx`, `src/lib/config.ts`, `src/lib/direct-ai-client.ts`, `src/nodes/formatResponse.ts`, `supabase/migrations/20260620120000_bump_reasoning_effort_to_medium.sql`, `UzzApp-Arquitetura.excalidraw`
  - Confiança: alta

## 2026-06-18

### feat
- Adicionado script para gerar diagrama Excalidraw da arquitetura do UzzApp, representando o fluxo do chatbot SaaS multi-tenant para WhatsApp, incluindo componentes como webhook, pipeline de processamento, IA, serviços externos e dashboard.
  - Arquivos: `scripts/gen-excalidraw.mjs`, `UzzApp-Arquitetura.excalidraw`
  - Confiança: alta

## 2026-06-18

### feat
- Implementadas APIs para upload de mídia e listagem de documentos da base de conhecimento, permitindo anexar imagens e documentos em blocos de mensagem.
- Adicionado suporte a anexos de mídia (imagem ou documento) com legenda opcional no bloco de mensagem do fluxo, incluindo interface para seleção da base ou upload direto.
- Adaptado executor de fluxo para enviar mensagens com anexos de mídia via WhatsApp (imagem ou documento) com suporte a legenda.
  - Arquivos: `src/app/api/flows/media/upload/route.ts`, `src/app/api/flows/media/documents/route.ts`, `src/components/flows/blocks/MessageBlock.tsx`, `src/components/flows/properties/MessageBlockProperties.tsx`, `src/lib/flows/flowExecutor.ts`
  - Confiança: alta

### fix
- Ajustado controle de limite de budget para ser ativado apenas se variável de ambiente `BUDGET_ENFORCEMENT_ENABLED` estiver `true`, evitando bloqueios inesperados.
- Tratamento de erro na API de teste de agentes para retornar status 402 com mensagem clara quando limite de budget é atingido.
  - Arquivos: `src/lib/direct-ai-client.ts`, `src/nodes/generateAIResponse.ts`, `src/app/api/agents/[id]/test/route.ts`
  - Evidência: checagem condicional da variável de ambiente e retorno HTTP 402 no handler
  - Confiança: alta

## 2026-06-18

### feat
- Adicionada funcionalidade completa de recuperação e redefinição de senha via email, incluindo páginas para solicitar link de redefinição (`/forgot-password`) e para criar nova senha (`/reset-password`).
- Implementado fluxo seguro que não revela existência do email na solicitação de recuperação e valida sessão de recuperação antes de permitir alteração da senha.
- Adicionado link "Esqueceu a senha?" na tela de login para acesso rápido à recuperação.
- Atualizadas rotas e helpers para suportar o fluxo de recuperação com Supabase, incluindo redirecionamento após confirmação do token.
  - Arquivos: `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/auth/confirm/route.ts`, `src/lib/supabase-browser.ts`
  - Confiança: alta

## 2026-06-18

### docs
- Atualizado comando no arquivo de exemplo de ambiente móvel para refletir nome correto do arquivo de destino
  - Arquivos: `.env.mobile.example`
  - Confiança: alta

## 2026-06-18

### feat
- Implementada funcionalidade de diff ao nível de palavra no componente `PromptSuggestionCard`, permitindo visualizar mudanças entre texto atual e sugerido em formato lado a lado ou inline estilo git.
- Adicionado botão para alternar entre visualização lado a lado e diff inline com destaque colorido para palavras removidas e adicionadas.
  - Arquivos: `src/components/agents/PromptSuggestionCard.tsx`
  - Confiança: alta

## 2026-06-14

### feat
- Adicionado script de backup para gerenciamento da base de dados, que lê a conexão do arquivo .env.local e executa o backup via pg_dump ajustando a porta para compatibilidade com Supabase
  - Arquivos: `scripts/backup.mjs`, `package.json`
  - Confiança: alta

## 2026-06-14

### feat
- Adicionada aba "Otimizar IA" no modal de edição de agentes com painel avaliador de prompts que revisa, pontua e sugere melhorias aplicáveis com um clique
  - Arquivos: `src/components/agents/AgentEditorModal.tsx`
  - Confiança: alta

### chore
- Removido arquivo de contexto obsoleto `.brv/context-tree/your_domain/your_topic/your_title.overview.md`
  - Arquivos: `.brv/context-tree/your_domain/your_topic/your_title.overview.md`
  - Confiança: alta

## 2026-06-14

### fix
- Atualizado status da fila reduzindo pendentes e incrementando processados; incrementado contador de curations no estado dream
  - Arquivos: `.brv/_queue_status.json`, `.brv/dream-state.json`
  - Evidência: alteração dos campos `pending` e `processed` e incremento de `curationsSinceDream`
  - Confiança: alta

### chore
- Removidos arquivos de contexto obsoletos e ajustada estrutura de metadados para curadoria de fatos
  - Arquivos: `.brv/context-tree/your_domain/your_topic/your_title.*`
  - Confiança: alta

### feat
- Adicionada aba QA no editor de agentes para testes de regressão de prompts, com armazenamento e avaliação AI de relatórios
- Implementada ação administrativa no dashboard para estender assinatura de clientes em +1 mês grátis via Stripe sem cupom
- Atualizado padrão de cliente para matcher de ground-truth usando `createServiceRoleClient()` síncrono, com orientações para mocks em testes
  - Arquivos: `.brv/context-tree/facts/project/dashboard_qa_billing_matcher.md`, `src/lib/ground-truth-matcher.ts`
  - Confiança: alta

## 2026-06-14

### docs
- Adicionada documentação completa do ByteRover para gerenciamento de conhecimento e guia de uso da CLI.
- Atualizados e reorganizados arquivos de contexto e fatos para refletir o estado atual do projeto, incluindo arquitetura do runtime AI, estado do projeto, e pipeline de exportação e reconstrução do deck comercial UzzApp.
- Documentados fluxos de trabalho de engenharia de contexto RLM e requisitos de curadoria, detalhando uso de recon precomputado, extração single-pass, e verificação via paths aplicados.
  - Arquivos: `.brv/context-tree/architecture/ai_runtime/*`, `.brv/context-tree/facts/*`, `.brv/context-tree/facts/project/*`, `.brv/context-tree/your_domain/your_topic/your_title.*`, `.github/skills/byterover/SKILL.md`, `claude/skills/byterover/SKILL.md`
- Confiança: alta

### chore
- Criados arquivos de configuração e status para ByteRover MCP (`.brv/_queue_status.json`, `.brv/config.json`).
- Atualizada estrutura e manifesto do contexto para refletir nova organização e tokens totais.
- Confiança: alta

## 2026-06-14

### fix
- Atualizado importação e mocks de `createServerClient` para `createServiceRoleClient` nos testes de `ground-truth-matcher`
  - Arquivos: `src/lib/__tests__/ground-truth-matcher.test.ts`
  - Evidência: substituição direta no import e nos mocks Jest
  - Confiança: alta

## 2026-06-13

### feat
- Adicionada funcionalidade no dashboard admin para estender o período grátis de assinaturas, adiando a próxima cobrança em até 12 meses sem gerar fatura.
- Implementada rota PATCH `/api/admin/billing/subscriptions/[id]` para atualizar o trial_end da assinatura no Stripe e refletir no banco Supabase.
- Incluído botão "+1 mês grátis" na lista de assinaturas do admin para facilitar a extensão do período grátis.
  - Arquivos: `src/app/api/admin/billing/subscriptions/[id]/route.ts`, `src/app/dashboard/admin/billing/page.tsx`
  - Confiança: alta

## 2026-06-13

### feat
- Adicionada avaliação automática por IA para relatórios de QA, com julgamento de cada pergunta/resposta e sugestões aplicáveis de ajuste de prompt. A avaliação é salva no relatório e pode ser reavaliada pelo usuário via interface.
  - Arquivos: `src/app/api/agents/[id]/qa/reports/[reportId]/evaluate/route.ts`, `src/components/agents/AgentQAPanel.tsx`, `src/components/agents/PromptSuggestionCard.tsx`, `src/lib/qa-evaluator.ts`, `src/lib/types.ts`
  - Confiança: alta

### chore
- Criada migração para adicionar colunas `evaluation` (JSONB), `evaluator_model` (texto) e `evaluated_at` (timestamp) na tabela `agent_qa_reports` para armazenar a avaliação IA dos relatórios de QA.
  - Arquivos: `supabase/migrations/20260613130000_add_qa_report_evaluation.sql`
  - Confiança: alta

## 2026-06-05

### fix
- Atualizado texto do banner de status de cobrança para indicar que o atendimento está pausado em vez de desconectado.
- Alterada lógica de suspensão de clientes para preservar credenciais do WhatsApp, permitindo reativação manual sem necessidade de novo onboarding Meta.
- Ajustado lookup de cliente por WABA ID para bloquear clientes com status de plano "canceled" ou "suspended", evitando uso indevido.
  - Arquivos: `src/components/BillingStatusBanner.tsx`, `src/lib/billing-lifecycle.ts`, `src/lib/waba-lookup.ts`
  - Evidência: remoção da desconexão automática do WhatsApp na suspensão e checagem explícita de status no lookup
  - Confiança: alta

## 2026-06-05

### fix
- Atualizado endpoint de override de billing para definir status operacional e de cobrança como ativos no cliente, além de limpar período de carência
  - Arquivos: `src/app/api/admin/billing/override/route.ts`
  - Evidência: alteração na função POST para atualizar campos `status`, `plan_status` e `grace_period_ends_at`
  - Confiança: alta

## 2026-06-03

### fix
- Corrigido erro de digitação em comentário sobre revogação de acesso do papel anon em migração de segurança
  - Arquivos: `supabase/migrations/20260601120000_security_lockdown_anon_exposure.sql`
  - Evidência: ajuste em comentário de linha referente a papel anon
  - Confiança: alta

## 2026-06-03

### fix
- Ajustado endpoint de secrets no Vault para rejeitar valores mascarados ou placeholders ao salvar, evitando sobrescrever chaves reais com valores inválidos (ex: "***1234", "placeholder")
  - Arquivos: `src/app/api/vault/secrets/route.ts`
  - Evidência: validação explícita no PUT que bloqueia valores com máscaras e placeholders comuns
  - Confiança: alta

## 2026-06-03

### fix
- Ajustado autenticação dos sockets Realtime para usar o JWT do usuário antes de assinar canais, garantindo que as políticas RLS por tenant funcionem corretamente e evitando assinaturas anônimas que retornavam zero dados.
- Adicionadas mensagens de aviso para estados de canal diferentes de "SUBSCRIBED" nas assinaturas Realtime de notificações globais, conversas e mensagens.
  - Arquivos: `src/hooks/useGlobalRealtimeNotifications.ts`, `src/hooks/useRealtimeConversations.ts`, `src/hooks/useRealtimeMessages.ts`
  - Evidência: inclusão de chamadas `setAuth(token)` antes das assinaturas e logs de status de canal
  - Confiança: alta

## 2026-06-03

### refactor
- Refatorada a inicialização do cliente Supabase para utilizar o client com role de serviço em múltiplos módulos, substituindo o client de servidor padrão. Essa alteração unifica a forma de acesso ao Supabase para operações que requerem privilégios elevados.
  - Arquivos: `src/lib/calendar-client.ts`, `src/lib/google-calendar-client.ts`, `src/lib/ground-truth-matcher.ts`, `src/lib/microsoft-calendar-client.ts`, `src/lib/unified-tracking.ts`, `src/lib/vault.ts`, `src/nodes/convertTextToSpeech.ts`, `src/nodes/getRAGContext.ts`
  - Confiança: alta

## 2026-06-03

### feat
- Atualizado o acesso às configurações de cliente e bot para usar o client com service role, garantindo conformidade com Row Level Security (RLS) no backend e webhook
  - Arquivos: `src/lib/config.ts`
  - Confiança: alta

## 2026-06-01

### feat
- Removidos endpoints de debug obsoletos relacionados a billing OpenAI e vault para limpeza do código
  - Arquivos removidos: `src/app/api/debug/config/route.ts`, `src/app/api/debug/env-check/route.ts`, `src/app/api/openai-billing/test-billing-usage/route.ts`, `src/app/api/openai-billing/test-costs/route.ts`, `src/app/api/openai-billing/test-subscription/route.ts`, `src/app/api/vault/debug/route.ts`
  - Confiança: alta

## 2026-06-01

### feat
- Implementado lockdown de segurança para o papel `anon`, removendo acesso público a tabelas e funções sensíveis para mitigar exposição de dados após incidente de vazamento de chaves. Revogadas permissões e corrigidas policies excessivamente permissivas, mantendo acesso normal para `authenticated` e `service_role`.
  - Arquivos: `supabase/migrations/20260601120000_security_lockdown_anon_exposure.sql`
  - Confiança: alta

## 2026-05-31

### feat
- Melhorada a navegação e exibição de tooltip nas seções editáveis do componente `RawPromptPreview`, facilitando a edição direta a partir da visualização do prompt
  - Arquivos: `src/components/agents/RawPromptPreview.tsx`
  - Confiança: alta

### chore
- Aumentado o tempo máximo da cron job de verificação de inatividade de 60 para 300 segundos para maior tolerância na execução
  - Arquivos: `src/app/api/cron/inactivity-check/route.ts`
  - Confiança: alta

### refactor
- Implementado cache temporário (30 segundos) para checagem se o engine está habilitado para um cliente, reduzindo consultas repetidas ao banco
- Ajustada concorrência da verificação de inatividade para processar até 3 cards simultaneamente, alinhando com o pool de conexões do Postgres e evitando timeouts por excesso de conexões
  - Arquivos: `src/lib/crm-automation-engine.ts`, `src/lib/jobs/inactivity-check.ts`
  - Confiança: alta

## 2026-05-31

### feat
- Adicionado componente de visualização do prompt final bruto com seções editáveis e navegação para campos do editor, integrado na aba "Prompt Final" do modal de edição do agente (`AgentEditorModal.tsx`, `RawPromptPreview.tsx`).
- Implementado painel de avaliação de prompt por IA que executa uma revisão especializada do prompt compilado do agente, gera sugestões aplicáveis e permite aplicar ou descartar cada sugestão diretamente no editor (`PromptEvaluatorPanel.tsx`, `AgentEditorModal.tsx`).
- Criada API REST `/api/agents/[id]/evaluate-prompt` para listar avaliações anteriores (GET) e executar nova avaliação (POST), armazenando resultados e sugestões estruturadas no banco (`src/app/api/agents/[id]/evaluate-prompt/route.ts`).
- Desenvolvida lógica de avaliação de prompt especializada que usa LLM para revisar o prompt compilado do agente, produzindo sugestões por seção mapeadas para campos do editor e avaliação geral com escore e justificativa (`prompt-evaluator.ts`).
- Refatorado o construtor do prompt do sistema para retornar segmentos estruturados com metadados que permitem mapear cada seção para o campo correspondente no editor, suportando navegação e aplicação de sugestões (`prompt-builder.ts`).
- Criada migração para nova tabela `agent_prompt_evaluations` no banco, que armazena avaliações de prompt com sugestões, estado de aplicação, referência opcional a mensagens reais, e políticas RLS para isolamento multi-tenant (`20260531120000_create_agent_prompt_evaluations.sql`).

- Arquivos principais:  
  `src/components/agents/AgentEditorModal.tsx`,  
  `src/components/agents/RawPromptPreview.tsx`,  
  `src/components/agents/PromptEvaluatorPanel.tsx`,  
  `src/app/api/agents/[id]/evaluate-prompt/route.ts`,  
  `src/lib/prompt-evaluator.ts`,  
  `src/lib/prompt-builder.ts`,  
  `supabase/migrations/20260531120000_create_agent_prompt_evaluations.sql`

- Confiança: alta

## 2026-05-29

### feat
- Implementado dashboard de feedback de conversas WhatsApp com filtros, paginação e visualização detalhada no dashboard de observabilidade
- Adicionada API GET para listagem paginada e filtrada de feedbacks de mensagens, com controle de acesso por papel (admin ou cliente)
- Adicionado botão "Copiar tudo" no componente de detalhes de trace para facilitar exportação dos dados da requisição e raciocínio
  - Arquivos: `src/app/api/message-feedback/route.ts`, `src/app/dashboard/observability/page.tsx`, `src/components/conversations/ConversationFeedbackDashboard.tsx`, `src/components/TracesClient.tsx`
  - Confiança: alta

### refactor
- Melhorada extração do campo reasoning no client Direct AI para suportar múltiplos formatos, incluindo passos detalhados
  - Arquivos: `src/lib/direct-ai-client.ts`
  - Confiança: alta

## 2026-05-28

### feat
- Adicionada configuração de regiões (`gru1`, `iad1`) no arquivo `vercel.json` para deploy na Vercel
  - Arquivos: `vercel.json`
  - Confiança: alta

## 2026-05-28

### refactor
- Melhorada formatação e legibilidade do código no componente `KanbanColumn`
  - Arquivos: `src/components/crm/KanbanColumn.tsx`
  - Confiança: alta

## 2026-05-28

### feat
- Implementado paginação e contagem total na API de cards do CRM para melhorar desempenho e usabilidade.
- Adicionado botão "Ver todos" no dashboard CRM para carregar todos os leads quando houver mais resultados que o limite padrão.
- Atualizados hooks `useCRMCards`, `useCRMColumns` e `useCRMTags` para gerenciar estado de carregamento com cache local e suporte a carregamento completo.
- Criados índices no banco de dados para otimizar joins entre `crm_cards` e `clientes_whatsapp` via campos `phone` e `client_id`.
- Ajustes na configuração e no gerenciamento do pool de conexões PostgreSQL para melhorar estabilidade e performance em ambiente serverless.
  - Arquivos: `src/app/api/crm/cards/route.ts`, `src/app/dashboard/crm/page.tsx`, `src/hooks/useCRMCards.ts`, `src/hooks/useCRMColumns.ts`, `src/hooks/useCRMTags.ts`, `src/lib/postgres.ts`, `supabase/migrations/20260528_crm_phone_index.sql`
  - Confiança: alta

## 2026-05-28

### feat
- Adicionado seletor de estágio do CRM no componente `ConversationsIndexClient` para filtrar conversas por estágio
  - Arquivos: `src/components/ConversationsIndexClient.tsx`
  - Confiança: alta

## 2026-05-28

### refactor
- Reordenados imports e ajustada formatação das respostas de erro para maior consistência na API de submissão de templates
  - Arquivos: `src/app/api/templates/[templateId]/submit/route.ts`
  - Confiança: alta

## 2026-05-28

### refactor
- Atualizado o tratamento do ID do WhatsApp Business Account (WABA) para priorizar o uso do campo `meta_waba_id` em vez de `whatsapp_business_account_id`, visando maior precisão na identificação do cliente. Ajustes feitos na API de configuração do cliente, submissão de templates e formulário de templates para refletir essa preferência e corrigir IDs desatualizados.
  - Arquivos: `src/app/api/client/config/route.ts`, `src/app/api/templates/[templateId]/submit/route.ts`, `src/components/templates/TemplateForm.tsx`
  - Confiança: alta

## 2026-05-27

### refactor
- Atualizado parâmetro de resumo de raciocínio de "concise" para "detailed" para melhorar a clareza das respostas do Direct AI Client
  - Arquivos: `src/lib/direct-ai-client.ts`
  - Confiança: alta

## 2026-05-27

### refactor
- Alterado para avançar automaticamente ao próximo bloco em execuções de fluxo de mensagens, removendo espera por resposta do usuário
- Ajustada extração do texto de raciocínio da resposta da IA para usar nova propriedade `reasoningText` e melhorar compatibilidade com diferentes formatos de resposta
  - Arquivos: `src/lib/direct-ai-client.ts`, `src/lib/flows/flowExecutor.ts`
  - Confiança: alta

## 2026-05-27

### refactor
- Removidas instruções de saudação para clientes novos e recorrentes das configurações padrão do bot.
- Atualizada execução dos blocos de mensagem para incluir `clientId` e enviar mensagens WhatsApp com configuração do cliente.
- Melhorias gerais na organização e formatação do código em `FlowExecutor`, incluindo tratamento de mensagens interativas e salvamento de mensagens.
- Ajustes na extração e uso de variáveis de contexto e histórico de execução para maior clareza.
  - Arquivos: `src/lib/flows/flowExecutor.ts`, `supabase/seeds/default_bot_configurations.sql`
  - Confiança: alta

## 2026-05-27

### chore
- Melhorada a formatação do código para aumentar a legibilidade nos componentes `LeadStageSelector` e `AdminBillingPage`
  - Arquivos: `src/components/LeadStageSelector.tsx`, `src/app/dashboard/admin/billing/page.tsx`
  - Confiança: alta

## 2026-05-27

### feat
- Adicionado suporte a métodos de pagamento "card" e "boleto" no Stripe Checkout para assinaturas.
- Implementada API para liberação e revogação manual de acesso gratuito a clientes, sem uso do Stripe, com atualização do status do plano no banco.
- Incluída interface no dashboard administrativo para controlar manualmente o acesso dos clientes, com botões para liberar ou revogar acesso gratuito.
- Adicionado componente LeadStageSelector para exibir e alterar o estágio do lead no CRM diretamente na página de conversa do cliente, com integração via API para mover cartões entre colunas do pipeline.
  - Arquivos: `src/app/api/admin/billing/checkout-session/route.ts`, `src/app/api/admin/billing/override/route.ts`, `src/app/dashboard/admin/billing/page.tsx`, `src/components/ConversationPageClient.tsx`, `src/components/LeadStageSelector.tsx`
  - Confiança: alta

## 2026-05-27

### feat
- Melhorada a exibição do raciocínio (chain-of-thought) no componente de traces, incluindo mensagem informativa quando apenas tokens de raciocínio interno são usados sem texto retornado. Ajustada a solicitação para incluir resumo automático do raciocínio na chamada à API OpenAI.
  - Arquivos: `src/components/TracesClient.tsx`, `src/lib/direct-ai-client.ts`
  - Confiança: alta

## 2026-05-27

### feat
- Adicionado rastreamento de passos de follow-up em interações de IA para maior observabilidade no componente de traces. Inclui exibição detalhada dos argumentos da ferramenta, resumo dos resultados, prompts enviados ao LLM, raciocínio do modelo e respostas geradas após chamadas de ferramentas.
- Implementado suporte no fluxo do chatbot para coletar e salvar snapshots das chamadas de follow-up feitas após resultados de ferramentas, como buscar_conhecimento e buscar_documento, integrando essas informações ao trace para análise posterior.
  - Arquivos: `src/components/TracesClient.tsx`, `src/flows/chatbotFlow.ts`
  - Confiança: alta

## 2026-05-27

### refactor
- Removidos valores padrão de saudações no código, agora configuráveis via dashboard; melhorada formatação e padronização do código em `checkContinuity.ts` e `route.ts`.
- Ajustado retorno para não usar mais mensagens fixas internas, incentivando configuração externa das instruções de saudação.
  - Arquivos: `src/app/api/flow/nodes/[nodeId]/route.ts`, `src/nodes/checkContinuity.ts`
  - Confiança: alta

## 2026-05-23

### feat
- Melhorada a associação de mensagens com traces no endpoint de mensagens, adicionando o campo `trace_id` na metadata das mensagens para melhor rastreabilidade.
- Atualizada a interface de observabilidade para definir a aba padrão como "traces" e permitir abertura direta de traces via parâmetro `traceId` na URL.
- Adicionados botões de feedback nas mensagens com indicação visual de trace vinculado, possibilitando acesso rápido ao trace correspondente na dashboard.
- Ajustada a interface do componente de mensagens para melhor alinhamento e responsividade dos balões de mensagem e botões de feedback.
- Expandido limite de carregamento de traces na dashboard de 100 para 500 para maior visibilidade.
- Refinada exibição dos itens de trace na lista, removendo indicadores de status e ajustando o layout para foco em tempo, mensagem e latência.
  - Arquivos: `src/app/api/messages/[phone]/route.ts`, `src/app/dashboard/observability/page.tsx`, `src/components/MessageBubble.tsx`, `src/components/MessageFeedbackButtons.tsx`, `src/components/TracesClient.tsx`
  - Confiança: alta

## 2026-05-23

### feat
- Implementado sistema de feedback para mensagens com API REST e componentes de UI para envio e visualização de avaliações (like, dislike, bug).
- Adicionada tabela `message_feedback` no banco com políticas de segurança para armazenar avaliações vinculadas a mensagens e rastros.
- Integrado carregamento de feedback nas APIs de mensagens e rastros, exibindo contagem e detalhes no dashboard.
- Criados botões interativos de feedback em mensagens enviadas, com modal para observações opcionais.
- Agrupamento de rastros no cliente por telefone/contato, incluindo filtro por status "com review" e exibição de indicadores visuais.
  - Arquivos: `src/app/api/message-feedback/route.ts`, `src/app/api/messages/[phone]/route.ts`, `src/app/api/traces/[id]/route.ts`, `src/app/api/traces/route.ts`, `src/components/MessageFeedbackButtons.tsx`, `src/components/MessageBubble.tsx`, `src/components/TracesClient.tsx`, `supabase/migrations/20260523110000_create_message_feedback.sql`
  - Confiança: alta

## 2026-05-23

### feat
- Melhorado o tratamento de upload de mídia para arquivos de áudio e vídeo enviados como documentos pelo WhatsApp Business, diferenciando CSV de mídias por extensão e MIME, e encaminhando corretamente para upload no financeiro.
- Alterado fluxo de upload de mídia para usar Supabase Storage, evitando limite de tamanho do Vercel serverless, e enviando URL público para o financeiro registrar a gravação.
- Ajustada lógica de timeout e formato do corpo da requisição para registro da mídia no financeiro.
  - Arquivos: `src/app/api/webhook/route.ts`, `src/lib/financeiro-bridge.ts`
  - Confiança: alta

## 2026-05-22

### feat
- Expandido o suporte da integração financeiro para encaminhar mensagens de texto, documentos CSV, áudios e vídeos recebidos via WhatsApp Business para o agente financeiro. Adicionado processamento específico para importação de CSVs (Wise e Revolut) e upload de mídia para gravações de reuniões.
- Implementadas funções auxiliares para detectar o provedor do CSV, enviar arquivos CSV e mídias para o backend financeiro via API multipart com timeout configurado.
- Introduzido modo silencioso para o bridge financeiro que permite persistir conversas sem enviar respostas via WhatsApp, útil para comandos fire-and-forget.
  - Arquivos: `src/app/api/webhook/route.ts`, `src/lib/financeiro-bridge.ts`
  - Confiança: alta

## 2026-05-22

### docs
- Corrigido erro de digitação na seção "Common Issues" do arquivo `CLAUDE.md`
  - Arquivos: `CLAUDE.md`
  - Confiança: alta

## 2026-05-22

### feat
- Implementada resolução canônica de telefone para unificação das conversas no módulo financeiro, permitindo que mensagens e respostas sejam roteadas para um número principal mesmo quando originadas de aliases alternativos configurados via variável de ambiente `FINANCEIRO_REPLY_TO`.
- Ajustada lógica de envio de respostas financeiras para redirecionar mensagens ao número alternativo configurado, evitando autoenvio proibido pela Meta Cloud API.
- Atualizada função de verificação de proprietário financeiro para considerar também o número alternativo e garantir que interações via alias passem na validação.
  - Arquivos: `src/lib/financeiro-bridge.ts`, `src/app/api/webhook/route.ts`, `src/flows/chatbotFlow.ts`
  - Confiança: alta

## 2026-05-22

### fix
- Ajustado formato de log de erro na função `sendTextMessage` para melhorar legibilidade do JSON registrado
  - Arquivos: `src/lib/meta.ts`
  - Evidência: alteração no console.error para usar JSON.stringify com indentação
  - Confiança: alta

## 2026-05-22

### fix
- Melhorado tratamento e log de erros na função de envio de mensagens via Meta API para detalhar códigos e mensagens de erro da resposta HTTP
  - Arquivos: `src/lib/meta.ts`
  - Evidência: adição de captura e formatação detalhada de erros Axios na função `sendTextMessage`
  - Confiança: alta

## 2026-05-22

### feat
- Implementado roteamento de mensagens de eco de auto-chat para o agente financeiro, encaminhando textos do proprietário para processamento específico
  - Arquivos: `src/app/api/webhook/route.ts`
  - Confiança: alta

## 2026-05-22

### docs
- Atualizada orientação para esclarecer a revisão de problemas comuns no arquivo CLAUDE.md
  - Arquivos: `CLAUDE.md`
  - Confiança: alta

## 2026-05-22

### feat
- Implementado roteamento de mensagens de números autorizados para o agente financeiro externo, com suporte a mensagens de texto e respostas interativas via botões. Mensagens de mídia não suportadas recebem aviso ao usuário.
- Adicionada ponte financeira no fluxo principal do chatbot para interceptar e encaminhar mensagens específicas, evitando processamento padrão.
  - Arquivos: `src/flows/chatbotFlow.ts`, `src/lib/financeiro-bridge.ts`
  - Confiança: alta

### chore
- Removidos documentos extensos relacionados ao deploy e checklist iOS, incluindo guias de implantação, checklist de implementação, guia detalhado de iOS e documentação de App Store Connect.
  - Arquivos removidos: `docs/app/DEPLOY.md`, `docs/ios/IOS_CHECKLIST.md`, `docs/ios/IOS_IMPLEMENTATION_GUIDE.md`
  - Confiança: alta

## 2026-05-20

### refactor
- Melhorado tratamento de erros e lógica de atualização do template na função `submitTemplate` do hook `useTemplates`. Agora erros detalhados da API são exibidos e a atualização do estado ocorre somente com template válido.
- Atualizada nomenclatura e mensagens relacionadas ao ID da conta WhatsApp Business (WABA ID) no formulário de templates para maior clareza.
- Ajustes na exibição de mensagens de erro na submissão de templates na página de templates.
  - Arquivos: `src/hooks/useTemplates.ts`, `src/components/templates/TemplateForm.tsx`, `src/app/dashboard/templates/page.tsx`
  - Confiança: alta

## 2026-05-14

### docs
- Atualizada descrição do projeto no README para incluir informação da versão V3
  - Arquivos: `README.md`
  - Confiança: alta

## 2026-05-14

### feat
- Ajustado o limite máximo de comprimento de mensagens para 600 caracteres visando melhor experiência no WhatsApp, abaixo do limite técnico de 4096 caracteres.
- Melhorada a lógica de divisão e agrupamento de mensagens longas, quebrando primeiro por sentenças e, se necessário, por palavras para preservar a legibilidade.
  - Arquivos: `src/nodes/formatResponse.ts`
  - Confiança: alta

## 2026-05-14

### feat
- Implementado reranker LLM para RAG que reordena e filtra resultados da busca vetorial, melhorando a relevância dos trechos retornados. O reranker usa um modelo leve para selecionar os top-K mais úteis entre um pool maior inicial, com fallback seguro para busca por cosseno em caso de erro.
- Integrado reranker no fluxo principal de chatbot e na obtenção do contexto RAG, ativado via parâmetro `clientConfig` com configurações de modelo e telefone.
  - Arquivos: `src/lib/rerank.ts`, `src/nodes/getRAGContext.ts`, `src/flows/chatbotFlow.ts`
  - Confiança: alta

## 2026-05-14

### feat
- Melhorada geração de respostas da IA com regras específicas de formatação para mensagens WhatsApp, incluindo limite de caracteres por mensagem, quebra em múltiplas mensagens, e proibição de markdown para melhor legibilidade no app móvel.
- Aprimorado tratamento do contexto RAG para evitar cópia literal de documentos, usando instruções negativas explícitas para que a IA reformule e resuma informações, além de remover cabeçalhos de documentos que induziam à repetição literal.
- Otimizado prompt para maximizar cache do OpenAI, organizando mensagens system em blocos estáveis e variáveis para reduzir tokens processados em chamadas subsequentes.
- Ajustado nível de esforço de raciocínio automático para "medium" quando há contexto RAG, melhorando síntese e relevância das respostas geradas.
  - Arquivos: `src/nodes/generateAIResponse.ts`, `src/nodes/getRAGContext.ts`
  - Confiança: alta

## 2026-05-14

### feat
- Adicionado suporte para cache de tokens de entrada no cliente Direct AI e no sistema de tracking, incluindo registro da taxa de acerto do cache no console
  - Arquivos: `src/lib/direct-ai-client.ts`, `src/lib/direct-ai-tracking.ts`
  - Confiança: alta

## 2026-05-14

### feat
- Atualizado cliente Direct AI para usar a API Responses da OpenAI, removendo a função legada de chat completions; mantém uso da API de chat completions para Groq
  - Arquivos: `src/lib/direct-ai-client.ts`, `src/lib/openai.ts`
  - Confiança: alta

## 2026-05-14

### feat
- Implementado endpoint PATCH em `/api/assistant/feedback` para atualização de registros de feedback, permitindo alterar tipo e observações.
- Melhorada resposta do endpoint GET `/api/assistant/feedback` para super administradores, retornando feedbacks de todos os clientes com o nome do cliente incluído.
- Adaptado dashboard de feedback para exibir coluna "Cliente" apenas para super administradores.
- Atualizados botões de feedback para suportar alteração de feedback já enviado via PATCH, com melhor usabilidade e controle de estado.
  - Arquivos: `src/app/api/assistant/feedback/route.ts`, `src/components/assistant/AssistantFeedbackDashboard.tsx`, `src/components/assistant/AssistantMessage.tsx`
  - Confiança: alta

## 2026-05-14

### feat
- Adicionados componentes do assistente de IA para WhatsApp, incluindo interface, input, mensagens e abas de conversação.
- Implementada nova API para chat, conversas e feedback do assistente de IA.
- Criado esquema e migrações para tabelas relacionadas ao assistente e feedback no banco de dados.
- Atualizadas dependências para suportar markdown com extensões GFM e melhorias no parsing de markdown.
- Incluídas páginas e layout no dashboard para gerenciamento do assistente de IA e observabilidade.
  - Arquivos: `src/app/api/assistant/chat/route.ts`, `src/app/api/assistant/conversations/[id]/route.ts`, `src/app/api/assistant/conversations/route.ts`, `src/app/api/assistant/feedback/route.ts`, `src/app/dashboard/assistant/page.tsx`, `src/components/assistant/AssistantInterface.tsx`, `src/components/assistant/AssistantMessage.tsx`, `src/components/assistant/AssistantInput.tsx`, `src/components/assistant/ConversationTabs.tsx`, `src/lib/assistant-schema.ts`, `src/lib/assistant-prompt.ts`, `migrations/20260514_add_assistant_tables.sql`, `migrations/20260514000001_add_assistant_feedback.sql`, `migrations/20260514000002_add_feedback_observations.sql`
  - Confiança: alta

## 2026-05-14

### feat
- Adicionado proxy via Cloudflare Worker para Supabase, permitindo contornar problemas de resolução DNS em clientes finais ao usar o domínio `supabase.uzzai.com.br` em vez de `*.supabase.co`. O proxy suporta REST, Auth, Realtime (WebSocket) e Storage, mantendo transparência no tráfego e preservando headers e métodos.
- Atualizado `next.config.js` para permitir carregamento de imagens do Storage via novo domínio customizado.
- Configurada variável de ambiente `NEXT_PUBLIC_SUPABASE_URL` para apontar para o proxy em todos os ambientes, sem alteração nas chaves de autenticação.
- Documentação detalhada adicionada em `docs/setup/CLOUDFLARE_SUPABASE_PROXY.md` explicando o problema, solução, arquitetura, setup e validação do proxy.
  - Arquivos: `docs/setup/CLOUDFLARE_SUPABASE_PROXY.md`, `next.config.js`
  - Confiança: alta

## 2026-05-14

### refactor
- Refatorada documentação e código para integração do UzzApp com Stripe e isolamento multi-tenant, incluindo atualização de URLs base para produção, padronização de formatação TypeScript, melhorias na segurança (HMAC, rate limiting), e detalhamento dos fluxos principais e integrações.
- Atualizadas descrições, exemplos e tabelas em 36 arquivos de documentação e runbooks para refletir a arquitetura atualizada, reforçando práticas críticas como uso do Supabase client em serverless, tokens Vault por cliente, e workflows de webhooks Meta, Stripe e outros serviços.
- Melhorias no código do webhook, handlers, integração com Meta WhatsApp API, Stripe Connect, Google/Microsoft Calendar OAuth, Firebase push, e sistema de notificações, com padronização de sintaxe, tratamento de erros e segurança.
- Atualizados scripts, comandos, variáveis de ambiente e exemplos para uso correto do domínio `https://uzzap.uzzai.com` em vez do antigo `chat.luisfboff.com`.
- Documentação detalhada sobre limites de rate limiting, deduplicação, segurança, fallback e monitoramento para webhooks e serviços externos.
- Ajustes em exemplos de payloads JSON, diagramas de sequência, e workflows para refletir a nova arquitetura multi-tenant e integração Stripe Connect.
  - Arquivos: `docs/*.md`, `checkpoints/2026-02-19_chatbot-oficial/*`, `checkpoints/2026-03-15_chatbot-oficial/*`, `src/app/api/webhook/[clientId]/route.ts`, `src/lib/meta.ts`, `src/nodes/*`, `src/handlers/*`
  - Confiança: alta

## 2026-05-14

### feat
- Adicionado padrão remoto para imagens do domínio `supabase.uzzai.com.br` na configuração do Next.js
  - Arquivos: `next.config.js`
  - Confiança: alta

## 2026-05-11

### feat
- Melhorada a conversão de dados numéricos na função `listQualityDailyReports` para tratar valores nulos ou indefinidos como `null`, evitando conversões inválidas
  - Arquivos: `src/lib/quality-daily-report.ts`
  - Confiança: alta

## 2026-05-11

### feat
- Adicionado script de verificação de tipos TypeScript (`typecheck`) e melhorado cache para build incremental no workflow de CI
  - Arquivos: `.github/workflows/ci.yml`, `package.json`
  - Confiança: alta

## 2026-05-11

### fix
- Adicionado variável de ambiente NODE_OPTIONS para aumentar memória no processo de checagem de tipos TypeScript no CI
  - Arquivos: `.github/workflows/ci.yml`
  - Evidência: inclusão de `NODE_OPTIONS: --max-old-space-size=6144` na etapa de type check
  - Confiança: alta

## 2026-05-11

### feat
- Adicionada página de Observabilidade com navegação por abas para visualização integrada de traces, avaliações, ground truth e suporte/bugs
  - Arquivos: `src/app/dashboard/observability/page.tsx`, `src/components/DashboardNavigation.tsx`
  - Confiança: alta

## 2026-05-10

### feat
- Implementada visualização detalhada de contato com edição de nome, status de atendimento e controle de privacidade para salvar histórico de mensagens. Adicionado diálogo modal para detalhes do contato com informações de criação e atualização, além de perfil coletado pelo bot.
- Remodelada interface do componente `ContactsClient` com nova toolbar, filtro por status via abas, tabela de contatos com seleção múltipla, ações em lote para exclusão de histórico, e melhorias na usabilidade e layout responsivo.
- Adicionados botões para alternar modo de seleção, importar contatos via CSV e adicionar novo contato diretamente na interface principal.
- Arquivos: `src/components/ContactsClient.tsx`
- Confiança: alta

## 2026-05-10

### refactor
- Simplificada a lógica de renderização do layout no `DashboardLayoutClient` para ajustar tratamento de rotas, removendo `contacts` das rotas full-screen e adicionando às rotas fluid com sidebar.
- Ajustada estrutura e estilos do componente `ContactsClient` para remover botões redundantes e simplificar o header da lista de contatos.
  - Arquivos: `src/components/DashboardLayoutClient.tsx`, `src/components/ContactsClient.tsx`
  - Confiança: alta

## 2026-05-10

### feat
- Implementado recurso de silenciamento de contato para evitar persistência de mensagens, pausando o bot e bloqueando o salvamento do histórico quando `metadata.save_history` está falso.
- Adicionada opção no frontend para ativar/desativar o salvamento de mensagens por contato com feedback visual e rollback em caso de erro.
- Atualizado endpoint PATCH de contato para suportar campo `save_history` e armazenar essa preferência no banco.
- Modificada lógica do chatbot para respeitar o silenciamento, evitando salvar mensagens e responder contatos silenciados.
- Criada função utilitária `isContactSilenced` para verificar status de silenciamento no banco.
- Ajustada tipagem para incluir `save_history` em metadata de contato.
  - Arquivos: `src/app/api/contacts/[phone]/route.ts`, `src/app/api/webhook/route.ts`, `src/components/ContactsClient.tsx`, `src/flows/chatbotFlow.ts`, `src/hooks/useContacts.ts`, `src/lib/contact-privacy.ts`, `src/lib/types.ts`, `src/nodes/checkHumanHandoffStatus.ts`, `src/nodes/saveChatMessage.ts`
  - Confiança: alta

## 2026-05-07

### feat
- Atualizado o tratamento de tokens na integração com o SDK de IA para suportar formatos antigos e novos, garantindo compatibilidade retroativa
  - Arquivos: `src/lib/direct-ai-client.ts`
  - Confiança: alta

### refactor
- Ajustadas classes CSS para cores de fundo, borda e texto dos papéis nas mensagens, melhorando contraste e suporte a temas claro e escuro no componente `TracesClient`
  - Arquivos: `src/components/TracesClient.tsx`
  - Confiança: alta

### chore
- Atualizada dependência `caniuse-lite` para versão mais recente via override no `pnpm` para manter dados de compatibilidade atualizados
  - Arquivos: `package.json`, `pnpm-lock.yaml`
  - Confiança: alta

## 2026-05-07

### feat
- Adicionado snapshot detalhado e fiel do payload enviado ao LLM, incluindo mensagens, ferramentas, configurações e totais, para melhorar a análise e reprodução das chamadas AI no dashboard de qualidade.
- Implementado suporte para exibição do raciocínio (chain-of-thought) fornecido por alguns provedores AI, com contagem de tokens e visualização dedicada na aba de prompt.
- Atualizada interface e tipos para incluir o snapshot da requisição e o raciocínio bruto na resposta AI.
- Adaptado componente `PromptTab` para suportar visualização do snapshot completo, raciocínio, chamadas de ferramentas e resposta final, mantendo fallback para traces legados.
- Captura do snapshot e raciocínio integrada na função principal de chamada AI (`callDirectAI`) e no fluxo do chatbot.
  - Arquivos: `src/components/TracesClient.tsx`, `src/flows/chatbotFlow.ts`, `src/lib/direct-ai-client.ts`, `src/lib/types.ts`, `src/nodes/generateAIResponse.ts`
  - Confiança: alta

## 2026-05-07

### fix
- Removida regra obrigatória de cadastro do prompt do agente principal para otimizar o fluxo de mensagens e reduzir o tamanho do prompt
- A orientação para coleta de dados cadastrais foi mantida apenas na descrição da tool `registrar_dado_cadastral` em `src/lib/agent-tools.ts`
  - Arquivos: `src/nodes/generateAIResponse.ts`
  - Evidência: remoção do bloco de instruções no system prompt e comentário explicativo no código
  - Confiança: alta
```

## 2026-05-07

### docs
- Adicionada documentação completa do fluxo visual da arquitetura do chatbot, detalhando agentes LLM, nodes do pipeline, sistema de tools, conexões externas, tabelas do Supabase e sequência de processamento.
  - Arquivos: `docs/ARQUITETURA_FLUXO_VISUAL.md`
  - Confiança: alta

### refactor
- Desativado globalmente o node 9.5 Fast Track Router no fluxo principal, mantendo código comentado para possível reativação futura.
  - Arquivos: `src/flows/chatbotFlow.ts`
  - Confiança: alta

### fix
- Ajustado `formatResponse.ts` para remover vazamento de chamadas de tools no texto da IA, eliminando blocos JSON com chaves de argumentos de tools conhecidas e frases narrativas inventadas que indicam execução de tools.
  - Arquivos: `src/nodes/formatResponse.ts`
  - Evidência: regex para remover JSON com chaves específicas e filtro de linhas com frases típicas de narração de tool calls
  - Confiança: alta

### refactor
- Simplificada função `generateAIResponse` removendo constantes legadas de definição de tools e código morto relacionado a tools no formato antigo; agora usa exclusivamente `buildAllowedTools` para montar tools ativas.
- Adicionada regra crítica no prompt do sistema para impedir que o modelo escreva JSON ou descreva chamadas de tools no texto, evitando vazamentos.
- Removida duplicação do helper `checkSlotsAreFilled` e constantes legadas, reduzindo complexidade e dívida técnica.
  - Arquivos: `src/nodes/generateAIResponse.ts`
  - Confiança: alta

## 2026-05-06

### fix
- Otimizado o formato do prompt do sistema para incluir instruções obrigatórias explícitas de saudação e fallback, garantindo que sejam usadas exatamente como configuradas. Ajustado o agrupamento e formatação das regras e estilo do prompt para maior clareza e consistência.
- Arquivos: `src/lib/prompt-builder.ts`
- Evidência: inclusão de tags XML específicas para greeting e fallback com texto obrigatório, remoção de regras duplicadas e reformatação do código.
- Confiança: alta

## 2026-05-06

### feat
- Adicionado widget de supervisão assistida no DashboardClient para análise de traces com sugestões automáticas de qualidade e interface para feedback humano.
- Implementada lógica heurística para avaliação automática da qualidade das respostas do bot, incluindo status, latência, erros em tool calls e custo.
- Incluído componente TracesWidget com controles para envio de feedback humano sobre a qualidade das respostas, permitindo marcação como correta, incorreta ou parcial, com opção de correção e promoção para ground truth.
- Melhorado layout do DashboardClient para suportar a exibição do novo widget em grid responsivo.
  - Arquivos: `src/components/DashboardClient.tsx`, `src/components/TracesClient.tsx`
  - Confiança: alta

## 2026-05-06

### fix
- Atualizada a versão do pacote `baseline-browser-mapping` para 2.10.27 e simplificado o input do ID do número de telefone Meta para usar apenas `meta_phone_number_id`
  - Arquivos: `package.json`, `src/app/dashboard/settings/page.tsx`
  - Evidência: atualização da dependência no `package.json` e remoção da fallback para `phone_number_id` no componente React
  - Confiança: alta

## 2026-05-06

### fix
- Atualizada versão do pacote `baseline-browser-mapping` para 2.10.27 no lockfile para corrigir dependências.
- Melhorias no componente `TemplateForm` para usar consistentemente o termo "Meta Phone Number ID (Meta ID)" em vez de "WABA ID", incluindo fetch automático do Meta ID, validação e exibição no formulário.
- Ajustes na interface da página de configurações para sempre exibir o Meta Phone Number ID (Meta ID) de forma legível e acessível.
- Simplificação e correção na exibição do status do número WhatsApp na Meta, removendo detalhes redundantes e mensagens de permissão.
  - Arquivos: `pnpm-lock.yaml`, `src/components/templates/TemplateForm.tsx`, `src/app/dashboard/settings/page.tsx`
  - Evidência: commit e diff indicam atualização de dependência e refatoração do formulário e página de configurações para uso correto do Meta ID.
  - Confiança: alta

## 2026-05-06

### feat
- Adicionado estado `metaId` e lógica inicial para busca do ID do WABA no formulário de templates
  - Arquivos: `src/components/templates/TemplateForm.tsx`
  - Confiança: alta

## 2026-05-01

### feat
- Atualizado o dedupeKey dos triggers de inatividade para incluir a data atual, evitando múltiplos eventos duplicados no mesmo dia.
- Ajustado filtro de status para considerar falhas recentes como duplicatas em triggers de inatividade, reduzindo spam de chamadas à API Meta.
  - Arquivos: `src/lib/crm-automation-engine.ts`, `src/lib/jobs/inactivity-check.ts`
  - Confiança: alta

## 2026-05-01

### feat
- Melhorada a detecção e tratamento de erros da API Meta WhatsApp com verificação adicional de subcódigo de erro para casos específicos de token e escopo
  - Arquivos: `src/app/api/client/whatsapp-health/route.ts`
  - Confiança: alta

## 2026-05-01

### feat
- Melhorado o tratamento de erros nas APIs WABA e Phone ID, com logs detalhados e mensagens específicas para códigos de erro comuns como token expirado e falta de permissão
  - Arquivos: `src/app/api/client/whatsapp-health/route.ts`
  - Confiança: alta

## 2026-05-01

### feat
- Passa a salvar mensagens recebidas mesmo quando o chatbot está pausado, garantindo que as mensagens apareçam na visualização da conversa
  - Arquivos: `src/flows/chatbotFlow.ts`
  - Confiança: alta

### refactor
- Pequeno ajuste na renderização da qualidade do status do telefone para melhorar legibilidade do código
  - Arquivos: `src/app/dashboard/settings/page.tsx`
  - Confiança: alta

## 2026-05-01

### feat
- Melhorada a exibição do status do telefone no dashboard, incluindo tratamento para a qualidade "UNKNOWN" e ajuste das cores para diferentes ratings
  - Arquivos: `src/app/dashboard/settings/page.tsx`
  - Confiança: alta

## 2026-05-01

### feat
- Melhorada a recuperação de metadados do WhatsApp para considerar o campo `whatsapp_business_account_id` além de `meta_waba_id`, ampliando a compatibilidade na consulta à API da Meta.
- Ajustado o tratamento de erros para tokens sem permissão `whatsapp_business_management`, exibindo mensagem informativa no dashboard em vez de erro crítico.
- Atualizada a interface do dashboard para diferenciar visualmente erros por falta de permissão de leitura de metadados, usando indicador amarelo e mensagem específica.
  - Arquivos: `src/app/api/client/whatsapp-health/route.ts`, `src/app/dashboard/settings/page.tsx`
  - Confiança: alta

## 2026-05-01

### feat
- Melhorada a recuperação do status do telefone no endpoint de saúde do WhatsApp, adicionando suporte para consulta via WABA (WhatsApp Business Account) com fallback para consulta direta pelo ID do número
  - Arquivos: `src/app/api/client/whatsapp-health/route.ts`
  - Confiança: alta

## 2026-05-01

### feat
- Adicionado endpoint API para health check do WhatsApp que retorna status do número, último webhook recebido e erros relacionados à autenticação e Meta API.
- Integrado health check do WhatsApp na página de configurações do dashboard, com botão para consulta em tempo real e exibição detalhada do status do número e último webhook.
  - Arquivos: `src/app/api/client/whatsapp-health/route.ts`, `src/app/dashboard/settings/page.tsx`
  - Confiança: alta

## 2026-05-01

### feat
- Adicionado endpoint GET `/api/digest/whatsapp/contacts` para listar contatos de WhatsApp com interação recente, usado pelo app financeiro para exclusão no digest diário. Implementa autenticação via token e filtro por período (padrão 90 dias, máximo 365).
  - Arquivos: `src/app/api/digest/whatsapp/contacts/route.ts`
  - Confiança: alta

## 2026-05-01

### feat
- Implementado endpoint API `/api/digest/whatsapp` para buscar conversas e mensagens filtradas por intervalo de datas, autenticado via token Bearer. O endpoint retorna dados compactos com mensagens truncadas e estatísticas resumidas por contato.
  - Arquivos: `src/app/api/digest/whatsapp/route.ts`
  - Confiança: alta

## 2026-04-30

### chore
- Atualizado `.gitignore` para ignorar diretórios `.data` e `tmp`, e removidos arquivos temporários não utilizados na pasta `tmp`
  - Arquivos: `.gitignore`, `tmp/calendar_changes_before_pull.patch`, `tmp/fix-sports-prompt.js`, `tmp/pdfs/uzzapp-app-summary-preview.png`, `tmp/pdfs/uzzapp-app-summary.html`, `tmp/public_data_dump_2026_04_14.sql`
  - Confiança: alta

## 2026-04-30

### chore
- Removidos scripts e arquivos obsoletos relacionados a AI Gateway Fallback, verificação de webhook, rastreamento de documentos e conversão XLSX para CSV, incluindo PowerShell, Bash, TypeScript e JavaScript.
- Excluída documentação e bases de dados antigas de componentes visuais e contatos, além de assets e scripts auxiliares que não são mais necessários para a arquitetura atual.
  - Arquivos removidos: múltiplos em `component-database/`, `data/contacts/umana/CSVs/`, `resources/`, `scripts/` (ex: `scripts/xlsx-to-csv.js`, `scripts/export-database-schema.js`, `scripts/analyze_supabase.py`, entre outros)
- Evidência: Exclusão massiva de arquivos e pastas indicam limpeza e descontinuação de funcionalidades antigas.
- Confiança: alta

## 2026-04-30

### feat
- Adicionado sistema de diagnóstico com página interativa que executa testes automáticos de conectividade e autenticação, exibindo resultados e permitindo cópia do relatório em JSON.
- Implementada API para receber e registrar logs dos relatórios de diagnóstico enviados pelo cliente.
- Criado endpoint de health check simples para monitoramento do serviço.
  - Arquivos: `src/app/diagnostico/page.tsx`, `src/app/api/diagnostico/log/route.ts`, `src/app/api/health/route.ts`
  - Confiança: alta

## 2026-04-30

### feat
- Implementada geração automática de slugs únicos para colunas do CRM, evitando conflitos por nomes semelhantes; aprimorada a exibição de erros no diálogo de criação de colunas com notificações toast.
- Ajustado endpoint API para criar colunas com slug único baseado no nome, considerando colunas já existentes do cliente.
- Melhorado feedback ao usuário no componente `CreateColumnDialog` para exibir mensagens claras em caso de falha na criação.
  - Arquivos: `src/app/api/crm/columns/route.ts`, `src/components/crm/CreateColumnDialog.tsx`, `src/hooks/useCRMColumns.ts`
  - Confiança: alta

## 2026-04-30

### feat
- Adicionado campo de entrada para Meta Phone Number ID na página de configurações do dashboard, permitindo configurar este valor via UI.
  - Arquivos: `src/app/dashboard/settings/page.tsx`
  - Confiança: alta

### docs
- Atualizada documentação principal (`README.md`) com nova estrutura, detalhes do stack, arquitetura, quick start, operação, organização de pastas e scripts operacionais.
- Adicionados arquivos de documentação e guias para scripts, apresentações comerciais, macroprocessos e migração.
- Documentação de scripts operacionais atualizada para refletir comandos npm e localização correta dos scripts.
- Criados arquivos README em pastas de assets de branding e dados de contatos explicando uso e organização.
  - Arquivos: `README.md`, `docs/MACROPROCESSOS-UZZAPP.md`, `docs/presentations/README.md`, `assets/branding/README.md`, `data/contacts/README.md`, `scripts/README.md`
  - Confiança: alta

### refactor
- Melhorias visuais e estruturais no painel de automações CRM:
  - Ajustes no layout e scroll para melhor usabilidade e responsividade.
  - Correção de espaçamentos, classes CSS e organização dos componentes.
  - Ajustes em diálogos de edição/criação de regras, incluindo scroll interno e organização dos campos.
  - Atualização do componente KanbanCard para melhor controle de overflow e usabilidade do menu dropdown.
  - Arquivos: `src/components/crm/AutomationRulesPanel.tsx`, `src/components/crm/KanbanCard.tsx`, `src/app/dashboard/crm/page.tsx`
  - Confiança: alta

## 2026-04-30

### feat
- Migrado o formato dos prompts do agente para uso de tags XML em vez de markdown, seguindo práticas recomendadas para modelos GPT-5. Essa mudança melhora a fidelidade no seguimento das instruções e permite cache eficiente de prompts.
- Atualizado prompt padrão do sistema para utilizar tags XML, alinhando com o novo formato.
- Ajustes nos testes unitários para validar a presença das tags XML nos prompts gerados.
  - Arquivos: `src/lib/prompt-builder.ts`, `src/nodes/generateAIResponse.ts`, `tests/unit/prompt-builder.test.ts`
  - Confiança: alta

## 2026-04-28

### feat
- Melhorada a tipagem de `contactMetadata` na requisição POST para maior segurança de tipos
  - Arquivos: `src/app/api/agents/[id]/test/route.ts`
  - Confiança: alta

## 2026-04-28

### feat
- Implementado suporte para exibição de anexos (imagens, PDFs e outros arquivos) nas mensagens do chat de teste do agente no modal AgentEditorModal.
- No endpoint de teste do agente, adicionada execução segura de chamadas a ferramentas de leitura (ex: buscar_documento) para pré-visualização de documentos e anexos, incluindo coleta de metadados reais do cliente para contexto mais fiel.
- Alterações incluem captura e retorno de anexos e resultados das ferramentas executadas no JSON de resposta da API de teste.
  - Arquivos: `src/app/api/agents/[id]/test/route.ts`, `src/components/agents/AgentEditorModal.tsx`
  - Confiança: alta

## 2026-04-28

### feat
- Adicionados os props `ragChunks` e `toolCallNames` no `AgentEditorModal` para melhorar a visualização dos testes de agentes, incluindo pré-visualização detalhada dos chunks RAG com similaridade e nomes das chamadas de ferramentas usadas.
- Implementada extração e formatação dos chunks RAG e nomes das tool calls na API de teste de agentes para fornecer dados enriquecidos ao modal de edição.
- Incluídos tooltips no modal para exibir detalhes dos chunks RAG e das ferramentas chamadas durante o teste, melhorando a usabilidade e transparência das informações.
  - Arquivos: `src/app/api/agents/[id]/test/route.ts`, `src/components/agents/AgentEditorModal.tsx`
  - Confiança: alta

## 2026-04-28

### feat
- Atualizada a implementação do tooltip no `AgentEditorModal` para melhorar a orientação ao usuário, incluindo o uso de `TooltipProvider` com delay configurado
  - Arquivos: `src/components/agents/AgentEditorModal.tsx`
  - Confiança: alta

## 2026-04-28

### feat
- Aprimorada funcionalidade de teste de agentes para simular fluxo completo de produção, incluindo uso de configuração real do cliente, prompts compilados, histórico de conversa real ou em-modal, contexto RAG e ferramentas habilitadas.
- Adicionado suporte para seleção de conversa real para carregar histórico completo no teste, além de exibir metadados detalhados da última resposta (modelo usado, latência, uso de RAG e ferramentas).
- Interface do modal de edição de agentes atualizada com seletor de histórico de conversa, indicadores de recursos ativos (tools, RAG, handoff) e painel de metadados da resposta.
- Implementado tratamento aprimorado de erros com mensagens específicas em português para falhas comuns de API key, limite de requisições e modelo não encontrado.
  - Arquivos: `src/app/api/agents/[id]/test/route.ts`, `src/components/agents/AgentEditorModal.tsx`
  - Confiança: alta

## 2026-04-28

### feat
- Adicionado componente `ModelTestResultCard` para exibir feedback detalhado e categorizado dos testes de modelos no editor de agentes, com mensagens de erro explicativas e detalhes técnicos opcionais.
- Melhorada a API de teste de modelos (`src/app/api/client/test-model/route.ts`) para identificar e categorizar erros comuns (credenciais ausentes, chave inválida, modelo não encontrado, acesso negado, parâmetros incompatíveis, limites de contexto, quota, rate limit, erros de rede e do provider), retornando respostas JSON mais informativas para o frontend.
- Integrado o novo componente de resultado ao modal de edição de agentes para mostrar feedback visual aprimorado e mensagens de toast mais claras.
  - Arquivos: `src/app/api/client/test-model/route.ts`, `src/components/agents/AgentEditorModal.tsx`
  - Confiança: alta

## 2026-04-28

### feat
- Adicionada funcionalidade de teste de conectividade para modelos OpenAI e Groq no modal de edição de agentes, com feedback visual de sucesso, falha, latência e resposta.
- Incluídos botões para disparar o teste e mensagens toast para informar o status da operação.
  - Arquivos: `src/components/agents/AgentEditorModal.tsx`
  - Confiança: alta

## 2026-04-28

### feat
- Adicionada interface de preços dos modelos OpenAI no editor de agentes, exibindo valores de input, input em cache e output por 1M tokens com tooltip explicativo e links para tabela oficial
  - Arquivos: `src/components/agents/AgentEditorModal.tsx`, `src/lib/openai-pricing.ts`
  - Confiança: alta

## 2026-04-28

### feat
- Adicionados novos modelos OpenAI da série GPT-5.x e variantes ao sistema, incluindo GPT-5.5, GPT-5.4, GPT-5.2, GPT-5.1, e suas versões Pro, Mini e Nano, além do modelo legado "o3".
- Atualizada a lógica de raciocínio (reasoning) no cliente Direct AI para suportar os novos modelos, com regras específicas para níveis de esforço de raciocínio aceitos por cada modelo.
- Implementado controle de orçamento mínimo de tokens de saída para modelos com raciocínio, prevenindo respostas vazias ao ajustar automaticamente `maxTokens` quando necessário.
- Adicionada detecção e tratamento de cenários onde o modelo consome todo o orçamento de tokens em raciocínio sem gerar saída visível, lançando erro para evitar respostas vazias.
- Atualizadas interfaces de seleção de modelos no editor de agentes e propriedades de geração de resposta para incluir os novos modelos e suas descrições detalhadas.
  - Arquivos: `src/lib/direct-ai-client.ts`, `src/components/agents/AgentEditor.tsx`, `src/components/agents/AgentEditorModal.tsx`, `src/components/flow-architecture/properties/GenerateResponseProperties.tsx`, `src/components/FlowArchitectureManager.tsx`
  - Confiança: alta

## 2026-04-28

### feat
- Adicionados novos modelos OpenAI ("gpt-5.4-nano", "gpt-5-nano") e expandidas opções de esforço de raciocínio para agentes (incluindo "none", "minimal" e "xhigh").
- Atualizada interface e componentes para suportar seleção dos novos modelos e níveis de raciocínio no editor de agentes e propriedades de geração de resposta.
- Melhorias no componente FlowArchitectureManager para visualização e edição dos nodes do fluxo, incluindo organização e ordenação aprimorada dos campos de configuração, suporte a múltiplos tipos de dados, e refinamento da renderização do diagrama Mermaid com rotas de bypass.
- Ajustes no layout e usabilidade do editor de agentes, incluindo seleção de fuso horário e configuração de horário comercial.
- Atualização da constraint no banco de dados para permitir os novos valores de esforço de raciocínio na tabela `agents`.
  - Arquivos: `src/components/agents/AgentEditor.tsx`, `src/components/agents/AgentEditorModal.tsx`, `src/components/flow-architecture/properties/GenerateResponseProperties.tsx`, `src/components/FlowArchitectureManager.tsx`, `src/lib/direct-ai-client.ts`, `src/lib/types.ts`, `supabase/migrations/20260428000000_add_new_openai_models_reasoning.sql`
  - Confiança: alta

## 2026-04-28

### feat
- Implementada página de configurações com interface em abas para gerenciamento de perfil, WhatsApp, preferências, suporte e configurações avançadas.
- Adicionado componente de busca com sugestão para navegação rápida entre abas.
- Criados componentes React para sidebar, tabs, seções e campos de formulário com temas claro e escuro.
- Incluída funcionalidade para edição de perfil, alteração de senha, gerenciamento de credenciais (Meta, OpenAI), e desconexão do WhatsApp.
- Adicionado design canvas interativo para prototipagem visual e organização de seções e artboards com suporte a drag-and-drop, foco e zoom.
- Incluído pacote de ícones customizados para uso na interface.
- Adicionados estilos CSS para temas, botões, inputs, cards e elementos da interface.
- Documentação inicial do projeto UzzApp com instruções para implementação do design.
  - Arquivos: `src/app/dashboard/settings/page.tsx`, `docs/uzzapp/project/Settings.html`, `docs/uzzapp/project/design-canvas.jsx`, `docs/uzzapp/project/icons.jsx`, `docs/uzzapp/project/sections.jsx`, `docs/uzzapp/project/styles.css`, `docs/uzzapp/project/uzz-sidebar.jsx`, `docs/uzzapp/project/var-a-sidebar.jsx`, `docs/uzzapp/project/var-b-tabs.jsx`, `docs/uzzapp/README.md`
- Confiança: alta

## 2026-04-27

### fix
- Atualizadas referências das colunas nos componentes `CRMPage` e `KanbanBoard` para corrigir inconsistências no uso das props `columns` e `allColumns`.
  - Arquivos: `src/app/dashboard/crm/page.tsx`, `src/components/crm/KanbanBoard.tsx`
  - Evidência: ajuste direto nas props passadas e uso condicional de `allColumns` no KanbanBoard
  - Confiança: alta

## 2026-04-27

### feat
- Adicionada funcionalidade de busca na página CRM para filtrar contatos por nome ou telefone. Inclui campo de input com ícone de busca e botão para limpar o filtro.
- Ajustado o filtro dos cards exibidos para considerar a busca, atualizando a lista exibida em tempo real.
  - Arquivos: `src/app/dashboard/crm/page.tsx`
  - Confiança: alta

## 2026-04-27

### feat
- Adicionada funcionalidade para desativar agentes no dashboard, permitindo que nenhum agente fique ativo e pausando respostas do bot enquanto isso. Incluído item no menu para desativar agentes ativos.
- Melhorado fluxo do chatbot para detectar ausência de agente ativo e pausar respostas automáticas, registrando essa condição no log de execução.
  - Arquivos: `src/app/dashboard/agents/page.tsx`, `src/flows/chatbotFlow.ts`
  - Confiança: alta

## 2026-04-27

### feat
- Adicionada funcionalidade de sidebar redimensionável nos componentes `ConversationsIndexClient` e `DashboardLayoutClient`, com persistência da largura no localStorage e limites configuráveis
  - Arquivos: `src/components/ConversationsIndexClient.tsx`, `src/components/DashboardLayoutClient.tsx`, `src/hooks/useResizableSidebar.ts`
  - Confiança: alta

## 2026-04-27

### refactor
- Removido header desktop com tema escuro e controles de tema e notificações do `DashboardLayoutClient` para simplificar layout; ajustado header mobile para manter funcionalidade principal.
- Reorganizado `DashboardNavigation` para incluir `ThemeToggle` no cabeçalho e envolver botão de logout em container flexível, melhorando alinhamento e usabilidade.
  - Arquivos: `src/components/DashboardLayoutClient.tsx`, `src/components/DashboardNavigation.tsx`
  - Confiança: alta

## 2026-04-27

### refactor
- Removida exibição do e-mail do usuário e informações de versão no componente `DashboardNavigation`. Ajustada largura da sidebar no `DashboardLayoutClient` de 220px para 190px para refletir a remoção dos elementos.
  - Arquivos: `src/components/DashboardNavigation.tsx`, `src/components/DashboardLayoutClient.tsx`
  - Confiança: alta

## 2026-04-27

### refactor
- Simplificada a estrutura do layout e apresentação das métricas no componente `DashboardMetricsView`, com reorganização da toolbar, controles e estatísticas para melhor usabilidade e visual mais limpo.
- Arquivos: `src/components/DashboardMetricsView.tsx`
- Confiança: alta

## 2026-04-27

### refactor
- Atualizadas importações e melhorada a organização visual dos componentes `ConversationDetail`, `ConversationsHeader`, `ConversationsIndexClient` e `MessageBubble`.
- Reestruturada a sidebar e a área principal de conversas para desktop, incluindo campo de busca, filtros e indicadores de resultados no `ConversationsIndexClient`.
- Adicionado suporte para controles à esquerda no cabeçalho de conversas (`ConversationsHeader`).
- Ajustes em estilos CSS para melhor controle de overflow e quebra de texto em mensagens (`MessageBubble`).
  - Arquivos: `src/components/ConversationDetail.tsx`, `src/components/ConversationsHeader.tsx`, `src/components/ConversationsIndexClient.tsx`, `src/components/MessageBubble.tsx`
  - Confiança: alta

## 2026-04-27

### refactor
- Melhorada a formatação do código e ajustada a lógica do título do botão para ocultar/mostrar colunas vazias na página CRM
  - Arquivos: `src/app/dashboard/crm/page.tsx`, `src/components/crm/KanbanBoard.tsx`
  - Confiança: alta

## 2026-04-27

### feat
- Adicionado botão toggle para ocultar ou mostrar colunas vazias na página CRM, com estado padrão alterado para ocultar colunas vazias
  - Arquivos: `src/app/dashboard/crm/page.tsx`
  - Confiança: alta

### refactor
- Removido listener e função de tratamento de evento wheel para scroll horizontal no KanbanBoard, simplificando o código
  - Arquivos: `src/components/crm/KanbanBoard.tsx`
  - Confiança: alta

## 2026-04-27

### refactor
- Padronizado formatação de código e melhorada estrutura de componentes em múltiplos arquivos, incluindo ajustes em espaçamento, uso de ponto e vírgula, e organização de imports.
- Ajustado layout e classes CSS para melhor responsividade e consistência visual em componentes como `ConversationList`, `ConversationsHeader`, `ConversationsIndexClient`, `MessageBubble` e `StatusToggle`.
- Atualizado componentes para uso consistente de React e Next.js, como hooks e props, e refinado elementos de UI como botões, badges e filtros.
  - Arquivos: `src/components/ConversationList.tsx`, `src/components/ConversationsHeader.tsx`, `src/components/ConversationsIndexClient.tsx`, `src/components/MessageBubble.tsx`, `src/components/StatusToggle.tsx`
  - Confiança: alta

## 2026-04-27

### refactor
- Melhorado layout e estilos nos componentes do CRM para maior responsividade e consistência, ajustando classes CSS e estrutura flexível
  - Arquivos: `src/app/dashboard/crm/loading.tsx`, `src/app/dashboard/crm/page.tsx`
  - Confiança: alta

### refactor
- Ajustada densidade e base de fonte global para 14px, refinando estilos CSS para melhor aparência e consistência visual
  - Arquivos: `src/app/globals.css`
  - Confiança: alta

### refactor
- Atualizado layout do Dashboard para compactar sidebar e header, reduzindo larguras e alturas, e ajustando espaçamentos e tipografia para melhor usabilidade e visual mais enxuto
  - Arquivos: `src/components/DashboardLayoutClient.tsx`
  - Confiança: alta

### refactor
- Refinado componente de navegação do dashboard: ajustado espaçamentos, ocultação de subitens em modo colapsado e renomeado item de menu "Base de Conhecimento" para "Documentos"
  - Arquivos: `src/components/DashboardNavigation.tsx`
  - Confiança: alta

## 2026-04-27

### feat
- Adicionado modal de configurações ao pipeline CRM com filtros, opções de exibição, gerenciamento de tags e painel de automações; aprimorada interface da página CRM com cabeçalho compacto, botões de alternância de visualização e botão de acesso rápido às configurações.
- Refatorado layout do cabeçalho e removidos painéis de resumo antigos para simplificar a interface e melhorar usabilidade.
  - Arquivos: `src/app/dashboard/crm/page.tsx`
  - Confiança: alta

## 2026-04-26

### refactor
- Removidos `QualityAlertBadge` e `pendingQualityCount` do layout do dashboard por não serem mais utilizados.
- Atualizado componente `DashboardMetricsView` para melhorar legibilidade, consistência e experiência mobile-first, incluindo ajustes em hooks, estado, renderização e estilização.
- Refatorado endpoint da API de métricas do dashboard para padronizar formatação, melhorar controle de datas, limites, consultas e processamento dos dados agregados.
- Melhorias gerais de código e estilo em `QualityDashboard` para maior clareza e consistência visual.
  - Arquivos: `src/app/api/dashboard/metrics/route.ts`, `src/components/DashboardLayoutClient.tsx`, `src/components/DashboardMetricsView.tsx`, `src/components/DashboardNavigation.tsx`, `src/components/quality/QualityDashboard.tsx`
  - Confiança: alta

### feat
- Adicionado novo prompt de atendimento personalizado para o agente "Danilo" do cliente SPORTS TRAINING, com orientações detalhadas para interação humanizada, respostas naturais, uso de emojis, regras para tratamento de dúvidas, agendamentos e transferência para atendimento humano.
  - Arquivo: `tmp/fix-sports-prompt.js`
  - Confiança: alta

## 2026-04-26

### feat
- Adicionado componente `NavGroup` para agrupar itens de navegação no dashboard com controle de expansão e destaque de rota ativa. Melhorias na UI dos itens de navegação, incluindo suporte a subitens com ícones menores e ajustes de espaçamento.
- Corrigidas várias strings com caracteres acentuados no componente `DashboardNavigation` para exibição correta.
  - Arquivos: `src/components/DashboardNavigation.tsx`
  - Confiança: alta

## 2026-04-26

### refactor
- Removidos termos explícitos e de retry para detecção de intenção de documentos, simplificando a lógica de análise de texto em `handleDocumentSearchToolCall.ts`.
- Atualizados testes para refletir remoção da restrição que bloqueava chamadas sem intenção explícita, permitindo buscas e respostas mesmo sem termos específicos.
  - Arquivos: `src/nodes/handleDocumentSearchToolCall.ts`, `tests/unit/handle-document-search-tool-call.test.ts`
  - Confiança: alta

## 2026-04-26

### feat
- Adicionados scripts de diagnóstico para rastreamento de clientes, detalhes de chamadas de ferramenta e buscas de documentos, facilitando análise de logs e estado de agentes e clientes
  - Arquivos: `scripts/list-clients.mjs`, `scripts/trace-detail.mjs`, `scripts/trace-doc-search.mjs`, `scripts/trace-doc-search-v2.mjs`
  - Confiança: alta

### refactor
- Removido gate de bloqueio por ausência de intenção explícita no nó `handleDocumentSearchToolCall`, permitindo que chamadas para buscar documentos sejam feitas sempre que o modelo decidir, simplificando a lógica de filtragem
  - Arquivos: `src/nodes/handleDocumentSearchToolCall.ts`
  - Confiança: alta

## 2026-04-26

### refactor
- Reorganizado imports e melhorada a legibilidade dos testes em `handleDocumentSearchToolCall`
- Ajustada formatação e comentários para refletir remoção da lógica de bloqueio por estágio de descoberta no fluxo de documentos
  - Arquivos: `tests/unit/handle-document-search-tool-call.test.ts`
  - Confiança: alta

## 2026-04-26

### feat
- Habilitado por padrão as ferramentas, RAG e busca de documentos para novos agentes e agentes existentes não arquivados, alinhando o comportamento esperado para clientes SaaS sem necessidade de configuração manual.
- Atualizadas as configurações padrão no banco e no fallback JSON dos clientes para `enable_tools`, `enable_rag` e `enable_document_search` como `true`.
- Ajustada a criação de agentes legados para ativar essas funcionalidades por padrão.
- Refatorado o código de manipulação da busca de documentos para simplificar consultas recentes, melhorar logs e mensagens, e remover lógica de bloqueio baseada em dados comerciais e histórico.
  - Arquivos: `src/app/api/agents/route.ts`, `src/lib/agent-templates.ts`, `src/lib/agent-tools.ts`, `src/nodes/handleDocumentSearchToolCall.ts`, `supabase/migrations/20260426193000_default_tools_enabled.sql`
  - Confiança: alta

## 2026-04-26

### feat
- Melhorada a ferramenta de busca e envio de documentos, imagens, fotos, links e materiais na base de conhecimento, incluindo reconhecimento de termos para reenvio e busca por nomes de arquivos de imagens.
- Implementada busca fallback por nome de arquivo para documentos de imagem quando a busca semântica retorna apenas arquivos de texto.
- Atualizado prompt do sistema para orientar o agente a usar a ferramenta de documentos ao receber pedidos de fotos, imagens, links, anexos, PDFs, catálogos, tabelas ou materiais, evitando inventar placeholders ou links falsos.
- Ajustada resposta do agente para explicar por texto quando não houver confirmação de envio de mídia ou links reais, deixando claro o limite da informação.
- Restaurada configuração para ativar busca de documentos em agentes legados que já usam RAG e ferramentas, mas tinham esta opção desativada.
- Removido o arquivo de documentação `docs/meta/META_APP_SETUP.md` do repositório.
- Adicionados testes unitários para cobrir novos casos de uso da busca de documentos, incluindo detecção de intenção explícita por termos de reclamação de falta de envio, fallback para busca por nome de arquivo e reconhecimento de extensões de imagem na consulta.

  - Arquivos: `src/lib/agent-tools.ts`, `src/lib/prompt-builder.ts`, `src/nodes/generateAIResponse.ts`, `src/nodes/handleDocumentSearchToolCall.ts`, `supabase/migrations/20260426183000_restore_legacy_document_search_agents.sql`, `tests/unit/handle-document-search-tool-call.test.ts`, `docs/meta/META_APP_SETUP.md`
  - Confiança: alta

## 2026-04-25

### feat
- Adicionada gestão aprimorada de configuração e contexto do agente, incluindo novos campos para seções de prompt, controle de tokens e esforço de raciocínio.
- Implementada lógica para controle de ferramentas permitidas por agente, com validação e rejeição de chamadas a ferramentas não autorizadas.
- Adicionado suporte a deduplicação de mensagens recebidas no webhook para evitar processamento repetido.
- Introduzidos novos controles UI no editor de agentes para edição de seções de prompt (contexto de negócio, regras, limites, escalonamento, exemplos) e sliders para ajuste de tokens de contexto.
- Atualizados endpoints API para suportar os novos campos de configuração do agente, como prompt_sections, max_input_tokens, max_history_tokens, max_knowledge_tokens e reasoning_effort.
- Incluída biblioteca e lógica para definição e validação das ferramentas disponíveis para agentes, condicionadas à configuração e metadados do contato.
- Atualizadas dependências de desenvolvimento para incluir ferramentas de teste e cobertura (Vitest, Playwright, MSW) e outras melhorias no ecossistema.

- Arquivos principais:  
  `src/app/api/agents/[id]/route.ts`,  
  `src/app/api/agents/route.ts`,  
  `src/app/api/agents/[id]/versions/[versionId]/restore/route.ts`,  
  `src/app/api/webhook/route.ts`,  
  `src/components/agents/AgentEditor.tsx`,  
  `src/components/agents/AgentEditorModal.tsx`,  
  `src/flows/chatbotFlow.ts`,  
  `src/lib/agent-tools.ts`  
- Confiança: alta

## 2026-04-24

### feat
- Implementado plano completo para melhoria do ecossistema UzzAI, focando em detecção ampliada de suporte implícito, redução de duplicidade em casos de suporte e aprimoramento da busca e recuperação de documentos multimodais, especialmente apresentações.
- Criado prompt principal enxuto (RAG-first) com regras claras para uso de ferramentas e política anti-ambiguidade na chamada de ferramentas, além de protocolo robusto para triagem de suporte com gatilhos explícitos e implícitos, incluindo análise de prints/imagens.
- Adicionado sistema híbrido de ranking para busca de documentos que combina similaridade vetorial, sobreposição de tokens no nome do arquivo, tipo de documento e reforço para arquivos de apresentação (PDFs, slides, decks).
- Reforçada classificação de casos de suporte para identificar causas operacionais (duplicidade, ordenação) como `system/high` e ampliar sinais implícitos para maior recall, incluindo frases como "cliente falou X e respondeu Y", "mandou duas vezes", "respondeu atrasado", entre outras.
- Ajustado fluxo do chatbot para garantir persistência única de casos de suporte por mensagem processada, associando o `trace_id` quando disponível, e tratamento consistente de erros na persistência.
- Documentação extensiva criada para governança comercial, políticas de preços, FAQ, playbook de respostas padrão para suporte, runbook de homologação E2E e detalhamento dos produtos e serviços UzzAI.
- Inclusão de testes unitários e de integração cobrindo detecção de suporte implícito, classificação de casos, e ranking híbrido na busca de documentos, garantindo maior confiabilidade e cobertura dos cenários críticos.

  - Arquivos principais:  
    `src/lib/support-cases.ts`, `src/flows/chatbotFlow.ts`, `src/nodes/searchDocumentInKnowledge.ts`, `src/nodes/handleDocumentSearchToolCall.ts`,  
    `docs/plans/PLANO_COMPLETO_MUDANCA_UZZAI.md`, `docs/prompt UZZAI/prompt.2uzzai.md`, `docs/prompt UZZAI/rag/*.md`, `docs/runbooks/UZZAI_E2E_HOMOLOGACAO_RAG_SUPORTE.md`,  
    `tests/unit/support-cases-detection.test.ts`, `tests/unit/search-document-in-knowledge.test.ts`, `tests/unit/handle-document-search-tool-call.test.ts`, `tests/integration/support-cases-api.test.ts`

  - Confiança: alta

## 2026-04-24

### fix
- Prevenção de chamadas duplicadas a ferramentas em respostas de IA para evitar contaminação de rastros e execuções repetidas. Implementada função de deduplicação baseada em nome e argumentos das chamadas.
  - Arquivos: `src/flows/chatbotFlow.ts`, `src/lib/tool-call-dedup.ts`, `tests/unit/tool-call-dedup.test.ts`
  - Evidência: uso da função `dedupeToolCalls` para filtrar chamadas repetidas e log de aviso em `chatbotFlow.ts`
  - Confiança: alta

### fix
- Ajustado filtro para considerar apenas mensagens de IA ao reconciliar rastros, ignorando mensagens humanas para evitar associação incorreta.
  - Arquivos: `src/lib/trace-reconciliation.ts`, `tests/unit/trace-reconciliation.test.ts`
  - Evidência: alteração em `trace-reconciliation.ts` para validar tipo de mensagem com `isAiMessage` antes de mapear por `wamid`
  - Confiança: alta

## 2026-04-24

### feat
- Adicionado workflow e dashboard para triagem de casos de suporte e bugs, incluindo API para criação, listagem, atualização e conversão de casos em tarefas de correção.
- Implementado captura automática de sinais de suporte/bugs a partir das mensagens do chatbot, com classificação da causa provável, severidade e ação recomendada.
- Criado nova tabela `support_cases` no banco para armazenar casos de suporte com isolamento por cliente e políticas de segurança.
- Incluído opção de ativar/desativar modo suporte no dashboard de configurações, que habilita a captura e triagem de casos.
- Adicionada nova página e componente React para visualização e gerenciamento dos casos de suporte, com filtros por status, severidade, causa e busca por texto.
- Atualizado fluxo do chatbot para enviar mensagens ao modo suporte quando ativado, orientando coleta objetiva de informações para bugs e falhas.
- Criado hook React `useSupportCases` para consumir API de suporte e facilitar manipulação dos casos no frontend.
- Incluído testes de integração para as APIs de suporte, cobrindo autenticação, criação, atualização e conversão de casos.
  - Arquivos principais: `src/app/api/support/cases/route.ts`, `src/app/api/support/cases/[id]/route.ts`, `src/app/api/support/cases/[id]/convert-task/route.ts`, `src/lib/support-cases.ts`, `src/hooks/useSupportCases.ts`, `src/components/support/SupportBugsDashboard.tsx`, `src/app/dashboard/support-bugs/page.tsx`, `src/app/dashboard/settings/page.tsx`, `src/flows/chatbotFlow.ts`, `supabase/migrations/20260520132000_create_support_cases.sql`, `tests/integration/support-cases-api.test.ts`
  - Confiança: alta

## 2026-04-23

### feat
- Adicionado endpoint para promoção em lote de Ground Truth a partir de traces (`POST /api/ground-truth/from-trace/bulk`) com validação e geração de embeddings
- Implementada UI no `GroundTruthManager` para carregar candidatos a bootstrap e promover múltiplos itens em lote com seleção via checkboxes
- Criado painel `ReviewQueuePanel` exibindo fila S4 com itens FAIL/REVIEW sem feedback humano, integrado ao workspace de avaliações
- Adicionados cards no dashboard de qualidade: `QualityDailyTrendCard` para tendência diária dos últimos 7 dias e `QualityCronHealthCard` para monitoramento da saúde dos crons
- Implementado endpoint `GET /api/quality/cron-health` que retorna status e detalhes dos crons de reconciliacão e relatório diário
- Documentado runbook operacional para qualidade com checklist diário, endpoints, comandos cron manuais, SQL para checkpoint e playbook de incidentes
  - Arquivos: `src/app/api/ground-truth/from-trace/bulk/route.ts`, `src/components/quality/GroundTruthManager.tsx`, `src/components/quality/ReviewQueuePanel.tsx`, `src/components/quality/EvaluationsWorkspace.tsx`, `src/components/quality/QualityDashboard.tsx`, `src/components/quality/QualityDailyTrendCard.tsx`, `src/components/quality/QualityCronHealthCard.tsx`, `src/app/api/quality/cron-health/route.ts`, `docs/runbooks/quality-operations.md`
- Confiança: alta

### test
- Criados testes de integração para o endpoint de promoção em lote de Ground Truth a partir de traces, cobrindo casos de autorização e sucesso na criação
- Criados testes de integração para o endpoint de saúde dos crons, validando respostas autorizadas e payload esperado
  - Arquivos: `tests/integration/ground-truth-bulk-from-trace-api.test.ts`, `tests/integration/quality-cron-health-api.test.ts`
- Confiança: alta

## 2026-04-23

### feat
- Automatizado o monitoramento de prontidão do checkpoint de qualidade para iniciar Sprint 5 no tenant piloto, incluindo API (`GET /api/quality/checkpoint-readiness`), componente visual no dashboard, e script SQL para análise manual.
- Adicionada API para fila de revisões de avaliações com filtros configuráveis por dias, limite e tipo de veredito (`GET /api/evaluations/review-queue`).
- Criado componente React `QualityCheckpointReadinessCard` para exibir status e critérios do checkpoint no dashboard de qualidade.
- Implementada lógica de avaliação detalhada dos critérios de qualidade com mensagens de próximos passos para ajustes antes do avanço para Sprint 5.
- Incluídos testes unitários e de integração para as novas APIs e lógica de avaliação de checkpoint.
  - Arquivos: `scripts/quality-checkpoint-readiness.sql`, `src/app/api/quality/checkpoint-readiness/route.ts`, `src/app/api/evaluations/review-queue/route.ts`, `src/components/quality/QualityCheckpointReadinessCard.tsx`, `src/components/quality/QualityDashboard.tsx`, `src/lib/quality-checkpoint-readiness.ts`, `tests/unit/quality-checkpoint-readiness.test.ts`, `tests/integration/quality-checkpoint-readiness-api.test.ts`, `tests/integration/evaluations-review-queue-api.test.ts`
- Confiança: alta

## 2026-04-23

### feat
- Implementado relatório diário automatizado de KPIs de qualidade por tenant, com cálculo, snapshot e listagem via API REST; inclui endpoint cron para execução automática diária.
- Adicionados scripts SQL e API para apoio operacional S2 (bootstrap de candidatos Ground Truth) e S4 (fila priorizada de revisões FAIL/REVIEW).
- Criada tabela `quality_daily_reports` no banco para persistência dos relatórios diários, com políticas de segurança e índices otimizados.
- Adicionada cobertura de testes para APIs de relatório diário e cron.
- Configurado cron no Vercel para execução diária do relatório de qualidade às 07:10 UTC.
  - Arquivos: `src/lib/quality-daily-report.ts`, `src/app/api/quality/daily-report/route.ts`, `src/app/api/cron/quality-daily-report/route.ts`, `src/app/api/ground-truth/bootstrap-candidates/route.ts`, `scripts/s2-bootstrap-ground-truth-candidates.sql`, `scripts/s4-fail-review-queue.sql`, `supabase/migrations/20260520121000_create_quality_daily_reports.sql`, `tests/integration/quality-daily-report-api.test.ts`, `tests/integration/quality-daily-report-cron-api.test.ts`, `vercel.json`
- Confiança: alta

## 2026-04-23

### fix
- Ajustado script SQL para permitir o status 'success' na tabela `message_traces`, corrigindo restrição CHECK que bloqueava reconciliação de traces.
- Implementado fallback para atualizar status como 'needs_review' quando atualização com status 'success' violar restrição de banco, evitando falhas na reconciliação.
- Atualizada função de reconciliação para tentar atualização com status alternativo em caso de erro de restrição, melhorando robustez.
- Adicionado teste para contemplar status 'success' no fluxo de reconciliação.
  - Arquivos: `scripts/fix-message-traces-status-check.sql`, `src/lib/trace-reconciliation.ts`, `tests/unit/trace-reconciliation.test.ts`
  - Evidência: script SQL altera constraint; código trata erro específico de constraint e tenta fallback; teste inclui status 'success'
  - Confiança: alta

## 2026-04-23

### feat
- Implementada reconciliação de traces pendentes e falhados com histórico de chat para correção automática de status e preenchimento de respostas de IA, incluindo classificação detalhada de buckets de pending.
  - Arquivos: `src/lib/trace-reconciliation.ts`, `src/lib/trace-status.ts`, `src/app/api/cron/traces-reconcile/route.ts`, `src/app/api/traces/route.ts`, `src/lib/trace-logger.ts`
  - Confiança: alta

- Adicionados alertas operacionais para qualidade de traces, com monitoramento de taxas de pending, falhas e latência, além de cobertura cadastral de contatos, expostos via API e painel.
  - Arquivos: `src/app/api/quality/alerts/route.ts`, `src/components/TracesClient.tsx`
  - Confiança: alta

- Atualizado fallback do chatbot para categorizar falhas de IA (quota, rate limit, timeout, indisponibilidade do provedor) e adaptar mensagem de contingência conforme categoria.
  - Arquivos: `src/flows/chatbotFlow.ts`
  - Confiança: alta

- Expandido esquema de captura cadastral para incluir campos de experiência com yoga e preferências de período/dia, com normalização e aliases para esses campos em ferramentas de extração e atualização de metadados.
  - Arquivos: `src/nodes/extractContactDataFallback.ts`, `src/nodes/updateContactMetadata.ts`, `src/nodes/generateAIResponse.ts`, `src/lib/types.ts`
  - Confiança: alta

- Adicionada consulta SQL oficial para validação de qualidade e observabilidade de traces por tenant, incluindo resumo de saúde, buckets de pending, reconciliação com histórico, cobertura cadastral e avaliações.
  - Arquivos: `scripts/quality-trace-validation.sql`
  - Confiança: alta

- Atualizado painel de traces para exibir cobertura cadastral (experiência e período/dia preferido), alertas recentes e bucket principal de pending.
  - Arquivos: `src/components/TracesClient.tsx`
  - Confiança: alta

- Endurecida reconciliação de status via webhook com merge seguro de metadados JSONB para evitar sobrescrita e garantir atualização correta dos campos.
  - Arquivos: `src/lib/trace-reconciliation.ts`, `src/nodes/updateMessageStatus.ts`
  - Confiança: alta

- Adicionado cron job agendado a cada 10 minutos para execução automática da reconciliação de traces pendentes e falhados.
  - Arquivos: `src/app/api/cron/traces-reconcile/route.ts`, `vercel.json`
  - Confiança: alta

- Incluídos testes unitários e de integração para novas funcionalidades de reconciliação, alertas de qualidade, classificação de status e captura cadastral.
  - Arquivos: `tests/unit/trace-status.test.ts`, `tests/unit/trace-reconciliation.test.ts`, `tests/unit/extract-contact-data-fallback.test.ts`, `tests/unit/update-contact-metadata.test.ts`, `tests/integration/quality-alerts-api.test.ts`, `tests/integration/traces-reconcile-cron-api.test.ts`, `tests/integration/traces-api.test.ts`
  - Confiança: alta

## 2026-04-23

### feat
- Implementado controle de envio de anexos baseado em intenção explícita do usuário e estágio comercial, com bloqueios para envios duplicados em cooldown e para usuários sem dados mínimos de descoberta comercial. Adicionado filtro para envio de apenas um arquivo de mídia por chamada e uso de mensagem textual alternativa quando o envio é bloqueado.
- Incluído testes unitários para validar as regras de gate de documentos, cobrindo bloqueios por ausência de intenção explícita, estágio comercial inadequado e cooldown de duplicatas, além da permissão de envio quando critérios são atendidos.
- Alterações principais nos arquivos `src/nodes/handleDocumentSearchToolCall.ts`, `src/flows/chatbotFlow.ts` e testes em `tests/unit/handle-document-search-tool-call.test.ts`.
- Confiança: alta

## 2026-04-22

### refactor
- Padronizada formatação do código e aprimorada sanitização de markdown na formatação de respostas para WhatsApp, incluindo remoção de imagens, links e linhas vazias após limpeza. Adicionado filtro para eliminar mensagens duplicadas consecutivas.
- Arquivos: `src/nodes/formatResponse.ts`
- Confiança: alta

## 2026-04-22

### refactor
- Removidos logs de console desnecessários e melhorado o formato de logs em módulos relacionados à IA para maior clareza e limpeza do código.
- Ajustado timeout do LLM de 2000ms para 5000ms em `crm-intent-classifier.ts`.
  - Arquivos: `src/lib/crm-automation-engine.ts`, `src/lib/crm-intent-classifier.ts`, `src/lib/direct-ai-client.ts`, `src/lib/direct-ai-tracking.ts`
  - Confiança: alta

## 2026-04-22

### chore
- Removido script de teste depreciado para o modelo gpt-5-nano
  - Arquivos: `tmp/test-gpt5-nano.mjs`
  - Confiança: alta

## 2026-04-22

### feat
- Atualizado o modelo OpenAI padrão para `gpt-5-nano` em múltiplos componentes, incluindo autenticação Meta, onboarding e cliente AI direto
  - Arquivos: `src/app/api/auth/meta/callback/route.ts`, `src/app/api/auth/meta/embedded-signup/route.ts`, `src/app/onboarding/page.tsx`, `src/lib/direct-ai-client.ts`
  - Confiança: alta

### test
- Adicionado script de teste para validação do modelo `gpt-5-nano` via Vault e chamada direta à API OpenAI
  - Arquivos: `tmp/test-gpt5-nano.mjs`
  - Confiança: alta

## 2026-04-22

### refactor
- Refatorado código para melhorar legibilidade e observabilidade em `chatbotFlow.ts` e `crm-automation-engine.ts`.
- Adicionada invalidação de cache WABA após restauração de versão do agente e atualização de configurações para efeito imediato (`src/app/api/agents/[id]/versions/[versionId]/restore/route.ts` e `src/app/api/flow/nodes/[nodeId]/route.ts`).
- Atualizados imports e formatação geral para consistência em múltiplos arquivos.
- Ajustada tipagem TypeScript e padronização de strings e espaçamentos em `TracesClient.tsx`.
- Adicionada nova aba "Prompt & Histórico" no painel de detalhes de traces para exibir dados de prompt, histórico de conversa e contexto RAG (`TracesClient.tsx`).
- Atualizado modelo padrão OpenAI para `gpt-4.1-nano` em onboarding e chamadas de API.
- Melhorias na exibição e filtros da interface de traces, incluindo contagem dinâmica e mensagens de erro mais claras.
- Ajustes no tratamento de tool calls e exibição de status com ícones e cores padronizados.
- Ajustes no cálculo de custos e latências para maior precisão.
- Melhorias no código de chamadas diretas à AI, incluindo uso do modelo `gpt-4.1-nano` e parâmetros específicos para esse modelo.
  - Arquivos principais: `src/flows/chatbotFlow.ts`, `src/lib/crm-automation-engine.ts`, `src/components/TracesClient.tsx`, `src/app/api/agents/[id]/versions/[versionId]/restore/route.ts`, `src/app/api/flow/nodes/[nodeId]/route.ts`, `src/lib/direct-ai-client.ts`
- Confiança: alta

## 2026-04-22

### feat
- Adicionado prompt Umana v2 focado em atendimento consultivo com regras claras de gating para agendamento e uso prioritário de RAG (Recuperação de Informação) para respostas factuais.
- Criado pacote de conhecimento RAG para Umana Rio Branco com documentos separados para identidade, horários, planos, equipe, localização e FAQ, visando reduzir o tamanho do prompt e aumentar a consistência das respostas.
- Implementada sanitização de markdown para mensagens WhatsApp, removendo cabeçalhos, negrito, itálico, código e outros elementos para garantir texto simples e legível no canal.
  - Arquivos: `docs/prompts/Umana Rio Branco/prompt.2umana.md`, `docs/prompts/Umana Rio Branco/rag/00_MAPA_RAG_UMANA.md`, `docs/prompts/Umana Rio Branco/rag/01_UMANA_IDENTIDADE_E_FILOSOFIA.md`, `docs/prompts/Umana Rio Branco/rag/02_UMANA_HORARIOS_E_AULAS_RIO_BRANCO.md`, `docs/prompts/Umana Rio Branco/rag/03_UMANA_PLANOS_E_VALORES.md`, `docs/prompts/Umana Rio Branco/rag/04_UMANA_PROFESSORES_EQUIPE.md`, `docs/prompts/Umana Rio Branco/rag/05_UMANA_LOCALIZACAO_E_CONTATO.md`, `docs/prompts/Umana Rio Branco/rag/06_UMANA_FAQ_ATENDIMENTO.md`, `src/nodes/formatResponse.ts`
  - Confiança: alta

## 2026-04-22

### fix
- Reforçado fallback seguro para tenants sem prompt customizado, evitando vieses de domínio e melhorando rastreamento de telemetria com estimativa de custo por token para respostas de IA.
- Ajustado fallback de resposta padrão para mensagem genérica e neutra, com marcação explícita de fallback e motivo.
- Adicionados marcadores de estágios de embedding e retrieval para rastreamento detalhado no fluxo de chatbot.
  - Arquivos: `src/flows/chatbotFlow.ts`, `src/nodes/generateAIResponse.ts`
  - Evidência: implementação de função `estimateTraceCostUsd`, uso do fallback neutro no prompt padrão, e logs de trace em pontos-chave do fluxo.
  - Confiança: alta

## 2026-04-22

### chore
- Migrado CI para usar pnpm em vez de npm, ajustando cache e comandos no workflow `.github/workflows/ci.yml`.
- Adicionado suporte a Vitest, MSW e Playwright com novas dependências no `package.json` e arquivos de configuração.
- Criados arquivos de configuração e setup para Vitest (`vitest.config.ts`, `tests/setup.ts`, `tests/mocks/server.ts`).
- Atualizadas dependências para incluir Vitest, Playwright, MSW e outras bibliotecas relacionadas.
  - Arquivos: `.github/workflows/ci.yml`, `package.json`, `pnpm-lock.yaml`, `vitest.config.ts`, `tests/setup.ts`, `tests/mocks/server.ts`

### test
- Implementados testes unitários e de integração usando Vitest para múltiplos módulos:
  - Testes unitários para `evaluation-engine`, `evaluation-worker`, `ground-truth-matcher`, `trace-logger`.
  - Testes de integração para APIs `/api/ground-truth` e `/api/traces`.
  - Teste smoke básico para garantir funcionamento do Vitest.
  - Arquivos: `tests/unit/evaluation-engine.test.ts`, `tests/unit/evaluation-worker.test.ts`, `tests/unit/ground-truth-matcher.test.ts`, `tests/unit/trace-logger.test.ts`, `tests/integration/ground-truth-api.test.ts`, `tests/integration/traces-api.test.ts`, `tests/smoke.test.ts`

### fix
- Ajustada saída de status no teste de trace-logger de `"pending"` para `"success"` para refletir estado correto.
  - Arquivo: `src/lib/__tests__/trace-logger.test.ts`
  - Evidência: alteração direta da string de status no teste
  - Confiança: alta

## 2026-04-22

### feat
- Adicionadas páginas de listagem e detalhe de traces no dashboard de qualidade, com navegação integrada e carregamento assíncrono usando Suspense
- Implementado badge de custo diário atualizado a cada minuto no dashboard de qualidade
- Atualizado componente de navegação para incluir link para o módulo de traces com badge "new"
  - Arquivos: `src/app/dashboard/quality/traces/page.tsx`, `src/app/dashboard/quality/traces/[id]/page.tsx`, `src/components/TracesClient.tsx`, `src/components/quality/CostTodayBadge.tsx`, `src/components/QualityDashboard.tsx`, `src/components/DashboardNavigation.tsx`
  - Confiança: alta

## 2026-04-22

### fix
- Ajustado para preservar registros de traces com status `success` em esquemas antigos que não suportam esse valor, aplicando fallback para `pending` e mantendo metadados de compatibilidade.
- Atualizado componente de traces para incluir status `success` em filtros e legendas.
- Adicionada migração para permitir o status `success` na tabela `message_traces`, atualizando restrição CHECK para compatibilidade retroativa.
  - Arquivos: `src/lib/trace-logger.ts`, `src/components/TracesClient.tsx`, `supabase/migrations/20260421211000_fix_message_traces_status_success.sql`, `supabase/migrations/20260422130000_create_observability_traces.sql`
  - Evidência: retry com status `pending` em caso de erro de restrição, alteração da constraint no banco e inclusão do status na UI
  - Confiança: alta

## 2026-04-21

### fix
- Adicionado fallback local para geração de resposta de IA no fluxo do chatbot em caso de falha na geração principal, com mensagem padrão e logs de erro e aviso
  - Arquivos: `src/flows/chatbotFlow.ts`
  - Evidência: try/catch envolvendo chamada a `generateAIResponse` e fallback com texto padrão e logs
  - Confiança: alta

## 2026-04-21

### fix
- Reforçado tratamento de casos onde o fluxo do chatbot pode gerar respostas vazias ou falhas silenciosas, adicionando logs de aviso e erro para conteúdos vazios após batch, formatação e envio de mensagens.
- Incluído fallback para conteúdo bruto quando a formatação retorna array vazio, e validação para garantir que ao menos uma mensagem seja enviada.
- Arquivos: `src/flows/chatbotFlow.ts`
- Evidência: adição de verificações explícitas para conteúdo vazio e erros, com logs e retornos de erro claros.
- Confiança: alta

## 2026-04-21

### fix
- Ajustado para popular dados de geração (modelo, tokens, resposta) em saídas antecipadas de chamadas de ferramentas, garantindo que o status seja definido como "success" quando apropriado
  - Arquivos: `src/flows/chatbotFlow.ts`, `src/lib/trace-logger.ts`
  - Evidência: inserção de `traceLogger.setGenerationData` em múltiplos retornos antecipados e alteração da lógica de status para considerar estágio "sent"
  - Confiança: alta

## 2026-04-21

### feat
- Adicionado workflow de CI no GitHub Actions para rodar testes unitários e de integração automaticamente em pushes e pull requests na branch main (`.github/workflows/ci.yml`).
- Refatorados testes de integração das APIs `/api/ground-truth` e `/api/traces` para substituir o mock de `createRouteHandlerClient` pelo novo mock de `createServiceRoleClient`, alinhando com mudanças na camada de acesso ao Supabase.
- Ajustados testes para manter consistência na serialização JSON e mensagens de erro esperadas.
  - Arquivos: `src/__tests__/integration/ground-truth-route.test.ts`, `src/__tests__/integration/traces-api.test.ts`, `.github/workflows/ci.yml`
  - Confiança: alta

## 2026-04-21

### fix
- Ajustado uso dos clientes Supabase nas APIs para utilizar `createServiceRoleClient` em vez de `createRouteHandlerClient`, corrigindo problemas de autenticação e sessão nas rotas de avaliações, ground-truth e traces.
- Melhorada a captura e retorno de detalhes de erro nas respostas JSON das APIs para facilitar diagnóstico.
- Tratamento aprimorado de erros específicos de banco de dados nas APIs de traces, incluindo mensagens claras para migrações pendentes.
  - Arquivos: `src/app/api/evaluations/route.ts`, `src/app/api/ground-truth/route.ts`, `src/app/api/traces/[id]/route.ts`, `src/app/api/traces/route.ts`
  - Evidência: substituição consistente do cliente Supabase e inclusão de detalhes de erro nas respostas HTTP.
  - Confiança: alta

### chore
- Aplicadas migrações de qualidade no banco de dados para garantir existência de tabelas e índices com cláusulas IF NOT EXISTS, evitando erros em ambientes com migrações parciais.
- Criada nova migration para concessão de permissão EXECUTE na função RPC `submit_human_feedback_atomic` para o papel `authenticated`.
  - Arquivos: múltiplas migrations em `supabase/migrations/`
  - Confiança: alta

### docs
- Adicionado documento detalhado de continuação da sprint com diagnóstico do estado atual do projeto, desvios do plano, sequência de execução recomendada, riscos e checklist de próximos passos para validação e desenvolvimento futuros.
  - Arquivos: `twin-plans/sprints/CONTINUACAO-2026-04-21.md`
  - Confiança: alta

## 2026-04-21

### fix
- Ajustado fluxo do chatbot para evitar término silencioso quando a IA retorna conteúdo vazio, inserindo mensagem fallback com sugestão de ajuda sobre aulas de Yoga
  - Arquivos: `src/flows/chatbotFlow.ts`
  - Evidência: código adiciona fallback e log de aviso em caso de conteúdo vazio da IA
  - Confiança: alta
```

## 2026-04-21

### fix
- Ajustado fluxo para realizar chamada de follow-up à IA após registrar dado cadastral quando a resposta inicial estiver vazia, garantindo que o usuário sempre receba uma mensagem
  - Arquivos: `src/flows/chatbotFlow.ts`
  - Evidência: implementação de lógica condicional para gerar resposta adicional se conteúdo estiver vazio após ferramenta de metadata
  - Confiança: alta

## 2026-04-21

### feat
- Finalizado hardening e diagnósticos das APIs de traces, incluindo autenticação multi-tenant via clientId e tratamento robusto de erros.
- Adicionado endpoint `/api/traces/health` para diagnóstico do estado das tabelas de traces e sugestões de ações.
- Implementado testes de integração completos para as APIs de traces (`GET /api/traces` e `GET /api/traces/[id]`).
- Adicionada funcionalidade no dashboard para promover traces para Ground Truth com confirmação do usuário.
- Ampliado suporte a campos cadastrais no fluxo e UI, incluindo `telefone_alternativo` e `profissao`.
- Melhorias no widget de traces: tratamento de erros exibido, novos links para API e diagnóstico, e ajustes visuais.
- Refatoração para usar helpers de sessão e clientId compartilhados em todas as APIs de traces.
- Criado módulo `trace-logger` com sanitização de PII, persistência de traces e logs detalhados, com cobertura de testes ≥80%.
- Ajuste na configuração `supabase/config.toml` para compatibilidade com CLI local (corrigido `refresh_token_reuse_interval` e removido `gcp_jwt_audience`).
- Correção no envio de e-mails via Resend para instanciar cliente sob demanda e validar chave de API.
  - Arquivos: `src/app/api/traces/route.ts`, `src/app/api/traces/[id]/route.ts`, `src/app/api/traces/health/route.ts`, `src/lib/trace-logger.ts`, `src/components/TracesClient.tsx`, `src/components/TracesWidget.tsx`, `src/lib/flows/flowExecutor.ts`, `src/lib/resend.ts`, `supabase/config.toml`, `src/__tests__/integration/traces-api.test.ts`
  - Confiança: alta

### chore
- Atualizado plano de sprint e documentação interna com status e pendências do módulo de traces.
- Pequenos ajustes de labels e ordenação em campos de perfil no frontend.
  - Arquivos: `twin-plans/sprints/01-traces-fundacao.md`, `src/components/ContactsClient.tsx`
  - Confiança: alta

## 2026-04-21

### feat
- Implementado fluxo completo de revisão humana para avaliações com feedback atômico e promoção opcional para ground truth.
- Criada tabela `human_feedback` com RLS para armazenar feedbacks manuais de operadores, incluindo veredito, correção, motivo, categoria de erro e vínculo com ground truth.
- Adicionada API RESTful para envio (`POST /api/evaluations/[traceId]/human-feedback`) e consulta (`GET /api/evaluations/[traceId]`) de feedback humano, com tratamento atômico via função RPC `submit_human_feedback_atomic`.
- Desenvolvida interface de usuário com três painéis: lista de avaliações filtrável e navegável por atalhos, visualização da conversa para revisão rápida, e detalhes da avaliação com histórico de feedbacks humanos.
- Adicionados atalhos de teclado (J/K para navegar, 1/2/3 para marcar veredito) para aumentar produtividade do operador.
- Incluído badge de alertas no menu principal indicando número de avaliações pendentes de revisão humana.
- Criado hook `useHumanFeedback` para submissão de feedback e `useQualityPendingCount` para contagem e atualização periódica de pendentes.
- Aplicadas migrações SQL para criação da tabela `human_feedback` e da função RPC atômica para submissão de feedback.
- Atualizado sistema de permissões e políticas RLS para garantir isolamento multi-tenant e segurança no acesso aos feedbacks.
- Documentação atualizada com detalhes da nova tabela e fluxo de feedback humano.

- Arquivos principais:  
  `src/app/api/evaluations/[traceId]/human-feedback/route.ts`,  
  `src/app/api/evaluations/pending/route.ts`,  
  `src/app/api/evaluations/[traceId]/route.ts`,  
  `src/components/quality/*`,  
  `src/hooks/useHumanFeedback.ts`,  
  `src/hooks/useQualityPendingCount.ts`,  
  `src/hooks/useEvaluations.ts`,  
  `src/components/DashboardLayoutClient.tsx`,  
  `src/components/DashboardNavigation.tsx`,  
  `supabase/migrations/20260513120000_create_human_feedback.sql`,  
  `supabase/migrations/20260513123000_add_submit_human_feedback_atomic_rpc.sql`

- Confiança: alta

## 2026-04-21

### feat
- Implementado módulo Ground Truth para criação e manutenção de gabarito de perguntas e respostas por cliente, com versionamento imutável e busca semântica via pgvector.
- Criadas APIs REST para gerenciamento de Ground Truth, incluindo listagem, criação, edição (nova versão), exclusão lógica, validação e promoção de message trace para ground truth.
- Desenvolvido dashboard de qualidade com páginas e componentes React para gerenciar Ground Truth e visualizar métricas e avaliações do juiz automático.
- Adicionadas integrações para avaliação automática de respostas do agente via novo worker, com armazenamento de avaliações e estatísticas.
- Implementadas migrações SQL para criação das tabelas `ground_truth` e `agent_evaluations`.
- Adicionado controle de acesso via RLS e isolamento por tenant nas APIs.
- Criado testes de integração e unitários para APIs, hooks, avaliação e matcher de Ground Truth.
- Incluído verificação antecipada de mensagens duplicadas no fluxo do chatbot para evitar processamento e inserção redundante.
- Atualizado navegação do dashboard para incluir links para as novas páginas de Qualidade e Ground Truth com badges "new".

  - Arquivos principais:  
    `src/app/api/ground-truth/*.ts`,  
    `src/app/api/evaluations/*.ts`,  
    `src/components/quality/*`,  
    `src/hooks/useGroundTruth.ts`,  
    `src/hooks/useEvaluations.ts`,  
    `src/lib/evaluation-engine.ts`,  
    `src/lib/evaluation-worker.ts`,  
    `src/lib/ground-truth-matcher.ts`,  
    `src/flows/chatbotFlow.ts`,  
    `src/components/DashboardNavigation.tsx`,  
    `docs/features/ground-truth.md`,  
    `docs/tables/tabelas.md`,  
    `twin-plans/sprints/02-ground-truth.md`,  
    `twin-plans/sprints/03-juiz-automatico.md`,  
    `supabase/migrations/20260429120000_create_ground_truth.sql`,  
    `supabase/migrations/20260506120000_create_agent_evaluations.sql`

  - Confiança: alta

## 2026-04-21

### docs
- Atualizado guia de setup local para uso do gerenciador de pacotes pnpm em vez de npm, com comandos ajustados no arquivo `twin-plans/sprints/00-stack-e-arquitetura.md`.
- Documentada estratégia e metas para pipelines de CI/CD futuras, incluindo status e cronogramas esperados para criação dos workflows no GitHub Actions, em `twin-plans/sprints/QA-STRATEGY.md`.
- Ajustes gerais de formatação e conteúdo nas seções de CI/CD e cheat sheet para refletir o uso de pnpm e o planejamento dos scripts de teste e deploy.
  - Arquivos: `twin-plans/sprints/00-stack-e-arquitetura.md`, `twin-plans/sprints/QA-STRATEGY.md`
  - Confiança: alta

## 2026-04-21

### docs
- Atualizada documentação das sprints para refletir o estado real pós-Sprint 1, incluindo decisões técnicas e hotfixes aplicados em produção
  - Arquivos: `twin-plans/sprints/00-sprint-zero-prep.md`, `twin-plans/sprints/00-stack-e-arquitetura.md`, `twin-plans/sprints/01-traces-fundacao.md`, `twin-plans/sprints/QA-STRATEGY.md`
  - Confiança: alta

### fix
- Aplicados hotfixes críticos em produção para mitigar hangs e erros no fluxo do webhook:
  - Migrado uso de `pg.Pool` para Supabase client em nodes críticos (`saveChatMessage.ts`, `getChatHistory.ts`, `checkDuplicateMessage.ts`)
  - Implementada deduplicação de webhooks por `wamid` antes do processamento para evitar respostas duplicadas e erros
  - Substituído `setImmediate()` por `void promise.catch()` para garantir execução de finalização de trace antes do freeze do Vercel
  - Corrigida condição de supressão de erros no trace-logger para suprimir apenas erros de tabela inexistente
  - Atualizada assinatura de route handlers dinâmicos para usar `params` como Promise conforme Next.js 16
  - Arquivos principais afetados: `src/nodes/saveChatMessage.ts`, `src/nodes/getChatHistory.ts`, `src/nodes/checkDuplicateMessage.ts`, `src/app/api/traces/[id]/route.ts`, `src/chatbotFlow.ts`
  - Evidência: migração para Supabase client e checagem de `wamid` para evitar hangs e duplicatas, correção de assinatura e tratamento de erros detalhados no changelog interno
  - Confiança: alta

## 2026-04-21

### fix
- Exportada nova função `getRAGContextWithTrace` que retorna contexto RAG junto com dados de rastreamento detalhados, melhorando a visibilidade do processo de recuperação de contexto para chatbotFlow.
- Ajustada função `getRAGContext` para usar internamente `getRAGContextWithTrace` e manter compatibilidade retornando apenas o contexto como string.
- Arquivos: `src/nodes/getRAGContext.ts`
- Evidência: alteração explícita na exportação e retorno de dados estruturados com traceData.
- Confiança: alta

## 2026-04-21

### fix
- Reforçado o bloqueio de mensagens duplicadas para priorizar verificação por WAMID, evitando falsos positivos em checagem por similaridade de conteúdo; ajustado para não executar fallback quando WAMID não é encontrado.
- Melhorado o processo de handoff humano para sempre enviar aviso ao usuário antes da transferência e registrar o envio da notificação; corrigida atualização do status do cliente para incluir filtro por tenant (client_id) e lançar erro se cliente não for encontrado.
- Adicionadas marcações detalhadas de trace para estágios do fluxo de chatbot, incluindo carregamento de contexto RAG, início e conclusão da geração de resposta e início da transferência para humano, para melhor monitoramento e rastreabilidade.
  - Arquivos: `src/flows/chatbotFlow.ts`, `src/nodes/checkDuplicateMessage.ts`, `src/nodes/handleHumanHandoff.ts`
  - Evidência: mudanças explícitas no tratamento de duplicatas, envio de mensagem de aviso antes do handoff, e inclusão de logs de trace detalhados
  - Confiança: alta

## 2026-04-20

### fix
- Garantida persistência dos traces de observabilidade com flush await no fluxo do chatbot para evitar perda de dados. Adicionados tratamentos e exibição de erros no dashboard de traces para melhor visibilidade.
- Implementada detecção e aviso único para ausência das tabelas de traces no banco, prevenindo erros silenciosos.
  - Arquivos: `src/components/TracesClient.tsx`, `src/flows/chatbotFlow.ts`, `src/lib/trace-logger.ts`
  - Evidência: alteração de chamadas fire-and-forget para await no flush do traceLogger; captura e exibição de erros HTTP no componente de traces; logs de aviso para erro de tabela ausente.
  - Confiança: alta

## 2026-04-20

### fix
- Migrado o método `checkDuplicateMessage` de PostgreSQL para Supabase, incluindo verificação de duplicidade por `wamid` para evitar processamentos repetidos de webhooks do Meta.
- Ajustado o fluxo do chatbot para enviar o campo `wamid` na checagem de mensagens duplicadas.
- Refatoradas funções auxiliares de normalização e cálculo de similaridade de mensagens para formato mais conciso.
  - Arquivos: `src/nodes/checkDuplicateMessage.ts`, `src/flows/chatbotFlow.ts`
  - Evidência: substituição de queries SQL diretas por chamadas ao Supabase, inclusão de filtro por `wamid` e tratamento de erros para não bloquear o fluxo.
  - Confiança: alta

## 2026-04-20

### fix
- Migradas as funções `saveChatMessage` e `getChatHistory` para utilizar o cliente Supabase em vez de consultas diretas ao PostgreSQL, mantendo suporte multi-tenant e campos como status, mídia e erros.
- Ajustado o tratamento dos dados retornados e inseridos para compatibilidade com JSONB do Supabase, incluindo melhorias na tipagem e remoção de queries SQL manuais.
  - Arquivos: `src/nodes/getChatHistory.ts`, `src/nodes/saveChatMessage.ts`
  - Evidência: substituição de `query` por `createServiceRoleClient` e uso do método `.from().select()` e `.from().insert()` do Supabase client.
  - Confiança: alta

## 2026-04-20

### fix
- Ajustado layout da sidebar e área de conteúdo para rotas de traces, garantindo exibição correta sem padding e com sidebar visível
- Corrigida renderização do componente `TracesClient` para ocupar toda a altura disponível, evitando overflow inesperado
- Modificado flush do traceLogger para usar `void` em vez de `setImmediate`, melhorando gravação de traces no ambiente Vercel
- Refinada lógica de tratamento silencioso de erros no trace-logger para ignorar apenas erros relacionados a tabelas inexistentes, evitando logs falsos de erro
  - Arquivos: `src/components/DashboardLayoutClient.tsx`, `src/components/TracesClient.tsx`, `src/flows/chatbotFlow.ts`, `src/lib/trace-logger.ts`
  - Evidência: mudanças no flush de traceLogger e ajuste de layout indicam correção de problemas de gravação e visualização no Vercel
  - Confiança: alta

## 2026-04-20

### fix
- Corrigida sobreposição da sidebar na página de traces e ajustado erro silencioso no widget de traces para evitar quebra do dashboard
  - Arquivos: `src/components/DashboardLayoutClient.tsx`, `src/components/TracesWidget.tsx`
  - Evidência: inclusão da rota `/dashboard/traces` na detecção da sidebar e tratamento silencioso de erros HTTP e de rede no widget
  - Confiança: alta

## 2026-04-20

### fix
- Ajustado await para `params` do tipo Promise no endpoint GET `/api/traces/[id]` para compatibilidade com Next.js 15
  - Arquivos: `src/app/api/traces/[id]/route.ts`
  - Evidência: alteração de desestruturação para `await params` na função GET
  - Confiança: alta

## 2026-04-20

### feat
- Adicionada tela de Traces no dashboard para rastrear mensagens processadas com detalhes do pipeline, chamadas de ferramentas (tool calls) e RAG (retrieval-augmented generation). Inclui filtros por status, busca por telefone ou texto, estatísticas diárias, e visualização detalhada em abas (Visão Geral, Tool Calls e RAG).
- Atualizada navegação do dashboard para incluir link para a nova tela de Traces.
  - Arquivos: `src/app/dashboard/traces/page.tsx`, `src/components/TracesClient.tsx`, `src/components/DashboardNavigation.tsx`
  - Confiança: alta

## 2026-04-20

### docs
- Adicionado guia completo de debug e observabilidade detalhando logs, tabelas de trace, APIs, dashboard, queries de diagnóstico e cenários de debug passo a passo
  - Arquivos: `checkpoints/2026-04-16_chatbot-oficial/14_DEBUG_AND_OBSERVABILITY_GUIDE.md`
  - Confiança: alta

## 2026-04-20

### feat
- Implementada fundação do sistema de observabilidade com rastreamento detalhado por mensagem, incluindo estágios do processamento, latências, custos, modelo usado e status. Criadas tabelas `message_traces`, `retrieval_traces` e `tool_call_traces` com políticas RLS para isolamento multi-tenant.
- Adicionadas APIs REST para consulta de traces (`/api/traces` e `/api/traces/[id]`) com autenticação e paginação.
- Integrado logger de trace no fluxo principal do chatbot (`chatbotFlow.ts`), registrando eventos de webhook, chamadas de ferramentas e erros, com envio assíncrono para banco.
- Criado componente React `TracesWidget` para exibir no dashboard métricas de custo diário e últimas mensagens traceadas com status, latência e custo.
- Desenvolvido módulo `trace-logger.ts` para criação e gerenciamento estruturado dos traces, incluindo sanitização de PII (CPF, email, cartão).
- Implementado fallback para extração automática de dados cadastrais do usuário via IA (`extractContactDataFallback.ts`), acionado quando ferramenta específica não é chamada, com salvamento validado e normalizado.
- Ampliado tratamento de metadados cadastrais (`updateContactMetadata.ts`) com validações rigorosas, normalizações (CPF, email, CEP, data, telefone alternativo, estado) e rejeições detalhadas.
- Atualizado fluxo de geração de resposta para suportar logging detalhado das chamadas de ferramentas e integração com o trace logger.
- Documentação extensa do plano mestre e sprints para observabilidade, avaliação automática e feedback humano adicionada em `twin-plans/PLANO_SPRINTS_OBSERVABILIDADE_E_FEEDBACK.md` e arquivos relacionados.
- Configurado ambiente de testes com vitest, msw, playwright e scripts CI para garantir qualidade e segurança do novo sistema.

  - Arquivos principais:  
    `src/lib/trace-logger.ts`,  
    `src/app/api/traces/route.ts`,  
    `src/app/api/traces/[id]/route.ts`,  
    `src/components/TracesWidget.tsx`,  
    `src/components/DashboardMetricsView.tsx`,  
    `src/flows/chatbotFlow.ts`,  
    `src/nodes/extractContactDataFallback.ts`,  
    `src/nodes/updateContactMetadata.ts`,  
    `src/nodes/generateAIResponse.ts`,  
    `supabase/migrations/20260422130000_create_observability_traces.sql`,  
    `twin-plans/PLANO_SPRINTS_OBSERVABILIDADE_E_FEEDBACK.md`,  
    `twin-plans/sprints/00-sprint-zero-prep.md`,  
    `twin-plans/sprints/00-stack-e-arquitetura.md`

  - Confiança: alta

## 2026-04-20

### fix
- Corrigido erro de digitação na documentação do resumo por email do UzzApp
  - Arquivos: `docs/UZZAPP_RECURSOS_E_FEATURES.md`
  - Evidência: correção de "umm" para "um" no texto
  - Confiança: alta

## 2026-04-20

### fix
- Atualizado `pushToRedis` e `batchMessages` para incluir `clientId` nas chaves e na estrutura de entrada, garantindo segregação por cliente nas operações Redis.
- Ajustado endpoint API de teste para validar presença de `clientId` no input e incluir `clientId` na mensagem de log.
- Modificado debounce key para incluir `clientId` no fluxo principal do chatbot.
- Corrigidos imports dinâmicos para manter padrão consistente.
  - Arquivos: `src/nodes/pushToRedis.ts`, `src/nodes/batchMessages.ts`, `src/app/api/test/nodes/push-redis/route.ts`, `src/flows/chatbotFlow.ts`
  - Evidência: alteração explícita das chaves Redis para incluir `clientId` e validação no endpoint.
  - Confiança: alta

## 2026-04-20

### refactor
- Reorganizado imports e aprimorado prompt de análise de imagens para gerar descrições detalhadas e texto extraído, melhorando a busca semântica de imagens de propriedades.
- Atualizado endpoint de upload para incluir nome original do arquivo na descrição da imagem, facilitando buscas por nome de propriedade.
- Ajustes gerais de formatação e tratamento de erros no upload de documentos.
  - Arquivos: `src/app/api/documents/upload/route.ts`
  - Confiança: alta

### feat
- Implementada busca fallback por nome de arquivo quando a busca semântica não retorna resultados, permitindo encontrar documentos pelo nome original mesmo sem correspondência semântica.
- Agrupamento de resultados de busca por arquivo original, retornando apenas o chunk com maior similaridade por arquivo.
  - Arquivos: `src/nodes/searchDocumentInKnowledge.ts`
  - Confiança: alta

## 2026-04-20

### fix
- Estabilizado o cadastro automático e triggers do CRM, incluindo melhorias no tratamento de eventos e atualização de status de cards CRM com dados de mensagens enviadas e recebidas.
- Ajustado cálculo de primeira mensagem do usuário considerando histórico real para melhor integração CRM.
  - Arquivos: `src/app/api/crm/automation-executions/route.ts`, `src/nodes/updateCRMCardStatus.ts`, `src/flows/chatbotFlow.ts`
  - Evidência: inclusão de contagem de mensagens históricas para definir primeira mensagem e envio de eventos "message_sent" e "message_received" com metadados.
  - Confiança: alta

### feat
- Adicionado suporte para múltiplos campos cadastrais no chatbot, permitindo envio e armazenamento simultâneo de vários dados do contato.
- Expandido conjunto de campos cadastrais suportados, incluindo nome completo, data de nascimento, RG, CEP, endereço, bairro, cidade e estado.
- Implementada exibição ordenada e formatada dos dados cadastrais coletados no painel de contatos.
- Atualizadas definições de ferramentas para registro de dados cadastrais com validação aprimorada e instruções para uso de múltiplos campos.
- Mapeamento de aliases para novos campos cadastrais nas flows de chatbot para padronização.
  - Arquivos: `src/components/ContactsClient.tsx`, `src/nodes/generateAIResponse.ts`, `src/lib/flows/flowExecutor.ts`, `src/lib/types.ts`, `src/nodes/updateContactMetadata.ts`
  - Confiança: alta

## 2026-04-19

### fix
- Ajustada invalidação do cache de configuração do webhook ao ativar, atualizar ou deletar agentes para refletir mudanças imediatamente no WABA
  - Arquivos: `src/app/api/agents/[id]/activate/route.ts`, `src/app/api/agents/[id]/route.ts`
  - Evidência: chamadas a `invalidateWABACache` após operações de ativação, patch e delete de agentes
  - Confiança: alta

### refactor
- Modificada consulta para buscar agente ativo para usar `order` e `limit` ao invés de `single`, evitando erro se houver múltiplos agentes ativos por inconsistência
  - Arquivos: `src/lib/config.ts`
  - Confiança: alta

## 2026-04-17

### fix
- Ajustado renderização do seletor de colunas protegidas para usar fallback por campo no painel de regras de automação CRM
  - Arquivos: `src/components/crm/AutomationRulesPanel.tsx`
  - Evidência: modificação da condição que determina renderização do seletor para incluir campo protegido específico
  - Confiança: alta

## 2026-04-17

### feat
- Permitido uso de colunas protegidas na regra `move_to_column` para evitar mover cards que já estejam em colunas específicas. Implementada interface para seleção múltipla dessas colunas no painel de automações.
- Normalização dos parâmetros da ação `move_to_column` para tratar e deduplicar colunas protegidas, garantindo que a coluna de destino não esteja na lista de proteção.
- Adicionada lógica no motor de automação para pular a ação de mover se o card estiver em uma coluna protegida, lançando erro específico para controle do fluxo.
  - Arquivos: `src/app/api/crm/automation-rules/route.ts`, `src/components/crm/AutomationRulesPanel.tsx`, `src/lib/crm-automation-engine.ts`, `src/lib/crm-automation-constants.ts`
  - Confiança: alta

## 2026-04-17

### feat
- Implementado endpoint para atualização em massa do status de atendimento dos contatos por coluna no CRM (`POST /api/crm/columns/[id]/bulk-status`), com validação de status e controle de usuário que realizou transferência.
- Adicionada funcionalidade no dashboard CRM para disparar atualização em massa de status via interface, incluindo confirmação modal e feedback visual.
- Atualizado componente KanbanColumn para incluir opções de alteração em massa de status com ícones e estados de carregamento.
- Hook `useCRMCards` estendido para suportar a chamada da API de bulk update e atualizar a lista de cards após a operação.
  - Arquivos: `src/app/api/crm/columns/[id]/bulk-status/route.ts`, `src/app/dashboard/crm/page.tsx`, `src/components/crm/KanbanBoard.tsx`, `src/components/crm/KanbanColumn.tsx`, `src/hooks/useCRMCards.ts`
  - Confiança: alta

## 2026-04-17

### feat
- Implementado editor inline para nome de contato nas telas de contatos, conversas e CRM, permitindo edição direta com validação e feedback visual.
- Adicionado componente `ContactNameEditor` reutilizável com estados de edição, salvamento e cancelamento, integrado ao backend via PATCH `/api/contacts/[phone]`.
- Atualizado endpoint PATCH de contatos para validar e normalizar nome e status, incluindo novo status `fluxo_inicial`.
- Ajustado componentes `ContactsClient`, `ConversationsIndexClient` e `CardDetailPanel` para usar o editor inline e atualizar visualmente o nome do contato após edição.
  - Arquivos: `src/app/api/contacts/[phone]/route.ts`, `src/app/dashboard/crm/page.tsx`, `src/components/ContactNameEditor.tsx`, `src/components/ContactsClient.tsx`, `src/components/ConversationsIndexClient.tsx`, `src/components/crm/CardDetailPanel.tsx`
  - Confiança: alta

## 2026-04-17

### feat
- Implementado suporte a horário de funcionamento por agente, permitindo configurar dias, horários, fuso horário e mensagem fora do expediente. O bot passa a responder apenas dentro do horário configurado, com opção de enviar mensagem personalizada fora do horário.
  - Arquivos: `src/app/api/agents/[id]/route.ts`, `src/components/agents/AgentEditorModal.tsx`, `src/flows/chatbotFlow.ts`, `src/lib/agent-templates.ts`, `src/lib/business-hours.ts`, `src/lib/config.ts`, `src/lib/types.ts`, `supabase/migrations/20260417200000_add_business_hours_to_agents.sql`
  - Confiança: alta

## 2026-04-17

### chore
- Adicionada configuração local para comandos psql no Claude CLI (`.claude/settings.local.json`)
  - Arquivos: `.claude/settings.local.json`
  - Confiança: alta

### docs
- Criado documento detalhado do Plano de Arquitetura Agente Conversacional V2 com motor de políticas global, incluindo diagnóstico, visão arquitetural, componentes (PolicyStateResolver, CapabilityPolicyEngine, SkillLoader), persistência de estado, roteamento de modelo, prompt compiler, métricas, plano de implementação em 5 sprints, opt-in por cliente, riscos, guardrails operacionais e compatibilidade com legado
  - Arquivos: `docs/PLANO_ARQUITETURA_AGENTE_V2.md`
  - Confiança: alta

## 2026-04-17

### feat
- Adicionada verificação de saúde do Supabase no fluxo de login para detectar instabilidade do serviço e informar o usuário com mensagens e contagem de tentativas.
- Implementada lógica de retry no login com email para tentativas automáticas em caso de falhas de rede ou indisponibilidade temporária.
- Melhorado tratamento de erros no webhook Stripe para capturar falha na configuração do segredo e falha na verificação de assinatura, com logs específicos.
- Refatorado cliente Supabase para navegador com padronização de código e melhorias na tipagem e formatação.
  - Arquivos: `src/app/(auth)/login/page.tsx`, `src/lib/supabase-browser.ts`, `src/app/api/stripe/platform/webhooks/route.ts`
  - Confiança: alta

## 2026-04-16

### docs
- Adicionados guardrails operacionais para a arquitetura do Agente Conversacional V2, incluindo validação pós-LLM, refinamento dos estados de política, matriz de precedência para resolução de conflitos e regras de compatibilidade com legado.
- Documentada a responsabilidade clara entre CapabilityPolicyEngine e Skills para evitar acumulo indevido de regras de negócio.
- Atualizado o fluxo final do pipeline detalhando as etapas desde o parse até a atualização do policy_context.
  - Arquivos: `twin-plans/PLANO_ARQUITETURA_AGENTE_V2.md`
  - Confiança: alta

## 2026-04-16

### docs
- Generalizada a arquitetura do agente conversacional V2 para um motor de políticas global multi-tenant, substituindo o modelo específico de funil de agendamento da Umåna.
- Documentação detalha nova estrutura de PolicyStateResolver, CapabilityPolicyEngine, SkillLoader em camadas, persistência de estado via JSONB, roteamento de modelo por estado e métricas específicas por capability.
- Definidas interfaces para SlotSchema, TenantLexicon e CapabilityPolicy para configuração dinâmica por cliente, eliminando hardcodes e aumentando flexibilidade.
- Plano de implementação dividido em 5 sprints, com opt-in por cliente via configuração `agentV2` para garantir zero impacto em clientes atuais.
- Explicitação dos riscos, métricas de sucesso e referências internas para facilitar adoção e manutenção.
  - Arquivos: `twin-plans/PLANO_ARQUITETURA_AGENTE_V2.md`
  - Confiança: alta

## 2026-04-16

### docs
- Adicionado plano técnico detalhado da arquitetura Agente Conversacional V2 para melhoria do fluxo de agendamento e controle de ferramentas por estágio da conversa.
- Documento inclui diagnóstico dos problemas da versão atual, proposta de arquitetura com detecção de estágio da conversa via heurísticas, carregamento de skills específicas por estágio, persistência do estágio, roteamento de modelos, plano de implementação faseado e métricas de sucesso.
- Arquivo novo: `twin-plans/PLANO_ARQUITETURA_AGENTE_V2.md`
- Confiança: alta

## 2026-04-15

### docs
- Adicionada bateria detalhada de testes de calendário (CAL-01 a CAL-09) para validação do agendamento via bot, incluindo agendamento, cancelamento, reagendamento, verificação de disponibilidade, anti-duplicata, toggle de ativação e segurança de dados
  - Arquivos: `docs/prompts/Umana Rio Branco/QA_TESTES_UMANA.md`
  - Confiança: alta

## 2026-04-15

### feat
- Adicionado toggle para ativar ou pausar o uso do calendário pelo bot sem desconectar OAuth, controlado pelo campo `calendar_bot_enabled` nas configurações do cliente. Implementado endpoint POST `/api/calendar/toggle` para atualizar essa configuração e componente de UI com switch no dashboard do calendário para controlar essa funcionalidade.
- Atualizado o carregamento da configuração do cliente para incluir o novo toggle `botEnabled` que determina se o bot pode usar as integrações de calendário.
- Ajustada a geração de respostas da IA para considerar o toggle `botEnabled` ao injetar regras de calendário, ativando-as somente se o bot estiver habilitado e a integração estiver ativa.
  - Arquivos: `src/app/api/calendar/toggle/route.ts`, `src/app/dashboard/calendar/page.tsx`, `src/lib/config.ts`, `src/lib/types.ts`, `src/nodes/generateAIResponse.ts`
  - Confiança: alta

## 2026-04-15

### feat
- Adicionado suporte para exibir o perfil coletado pelo bot no painel de detalhes do contato, incluindo campos como "Como conheceu", "Indicado por", "Objetivo", "E-mail" e "CPF".
- Atualizadas as APIs de contatos para incluir o campo `metadata` na resposta, permitindo o acesso a informações adicionais do perfil.
  - Arquivos: `src/app/api/contacts/[phone]/route.ts`, `src/app/api/contacts/route.ts`, `src/components/ContactsClient.tsx`, `src/hooks/useContacts.ts`
  - Confiança: alta

## 2026-04-15

### feat
- Implementado bloqueio para impedir chamada de `verificar_agenda` antes da coleta completa dos dados cadastrais (como_conheceu, indicado_por, objetivo, email, CPF) no fluxo de agendamento Umana. Ajustada ordem dos passos para garantir coleta total antes de verificar disponibilidade e confirmar horário.
  - Arquivos: `CONTATOS UMANA/prommpt Umana/prompt.md`
  - Confiança: alta

## 2026-04-15

### docs
- Atualizado documento de testes QA para alinhar os casos de teste ao fluxo real do bot, corrigindo descrições e sequências de interações em múltiplos cenários de agendamento e transferência.
  - Arquivos: `docs/prompts/Umana Rio Branco/QA_TESTES_UMANA.md`
  - Confiança: alta

## 2026-04-15

### docs
- Atualizados testes de QA do bot Umana com novos fluxos detalhados de calendário, coleta de dados, agendamento, cancelamento, reagendamento, distinção entre visita e aula experimental, e prevenção de eventos duplicados.
- Incluídas tabelas de mensagens, objetivos e critérios para múltiplos testadores focados em cenários reais e comportamentos esperados.
  - Arquivos: `docs/prompts/Umana Rio Branco/QA_TESTES_UMANA.md`
  - Confiança: alta

## 2026-04-15

### feat
- Alterado fluxo de coleta de dados para iniciar somente após o usuário demonstrar intenção explícita de agendar visita ou aula experimental, evitando coleta prematura durante dúvidas ou exploração.
- Atualizado prompt e instruções no arquivo de contato Umana para refletir essa mudança no atendimento.
  - Arquivos: `CONTATOS UMANA/prommpt Umana/prompt.md`
  - Confiança: alta

## 2026-04-15

### feat
- Implementado cancelamento múltiplo de eventos na agenda via lista numerada. Agora é possível cancelar vários compromissos selecionando números da lista ou usando "todos". Ajustes na ferramenta `cancelar_evento_agenda` para suportar array de IDs (`event_ids`) e fluxo de confirmação pelo usuário.
  - Arquivos: `src/nodes/generateAIResponse.ts`, `src/nodes/handleCalendarToolCall.ts`
  - Confiança: alta

## 2026-04-15

### chore
- Atualizado `pnpm-lock.yaml` para incluir a dependência `@capacitor/camera` na versão 7.0.5
  - Arquivos: `pnpm-lock.yaml`
  - Confiança: alta

## 2026-04-15

### feat
- Implementado reagendamento de eventos no calendário com atualização parcial de título, datas e participantes, sem necessidade de cancelar e recriar o evento.
- Adicionada função para evitar duplicação de eventos, com tolerância ampliada para busca de eventos semelhantes no mesmo dia e detecção por telefone na descrição.
- Atualizadas integrações com Google Calendar e Microsoft Calendar para suportar atualização (patch) de eventos.
- Incluído novo comando de ferramenta "alterar_evento_agenda" para uso pela IA, com validação de parâmetros e mensagens de erro amigáveis.
- Refinadas regras de uso das ferramentas de calendário para incluir o reagendamento e melhorar o fluxo de cancelamento e criação.
  - Arquivos: `src/lib/calendar-client.ts`, `src/lib/google-calendar-client.ts`, `src/lib/microsoft-calendar-client.ts`, `src/nodes/generateAIResponse.ts`, `src/nodes/handleCalendarToolCall.ts`
  - Confiança: alta

## 2026-04-15

### feat
- Refinadas regras de transferência para atendimento humano e agendamento no bot Umana, diferenciando claramente entre visita gratuita (agendada autonomamente pelo bot) e aula experimental/particular (sempre com transferência para instrutor e confirmação de custo). Atualizadas orientações para coleta de dados, confirmação e criação de eventos de calendário.
  - Arquivos: `CONTATOS UMANA/prommpt Umana/prompt.md`
  - Confiança: alta

- Atualizadas regras de manipulação de eventos de calendário no código, incluindo instruções para uso exclusivo da ferramenta de cancelamento ao lidar com pedidos de cancelamento, e orientações para evitar exposição de dados sensíveis nas mensagens ao usuário. Implementada injeção de sistema com regras obrigatórias para integração com Google e Microsoft Calendar.
  - Arquivos: `src/nodes/generateAIResponse.ts`
  - Confiança: alta

## 2026-04-15

### chore
- Adicionadas diversas planilhas CSV e XLSX com listas de contatos, prospects e ex-alunos para gestão da Casa Rio Branco Umåna Yōga.
- Incluído script `xlsx-to-csv.js` para conversão de arquivos XLSX em CSV, com opções de filtro por aba, delimitador e saída.
- Adicionado arquivo HTML `canvas-uzzapp.html` com Business Model Canvas interativo para o projeto UzzApp, usando React e Tailwind CSS.
  - Arquivos: `CONTATOS UMANA/CSVs/*.csv`, `CONTATOS UMANA/CSVs/*.xlsx`, `CONTATOS UMANA/xlsx-to-csv.js`, `canvas-uzzapp.html`
  - Confiança: alta

### feat
- Implementada nova versão do prompt do chatbot para atendimento da Umåna Yōga (Casa Rio Branco & Casa Bela Vista), com regras detalhadas para:
  - Filosofia, estilo de vida e apresentação da escola
  - Fluxo de coleta de dados pré-agendamento (como conheceu, indicação, objetivo, email, CPF)
  - Diferença clara entre visita gratuita e aula experimental paga
  - Horários disponíveis para agendamento (Seg-Qui 10h-13h e 15h-20h, Sex 15h-18h)
  - Regras de linguagem para respostas no WhatsApp (crase obrigatória, vocabulário específico, proibição de markdown)
  - Gatilhos para transferência para atendimento humano e fluxo de confirmação de agendamento
  - Orientações para não oferecer contatos automaticamente, apenas sob solicitação explícita
- Arquivo principal: `CONTATOS UMANA/prommpt Umana/prompt.md`
- Confiança: alta

### feat
- CRM: Adicionada coluna JSONB `metadata` na tabela `clientes_whatsapp` para armazenar dados cadastrais coletados (CPF, email, como conheceu, indicado por, objetivo).
- Criada função RPC `merge_contact_metadata` para merge não-destrutivo dos dados no metadata.
- Novos nodes:
  - `updateContactMetadata.ts` para atualizar metadata via RPC
  - `upsertContactMetadata.ts` para detecção e inserção automática de dados no fluxo
- Modificações em nodes para suportar metadata no contexto da IA e tool call `registrar_dado_cadastral` para salvar dados coletados pelo bot.
- Fluxo chatbot atualizado para injetar dados coletados no prompt e evitar perguntas repetidas.
- Arquivos relevantes: `src/nodes/updateContactMetadata.ts`, `src/nodes/upsertContactMetadata.ts`, `src/nodes/checkOrCreateCustomer.ts`, `src/nodes/generateAIResponse.ts`, `src/flows/chatbotFlow.ts`, `src/lib/types.ts`
- Confiança: alta

### feat
- Calendário:
  - Melhorias no cancelamento de eventos: fallback para buscar evento por título e data quando `event_id` não é fornecido.
  - Ao criar evento, salva mensagem de sistema no histórico do chat para evitar duplicação de eventos.
  - Inclui email do contato como participante do evento, se disponível.
  - Modificações em `handleCalendarToolCall.ts`, `saveChatMessage.ts`, `generateAIResponse.ts`, `google-calendar-client.ts`, `microsoft-calendar-client.ts`
- Confiança: alta

### fix
- Corrigido bug de criação prematura de evento no calendário sem confirmação explícita do usuário.
- Atualizada descrição da tool `criar_evento_agenda` para exigir fluxo de confirmação em 6 passos antes de criar evento.
- Atualizado prompt Umåna para reforçar fluxo obrigatório de confirmação e evitar criação automática.
- Confiança: alta
- Evidência: alteração na descrição da tool e regras no prompt para confirmação explícita antes de criar evento.

### feat
- Mobile: integração da câmera via Capacitor e adição de botão "voltar" nas telas de contatos e conversas.
- Confiança: alta

### fix
- Templates:
  - Corrigido erro 404 ao editar templates em rascunho no dashboard.
  - Backend atualizado para suportar documentos PDF como header de template.
- Pendências: UI para upload de PDF e bug accordion no dashboard.
- Arquivos: `src/app/dashboard/templates/[id]/edit/page.tsx`, `src/lib/meta.ts`, `src/app/api/templates/send/route.ts`
- Confiança: alta

## 2026-04-15

### feat
- Adicionada ferramenta para captura e registro de dados cadastrais do contato (ex: CPF, email, indicação) para evitar perguntas repetidas em futuras conversas.
- Implementadas regras rigorosas para criação de eventos na agenda, exigindo confirmação explícita do usuário e evitando duplicidade de eventos.
- Incluído envio de metadados cadastrais coletados no contexto da conversa para o modelo de IA, melhorando o fluxo de atendimento.
  - Arquivos: `src/nodes/generateAIResponse.ts`
  - Confiança: alta

## 2026-04-15

### feat
- Adicionada coluna JSONB `metadata` para armazenar dados flexíveis de contatos em `clientes_whatsapp`, com suporte a tabelas legadas e índice GIN para consultas eficientes.
- Criada função RPC `merge_contact_metadata` para mesclar dados de metadata de contatos de forma segura e multi-tenant, atualizando registros por telefone e client_id quando disponível.
  - Arquivos: `supabase/migrations/20260415110000_add_metadata_to_clientes_whatsapp.sql`, `supabase/migrations/20260415113000_create_merge_contact_metadata_rpc.sql`
  - Confiança: alta

## 2026-04-15

### feat
- Adicionado suporte para cancelar eventos existentes na agenda sem criar novos compromissos. Implementada nova ferramenta "cancelar_evento_agenda" que permite cancelar eventos pelo ID, título e/ou intervalo de datas, com lógica para busca e seleção do compromisso mais adequado para cancelamento.
  - Arquivos: `src/flows/chatbotFlow.ts`, `src/lib/calendar-client.ts`, `src/lib/google-calendar-client.ts`, `src/lib/microsoft-calendar-client.ts`, `src/nodes/generateAIResponse.ts`, `src/nodes/handleCalendarToolCall.ts`
  - Confiança: alta

## 2026-04-15

### feat
- Integrado plugin de câmera do Capacitor para Android e iOS, incluindo permissões necessárias nos manifestos e plist. Adicionados scripts PowerShell para build e pré-verificação de release Android no Windows. 
- Adicionado botão "Voltar" nas telas de contatos e conversas para facilitar navegação ao dashboard.
  - Arquivos: `android/app/src/main/AndroidManifest.xml`, `ios/App/App/Info.plist`, `android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle`, `capacitor.config.ts`, `package.json`, `src/components/ContactsClient.tsx`, `src/components/ConversationsIndexClient.tsx`, `scripts/android-preflight-check.ps1`, `scripts/build-android-release.ps1`
  - Confiança: alta

## 2026-04-15

### feat
- Incluído nome e telefone do contato na criação de eventos no calendário, com sanitização e formatação dos dados para título e descrição do evento. Também simplificada a exibição da faixa de horário do evento considerando fuso horário de São Paulo.
  - Arquivos: `src/nodes/handleCalendarToolCall.ts`, `src/flows/chatbotFlow.ts`
  - Confiança: alta

## 2026-04-14

### feat
- Melhorado o tratamento de erros na API de teste de agentes com mensagens em português mais amigáveis para problemas comuns como chave de API ausente, inválida, limite de requisições e modelo não encontrado
  - Arquivos: `src/app/api/agents/[id]/test/route.ts`
  - Confiança: alta

## 2026-04-13

### feat
- Adicionado verificação de permissões de token na rota de signup embutido da Meta e padronizado strings de tipos de sincronização para minúsculas em `coexistence-sync.ts`
  - Arquivos: `src/app/api/auth/meta/embedded-signup/route.ts`, `src/lib/coexistence-sync.ts`
  - Confiança: alta

## 2026-04-13

### feat
- Adicionada verificação de permissão `whatsapp_business_messaging` no token durante o signup embutido para alertar sobre possíveis limitações no envio de templates
  - Arquivos: `src/app/api/auth/meta/embedded-signup/route.ts`
  - Confiança: alta

- Refatorado envio de mensagens agendadas para usar configuração de cliente obtida via Vault com cache para otimizar múltiplos envios; implementado uso das funções `sendTemplateMessage` e `sendTextMessage` para envio via API do WhatsApp
  - Arquivos: `src/app/api/cron/scheduled-messages/route.ts`
  - Confiança: alta

- Melhorada a mensagem de erro ao enviar templates no componente de seleção, exibindo detalhes adicionais quando disponíveis
  - Arquivos: `src/components/TemplateSelectorDialog.tsx`
  - Confiança: alta

## 2026-04-11

### feat
- Implementado reordenamento de colunas no quadro Kanban usando contexto sortable do dnd-kit, permitindo arrastar e soltar colunas horizontalmente.
- Removidos botões de mover coluna para esquerda/direita, substituídos pela interação drag-and-drop para reordenar colunas.
- Criado componente `SortableColumn` para encapsular a lógica de sortable nas colunas do Kanban.
- Ajustes no componente `KanbanBoard` para gerenciar estado local da ordem das colunas e atualizar ordem via callback `onReorderColumns`.
- Atualizada renderização das colunas para usar `SortableContext` com estratégia horizontal e ordenar colunas conforme estado local.
  - Arquivos: `src/components/crm/KanbanBoard.tsx`, `src/components/crm/KanbanColumn.tsx`, `src/components/crm/SortableColumn.tsx`, `src/app/dashboard/crm/page.tsx`
  - Confiança: alta

## 2026-04-11

### feat
- Adicionado logging para regras de automação CRM que foram correspondidas e executadas, facilitando o monitoramento e debug
  - Arquivos: `src/lib/crm-automation-engine.ts`
  - Confiança: alta

## 2026-04-11

### fix
- Reduzido TTL do cache de regras de automação de 5 minutos para 30 segundos para melhorar atualização de dados
  - Arquivos: `src/lib/crm-automation-engine.ts`
  - Evidência: alteração do valor da constante `RULE_CACHE_TTL_MS` de 300000 para 30000
  - Confiança: alta

## 2026-04-11

### feat
- Adicionado logging para regras de automação CRM que são puladas por não atenderem condições de gatilho
  - Arquivos: `src/lib/crm-automation-engine.ts`
  - Confiança: alta

## 2026-04-11

### feat
- Adicionado logging detalhado para classificação de intenção CRM e atualizações de status de cartão, incluindo início, resultados e casos de skip para melhor monitoramento e diagnóstico.
  - Arquivos: `src/flows/chatbotFlow.ts`, `src/lib/crm-intent-classifier.ts`, `src/nodes/updateCRMCardStatus.ts`
  - Confiança: alta

### refactor
- Melhorias de formatação e padronização no código da engine de automação CRM, incluindo ajustes em quebras de linha, indentação e chamadas de funções para maior legibilidade.
  - Arquivos: `src/lib/crm-automation-engine.ts`
  - Confiança: alta

## 2026-04-11

### refactor
- Melhorada a segurança de tipos e o logging na função `getActiveAgent` para maior clareza e consistência
  - Arquivos: `src/lib/config.ts`
  - Confiança: alta

## 2026-04-11

### refactor
- Otimizado o hook `useConversations` para evitar fetches desnecessários quando o limite é zero e melhor gerenciamento de polling e realtime; ajustado `ConversationsIndexClient` e `ConversationPageClient` para usar lógica de fetch condicional baseada no filtro de status, reduzindo chamadas duplicadas e melhorando performance.
- Melhorias no componente `ConversationPageClient` e `ConversationsIndexClient` para evitar chamadas redundantes, ajustar memoização e callbacks, e limpar imports e formatação.
- Refatoração no fluxo `chatbotFlow` para aprimorar logging detalhado da configuração do agente e do cliente no início do processamento, além de melhorias na organização de imports.
- Refatorado handler `handleAudioToolCall` para evitar fallback com base64 no upload de áudio, usando apenas URLs permanentes quando disponíveis e adicionando logs de advertência em falhas de upload; reorganização e limpeza de imports.
- Ajustes no endpoint de ativação de agentes para melhorar tratamento de erros e logs detalhados ao ativar/desativar agentes.
- Adicionado logging detalhado na resolução da configuração do cliente e do agente ativo para facilitar debugging.
- Ajustes no `apiFetch` para garantir o header `Content-Type: application/json` em requisições com corpo JSON.
  - Arquivos: `src/hooks/useConversations.ts`, `src/components/ConversationsIndexClient.tsx`, `src/components/ConversationPageClient.tsx`, `src/flows/chatbotFlow.ts`, `src/handlers/handleAudioToolCall.ts`, `src/app/api/agents/[id]/activate/route.ts`, `src/lib/api.ts`, `src/lib/config.ts`
  - Confiança: alta

### fix
- Ajustado handler `handleAudioToolCall` para salvar mensagem mesmo quando upload do áudio falha, evitando perda de mensagem e registrando erros detalhados.
- Melhorado tratamento de erros no endpoint PATCH `/api/agents/[id]` com logs detalhados de validação e atualização.
  - Arquivos: `src/handlers/handleAudioToolCall.ts`, `src/app/api/agents/[id]/route.ts`, `src/app/api/agents/[id]/activate/route.ts`
  - Evidência: inclusão de logs de erro e retorno de detalhes em respostas HTTP; fallback para salvar mensagens sem URL de áudio.
  - Confiança: alta

## 2026-04-08

### feat
- Adicionado suporte a localidade pt-BR no Stripe Checkout para melhorar experiência regional; aprimorada gestão de cupons no dashboard admin permitindo uso de códigos legíveis e seleção de cupom na geração de links de checkout
  - Arquivos: `src/app/api/admin/billing/checkout-session/route.ts`, `src/app/api/admin/billing/coupons/route.ts`, `src/app/dashboard/admin/billing/page.tsx`
  - Confiança: alta

### refactor
- Refatorado componente `ConversationPageClient` e `ConversationsIndexClient` para usar lista completa de conversas sem filtro de status, garantindo consistência na exibição e seleção de conversas; ajustes na contagem de mensagens não lidas e métricas por status
  - Arquivos: `src/components/ConversationPageClient.tsx`, `src/components/ConversationsIndexClient.tsx`
  - Confiança: alta

### refactor
- Modernizada sintaxe e organização do componente `StatusToggle` com padronização de aspas, tipagem e imports; mantida lógica funcional com melhorias na legibilidade do código
  - Arquivos: `src/components/StatusToggle.tsx`
  - Confiança: alta

## 2026-04-08

### feat
- Adicionados scripts para exportar apresentações UzzApp para PDF com alta fidelidade visual e texto extraível, utilizando transformações CSS/DOM aplicadas somente no momento da exportação via Puppeteer.
- Implementada estratégia híbrida de exportação PDF que preserva o HTML original para edição e aplica correções específicas para compatibilidade PDF durante a geração, incluindo conversão de textos em gradiente para SVG inline e estabilização de botões CTA.
- Refinadas versões da exportação híbrida para reduzir alterações visuais excessivas, mantendo estilos originais para elementos estáveis e estabilizando apenas camadas frágeis, além de ajuste específico para botões CTA com fundo sólido e redução do deviceScaleFactor para diminuir o tamanho do PDF.
- Documentada e implementada variante experimental PDF-safe que substitui efeitos CSS instáveis por primitivas SVG e superfícies estáticas para melhorar compatibilidade e fidelidade em visualizadores móveis.
- Evolução da geração de apresentações PPTX da UzzApp: reconstrução inicial baseada em imagens, seguida por rebuild nativo e editável com PptxGenJS, complementado por pós-processamento com python-pptx para aplicação de gradientes nativos e alinhamento refinado do fundo com o gradiente HTML via edição XML direta.
- Incluída automação PowerShell para pipeline híbrido PPTX e validação via PowerPoint COM, garantindo preservação de hyperlinks e qualidade visual.
- Atualizado domínio de arquitetura e estado do projeto com detalhamento das decisões de runtime AI, regras operacionais, snapshot do estado do repositório, e evolução das estratégias de exportação e rebuild da apresentação UzzApp.

  - Arquivos principais:  
    `scripts/export-uzzapp-luis-exportonly-hybrid-pdf.js`,  
    `scripts/export-uzzapp-luis-pdf.js`,  
    `scripts/export-uzzapp-luis-image-pdf.js`,  
    `docs/UzzApp apresentacao Luis/UzzApp_Apresentacao_Comercial_v2*.pdf`,  
    `docs/UzzApp apresentacao Luis/pptx-rebuild/build-uzzapp-ppt.js`,  
    `docs/UzzApp apresentacao Luis/pptx-rebuild/postprocess-native-gradients.py`,  
    `docs/UzzApp apresentacao Luis/pptx-rebuild/rebuild-native-gradients.ps1`,  
    `.brv/context-tree/architecture/_index.md`,  
    `.brv/context-tree/architecture/project_state/_index.md`
  - Confiança: alta

## 2026-04-01

### feat
- Filtrado cupons Stripe para incluir apenas os específicos do UzzApp e adicionado metadata para identificar novos cupons como do UzzApp
  - Arquivos: `src/app/api/admin/billing/coupons/route.ts`
  - Confiança: alta

## 2026-04-01

### feat
- Adicionado controle de papéis de usuário no layout do dashboard para habilitar navegação condicional e exibir seções administrativas apenas para admins.
- Atualizada navegação do dashboard para mostrar itens de "Pagamentos" e "Gestão de Clientes" somente para usuários com papel "admin", com badges indicativos.
- Melhorada interface da página de pagamentos, removendo botões de checkout e billing portal e ajustando layout e textos para foco em onboarding e gerenciamento de produtos.
  - Arquivos: `src/app/dashboard/layout.tsx`, `src/components/DashboardLayoutClient.tsx`, `src/components/DashboardNavigation.tsx`, `src/app/dashboard/payments/page.tsx`
  - Confiança: alta

## 2026-04-01

### feat
- Implementado sistema completo de gerenciamento de faturamento, incluindo APIs para planos, cupons, assinaturas, checkout e portal de faturamento.
- Adicionado dashboard administrativo para visualização e controle de clientes, assinaturas, planos e cupons com funcionalidades de criação, cancelamento e geração de links de pagamento.
- Criado componente de banner para exibir status de pagamento pendente ou conta suspensa no dashboard do cliente.
- Implementado componente PaymentWall para bloquear acesso ao dashboard em caso de assinatura pendente, cancelada ou suspensa, com opção de checkout integrado.
- Integrado lógica de ciclo de vida de assinaturas com Stripe via webhooks, incluindo tratamento de períodos de carência, suspensão automática e atualização de status no banco.
- Adicionado endpoint cron para aplicação automática de suspensão em clientes com período de carência expirado.
- Integrado fluxo de checkout na página de onboarding, com validação de status de assinatura e redirecionamento para pagamento.
- Atualizado layout do dashboard para incluir navegação e banner de status de faturamento.
- Adicionado rota e botão no dashboard admin para acesso ao painel de faturamento.
  - Arquivos principais: `src/app/api/admin/billing/*`, `src/app/api/billing/*`, `src/app/api/cron/enforce-grace-period/route.ts`, `src/app/api/stripe/platform/webhooks/route.ts`, `src/app/dashboard/admin/billing/page.tsx`, `src/app/dashboard/billing/page.tsx`, `src/app/onboarding/page.tsx`, `src/components/BillingStatusBanner.tsx`, `src/components/PaymentWall.tsx`, `src/components/DashboardLayoutClient.tsx`, `src/components/DashboardNavigation.tsx`
  - Confiança: alta

## 2026-04-01

### feat
- Implementada paginação incremental ("load more") e busca no backend para contatos, com debounce na busca no frontend.
- Atualizada API de contatos para suportar parâmetros de busca e paginação robusta com limites e offsets validados.
- Ajustada interface de contatos para exibir botão "Carregar mais" ao final da lista, mostrando quantidade total e carregando mais itens sob demanda.
- Refatorado hook `useContacts` para gerenciar estados de carregamento, paginação incremental, busca e controle de mais resultados.
  - Arquivos: `src/app/api/contacts/route.ts`, `src/components/ContactsClient.tsx`, `src/hooks/useContacts.ts`
  - Confiança: alta

## 2026-04-01

### feat
- Adicionado botão "Pular e ir para o Dashboard" na etapa de conexão do WhatsApp no onboarding para permitir avanço direto
  - Arquivos: `src/app/onboarding/page.tsx`
  - Confiança: alta
```

## 2026-03-31

### chore
- Atualizadas as credenciais do app Meta para o novo app ID 1444733643784802
  - Arquivos: `docs/meta/UzzApp SaaS Oficial_Meta_App_Review_Submitted_On_2026-03-27.pdf`
  - Confiança: alta

## 2026-03-31

### fix
- Ajustado largura do painel de automações e padding do scroll para evitar conteúdo cortado na interface CRM
  - Arquivos: `src/components/crm/AutomationRulesPanel.tsx`
  - Evidência: alteração da classe CSS de largura de `sm:max-w-lg` para `sm:max-w-xl` e ajuste no padding do ScrollArea
  - Confiança: alta

## 2026-03-31

### fix
- Reforçado endpoints de engine e logs de automação CRM para compatibilidade com esquemas de banco e maior estabilidade em transações, incluindo fallback para consultas em tabelas legadas e tratamento de erro de coluna ausente
  - Arquivos: `src/app/api/crm/automation-executions/route.ts`, `src/app/api/crm/automation-rules/[id]/executions/route.ts`
  - Evidência: captura e tratamento do erro de código 42703 (coluna ausente) com queries alternativas
  - Confiança: alta

### refactor
- Adaptado registro de atividades de automação para detectar dinamicamente backend disponível (`crm_activity_log` ou `crm_card_activities`) e normalizar tipos de atividade, garantindo compatibilidade com diferentes versões do banco
- Removido campo `contact_name` da consulta de contexto do cartão, passando a retornar sempre null
  - Arquivos: `src/lib/crm-automation-engine.ts`
  - Confiança: alta

## 2026-03-31

### feat
- Adicionada API para consulta de logs de execuções das automações CRM com filtros por status, trigger, regra, dias e limite. Implementada interface no painel de regras para visualização detalhada desses logs, incluindo dados mascarados para usuários não administradores.
- Melhorada a lógica de disparo de eventos de automação no chatbot para considerar intents sem checagem rígida de confiança mínima.
- Ajustada a avaliação de confiança mínima em triggers de automação para usar um valor padrão do threshold do trigger quando não especificado nas condições.
  - Arquivos: `src/app/api/crm/automation-executions/route.ts`, `src/components/crm/AutomationRulesPanel.tsx`, `src/flows/chatbotFlow.ts`, `src/lib/crm-automation-engine.ts`
  - Confiança: alta

## 2026-03-31

### feat
- Atualizado snapshot do projeto ChatBot-Oficial com estado da arquitetura, runtime e fatos operacionais datados de 2026-03-31
- Documentada decisão arquitetural de manter `callDirectAI()` como núcleo determinístico do runtime AI em tempo real, excluindo frameworks pesados para fluxo principal
- Registrada regra operacional obrigatória para ByteRover: todas as operações devem usar `cwd='C:\Users\Luisf\Documents\GITHUB\ChatBot-Oficial'`
- Capturado padrão reutilizável para exportação móvel e PDF da apresentação comercial com slides fixos em 1280x720 e escala CSS, garantindo fidelidade e estabilidade na exportação Puppeteer
- Alterada configuração global de tema padrão para fallback em modo claro (`defaultTheme='light'`) no `ThemeProvider` em `src/app/layout.tsx`, afetando usuários sem preferência salva
  - Arquivos: `.brv/context-tree/architecture/_index.md`, `.brv/context-tree/architecture/project_state/_index.md`, `.brv/context-tree/facts/_index.md`, `.brv/context-tree/facts/project/_index.md`, `.brv/context-tree/architecture/project_state/theme_default_fallback_light_mode_2026_03_31.md`, `.brv/context-tree/facts/project/theme_fallback_default_light_2026_03_31.md`, `src/app/layout.tsx`, `docs/UzzApp_Apresentacao_Comercial_v2.html`, `docs/UzzApp_Apresentacao_Comercial_v2.pdf`, `scripts/export-uzzapp-commercial-pdf.js`
  - Confiança: alta

## 2026-03-31

### fix
- Alterado o tema padrão da aplicação de escuro para claro no layout principal
  - Arquivos: `src/app/layout.tsx`
  - Evidência: modificação da propriedade `defaultTheme` de "dark" para "light" no componente `ThemeProvider`
  - Confiança: alta

## 2026-03-31

### chore
- Adicionada documentação arquitetural detalhada e fatos de projeto para ChatBot-Oficial, incluindo modelo de execução AI, decisões de framework, estado do repositório e padrões de exportação PDF
  - Arquivos: `.brv/context-tree/_index.md`, `.brv/context-tree/_manifest.json`, `.brv/context-tree/architecture/_index.md`, `.brv/context-tree/architecture/ai_runtime/_index.md`, `.brv/context-tree/architecture/ai_runtime/agent_framework_decision_for_realtime_flow.md`, `.brv/context-tree/architecture/ai_runtime/byterover_global_mode_cwd_requirement.md`, `.brv/context-tree/architecture/ai_runtime/context.md`, `.brv/context-tree/architecture/context.md`, `.brv/context-tree/architecture/project_state/_index.md`, `.brv/context-tree/architecture/project_state/chatbot_oficial_snapshot_2026_03_31.md`, `.brv/context-tree/architecture/project_state/commercial_deck_mobile_pdf_export_pattern.md`, `.brv/context-tree/architecture/project_state/context.md`, `.brv/context-tree/facts/_index.md`, `.brv/context-tree/facts/context.md`, `.brv/context-tree/facts/project/_index.md`, `.brv/context-tree/facts/project/byterover_cwd_requirement_for_repository.md`, `.brv/context-tree/facts/project/chatbot_oficial_state_facts_2026_03_31.md`, `.brv/context-tree/facts/project/commercial_deck_export_facts_2026_03_31.md`, `.brv/context-tree/facts/project/context.md`, `.brv/context-tree/facts/project/initial_byterover_repository_sanity_check.md`
  - Confiança: alta

### feat
- Implementado padrão reutilizável para exportação confiável de apresentações comerciais em PDF com suporte a visualização móvel responsiva via escala CSS
- Adicionado script de geração de PDF determinístico usando Puppeteer para o deck comercial
- Corrigidos caminhos de imagens quebradas para garantir integridade dos recursos na exportação PDF
  - Arquivos: `docs/UzzApp_Apresentacao_Comercial_v2.html`, `scripts/export-uzzapp-commercial-pdf.js`, `docs/UzzApp_Apresentacao_Comercial_v2.pdf`
  - Confiança: alta

### docs
- Atualizadas instruções em `AGENTS.md`, `CLAUDE.md` e `.github/copilot-instructions.md` para exigir passagem explícita do parâmetro `cwd` com o caminho do repositório em chamadas ByteRover MCP devido ao modo global do servidor
- Ajustada apresentação comercial HTML original para corrigir estilos e garantir compatibilidade com exportação PDF e visualização móvel
  - Arquivos: `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `UzzApp_Apresentacao_Comercial.html`
  - Confiança: alta

## 2026-03-31

### fix
- Normalizada a intenção comercial (LLM intents) para garantir consistência no processamento das regras de automação CRM e persistência de execuções de regras puladas com motivo registrado.
- Ajustado para registrar logs de regras puladas quando as condições ou triggers não são atendidas, melhorando rastreabilidade das execuções.
  - Arquivos: `src/app/api/crm/automation-rules/route.ts`, `src/lib/crm-automation-engine.ts`, `src/lib/crm-intent-classifier.ts`, `src/lib/crm-intent-normalizer.ts`
  - Evidência: inclusão de função `normalizeCommercialIntent` aplicada nas intenções e registro de execuções com status "skipped" e motivo.
  - Confiança: alta

## 2026-03-31

### feat
- Adicionado toggle `crm_engine_v2` nas configurações do CRM e painel de automações para ativar o novo motor de automações por cliente. Incluído também opção para habilitar trigger de intenção/urgência assistida por IA com ajuste de limiar de confiança.
  - Arquivos: `src/app/api/crm/settings/route.ts`, `src/components/crm/AutomationRulesPanel.tsx`
  - Confiança: alta

## 2026-03-31

### feat
- Implementada a versão 2 do motor de automação CRM com suporte a múltiplas fases (2, 3, 4 e 5 opcionais), incluindo:
  - Novo sistema de regras de automação com validação JSONLogic para condições complexas.
  - Suporte a múltiplas etapas de ação com políticas de erro (continuar, parar, compensar).
  - Implementação de fila de mensagens mortas (DLQ) para ações externas com retry exponencial.
  - Agendamento de ações com delay e processamento via cron jobs.
  - Novos triggers: `keyword_detected`, `intent_detected` e `urgency_detected` com classificação LLM integrada.
  - Novas ações: envio de mensagem WhatsApp com fallback para template, notificação push para usuários.
  - Interface de usuário atualizada para gerenciar múltiplas etapas, histórico de execuções e ordenação das regras.
  - Integração de eventos Stripe `payment_completed` para disparar automações.
  - Máscara de dados sensíveis em logs e respostas API para usuários não administradores.
  - Novas APIs REST para listar, simular, reordenar regras, gerenciar ações agendadas e limpar filas.
  - Classificador de intenção CRM usando LLM com fallback determinístico e controle de orçamento diário.
  - Atualização das configurações CRM para suportar templates de próximos passos e janela de silêncio para notificações.
  - Migrações SQL para criar tabelas `crm_action_dlq` e `crm_scheduled_actions` e alterar `crm_settings`.
  - Ajustes no fluxo chatbot para emitir eventos de automação baseados em palavras-chave e intenções detectadas.
  - Cache em memória para regras de automação com TTL de 5 minutos e limpeza seletiva.
  - Controle de concorrência via lock otimista por cartão para evitar execuções paralelas conflitantes.
- Arquivos principais: `src/lib/crm-automation-engine.ts`, `src/components/crm/AutomationRulesPanel.tsx`, `src/lib/crm-intent-classifier.ts`, `src/app/api/crm/automation-rules/route.ts`, `src/app/api/crm/automation-rules/[id]/executions/route.ts`, `src/app/api/crm/automation-rules/reorder/route.ts`, `src/app/api/crm/automation-rules/simulate/route.ts`, `src/app/api/crm/scheduled-actions/route.ts`, `src/app/api/crm/scheduled-actions/[id]/route.ts`, `src/app/api/cron/crm-dlq-retry/route.ts`, `src/app/api/cron/crm-scheduled-actions/route.ts`, `src/app/api/stripe/webhooks/route.ts`, `src/lib/crm-automation-pii.ts`, `src/lib/crm-automation-constants.ts`, `src/flows/chatbotFlow.ts`, `supabase/migrations/20260331133000_crm_automation_engine_v2_phase2_operational.sql`
- Confiança: alta

## 2026-03-31

### feat
- Implementada a fase 1 da fundação do CRM Automation Engine v2 com suporte a regras avançadas, condições complexas e múltiplos passos de ação.
- Adicionado novo schema e trigger no banco para versionamento automático das regras e controle de idempotência nas execuções.
- Criada biblioteca `crm-automation-engine.ts` para processamento canônico das regras no backend, substituindo lógica legada.
- Atualizados endpoints API CRM para usar autenticação via sessão, validar tipos de triggers e ações, e suportar novo formato de regras com múltiplos passos.
- Adicionada emissão de eventos de automação em movimentação de cards, captura de origem de leads e atualização de status CRM, com deduplicação e controle de concorrência.
- Criados jobs cron para limpeza de logs antigos de execuções e verificação periódica de inatividade de cards, emitindo eventos para engine.
- Atualizado componente UI `AutomationRulesPanel` para suportar novo tipo de condição "column_select" para triggers de movimentação de cards.
- Atualizadas constantes de triggers e ações CRM para refletir novos tipos e corrigir textos.
- Ajustada lógica dos nodes `captureLeadSource` e `updateCRMCardStatus` para usar o novo engine canônico e remover lógica legada.
- Atualizado método `ensureCRMCard` para emitir evento `card_created` via engine após criação.
- Configurado feature flag global e por cliente para ativar/desativar o novo engine.
- Adicionadas rotinas para criação automática de regras padrão CRM para novos clientes.
- Atualizado `vercel.json` para incluir agendamento dos novos crons de inatividade e limpeza.

- Arquivos principais:  
  `src/lib/crm-automation-engine.ts`,  
  `src/app/api/crm/automation-rules/route.ts`,  
  `src/lib/jobs/inactivity-check.ts`,  
  `src/app/api/cron/inactivity-check/route.ts`,  
  `src/app/api/cron/crm-executions-cleanup/route.ts`,  
  `src/nodes/captureLeadSource.ts`,  
  `src/nodes/updateCRMCardStatus.ts`,  
  `src/components/crm/AutomationRulesPanel.tsx`,  
  `src/lib/crm-automation-constants.ts`,  
  `supabase/migrations/20260331120000_crm_automation_engine_v2_phase1.sql`,  
  `vercel.json`
- Confiança: alta

## 2026-03-31

### feat
- Adicionados controles para mover colunas do Kanban para esquerda e direita na tela CRM, permitindo reordenar colunas via botões de setas.
- Implementada função de reordenação das colunas com atualização da posição no backend.
- Atualizados componentes `KanbanBoard` e `KanbanColumn` para suportar os novos controles de movimentação lateral das colunas, incluindo desabilitação dos botões quando a coluna está na extremidade.
  - Arquivos: `src/app/dashboard/crm/page.tsx`, `src/components/crm/KanbanBoard.tsx`, `src/components/crm/KanbanColumn.tsx`
  - Confiança: alta

## 2026-03-31

### fix
- Unificado persistência de importação de contatos no CRM para usar consultas SQL diretas em vez do cliente Supabase, melhorando consistência e controle das operações.
- Corrigida lógica de movimentação e criação de cards no CRM, incluindo registro de logs de atividade e contagem correta de cards criados, movidos e erros.
- Ajustada interface e exibição no frontend para mostrar quantidade de cards movidos no CRM durante importação de contatos.
  - Arquivos: `src/app/api/contacts/import/route.ts`, `src/components/ContactsClient.tsx`, `src/lib/types.ts`
  - Evidência: substituição de chamadas Supabase por queries SQL, adição de campo `cardsMoved` e ajuste na contagem e exibição no cliente.
  - Confiança: alta

## 2026-03-31

### feat
- Integrada opção de adicionar contatos importados como cards no CRM, com seleção de coluna e controle de criação/atualização automática dos cards e registro de atividades.
- Adicionado switch e seleção de coluna no modal de importação de contatos para ativar a criação automática de cards no CRM.
- Atualizada API de importação para suportar parâmetro de adição ao CRM e retornar contagem de cards criados e erros.
- Ajustado hook `useContacts` para suportar opção de adicionar contatos ao CRM na importação.
  - Arquivos: `src/app/api/contacts/import/route.ts`, `src/components/ContactsClient.tsx`, `src/hooks/useContacts.ts`, `src/lib/types.ts`
  - Confiança: alta

## 2026-03-31

### feat
- Adicionado mapeamento manual de colunas para importação CSV de contatos, com sugestões automáticas baseadas em aliases comuns para telefone, nome e status. Agora é possível selecionar quais colunas do CSV correspondem a cada campo no sistema, incluindo opção para não importar nome ou usar status padrão.
- Implementada normalização e validação dos cabeçalhos CSV para melhorar robustez do importador.
- Interface de importação atualizada para exibir seletores de coluna após o upload do arquivo, obrigando seleção da coluna de telefone para habilitar o botão de importação.
  - Arquivos: `src/components/ContactsClient.tsx`
  - Confiança: alta

## 2026-03-31

### fix
- Tornado o endpoint de importação de contatos seguro para execução serverless, com validação aprimorada de telefones brasileiros, incluindo normalização, erros e avisos para números incompletos. Adicionada verificação e tratamento de status inválidos e prevenção de duplicatas via Supabase client.
- Incluído suporte a avisos na resposta da importação e exibidos no frontend com contagem e detalhes, melhorando a visibilidade de contatos importados com possíveis problemas.
  - Arquivos: `src/app/api/contacts/import/route.ts`, `src/components/ContactsClient.tsx`, `src/lib/types.ts`
  - Evidência: refatoração para uso de `createRouteHandlerClient`, validações detalhadas de telefone e status, inclusão de warnings no resultado e UI.
  - Confiança: alta

## 2026-03-26

### feat
- Implementado sistema de arquivamento dos eventos de webhook da Meta com persistência em banco de dados, incluindo tabela `meta_webhook_events` e funções para inserir e atualizar registros de eventos.
- Integrado arquivamento e atualização do status de processamento dos webhooks nas rotinas de tratamento de eventos, permitindo rastreamento de sucesso ou falha no processamento.
- Adicionado filtro para ignorar tipos específicos de mensagens no histórico (`errors`), com logs para mensagens ignoradas durante a sincronização de histórico.
- Ajustado persistência de mensagens do histórico para considerar status de leitura ao importar dados, incluindo atualização do campo `last_read_at` em contatos sincronizados.
- Criadas funções auxiliares para mapear status de mensagens e decidir se uma mensagem do histórico deve ser ignorada.
  - Arquivos: `src/app/api/webhook/route.ts`, `supabase/migrations/20260326194000_create_meta_webhook_events.sql`
  - Confiança: alta

## 2026-03-26

### fix
- Atualizado mapeamento do tipo de sincronização na função `requestCoexistenceSync` para usar valores corretos da API Meta
  - Arquivos: `src/lib/coexistence-sync.ts`
  - Evidência: substituição direta do valor `sync_type` pelo mapeamento `META_SYNC_TYPE_MAP` com chaves `contacts` e `history`
  - Confiança: alta

## 2026-03-26

### fix
- Atualizada mensagem de aviso sobre elegibilidade do cliente para sincronização em modo coexistência, removendo bloqueio e ajustando texto para indicar prosseguimento sem verificação local
  - Arquivos: `src/app/api/client/whatsapp-sync/route.ts`
  - Evidência: alteração da mensagem de console.warn e remoção do retorno de erro 400
  - Confiança: alta

## 2026-03-26

### fix
- Corrigida formatação de comentário no script de migração `add_onboarding_type_to_clients.sql`
  - Arquivos: `supabase/migrations/20260325180609_add_onboarding_type_to_clients.sql`
  - Evidência: ajuste em comentário para padronização
  - Confiança: alta

## 2026-03-26

### feat
- Melhorado tratamento e logging de erros na sincronização com WhatsApp, incluindo avisos para requisições não autenticadas, tipos inválidos, cliente não encontrado, elegibilidade para sincronização coexistente e falhas na obtenção de token Meta.
- Ajustada lógica e interface no dashboard de configurações para exibir o cartão de sincronização coexistente com base em nova condição, além de mensagens informativas sobre o tipo de onboarding do cliente.
  - Arquivos: `src/app/api/client/whatsapp-sync/route.ts`, `src/app/dashboard/settings/page.tsx`
  - Confiança: alta

## 2026-03-26

### feat
- Implementada sincronização coexistente para contatos e histórico do WhatsApp Business App via API Meta, com controle de estado e interface no dashboard de configurações.
- Adicionada nova rota API `/api/client/whatsapp-sync` para solicitar sincronização de contatos ou histórico, validando permissões e estado do cliente.
- Expandido processamento de webhooks para suportar payloads de sincronização de contatos e histórico, persistindo dados em tabelas específicas e atualizando status de provisionamento.
- Atualizado dashboard de configurações para exibir status detalhado das sincronizações coexistentes, com botões para solicitar sincronização manual e feedback visual do progresso e erros.
- Ajustado tratamento de mensagens para priorizar conteúdo de dashboard em histórico sincronizado.
- Criada biblioteca `coexistence-sync` para gerenciar estado, requisição e atualização do status de sincronização coexistente, incluindo lógica de bloqueio e janela de 24h para solicitações.
  - Arquivos: `src/app/api/client/whatsapp-sync/route.ts`, `src/app/api/webhook/route.ts`, `src/app/api/client/config/route.ts`, `src/app/dashboard/settings/page.tsx`, `src/lib/coexistence-sync.ts`, `src/hooks/useRealtimeMessages.ts`
  - Confiança: alta

## 2026-03-26

### feat
- Melhorada a lógica do endpoint GET `/api/messages/[phone]` para unificar e deduplicar mensagens vindas das tabelas `n8n_chat_histories` e `messages`, com cálculo de score para preferir mensagens mais ricas em metadados e tratamento especial para mensagens interativas. Inclui parsing robusto de JSON e limpeza de conteúdo.
- Implementado webhook multi-tenant unificado em `/api/webhook/route.ts` com validação HMAC, lookup de cliente via WABA ID, auto-provisionamento para WABAs desconhecidos, processamento de status, reações e mensagens SMB echo (mensagens enviadas pelo WhatsApp Business App).
- No processamento de SMB echo, adicionada lógica para download, armazenamento e análise de mídia (áudio, imagem, documento, vídeo, sticker), com transcrição de áudio e análise de conteúdo para enriquecimento do histórico e dashboard.
- Atualizado hook `useRealtimeMessages` para suportar tipos de mensagem variados, parsing de metadados e definição dinâmica do tipo da mensagem em tempo real.
- Diversas melhorias de logging, tratamento de erros e robustez geral nas integrações com Meta WhatsApp API e banco de dados.
  - Arquivos: `src/app/api/messages/[phone]/route.ts`, `src/app/api/webhook/route.ts`, `src/hooks/useRealtimeMessages.ts`
  - Confiança: alta

## 2026-03-26

### feat
- Adicionado importação de `createServiceRoleClient` para integração com Supabase no webhook
  - Arquivos: `src/app/api/webhook/route.ts`
  - Confiança: alta

## 2026-03-26

### feat
- Integrado componente `EmbeddedSignupButton` no passo de conexão do WhatsApp para melhorar a experiência do usuário, substituindo o botão com redirecionamento por uma janela de autorização embutida.
- Adicionado tratamento de erros e callbacks para sucesso, erro e cancelamento no fluxo de conexão.
- Atualizado redirecionamento após conexão para navegar internamente no onboarding com parâmetros de query.
  - Arquivos: `src/app/onboarding/page.tsx`
  - Confiança: alta

## 2026-03-26

### feat
- Implementado suporte para processar e salvar mensagens enviadas pelo WhatsApp Business App (SMB message echoes) no dashboard e no histórico de chat AI, permitindo visualização dessas mensagens como enviadas pelo app oficial.
- Adicionado ícone indicativo nas mensagens do tipo SMB no componente `MessageBubble` para diferenciar visualmente essas mensagens no dashboard.
  - Arquivos: `src/app/api/webhook/route.ts`, `src/components/MessageBubble.tsx`
  - Confiança: alta

## 2026-03-26

### fix
- Ajustado fluxo de troca de código por token no OAuth do Meta para não enviar `redirect_uri` quando o código for obtido via JS SDK (FB.login), evitando erros na autenticação.
- Incluído parâmetro `redirect_uri` apenas no fluxo de redirecionamento server-side.
  - Arquivos: `src/app/api/auth/meta/callback/route.ts`, `src/lib/meta-oauth.ts`
  - Evidência: remoção condicional do parâmetro `redirect_uri` na requisição de token, conforme comentário no código.
  - Confiança: alta

## 2026-03-26

### fix
- Melhorada a confirmação e o tratamento de erros ao desconectar o WhatsApp na página de configurações do dashboard. Ajustes na exibição de mensagens e no estado de carregamento durante a desconexão.
  - Arquivos: `src/app/dashboard/settings/page.tsx`
  - Evidência: aprimoramento do fluxo assíncrono, mensagens de erro e feedback visual no botão de desconexão
  - Confiança: alta

## 2026-03-26

### feat
- Adicionado botão para desconectar WhatsApp no dashboard de configurações, que desregistra o número e limpa segredos no Vault via nova API DELETE `/api/auth/meta/disconnect`.
- Implementada rota API para desconectar WhatsApp Business, removendo credenciais Meta, dados WABA e segredos Vault, com tentativa de desregistro do número na Cloud API.
  - Arquivos: `src/app/api/auth/meta/disconnect/route.ts`, `src/app/dashboard/settings/page.tsx`
  - Confiança: alta

## 2026-03-25

### fix
- Restaurado o campo `featureType` e `sessionInfoVersion` em `extras` para o modo de coexistência no componente de botão de cadastro embutido
  - Arquivos: `src/components/EmbeddedSignupButton.tsx`
  - Evidência: reintrodução explícita das propriedades removidas em `extras`
  - Confiança: alta

## 2026-03-25

### fix
- Ajustado componente EmbeddedSignupButton para alinhar com a documentação oficial do Meta Embedded Signup, atualizando versão do SDK para v25.0 e modificando estrutura do objeto extras para {setup: {}} no fluxo de onboarding do WhatsApp Business.
  - Arquivos: `src/components/EmbeddedSignupButton.tsx`
  - Evidência: alteração explícita da versão do SDK e mudança na estrutura do parâmetro extras conforme commit e diff
  - Confiança: alta

## 2026-03-25

### fix
- Revertida versão do SDK do Facebook para v22.0 para compatibilidade com a versão da Graph API usada no código
  - Arquivos: `src/components/EmbeddedSignupButton.tsx`
  - Evidência: alteração explícita da versão do SDK de v25.0 para v22.0 no componente
  - Confiança: alta

## 2026-03-25

### fix
- Ajustado callback do `FB.login` para ser síncrono, evitando rejeição do SDK ao usar função assíncrona
  - Arquivos: `src/components/EmbeddedSignupButton.tsx`
  - Evidência: mudança de callback async para função síncrona que chama handler async internamente
  - Confiança: alta

## 2026-03-25

### fix
- Corrigida condição de corrida na inicialização do SDK do Facebook, definindo `fbAsyncInit` antes do carregamento do script e usando a estratégia `afterInteractive` para garantir a ordem correta de carregamento.
- Removida inicialização duplicada do SDK, unificando a lógica dentro do hook `useEffect`.
- Adicionados logs para facilitar o debug do estado do SDK e das chamadas de login.
- Arquivos: `src/components/EmbeddedSignupButton.tsx`
- Evidência: alteração da ordem de definição de `fbAsyncInit` e mudança da estratégia de carregamento do script para `afterInteractive`.
- Confiança: alta

## 2026-03-25

### feat
- Atualizado o SDK do Facebook para a versão v25.0 no componente EmbeddedSignupButton
  - Arquivos: `src/components/EmbeddedSignupButton.tsx`
  - Confiança: alta

## 2026-03-25

### feat
- Adicionado importação do componente `EmbeddedSignupButton` na página de configurações
  - Arquivos: `src/app/dashboard/settings/page.tsx`
  - Confiança: alta

## 2026-03-25

### feat
- Integrado componente `EmbeddedSignupButton` para migração do WhatsApp no painel de configurações, substituindo o botão com lógica manual de migração.
- Arquivos: `src/app/dashboard/settings/page.tsx`
- Confiança: alta

## 2026-03-25

### fix
- Corrigido espaçamento na entrada do changelog relacionada às atualizações de branding UzzApp
  - Arquivos: `README.md`
  - Evidência: ajuste de espaço em linha do README
  - Confiança: alta

## 2026-03-25

### feat
- Implementada funcionalidade de signup embutido via Facebook JS SDK com suporte a modo coexistência para WhatsApp Business App e Cloud API no mesmo número. Inclui endpoint API (`src/app/api/auth/meta/embedded-signup/route.ts`), componente React (`src/components/EmbeddedSignupButton.tsx`) e página de teste (`src/app/test-oauth/page.tsx`) com UI para escolher entre modo coexistência e OAuth tradicional.
- Adicionada coluna `onboarding_type` na tabela `clients` para indicar o tipo de onboarding (`cloud_api` ou `coexistence`).
- Ajustado registro de PIN dinâmico para registro de número via Meta API (`src/lib/meta-oauth.ts`).
- Melhorias no estilo para impressão no arquivo `UzzApp_Apresentacao_Comercial.html`.

  - Arquivos: `src/app/api/auth/meta/embedded-signup/route.ts`, `src/components/EmbeddedSignupButton.tsx`, `src/app/test-oauth/page.tsx`, `supabase/migrations/20260325180609_add_onboarding_type_to_clients.sql`, `src/lib/meta-oauth.ts`, `UzzApp_Apresentacao_Comercial.html`
  - Confiança: alta

## 2026-03-24

### refactor
- Atualizadas URLs para refletir a nova marca UzzApp em  documentação, configuração e código
- Adicionada apresentação comercial em HTML detalhando funcionalidades e diferenciais da plataforma UzzApp
- Incluído glossário técnico para facilitar entendimento dos termos usados no projeto
- Ajustes em arquivos de configuração e rotas para alinhamento com a nova identidade visual e URLs
  - Arquivos: `.gitignore`, `README.md`, `UzzApp_Apresentacao_Comercial.html`, `memory/glossary.md`, `src/app/api/vault/secrets/route.ts`, `src/app/api/webhook/[clientId]/route.ts`, `src/lib/config.ts`, `supabase/migrations/DYNAMIC_PROVIDER_SELECTION.md`, `supabase/migrations/MULTI_TENANT_MIGRATION.md`, `supabase/migrations/VERCEL_DEPLOYMENT.md`, `supabase/migrations/WEBHOOK_CONFIGURATION.md`
  - Confiança: alta

## 2026-03-24

### chore
- Atualizado valor do plano mensal de R$ 249,90 para R$ 247,90 nas páginas de preços e landing page
  - Arquivos: `src/app/precos/page.tsx`, `src/components/landing/Plans.tsx`
  - Confiança: alta

## 2026-03-23

### fix
- Corrigido erro de digitação na descrição da imagem de fundo da área de conversas no plano de personalização visual
  - Arquivos: `docs/PLANO2.md`
  - Evidência: correção de palavra "conversasss" para "conversas"
  - Confiança: alta

## 2026-03-23

### fix
- Corrigido erro de digitação na descrição da imagem de fundo da área de conversas no documento de planejamento
  - Arquivos: `docs/PLANO2.md`
  - Evidência: correção de palavra "conversasss" para "conversas"
  - Confiança: alta

## 2026-03-23

### fix
- Corrigido erro de digitação na descrição da imagem de fundo da área de conversas no documento de planejamento
  - Arquivos: `docs/PLANO2.md`
  - Evidência: correção de "conversass" para "conversas"
  - Confiança: alta

## 2026-03-23

### feat
- Remodelado dashboard de analytics do CRM com novo layout, estilo visual aprimorado e componentes reutilizáveis para melhor responsividade e usabilidade.
- Refeito dashboard OpenAI Analytics com novo componente shell, gráficos redesenhados para melhor leitura em mobile e desktop, filtros e exportação CSV aprimorados.
- Atualizados gráficos de tendências de Meta Ads com novo shell, controles refinados e melhor adaptação para dispositivos móveis.
- Refatorado componente CustomizableChart para suporte a múltiplos tipos de gráficos com gradientes, legendas responsivas, exportação PNG/SVG e visual mais moderno.
- Atualizado DashboardMetricsView com novo layout editorial, melhorias visuais, persistência de configuração atualizada e melhor experiência mobile-first.
- Criado componente AnalyticsShell para padronizar estrutura visual de dashboards e gráficos analíticos.
- Ajustes gerais de estilo CSS para dashboards analíticos, incluindo novos painéis, chips e responsividade.
  - Arquivos principais: `src/app/dashboard/openai-analytics/page.tsx`, `src/components/crm/CRMAnalyticsDashboard.tsx`, `src/components/meta-ads/MetaAdsTrendCharts.tsx`, `src/components/CustomizableChart.tsx`, `src/components/DashboardMetricsView.tsx`, `src/components/AnalyticsShell.tsx`, `src/app/globals.css`
  - Confiança: alta

## 2026-03-23

### feat
- Melhorada a função de truncamento do diff para incluir resumo de arquivos alterados (diffstat) extraído via comando git, além de aumentar limite máximo de caracteres para 120k.
- Implementado fallback automático para modelo alternativo (`openai/gpt-4o-mini`) caso o modelo primário (`openai/gpt-4.1-mini`) retorne erro 413 (payload muito grande).
- Refatorado script de geração de changelog para modularizar chamadas à API e aprimorar logs.
  - Arquivos: `.github/scripts/generate-changelog.mjs`
  - Confiança: alta

## 2026-03-20

### refactor
- Atualizado o layout do componente KanbanBoard para melhorar o alinhamento e o comportamento de rolagem, ajustando a estrutura do div e a disposição dos elementos
  - Arquivos: `src/components/crm/KanbanBoard.tsx`
  - Confiança: alta

## 2026-03-20

### feat
- Adicionado suporte a rolagem horizontal no componente KanbanBoard e melhorias no layout na página CRMPage
  - Arquivos: `src/components/crm/KanbanBoard.tsx`, `src/app/dashboard/crm/page.tsx`
  - Confiança: alta

### fix
- Ajustada a cor do texto de mensagens de chat para branco no arquivo `globals.css`
  - Arquivos: `src/app/globals.css`
  - Evidência: mudanças nas variáveis de cores relacionadas ao chat
  - Confiança: alta

### refactor
- Implementada lógica de scroll com wheel para o KanbanBoard, melhorando a experiência de navegação horizontal
  - Arquivos: `src/components/crm/KanbanBoard.tsx`
  - Confiança: alta

## 2026-03-20

### feat
- Melhorada a responsividade do layout no dashboard de CRM e na Kanban board, ajustando classes CSS para garantir melhor adaptação em diferentes tamanhos de tela
  - Arquivos: `src/app/dashboard/crm/page.tsx`, `src/components/crm/KanbanBoard.tsx`
  - Confiança: alta

## 2026-03-20

### feat
- Adicionado geração automática de changelog via GitHub Models API
  - Arquivos: `.github/changelog-instructions.md`, `.github/scripts/generate-changelog.mjs`, `.github/workflows/ai-changelog.yml`, `CHANGELOG.md`, `vercel.json`
  - Confiança: alta
