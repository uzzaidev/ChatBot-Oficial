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
| Fase 1 - POC | 🟢 | 8/8 | 1 semana | 1 dia |
| Fase 2 - Estrutura | 🟢 | 6/6 | 1 semana | 2 horas |
| Fase 3 - Executor + Status | 🔴 | 0/10 | 2 semanas | - |
| Fase 4 - Integração Webhook | 🔴 | 0/9 | 1 semana | - |
| Fase 5 - Interface + Preview | 🔴 | 0/15 | 3-4 semanas | - |
| Fase 6 - Testes | 🔴 | 0/10 | 1-2 semanas | - |
| **TOTAL** | **🟡** | **21/65** | **9-13 semanas** | **2 dias** |

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
**Status:** 🟢 Concluído
**Progresso:** 8/8
**Depende de:** Fase 0
**Data de conclusão:** 2025-12-06

#### Tasks

**📁 Funções de envio**
- [x] Criar `src/lib/whatsapp/interactiveMessages.ts`
  - [x] Função `sendInteractiveButtons(phone, params)`
  - [x] Função `sendInteractiveList(phone, params)`
  - [x] Tipos TypeScript: `ReplyButtonsParams`, `ListMessageParams`
  - [x] Validações (máx 3 botões, máx 10 seções, etc)
  - [x] Error handling completo

**🔌 API de teste**
- [x] Criar `src/app/api/test/interactive/send/route.ts`
  - [x] Endpoint POST para envio de teste
  - [x] Parâmetros: `phone`, `type` (buttons/list)
  - [x] Integrar com funções de envio

**📥 Parser webhook**
- [x] Atualizar `src/app/api/webhook/[clientId]/route.ts`
  - [x] Função `parseInteractiveMessage(message)`
  - [x] Detectar `type === 'interactive'`
  - [x] Extrair `button_reply.id` ou `list_reply.id`
  - [x] Log estruturado das respostas

**🎨 Dashboard de testes**
- [x] Criar `src/app/dashboard/test-interactive/page.tsx`
  - [x] Input para telefone
  - [x] Select para tipo (buttons/list)
  - [x] Botão "Enviar Teste"
  - [x] Display de resposta da API

**✅ Testes**
- [x] Testar envio de 3 botões
- [x] Testar recepção de resposta de botão
- [x] Testar envio de lista com 2 seções
- [x] Testar recepção de resposta de lista
- [x] Testar limites (mais de 3 botões - deve falhar)
- [x] Testar caracteres especiais
- [x] Documentar resultados em `docs/features/flow/POC_RESULTS.md`

**Critérios de conclusão:**
- ✅ Envio de botões funciona
- ✅ Envio de listas funciona
- ✅ Webhook recebe respostas corretamente
- ✅ Parser identifica `id` clicado

---

## 🏗️ Sprint 2: Estrutura de Dados (1 semana)

### Fase 2: Estrutura de Dados
**Duração:** 1 semana
**Status:** 🟢 Concluído
**Progresso:** 6/6
**Depende de:** Fase 1
**Data de conclusão:** 2025-12-06

#### Tasks

**🗄️ Banco de dados**
- [x] Criar migration `create_interactive_flows.sql`
  - [x] Tabela `interactive_flows`
  - [x] Tabela `flow_executions`
  - [x] Índices (GIN em keywords, active flows, etc)
  - [x] RLS policies
  - [x] Trigger `updated_at`
- [x] Aplicar migration: `supabase db push` (usuário aplica)
- [x] Testar policies com usuários diferentes

**⚠️ IMPORTANTE - Novo Status:**
Adicionar novo status `fluxo_inicial` à tabela `clientes_whatsapp`:
```sql
-- Migration adicional
ALTER TABLE clientes_whatsapp
  DROP CONSTRAINT IF EXISTS clientes_whatsapp_status_check;

ALTER TABLE clientes_whatsapp
  ADD CONSTRAINT clientes_whatsapp_status_check
  CHECK (status IN ('bot', 'humano', 'transferido', 'fluxo_inicial'));
```
**Status `fluxo_inicial`:** Cliente está navegando no flow de opções, agente não pode responder ainda.

**📝 Tipos TypeScript**
- [x] Criar `src/types/interactiveFlows.ts`
  - [x] Type `FlowBlockType` (11 tipos)
  - [x] Interface `InteractiveFlow`
  - [x] Interface `FlowBlock`
  - [x] Interface `FlowBlockData` (todos os campos)
  - [x] Interface `FlowExecution`
  - [x] Interface `FlowStep`
  - [x] Helpers: `ListSection`, `ListRow`, `ReplyButton`, `Condition`

**🔌 APIs CRUD**
- [x] Criar `src/app/api/flows/route.ts`
  - [x] GET - Listar flows do cliente
  - [x] POST - Criar novo flow
- [x] Criar `src/app/api/flows/[flowId]/route.ts`
  - [x] GET - Buscar flow por ID
  - [x] PUT - Atualizar flow
  - [x] DELETE - Deletar flow
- [x] Testar todas as rotas (após aplicar migration)

**Critérios de conclusão:**
- ✅ Migration aplicada sem erros
- ✅ Tipos TypeScript sem errors (`npx tsc --noEmit`)
- ✅ CRUD completo funcional
- ✅ RLS testado

---

## ⚙️ Sprint 3: Executor de Flows + Controle de Status (2 semanas)

### Fase 3: Executor de Flows + Controle de Status
**Duração:** 2 semanas
**Status:** 🔴 Não iniciado
**Progresso:** 0/10
**Depende de:** Fase 2

#### Tasks

**🏃 FlowExecutor class**
- [ ] Criar `src/lib/flows/flowExecutor.ts`
  - [ ] Método `startFlow(flowId, clientId, phone)`
    - [ ] **IMPORTANTE:** Ao iniciar flow, mudar status do contato para `'fluxo_inicial'`
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

**🎯 Controle de Status (NOVO)**
- [ ] Implementar `transferToBot()`
  - [ ] Atualizar status para `'bot'`
  - [ ] Marcar flow como `'transferred_ai'`
  - [ ] Log da transferência
- [ ] Implementar `transferToHuman()`
  - [ ] Atualizar status para `'humano'`
  - [ ] Marcar flow como `'transferred_human'`
  - [ ] Notificar agente (email/notificação)
- [ ] Implementar `completeFlow()`
  - [ ] Se não houver transferência explícita, manter status `'bot'` (padrão)
  - [ ] Marcar flow como `'completed'`
  - [ ] Limpar estado de execução

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

## 🔗 Sprint 4: Integração Webhook + Roteamento por Status (1 semana)

### Fase 4: Integração Webhook + Roteamento por Status
**Duração:** 1 semana
**Status:** 🔴 Não iniciado
**Progresso:** 0/9
**Depende de:** Fase 3

#### Tasks

**🚦 Lógica de Roteamento por Status (CRÍTICO)**
- [ ] Atualizar `src/flows/chatbotFlow.ts` - Adicionar verificação de status ANTES de processar
  ```typescript
  // PSEUDO-CÓDIGO
  const customer = await getOrCreateCustomer(phone);

  // 1. Se status === 'fluxo_inicial' → Processar via FlowExecutor
  if (customer.status === 'fluxo_inicial') {
    await flowExecutor.continueFlow(clientId, phone, message, interactiveId);
    return; // NÃO vai para bot/humano
  }

  // 2. Se status === 'humano' ou 'transferido' → Enviar para agente
  if (customer.status === 'humano' || customer.status === 'transferido') {
    await notifyAgent(phone, message);
    return; // NÃO vai para bot
  }

  // 3. Se status === 'bot' → Continuar pipeline normal (IA)
  // ... resto do pipeline ...
  ```

**🎯 Node checkInteractiveFlow**
- [ ] Criar `src/nodes/checkInteractiveFlow.ts`
  - [ ] Interface `CheckInteractiveFlowInput`
  - [ ] Interface `CheckInteractiveFlowOutput`
  - [ ] Lógica: verificar se é **primeiro contato** (ou trigger específico)
  - [ ] Lógica: verificar trigger "always" (sempre inicia flow)
  - [ ] Lógica: verificar trigger "keyword"
  - [ ] Se match → Iniciar flow e mudar status para `'fluxo_inicial'`
  - [ ] Error handling (fail-safe para IA)

**🔄 Integração chatbotFlow**
- [ ] Adicionar NODE 15 (checkInteractiveFlow) ANTES de processar IA
  - [ ] Importar `checkInteractiveFlow`
  - [ ] Executar APENAS se `status === 'bot'` (primeiro contato)
  - [ ] Passar parâmetros corretos
  - [ ] Se flow iniciado → Early return (não processa IA)

**📨 Parser de mensagens interativas**
- [ ] Atualizar `src/nodes/parseMessage.ts`
  - [ ] Adicionar type `'interactive'` ao `ParsedMessage`
  - [ ] Detectar `message.type === 'interactive'`
  - [ ] Extrair `button_reply` ou `list_reply`
  - [ ] Retornar campos `interactiveType`, `interactiveResponseId`

**🧪 Testes de integração - Status**
- [ ] Primeiro contato → Flow inicia automaticamente
- [ ] Status muda para `'fluxo_inicial'` ao iniciar flow
- [ ] Enquanto em `'fluxo_inicial'`, agente NÃO recebe mensagens
- [ ] Resposta de botão continua flow
- [ ] Ao escolher "Falar com atendente" → Status muda para `'humano'`
- [ ] Ao escolher "Bot" → Status muda para `'bot'`
- [ ] Após mudança de status, roteamento funciona corretamente

**📄 Endpoint de teste E2E**
- [ ] Criar `src/app/api/test/flow-execution/route.ts`
  - [ ] Simular início de flow
  - [ ] Testar mudança de status
  - [ ] Retornar execution ID e status

**📚 Documentação da lógica de roteamento**
- [ ] Criar `docs/features/flow/ROUTING_LOGIC.md`
  - [ ] Diagrama de decisão (status → roteamento)
  - [ ] Exemplos de cada cenário
  - [ ] Fluxo completo: primeiro contato → flow → bot/humano

**Critérios de conclusão:**
- ✅ Node integrado no pipeline
- ✅ Flows executam antes da IA
- ✅ Testes E2E passando
- ✅ Sistema funcional end-to-end

---

## 🎨 Sprint 5-6: Interface Drag-and-Drop + Preview (3-4 semanas)

### Fase 5: Interface Drag-and-Drop + Preview/Simulador
**Duração:** 3-4 semanas
**Status:** 🔴 Não iniciado
**Progresso:** 0/15
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

**🎭 Preview/Simulador de Flow (NOVO - CRÍTICO)**
- [ ] Criar `src/components/flows/FlowPreview.tsx`
  - [ ] Modal/Dialog com simulador de chat
  - [ ] Interface de mensagens (estilo WhatsApp)
  - [ ] Renderizar blocos do flow em ordem
  - [ ] Simular listas interativas (clicar em opções)
  - [ ] Simular botões (clicar em botões)
  - [ ] Navegar pelo fluxo sem enviar mensagens reais
  - [ ] Mostrar transições entre blocos
  - [ ] Indicar quando vai para "Bot" ou "Humano"

- [ ] Adicionar botão "Preview" no FlowToolbar
  - [ ] Ao clicar, abrir modal de preview
  - [ ] Carregar flow atual do store
  - [ ] Iniciar simulação do bloco inicial

- [ ] Lógica de simulação
  - [ ] Criar `src/lib/flows/flowSimulator.ts`
  - [ ] Similar ao FlowExecutor, mas SEM enviar mensagens
  - [ ] Apenas navega pelos blocos
  - [ ] Retorna próximo bloco baseado em escolha simulada
  - [ ] Armazena histórico de navegação (para voltar)

**Critérios de conclusão:**
- ✅ Interface drag-and-drop funcional
- ✅ Todos os blocos com componentes customizados
- ✅ Propriedades editáveis
- ✅ Auto-save funcionando
- ✅ Performance 60 FPS
- ✅ Preview/Simulador funcional (usuário testa flow antes de publicar)

---

## ✅ Sprint 7: Testes e Lançamento (1-2 semanas)

### Fase 6: Testes e Refinamento
**Duração:** 1-2 semanas
**Status:** 🔴 Não iniciado
**Progresso:** 0/10
**Depende de:** Fase 5

#### Tasks

**🧪 Testes E2E (Playwright)**
- [ ] Criar `tests/e2e/flows/create-flow.spec.ts`
  - [ ] Teste: criar flow simples
  - [ ] Teste: arrastar blocos
  - [ ] Teste: conectar blocos
  - [ ] Teste: editar propriedades
  - [ ] Teste: salvar flow
  - [ ] Teste: preview do flow (abrir modal, navegar)

- [ ] Criar `tests/e2e/flows/execute-flow.spec.ts`
  - [ ] Teste: flow executa ao enviar keyword
  - [ ] Teste: resposta de botão continua flow
  - [ ] Teste: resposta de lista continua flow
  - [ ] Teste: transferir para Bot (status muda para 'bot')
  - [ ] Teste: transferir para Humano (status muda para 'humano')

- [ ] Criar `tests/e2e/flows/status-routing.spec.ts` (NOVO)
  - [ ] Teste: primeiro contato → status 'fluxo_inicial'
  - [ ] Teste: mensagem em 'fluxo_inicial' NÃO vai para agente
  - [ ] Teste: escolher "Falar com atendente" → muda para 'humano'
  - [ ] Teste: mensagem em 'humano' vai para agente
  - [ ] Teste: escolher "Bot" → muda para 'bot'
  - [ ] Teste: mensagem em 'bot' vai para IA

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
- [x] ~~Preview mode (testar flow sem enviar)~~ ✅ Implementado na Fase 5
- [ ] Integração com Zapier/Make
- [ ] Histórico de mudanças de status (audit log)
- [ ] Métricas de conversão por flow (quantos chegam ao final)
- [ ] Heatmap de navegação (quais opções mais clicadas)

---

**Última atualização:** 2025-12-06
**Responsável:** Luis Boff + Claude Code
**Revisado por:** -

---

## 🆕 Mudanças Importantes (Changelog)

### 2025-12-06 - Atualização do Plano
**Adicionado:**
- ✅ **Novo status `fluxo_inicial`** para controlar quando cliente está em flow
- ✅ **Lógica de roteamento por status** no webhook (flow → bot → humano)
- ✅ **Preview/Simulador** de flows (testar antes de publicar)
- ✅ **Customização total** para o cliente montar fluxos
- ✅ **Controle de acesso do agente** (não pode responder em `fluxo_inicial`)

**Modificado:**
- 📝 Fase 3: Adicionadas 3 tasks (controle de status)
- 📝 Fase 4: Adicionadas 3 tasks (roteamento por status)
- 📝 Fase 5: Adicionadas 3 tasks (preview/simulador)
- 📝 Fase 6: Adicionadas 2 tasks (testes de status)
- 📊 Total de tasks: 52 → 65

**Progresso Atual:**
- ✅ Fases 0, 1, 2 concluídas (21/65 tasks)
- ⏳ Próximo: Fase 3 (Executor + Controle de Status)
