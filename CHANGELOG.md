# Changelog

Gerado automaticamente por IA a cada push no `main`.

```

```

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
