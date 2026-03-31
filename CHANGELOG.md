# Changelog

Gerado automaticamente por IA a cada push no `main`.

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
