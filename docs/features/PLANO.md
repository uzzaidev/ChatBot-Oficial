# Plano: Transformar Flow Architecture em ReactFlow

## Resumo da Solicitação
O usuário quer transformar a arquitetura de fluxo (Flow Architecture Manager) para usar ReactFlow, similar ao sistema de flows interativos já implementado. O objetivo é manter todas as funcionalidades atuais (escolher opções, ativar/desativar nodes) mas adicionar um painel lateral para editar prompts, variáveis, etc. Diferente do flow interativo, NÃO será possível adicionar novos blocos - apenas visualizar e editar os existentes.

## Estado Atual

### FlowArchitectureManager (atual)
**Localização**: `src/components/FlowArchitectureManager.tsx`
**Características**:
- Usa Mermaid.js para visualização de diagramas
- Mostra todos os nodes do fluxo de processamento (FLOW_METADATA)
- Permite ativar/desativar nodes (toggle enabled)
- Abre modal Dialog para editar configurações de nodes
- Mostra bypass routes quando nodes são desativados
- Suporta nodes configuráveis com prompts, temperatura, thresholds, etc.
- Dados salvos via API em `/api/flow/nodes/{nodeId}`

### Interactive Flows (referência para implementação)
**Localização**: `src/app/dashboard/flows/[flowId]/edit/page.tsx`
**Características**:
- Usa @xyflow/react (ReactFlow v12)
- Canvas drag-and-drop com FlowCanvas
- Sidebar esquerdo com blocos (FlowSidebar) - NÃO usar no Flow Architecture
- Painel direito de propriedades (FlowPropertiesPanel) - USAR como referência
- Toolbar no topo (FlowToolbar)
- Store Zustand para gerenciar estado (flowStore.ts)
- Blocos customizados (MessageBlock, ConditionBlock, etc.)
- Propriedades por tipo de bloco (MessageBlockProperties, etc.)

## Arquitetura Proposta

### Novo Componente: FlowArchitectureReact

**Estrutura de arquivos**:
```
src/components/flow-architecture/
├── FlowArchitectureReact.tsx          # Componente principal (substitui FlowArchitectureManager.tsx)
├── FlowArchitectureCanvas.tsx         # Canvas ReactFlow
├── FlowArchitecturePropertiesPanel.tsx # Painel direito de propriedades
├── FlowArchitectureToolbar.tsx        # Toolbar superior
├── blocks/                            # Blocos customizados para nodes do flow
│   ├── FlowNodeBlock.tsx             # Bloco genérico para nodes
│   ├── PreprocessingNodeBlock.tsx    # Opcional: variantes por categoria
│   ├── AnalysisNodeBlock.tsx
│   ├── GenerationNodeBlock.tsx
│   ├── OutputNodeBlock.tsx
│   └── AuxiliaryNodeBlock.tsx
└── properties/                        # Painéis de propriedades por node
    ├── GenerateResponseProperties.tsx # Node: generate_response
    ├── CheckContinuityProperties.tsx  # Node: check_continuity
    ├── ClassifyIntentProperties.tsx   # Node: classify_intent
    ├── DetectRepetitionProperties.tsx # Node: detect_repetition
    ├── GetChatHistoryProperties.tsx   # Node: get_chat_history
    ├── BatchMessagesProperties.tsx    # Node: batch_messages
    ├── GetRagContextProperties.tsx    # Node: get_rag_context
    └── SearchDocumentProperties.tsx   # Node: search_document
```

### Store Zustand: flowArchitectureStore.ts

**Estado**:
```typescript
interface FlowArchitectureState {
  // Nodes from FLOW_METADATA transformed to ReactFlow nodes
  nodes: FlowArchitectureNode[]
  
  // Edges calculated from dependencies
  edges: FlowArchitectureEdge[]
  
  // Selected node for editing
  selectedNodeId: string | null
  
  // Node configurations
  nodeConfigs: Record<string, NodeConfig>
  
  // UI state
  loading: boolean
  saving: boolean
  notification: { type: 'success' | 'error', message: string } | null
  
  // Actions
  loadNodesFromMetadata: () => void
  loadNodeConfigurations: () => Promise<void>
  toggleNodeEnabled: (nodeId: string, enabled: boolean) => Promise<void>
  updateNodeConfig: (nodeId: string, config: NodeConfig) => Promise<void>
  setSelectedNode: (nodeId: string | null) => void
}
```

**Transformação FLOW_METADATA → ReactFlow Nodes**:
- Cada node do FLOW_METADATA vira um ReactFlow node
- Posição calculada automaticamente (layout hierárquico ou manual)
- Edges criados a partir de dependencies e optionalDependencies
- Bypass routes mostrados como edges com estilo diferente

### Funcionalidades

#### 1. **Visualização Read-Only** ✅
- Todos os nodes são exibidos no canvas
- Nodes NÃO podem ser arrastados para criar novos
- Nodes PODEM ser arrastados para reposicionar (melhorar layout)
- Edges são automáticos baseados em dependencies
- Visual indica nodes ativos vs desativados
- Bypass routes destacados em laranja (quando node dependência está desabilitado)

#### 2. **Seleção de Node** ✅
- Click no node seleciona
- Click no canvas deseleciona
- Node selecionado tem borda destacada
- Abre painel direito com propriedades

#### 3. **Painel de Propriedades** ✅
- Mostra informações do node selecionado
- Toggle ON/OFF (somente para nodes configuráveis)
- Campos de configuração (se node.hasConfig)
  - Prompts (textarea)
  - Temperatura (number input 0-2)
  - Thresholds (number input 0-1)
  - Booleanos (switch)
  - Arrays/Objects (JSON textarea)
  - Selects customizados (ex: model provider, model)
- Botão "Salvar" persiste alterações via API

#### 4. **Toolbar Superior** ✅
- Título: "Arquitetura do Fluxo de Processamento"
- Botões:
  - Refresh/Reorganizar layout
  - Zoom controls
  - Fit view
  - Legenda (modal ou dropdown)

#### 5. **Legendas e Indicadores** ✅
- Cores por categoria:
  - Preprocessing: azul
  - Analysis: amarelo
  - Generation: verde
  - Output: vermelho
  - Auxiliary: roxo
  - Disabled: cinza tracejado
- Tipos de conexão:
  - Normal: linha sólida azul
  - Bypass ativo: linha tracejada laranja grossa
  - Desabilitado: linha tracejada cinza
- Badge/icon nos nodes configuráveis ([Config])
- Alert mostrando bypass routes ativos

## Implementação Passo a Passo

### Fase 1: Setup e Store ✅
1. Criar store `src/stores/flowArchitectureStore.ts`
2. Implementar transformação FLOW_METADATA → ReactFlow nodes/edges
3. Implementar carregamento de configurações do backend
4. Implementar ações de save/update

### Fase 2: Componentes de Layout ✅
1. Criar `FlowArchitectureReact.tsx` (container principal)
2. Criar `FlowArchitectureToolbar.tsx` (header com controles)
3. Criar `FlowArchitectureCanvas.tsx` (ReactFlow canvas)
4. Criar `FlowArchitecturePropertiesPanel.tsx` (painel direito)

### Fase 3: Blocos Customizados ✅
1. Criar `FlowNodeBlock.tsx` (componente genérico)
   - Props: node data (id, name, enabled, category, hasConfig)
   - Visual: ícone por categoria, nome, badge [Config]
   - Handles: top (target) e bottom (source)
   - Estilo condicional: ativo vs desativado

### Fase 4: Painéis de Propriedades ✅
1. Criar componente base para propriedades comuns
2. Criar painéis específicos para cada tipo de node:
   - GenerateResponseProperties (modelo, temperatura, prompts)
   - CheckContinuityProperties (thresholds, greetings)
   - ClassifyIntentProperties (use_llm, intents, prompt)
   - Etc. (um para cada node com hasConfig=true)

### Fase 5: Integração e Substituição ✅
1. Atualizar page `/dashboard/flow-architecture/page.tsx`
2. Substituir `<FlowArchitectureManager />` por `<FlowArchitectureReact />`
3. Adicionar `<ReactFlowProvider>` wrapper
4. Importar CSS do ReactFlow
5. Testar funcionamento completo

### Fase 6: Validação e Polish ✅
1. Testar todos os casos:
   - Toggle nodes on/off
   - Edição de configurações
   - Bypass routes funcionando
   - Salvamento persistido
2. Ajustar estilos e UX
3. Adicionar loading states e error handling
4. Documentar mudanças

## Diferenças vs Interactive Flows

| Aspecto | Interactive Flows | Flow Architecture |
|---------|------------------|-------------------|
| **Adicionar blocos** | ✅ Sim (drag from sidebar) | ❌ Não (read-only nodes) |
| **Deletar blocos** | ✅ Sim | ❌ Não |
| **Editar posição** | ✅ Sim | ✅ Sim (apenas reposicionar) |
| **Criar conexões** | ✅ Sim (manual) | ❌ Não (automático via dependencies) |
| **Editar propriedades** | ✅ Sim | ✅ Sim |
| **Sidebar esquerdo** | ✅ Sim (block palette) | ❌ Não necessário |
| **Painel direito** | ✅ Sim | ✅ Sim (similar) |
| **Toolbar** | ✅ Sim | ✅ Sim (simplificado) |
| **Store** | `flowStore.ts` | `flowArchitectureStore.ts` (novo) |
| **Fonte de dados** | API `/api/flows` | FLOW_METADATA + API `/api/flow/nodes` |

## Considerações Técnicas

### Layout Automático
- Usar ReactFlow's `getLayoutedElements` ou biblioteca `dagre` para layout hierárquico
- Posições iniciais calculadas automaticamente
- Permitir reposicionamento manual (salvar posições no localStorage?)

### Bypass Routes
- Implementar lógica CASCADE atual:
  - Quando node A desabilitado → mostrar edge para primeiro optionalDependency ativo
  - Edge bypass: estilo laranja tracejado, strokeWidth: 3px
  - Alert mostrando quais bypass routes estão ativos

### Performance
- Nodes fixos (não mudam dinamicamente)
- Configs carregados sob demanda (ou em batch no início)
- Memoização de componentes com React.memo

### Compatibilidade
- Manter API existente intacta
- Backward compatible (FlowArchitectureManager pode coexistir temporariamente)
- Migration path: flag de feature ou rota separada `/dashboard/flow-architecture-v2`

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Layout automático não fica bom | Médio | Permitir reposicionamento manual + salvar posições |
| Bypass routes complexos de renderizar | Alto | Implementar lógica CASCADE gradualmente, testar casos |
| Perda de funcionalidades do Mermaid | Baixo | ReactFlow oferece mais interatividade |
| Código duplicado com Interactive Flows | Médio | Extrair componentes comuns (helpers, types) |
| Breaking changes na API | Alto | NÃO alterar API, apenas frontend |

## Cronograma Estimado

- **Fase 1** (Setup): 30 min
- **Fase 2** (Layout): 45 min
- **Fase 3** (Blocos): 30 min
- **Fase 4** (Propriedades): 1h (múltiplos painéis)
- **Fase 5** (Integração): 15 min
- **Fase 6** (Validação): 30 min

**Total estimado**: ~3.5 horas

## Checklist de Sucesso

- [ ] Todos os nodes do FLOW_METADATA são exibidos
- [ ] Edges automáticos baseados em dependencies
- [ ] Bypass routes mostrados corretamente (laranja tracejado)
- [ ] Click em node abre painel de propriedades
- [ ] Toggle ON/OFF funciona (somente nodes configuráveis)
- [ ] Edição de configurações funciona (prompts, temperatura, etc.)
- [ ] Salvamento persiste no backend via API
- [ ] Visual bonito e responsivo
- [ ] Sem perda de funcionalidades vs versão Mermaid
- [ ] Zero bugs de renderização ou estado

## Próximos Passos

1. ✅ Criar este plano (PLANO.md)
2. 🔄 Obter aprovação do usuário
3. Começar implementação Fase 1
4. Seguir fases sequencialmente
5. Report progress após cada fase completa
