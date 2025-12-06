# Checklist: Flows Interativos WhatsApp

> **Documento técnico completo:** [`PLANO_FLOWS_INTERATIVOS.md`](./PLANO_FLOWS_INTERATIVOS.md)

---

## 📊 Progresso Geral

```
🔴 Não iniciado | 🟡 Em progresso | 🟢 Concluído | ⏸️ Bloqueado
```

| Fase | Status | Progresso | Estimativa | Real |
|------|--------|-----------|------------|------|
| Fase 0 - Pesquisa | 🟢 | 7/7 | 2-3 dias | 1 dia |
| Fase 1 - POC | 🔴 | 0/8 | 1 semana | - |
| Fase 2 - Estrutura | 🔴 | 0/6 | 1 semana | - |
| Fase 3 - Executor | 🔴 | 0/7 | 2 semanas | - |
| Fase 4 - Integração | 🔴 | 0/6 | 1 semana | - |
| Fase 5 - Interface | 🔴 | 0/12 | 3-4 semanas | - |
| Fase 6 - Testes | 🔴 | 0/8 | 1-2 semanas | - |
| **TOTAL** | **🟡** | **7/52** | **9-13 semanas** | **1 dia** |

**Data de início:** 2025-12-06
**Previsão de conclusão:** 2026-03-06 (estimativa)

---

## 🎯 Sprint 1: Pesquisa e POC (1-2 semanas)

### Fase 0: Pesquisa e Documentação da API Meta
**Duração:** 2-3 dias
**Status:** 🟢 Concluído
**Progresso:** 7/7
**Data de conclusão:** 2025-12-06

#### Tasks
- [x] Ler documentação oficial Meta sobre Interactive Messages
  - [x] Link: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages#interactive-messages
  - [x] Link: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#interactive-message-reply
- [x] Criar `META_API_INTERACTIVE_MESSAGES.md` com exemplos de payloads
  - [x] Exemplo de envio de botões (3 botões)
  - [x] Exemplo de envio de lista (2 seções, 4 itens)
  - [x] Exemplo de resposta de botão no webhook
  - [x] Exemplo de resposta de lista no webhook
- [x] Documentar limitações e edge cases
  - [x] Limites de caracteres (botão: 20, lista title: 24, etc)
  - [x] Máximo de botões/seções
  - [x] Rate limits
  - [x] Comportamento com caracteres especiais
- [x] Criar exemplos de código TypeScript para integração
  - [x] Funções de envio (sendInteractiveButtons, sendInteractiveList)
  - [x] Parser de webhook responses
  - [x] Validações e sanitização de dados
- [x] Documentar melhores práticas e tratamento de erros

**Critérios de conclusão:**
- ✅ Documento com exemplos criado (26.000+ caracteres)
- ✅ Exemplos completos de payloads (envio e recepção)
- ✅ Limitações e edge cases documentados
- ✅ Código de exemplo TypeScript funcional
- ✅ Pronto para Fase 1 (POC requer credenciais Meta API)

---

### Fase 1: POC - Teste de Mensagens Interativas
**Duração:** 1 semana
**Status:** 🔴 Não iniciado
**Progresso:** 0/8
**Depende de:** Fase 0

#### Tasks

**📁 Funções de envio**
- [ ] Criar `src/lib/whatsapp/interactiveMessages.ts`
  - [ ] Função `sendInteractiveButtons(phone, params)`
  - [ ] Função `sendInteractiveList(phone, params)`
  - [ ] Tipos TypeScript: `ReplyButtonsParams`, `ListMessageParams`
  - [ ] Validações (máx 3 botões, máx 10 seções, etc)
  - [ ] Error handling completo

**🔌 API de teste**
- [ ] Criar `src/app/api/test/interactive/send/route.ts`
  - [ ] Endpoint POST para envio de teste
  - [ ] Parâmetros: `phone`, `type` (buttons/list)
  - [ ] Integrar com funções de envio

**📥 Parser webhook**
- [ ] Atualizar `src/app/api/webhook/[clientId]/route.ts`
  - [ ] Função `parseInteractiveMessage(message)`
  - [ ] Detectar `type === 'interactive'`
  - [ ] Extrair `button_reply.id` ou `list_reply.id`
  - [ ] Log estruturado das respostas

**🎨 Dashboard de testes**
- [ ] Criar `src/app/dashboard/test-interactive/page.tsx`
  - [ ] Input para telefone
  - [ ] Select para tipo (buttons/list)
  - [ ] Botão "Enviar Teste"
  - [ ] Display de resposta da API

**✅ Testes**
- [ ] Testar envio de 3 botões
- [ ] Testar recepção de resposta de botão
- [ ] Testar envio de lista com 2 seções
- [ ] Testar recepção de resposta de lista
- [ ] Testar limites (mais de 3 botões - deve falhar)
- [ ] Testar caracteres especiais
- [ ] Documentar resultados em `docs/features/flow/POC_RESULTS.md`

**Critérios de conclusão:**
- ✅ Envio de botões funciona
- ✅ Envio de listas funciona
- ✅ Webhook recebe respostas corretamente
- ✅ Parser identifica `id` clicado

---

## 🏗️ Sprint 2: Estrutura de Dados (1 semana)

### Fase 2: Estrutura de Dados
**Duração:** 1 semana
**Status:** 🔴 Não iniciado
**Progresso:** 0/6
**Depende de:** Fase 1

#### Tasks

**🗄️ Banco de dados**
- [ ] Criar migration `create_interactive_flows.sql`
  - [ ] Tabela `interactive_flows`
  - [ ] Tabela `flow_executions`
  - [ ] Índices (GIN em keywords, active flows, etc)
  - [ ] RLS policies
  - [ ] Trigger `updated_at`
- [ ] Aplicar migration: `supabase db push`
- [ ] Testar policies com usuários diferentes

**📝 Tipos TypeScript**
- [ ] Criar `src/types/interactiveFlows.ts`
  - [ ] Type `FlowBlockType` (11 tipos)
  - [ ] Interface `InteractiveFlow`
  - [ ] Interface `FlowBlock`
  - [ ] Interface `FlowBlockData` (todos os campos)
  - [ ] Interface `FlowExecution`
  - [ ] Interface `FlowStep`
  - [ ] Helpers: `ListSection`, `ListRow`, `ReplyButton`, `Condition`

**🔌 APIs CRUD**
- [ ] Criar `src/app/api/flows/route.ts`
  - [ ] GET - Listar flows do cliente
  - [ ] POST - Criar novo flow
- [ ] Criar `src/app/api/flows/[flowId]/route.ts`
  - [ ] GET - Buscar flow por ID
  - [ ] PUT - Atualizar flow
  - [ ] DELETE - Deletar flow
- [ ] Testar todas as rotas (Postman/Thunder Client)

**Critérios de conclusão:**
- ✅ Migration aplicada sem erros
- ✅ Tipos TypeScript sem errors (`npx tsc --noEmit`)
- ✅ CRUD completo funcional
- ✅ RLS testado

---

## ⚙️ Sprint 3: Executor de Flows (2 semanas)

### Fase 3: Executor de Flows
**Duração:** 2 semanas
**Status:** 🔴 Não iniciado
**Progresso:** 0/7
**Depende de:** Fase 2

#### Tasks

**🏃 FlowExecutor class**
- [ ] Criar `src/lib/flows/flowExecutor.ts`
  - [ ] Método `startFlow(flowId, clientId, phone)`
  - [ ] Método `continueFlow(clientId, phone, userResponse, interactiveId)`
  - [ ] Método privado `executeBlock(executionId, blockId, flow)`
  - [ ] Método privado `determineNextBlock(...)`
  - [ ] Método privado `evaluateConditions(...)`

**🧩 Executores de blocos**
- [ ] Implementar `executeMessageBlock()`
- [ ] Implementar `executeInteractiveListBlock()`
- [ ] Implementar `executeInteractiveButtonsBlock()`
- [ ] Implementar `evaluateConditions()` (6 operadores)
- [ ] Implementar `executeActionBlock()` (set_variable, increment, add_tag)
- [ ] Implementar `executeDelayBlock()` (básico)
- [ ] Implementar `executeWebhookBlock()`
- [ ] Implementar `transferToAI()`
- [ ] Implementar `transferToHuman()`
- [ ] Implementar `completeFlow()`

**🧪 Testes unitários**
- [ ] Criar `src/lib/flows/__tests__/flowExecutor.test.ts`
  - [ ] Teste: iniciar flow
  - [ ] Teste: executar bloco de mensagem
  - [ ] Teste: executar bloco de lista
  - [ ] Teste: continuar flow após resposta
  - [ ] Teste: avaliar condições
  - [ ] Teste: transferir para IA
  - [ ] Teste: completar flow

**📄 Documentação**
- [ ] Criar `docs/features/flow/FLOW_EXECUTOR_API.md`
  - [ ] Como usar FlowExecutor
  - [ ] Exemplos de cada tipo de bloco
  - [ ] Tratamento de erros

**Critérios de conclusão:**
- ✅ Todos os tipos de blocos implementados
- ✅ Testes unitários passando
- ✅ Documentação completa

---

## 🔗 Sprint 4: Integração com Pipeline (1 semana)

### Fase 4: Integração com Pipeline
**Duração:** 1 semana
**Status:** 🔴 Não iniciado
**Progresso:** 0/6
**Depende de:** Fase 3

#### Tasks

**🎯 Node checkInteractiveFlow**
- [ ] Criar `src/nodes/checkInteractiveFlow.ts`
  - [ ] Interface `CheckInteractiveFlowInput`
  - [ ] Interface `CheckInteractiveFlowOutput`
  - [ ] Lógica: verificar execução ativa
  - [ ] Lógica: verificar trigger "always"
  - [ ] Lógica: verificar trigger "keyword"
  - [ ] Error handling (fail-safe para IA)

**🔄 Integração chatbotFlow**
- [ ] Atualizar `src/flows/chatbotFlow.ts`
  - [ ] Adicionar NODE 15 após NODE 9
  - [ ] Importar `checkInteractiveFlow`
  - [ ] Passar parâmetros corretos
  - [ ] Verificar `shouldContinueToAI`
  - [ ] Early return se flow executado

**📨 Parser de mensagens**
- [ ] Atualizar `src/nodes/parseMessage.ts`
  - [ ] Adicionar type `'interactive'` ao `ParsedMessage`
  - [ ] Detectar `message.type === 'interactive'`
  - [ ] Extrair `button_reply` ou `list_reply`
  - [ ] Retornar campos `interactiveType`, `interactiveResponseId`

**🧪 Testes de integração**
- [ ] Flow "always" inicia automaticamente
- [ ] Flow "keyword" inicia ao enviar keyword
- [ ] Resposta de botão continua flow
- [ ] Resposta de lista continua flow
- [ ] Após flow terminar, próxima msg vai para IA
- [ ] Múltiplos contatos com flows simultâneos

**📄 Endpoint de teste E2E**
- [ ] Criar `src/app/api/test/flow-execution/route.ts`
  - [ ] Simular início de flow
  - [ ] Retornar execution ID

**Critérios de conclusão:**
- ✅ Node integrado no pipeline
- ✅ Flows executam antes da IA
- ✅ Testes E2E passando
- ✅ Sistema funcional end-to-end

---

## 🎨 Sprint 5-6: Interface Drag-and-Drop (3-4 semanas)

### Fase 5: Interface Drag-and-Drop
**Duração:** 3-4 semanas
**Status:** 🔴 Não iniciado
**Progresso:** 0/12
**Depende de:** Fase 4

#### Tasks

**📦 Setup e dependências**
- [ ] Instalar dependências
  ```bash
  npm install @xyflow/react zustand framer-motion immer react-hot-toast
  ```
- [ ] Configurar Zustand store (`src/stores/flowStore.ts`)
  - [ ] State: `flowId`, `nodes`, `edges`, `selectedNodeId`
  - [ ] Actions: `loadFlow`, `saveFlow`, `addNode`, `updateNode`, `deleteNode`

**🎨 Layout principal**
- [ ] Criar `src/app/dashboard/flows/page.tsx` (lista de flows)
  - [ ] Tabela com flows existentes
  - [ ] Botão "Criar Flow"
  - [ ] Status (ativo/inativo)
  - [ ] Ações (editar, deletar, duplicar)
- [ ] Criar `src/app/dashboard/flows/[flowId]/edit/page.tsx` (editor)
  - [ ] Layout: Toolbar + Sidebar + Canvas + Properties
  - [ ] ReactFlowProvider wrapper

**🧩 Componentes principais**
- [ ] Criar `src/components/flows/FlowCanvas.tsx`
  - [ ] Setup ReactFlow
  - [ ] Background, Controls, MiniMap
  - [ ] Handlers: `onConnect`, `onNodeClick`, `onNodesChange`
  - [ ] Auto-save (5s debounce)
- [ ] Criar `src/components/flows/FlowToolbar.tsx`
  - [ ] Breadcrumbs (Dashboard > Flows > Nome)
  - [ ] Botão Salvar
  - [ ] Botão Testar
  - [ ] Status indicator (salvando/salvo)
- [ ] Criar `src/components/flows/FlowSidebar.tsx`
  - [ ] Lista de blocos disponíveis
  - [ ] Drag and drop para canvas
  - [ ] Categorias (Mensagens, Controle, Ações)
- [ ] Criar `src/components/flows/FlowPropertiesPanel.tsx`
  - [ ] Detectar bloco selecionado
  - [ ] Renderizar form específico do tipo
  - [ ] Atualizar bloco no store

**🧱 Componentes de blocos customizados**
- [ ] Criar `src/components/flows/blocks/StartBlock.tsx`
- [ ] Criar `src/components/flows/blocks/MessageBlock.tsx`
- [ ] Criar `src/components/flows/blocks/InteractiveListBlock.tsx`
  - [ ] Handles múltiplos (1 por row)
- [ ] Criar `src/components/flows/blocks/InteractiveButtonsBlock.tsx`
  - [ ] Handles múltiplos (1 por botão)
- [ ] Criar `src/components/flows/blocks/ConditionBlock.tsx`
- [ ] Criar `src/components/flows/blocks/ActionBlock.tsx`
- [ ] Criar `src/components/flows/blocks/AIHandoffBlock.tsx`
- [ ] Criar `src/components/flows/blocks/HumanHandoffBlock.tsx`
- [ ] Criar `src/components/flows/blocks/EndBlock.tsx`

**📝 Painéis de propriedades**
- [ ] Criar `src/components/flows/properties/MessageBlockProperties.tsx`
  - [ ] Textarea para texto da mensagem
  - [ ] Preview
- [ ] Criar `src/components/flows/properties/InteractiveListProperties.tsx`
  - [ ] Inputs: header, body, footer, buttonText
  - [ ] Gerenciar seções (add/remove)
  - [ ] Gerenciar rows (add/remove)
  - [ ] Validar limites (10 seções, 10 rows cada)
- [ ] Criar `src/components/flows/properties/InteractiveButtonsProperties.tsx`
  - [ ] Input: body, footer
  - [ ] Gerenciar botões (add/remove, máx 3)
  - [ ] Validar tamanho do título (20 chars)
- [ ] Criar `src/components/flows/properties/ConditionBlockProperties.tsx`
  - [ ] Add/remove conditions
  - [ ] Select operator (==, !=, >, <, contains)
  - [ ] Input value
  - [ ] Select next block

**⚡ Performance e otimizações**
- [ ] Memoizar todos componentes de bloco (React.memo)
- [ ] Debounce no auto-save (1s)
- [ ] Lazy load de blocos (se muitos)
- [ ] SnapToGrid habilitado
- [ ] requestAnimationFrame no drag

**🎨 UX e polish**
- [ ] Tooltips explicativos (Radix Tooltip)
- [ ] Loading states
- [ ] Error boundaries
- [ ] Animações com Framer Motion
- [ ] Keyboard shortcuts (Ctrl+S, Delete, Esc)
- [ ] Undo/Redo (opcional)

**Critérios de conclusão:**
- ✅ Interface drag-and-drop funcional
- ✅ Todos os blocos com componentes customizados
- ✅ Propriedades editáveis
- ✅ Auto-save funcionando
- ✅ Performance 60 FPS

---

## ✅ Sprint 7: Testes e Lançamento (1-2 semanas)

### Fase 6: Testes e Refinamento
**Duração:** 1-2 semanas
**Status:** 🔴 Não iniciado
**Progresso:** 0/8
**Depende de:** Fase 5

#### Tasks

**🧪 Testes E2E (Playwright)**
- [ ] Criar `tests/e2e/flows/create-flow.spec.ts`
  - [ ] Teste: criar flow simples
  - [ ] Teste: arrastar blocos
  - [ ] Teste: conectar blocos
  - [ ] Teste: editar propriedades
  - [ ] Teste: salvar flow
- [ ] Criar `tests/e2e/flows/execute-flow.spec.ts`
  - [ ] Teste: flow executa ao enviar keyword
  - [ ] Teste: resposta de botão continua flow
  - [ ] Teste: resposta de lista continua flow
  - [ ] Teste: transferir para IA

**⚡ Testes de performance**
- [ ] Testar com flow de 50+ blocos
- [ ] Medir FPS durante drag (Chrome DevTools)
- [ ] Medir tempo de save/load
- [ ] Otimizar gargalos encontrados

**🎨 Polimento UX**
- [ ] Revisar todos tooltips
- [ ] Suavizar animações
- [ ] Melhorar feedback visual (loading, success, error)
- [ ] Testar responsividade (desktop, tablet)
- [ ] Ajustar cores e espaçamentos

**📚 Documentação**
- [ ] Criar `docs/features/flow/USER_GUIDE.md`
  - [ ] Como criar um flow
  - [ ] Tipos de blocos
  - [ ] Triggers
  - [ ] Exemplos práticos
- [ ] Criar `docs/features/flow/FAQ.md`
- [ ] Atualizar `CLAUDE.md` com seção de flows

**🎥 Material de treinamento**
- [ ] Gravar screencast (5-10 min)
  - [ ] Criar flow de exemplo (Suporte/Vendas)
  - [ ] Testar execução
  - [ ] Mostrar analytics
- [ ] Criar templates prontos
  - [ ] Template: Atendimento inicial
  - [ ] Template: Qualificação de leads
  - [ ] Template: Agendamento

**🚀 Deploy e monitoramento**
- [ ] Code review completo
- [ ] Merge para main
- [ ] Deploy em staging
- [ ] Testar em staging com clientes beta
- [ ] Deploy em produção
- [ ] Setup monitoring (Sentry, logs)

**Critérios de conclusão:**
- ✅ Todos os testes E2E passando
- ✅ Performance validada
- ✅ Documentação completa
- ✅ Sistema em produção
- ✅ Primeiros clientes usando

---

## 📈 Métricas de Sucesso

Atualizar após lançamento:

- [ ] **Performance:** ≥ 60 FPS no drag (medido em Chrome DevTools)
- [ ] **Adoção:** ≥ 70% dos clientes criam ao menos 1 flow (primeira semana)
- [ ] **Engajamento:** ≥ 5 flows criados por cliente (primeiro mês)
- [ ] **Bugs críticos:** 0 bugs P0 (bloqueadores)
- [ ] **Satisfação:** NPS ≥ 8/10 (survey pós-uso)
- [ ] **Conversões:** Taxa de conclusão de flows ≥ 80%

---

## 📝 Notas e Observações

### Decisões Técnicas
-

### Bloqueios Encontrados
-

### Aprendizados
-

### Próximas Melhorias (Backlog)
- [ ] Templates marketplace
- [ ] A/B testing de flows
- [ ] Analytics detalhado (funil de conversão)
- [ ] Compartilhar flows entre clientes
- [ ] Importar/exportar flows (JSON)
- [ ] Versionamento de flows
- [ ] Preview mode (testar flow sem enviar)
- [ ] Integração com Zapier/Make

---

**Última atualização:** 2025-12-06
**Responsável:** -
**Revisado por:** -
