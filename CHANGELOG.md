# Changelog

Gerado automaticamente por IA a cada push no `main`.

```

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
