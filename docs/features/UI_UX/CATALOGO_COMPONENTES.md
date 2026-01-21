# 📚 Catálogo Completo de Componentes - ChatBot Oficial

**Página única com todos os componentes do projeto**  
**Última atualização:** 2026-01-16

---

## 📋 Índice Rápido

- [🎨 Componentes Base (shadcn/ui)](#-componentes-base-shadcnui)
- [📊 Dashboard & Métricas](#-dashboard--métricas)
- [📈 Gráficos & Visualizações](#-gráficos--visualizações)
- [📅 Filtros & Seletores](#-filtros--seletores)
- [💬 Conversas & Mensagens](#-conversas--mensagens)
- [👥 Contatos & Clientes](#-contatos--clientes)
- [🔄 Flows & Arquitetura](#-flows--arquitetura)
- [📄 Documentos & Upload](#-documentos--upload)
- [🔔 Notificações & Alertas](#-notificações--alertas)
- [⚙️ Configurações & Admin](#-configurações--admin)
- [🎯 Landing Page](#-landing-page)
- [🔐 Autenticação & Segurança](#-autenticação--segurança)
- [📱 Mobile & Providers](#-mobile--providers)

---

## 🎨 Componentes Base (shadcn/ui)

### **Alert**
- **Arquivo:** `src/components/ui/alert.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-slot`
- **Uso:** Alertas informativos
- **Variantes:** default, destructive

### **Alert Dialog**
- **Arquivo:** `src/components/ui/alert-dialog.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-alert-dialog`
- **Uso:** Diálogos de confirmação
- **Exemplo:** Confirmar exclusão

### **Avatar**
- **Arquivo:** `src/components/ui/avatar.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-avatar`
- **Uso:** Avatares de usuários
- **Variantes:** Com imagem, fallback com iniciais

### **Badge**
- **Arquivo:** `src/components/ui/badge.tsx`
- **Status:** ✅ Base
- **Dependências:** `class-variance-authority`
- **Uso:** Badges de status, tags
- **Variantes:** default, secondary, destructive, outline

### **Button**
- **Arquivo:** `src/components/ui/button.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-slot`
- **Uso:** Botões de ação
- **Variantes:** default, destructive, outline, ghost, link
- **Tamanhos:** sm, default, lg, icon

### **Card**
- **Arquivo:** `src/components/ui/card.tsx`
- **Status:** ✅ Base
- **Dependências:** Nenhuma
- **Uso:** Containers de conteúdo
- **Subcomponentes:** CardHeader, CardTitle, CardDescription, CardContent, CardFooter

### **Checkbox**
- **Arquivo:** `src/components/ui/checkbox.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-checkbox`
- **Uso:** Checkboxes de formulário

### **Dialog**
- **Arquivo:** `src/components/ui/dialog.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-dialog`
- **Uso:** Modais e diálogos
- **Subcomponentes:** DialogTrigger, DialogContent, DialogHeader, DialogFooter

### **Dropdown Menu**
- **Arquivo:** `src/components/ui/dropdown-menu.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-dropdown-menu`
- **Uso:** Menus dropdown

### **Input**
- **Arquivo:** `src/components/ui/input.tsx`
- **Status:** ✅ Base
- **Dependências:** Nenhuma
- **Uso:** Campos de texto
- **Variantes:** text, email, password, number

### **Label**
- **Arquivo:** `src/components/ui/label.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-label`
- **Uso:** Labels de formulário

### **Popover**
- **Arquivo:** `src/components/ui/popover.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-popover`
- **Uso:** Popovers flutuantes

### **Progress**
- **Arquivo:** `src/components/ui/progress.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-progress`
- **Uso:** Barras de progresso

### **Scroll Area**
- **Arquivo:** `src/components/ui/scroll-area.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-scroll-area`
- **Uso:** Áreas com scroll customizado

### **Select**
- **Arquivo:** `src/components/ui/select.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-select`
- **Uso:** Seletores dropdown
- **Subcomponentes:** SelectTrigger, SelectValue, SelectContent, SelectItem

### **Separator**
- **Arquivo:** `src/components/ui/separator.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-separator`
- **Uso:** Separadores visuais

### **Sheet**
- **Arquivo:** `src/components/ui/sheet.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-dialog`
- **Uso:** Sidebars móveis, painéis laterais
- **Variantes:** left, right, top, bottom

### **Slider**
- **Arquivo:** `src/components/ui/slider.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-slider`
- **Uso:** Controles deslizantes

### **Slider Control**
- **Arquivo:** `src/components/ui/slider-control.tsx`
- **Status:** ✅ Customizado
- **Dependências:** `@radix-ui/react-slider`
- **Uso:** Slider com valor visível
- **Uso em:** Configurações (temperature, max_tokens)

### **Switch**
- **Arquivo:** `src/components/ui/switch.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-switch`
- **Uso:** Toggles on/off

### **Toggle Switch**
- **Arquivo:** `src/components/ui/toggle-switch.tsx`
- **Status:** ✅ Customizado
- **Dependências:** Nenhuma
- **Uso:** Toggle customizado com melhor UX
- **Uso em:** Configurações

### **Table**
- **Arquivo:** `src/components/ui/table.tsx`
- **Status:** ✅ Base
- **Dependências:** Nenhuma
- **Uso:** Tabelas de dados
- **Subcomponentes:** TableHeader, TableBody, TableRow, TableCell

### **Tabs**
- **Arquivo:** `src/components/ui/tabs.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-tabs`
- **Uso:** Abas de navegação
- **Subcomponentes:** TabsList, TabsTrigger, TabsContent

### **Textarea**
- **Arquivo:** `src/components/ui/textarea.tsx`
- **Status:** ✅ Base
- **Dependências:** Nenhuma
- **Uso:** Campos de texto multilinha

### **Toast**
- **Arquivo:** `src/components/ui/toast.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-toast`
- **Uso:** Notificações toast

### **Toaster**
- **Arquivo:** `src/components/ui/toaster.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-toast`
- **Uso:** Provider de toasts

### **Tooltip**
- **Arquivo:** `src/components/ui/tooltip.tsx`
- **Status:** ✅ Base
- **Dependências:** `@radix-ui/react-tooltip`
- **Uso:** Tooltips informativos
- **Subcomponentes:** TooltipTrigger, TooltipContent

---

## 📊 Dashboard & Métricas

### **DashboardClient**
- **Arquivo:** `src/components/DashboardClient.tsx`
- **Status:** ✅ Produção
- **Dependências:** `DashboardMetricsView`, `UnifiedAnalytics`
- **Uso:** Página principal do dashboard
- **Features:** Alterna entre métricas e analytics

### **DashboardLayoutClient**
- **Arquivo:** `src/components/DashboardLayoutClient.tsx`
- **Status:** ✅ Produção
- **Dependências:** `DashboardNavigation`, `Sheet`
- **Uso:** Layout principal com sidebar
- **Features:** Sidebar colapsável, responsivo

### **DashboardNavigation**
- **Arquivo:** `src/components/DashboardNavigation.tsx`
- **Status:** ✅ Produção
- **Dependências:** `lucide-react`, `Badge`, `Tooltip`
- **Uso:** Navegação lateral do dashboard
- **Features:** Seções hierárquicas, badges, tooltips

### **DashboardMetricsView**
- **Arquivo:** `src/components/DashboardMetricsView.tsx`
- **Status:** ✅ Produção
- **Dependências:** `CustomizableChart`, `MetricCard`, `AdvancedDateFilters`, `ExportDialog`
- **Uso:** Dashboard completo de métricas
- **Features:** Gráficos customizáveis, filtros de data, exportação

### **MetricCard**
- **Arquivo:** `src/components/MetricCard.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `lucide-react`
- **Uso:** Cards de métricas com gradiente
- **Features:** Trend indicator, ícone, loading state
- **Classes CSS:** `.metric-card`, `.icon-bg-gradient`

### **MetricSelector**
- **Arquivo:** `src/components/MetricSelector.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Input`, `lucide-react`
- **Uso:** Seletor visual de métricas
- **Features:** Busca, categorias, tags visuais, preview

### **ConversationMetricCard**
- **Arquivo:** `src/components/ConversationMetricCard.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Badge`, `lucide-react`
- **Uso:** Cards de métricas de conversas
- **Features:** Tags de status (flow/human), valores grandes

### **MetricsDashboard**
- **Arquivo:** `src/components/MetricsDashboard.tsx`
- **Status:** ✅ Produção
- **Dependências:** `MetricCard`, `CustomizableChart`
- **Uso:** Dashboard de métricas legado
- **Nota:** Substituído por `DashboardMetricsView`

### **UnifiedAnalytics**
- **Arquivo:** `src/components/UnifiedAnalytics.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Tabs`, `Select`
- **Uso:** Analytics unificado (AI Gateway + Chatbot)
- **Features:** Filtros por período, cliente, tipo de API

### **GatewayMetricsDashboard**
- **Arquivo:** `src/components/GatewayMetricsDashboard.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Chart`
- **Uso:** Dashboard de métricas do AI Gateway

---

## 📈 Gráficos & Visualizações

### **CustomizableChart**
- **Arquivo:** `src/components/CustomizableChart.tsx`
- **Status:** ✅ Produção
- **Dependências:** `recharts`, `Card`
- **Uso:** Gráficos totalmente customizáveis
- **Tipos:** Line, Bar, Area, ComposedChart
- **Features:** Configuração dinâmica, cores, legendas

### **ChartConfigModal**
- **Arquivo:** `src/components/ChartConfigModal.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Dialog`, `Select`, `MetricSelector`, `Input`
- **Uso:** Modal de configuração de gráficos
- **Features:** Seleção de métrica, tipo de gráfico, cores, título

### **RadarChart**
- **Arquivo:** `src/components/charts/RadarChart.tsx`
- **Status:** ✅ Produção
- **Dependências:** `recharts`
- **Uso:** Gráfico radar/polígono
- **Uso em:** Comparação de métricas multidimensionais

### **TreemapChart**
- **Arquivo:** `src/components/charts/TreemapChart.tsx`
- **Status:** ✅ Produção
- **Dependências:** `recharts`
- **Uso:** Gráfico treemap
- **Uso em:** Breakdown hierárquico de dados

### **GaugeChart**
- **Arquivo:** `src/components/charts/GaugeChart.tsx`
- **Status:** ✅ Produção
- **Dependências:** `recharts`
- **Uso:** Gráfico gauge/velocímetro
- **Uso em:** Métricas percentuais (ex: cache hit rate)

### **FunnelChart**
- **Arquivo:** `src/components/charts/FunnelChart.tsx`
- **Status:** ✅ Produção
- **Dependências:** `recharts`
- **Uso:** Gráfico funil
- **Uso em:** Conversão de funis

### **ActivityHeatmap**
- **Arquivo:** `src/components/charts/ActivityHeatmap.tsx`
- **Status:** ✅ Produção
- **Dependências:** `recharts`
- **Uso:** Heatmap de atividade
- **Uso em:** Atividade por hora/dia

### **LatencyChart**
- **Arquivo:** `src/components/LatencyChart.tsx`
- **Status:** ✅ Produção
- **Dependências:** `recharts`
- **Uso:** Gráfico de latência
- **Features:** P50, P95, P99

### **ModelComparisonChart**
- **Arquivo:** `src/components/ModelComparisonChart.tsx`
- **Status:** ✅ Produção
- **Dependências:** `recharts`
- **Uso:** Comparação de modelos AI

### **ProviderBreakdownChart**
- **Arquivo:** `src/components/ProviderBreakdownChart.tsx`
- **Status:** ✅ Produção
- **Dependências:** `recharts`
- **Uso:** Breakdown por provedor (OpenAI, Anthropic, etc.)

### **DailyUsageChart**
- **Arquivo:** `src/components/DailyUsageChart.tsx`
- **Status:** ✅ Produção
- **Dependências:** `recharts`
- **Uso:** Uso diário

### **WeeklyUsageChart**
- **Arquivo:** `src/components/WeeklyUsageChart.tsx`
- **Status:** ✅ Produção
- **Dependências:** `recharts`
- **Uso:** Uso semanal

---

## 📅 Filtros & Seletores

### **AdvancedDateFilters**
- **Arquivo:** `src/components/AdvancedDateFilters.tsx`
- **Status:** ✅ Produção
- **Dependências:** `date-fns`, `react-day-picker`, `Tabs`
- **Uso:** Filtros avançados de data
- **Features:** Presets, mês/ano, range customizado
- **Subcomponentes:** `DateRangeSelector`, `MonthYearSelector`, `CustomDateRangePicker`

### **DateRangeSelector**
- **Arquivo:** `src/components/DateRangeSelector.tsx`
- **Status:** ✅ Produção
- **Dependências:** `date-fns`, `Button`
- **Uso:** Seleção de range de datas com presets
- **Presets:** Hoje, Ontem, Últimos 7/30/90 dias, Este ano, etc.

### **MonthYearSelector**
- **Arquivo:** `src/components/MonthYearSelector.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Select`
- **Uso:** Seleção de mês e ano específicos
- **Features:** Comparação de períodos

### **CustomDateRangePicker**
- **Arquivo:** `src/components/CustomDateRangePicker.tsx`
- **Status:** ✅ Produção
- **Dependências:** `react-day-picker`, `Dialog`
- **Uso:** Seletor visual de range customizado
- **Features:** Calendário, salvar ranges favoritos

### **ModelSelector**
- **Arquivo:** `src/components/ModelSelector.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Select`
- **Uso:** Seletor de modelos AI
- **Features:** Filtro por provedor

---

## 💬 Conversas & Mensagens

### **ConversationPageClient**
- **Arquivo:** `src/components/ConversationPageClient.tsx`
- **Status:** ✅ Produção
- **Dependências:** `ConversationDetail`, `ConversationList`, `SendMessageForm`
- **Uso:** Página completa de conversas
- **Features:** Lista lateral, detalhes, busca, filtros

### **ConversationsIndexClient**
- **Arquivo:** `src/components/ConversationsIndexClient.tsx`
- **Status:** ✅ Produção
- **Dependências:** `ConversationList`, `MetricCard`
- **Uso:** Índice de conversas com métricas
- **Features:** Cards de métricas, filtros de status

### **ConversationList**
- **Arquivo:** `src/components/ConversationList.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Avatar`, `Badge`
- **Uso:** Lista de conversas
- **Features:** Busca, filtros, status, última mensagem

### **ConversationDetail**
- **Arquivo:** `src/components/ConversationDetail.tsx`
- **Status:** ✅ Produção
- **Dependências:** `MessageBubble`, `DateSeparator`
- **Uso:** Detalhes de uma conversa
- **Features:** Scroll automático, separadores de data

### **MessageBubble**
- **Arquivo:** `src/components/MessageBubble.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Avatar`, `Badge`
- **Uso:** Bolha de mensagem
- **Variantes:** Enviada, recebida, sistema
- **Features:** Timestamp, status de entrega, mídia

### **SendMessageForm**
- **Arquivo:** `src/components/SendMessageForm.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Textarea`, `Button`, `MediaUploadButton`
- **Uso:** Formulário de envio de mensagens
- **Features:** Upload de mídia, emoji picker, preview

### **MessageActionMenu**
- **Arquivo:** `src/components/MessageActionMenu.tsx`
- **Status:** ✅ Produção
- **Dependências:** `DropdownMenu`
- **Uso:** Menu de ações da mensagem
- **Features:** Reagir, responder, encaminhar, deletar

### **InteractiveButtonsMessage**
- **Arquivo:** `src/components/InteractiveButtonsMessage.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Button`
- **Uso:** Mensagem com botões interativos
- **Features:** Até 3 botões de escolha

### **InteractiveListMessage**
- **Arquivo:** `src/components/InteractiveListMessage.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Button`
- **Uso:** Mensagem com lista interativa
- **Features:** Até 10 opções

### **DateSeparator**
- **Arquivo:** `src/components/DateSeparator.tsx`
- **Status:** ✅ Produção
- **Dependências:** Nenhuma
- **Uso:** Separador de data em conversas
- **Features:** Formatação automática (Hoje, Ontem, data)

### **ConversationUsageTable**
- **Arquivo:** `src/components/ConversationUsageTable.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Table`
- **Uso:** Tabela de uso por conversa

### **StatusBadge**
- **Arquivo:** `src/components/StatusBadge.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Badge`
- **Uso:** Badge de status de conversa
- **Variantes:** ativo, inativo, aguardando, etc.

### **StatusToggle**
- **Arquivo:** `src/components/StatusToggle.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Switch`
- **Uso:** Toggle de status de conversa

---

## 👥 Contatos & Clientes

### **ContactsClient**
- **Arquivo:** `src/components/ContactsClient.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Table`, `Dialog`, `EmptyState`
- **Uso:** Gerenciamento completo de contatos
- **Features:** Lista, busca, filtros, importação CSV, criação

### **ConversationMetricCard**
- **Arquivo:** `src/components/ConversationMetricCard.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Badge`
- **Uso:** Cards de métricas de conversas
- **Features:** Tags de status (flow/human)

---

## 🔄 Flows & Arquitetura

### **FlowCanvas**
- **Arquivo:** `src/components/flows/FlowCanvas.tsx`
- **Status:** ✅ Produção
- **Dependências:** `@xyflow/react`
- **Uso:** Canvas principal do editor de flows
- **Features:** Drag & drop, conexões, zoom, minimap

### **FlowSidebar**
- **Arquivo:** `src/components/flows/FlowSidebar.tsx`
- **Status:** ✅ Produção
- **Dependências:** `lucide-react`
- **Uso:** Sidebar com blocos arrastáveis
- **Features:** 9 tipos de blocos (start, message, condition, etc.)

### **FlowPropertiesPanel**
- **Arquivo:** `src/components/flows/FlowPropertiesPanel.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Input`, `Textarea`, `Select`
- **Uso:** Painel de propriedades do flow
- **Features:** Edição de configurações do flow

### **FlowToolbar**
- **Arquivo:** `src/components/flows/FlowToolbar.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Button`
- **Uso:** Barra de ferramentas do flow
- **Features:** Salvar, testar, publicar

### **FlowPreview**
- **Arquivo:** `src/components/flows/FlowPreview.tsx`
- **Status:** ✅ Produção
- **Dependências:** `MessageBubble`
- **Uso:** Preview do flow em formato de chat
- **Features:** Simulação de conversa

### **FlowTriggerSettings**
- **Arquivo:** `src/components/flows/FlowTriggerSettings.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Input`, `Select`
- **Uso:** Configuração de triggers do flow

### **Flow Blocks** (9 componentes)
- **Arquivo:** `src/components/flows/blocks/`
- **Status:** ✅ Produção
- **Componentes:**
  - `StartBlock.tsx` - Bloco inicial
  - `MessageBlock.tsx` - Mensagem
  - `InteractiveListBlock.tsx` - Lista interativa
  - `InteractiveButtonsBlock.tsx` - Botões interativos
  - `ConditionBlock.tsx` - Condição
  - `ActionBlock.tsx` - Ação
  - `AIHandoffBlock.tsx` - Transferência para IA
  - `HumanHandoffBlock.tsx` - Transferência para humano
  - `EndBlock.tsx` - Bloco final

### **FlowArchitectureCanvas**
- **Arquivo:** `src/components/flow-architecture/FlowArchitectureCanvas.tsx`
- **Status:** ✅ Produção
- **Dependências:** `@xyflow/react`
- **Uso:** Canvas da arquitetura de flow
- **Features:** Visualização de nodes do sistema

### **FlowArchitectureReact**
- **Arquivo:** `src/components/flow-architecture/FlowArchitectureReact.tsx`
- **Status:** ✅ Produção
- **Dependências:** `FlowArchitectureCanvas`, `FlowArchitecturePropertiesPanel`
- **Uso:** Componente principal da arquitetura

### **FlowArchitecturePropertiesPanel**
- **Arquivo:** `src/components/flow-architecture/FlowArchitecturePropertiesPanel.tsx`
- **Status:** ✅ Produção
- **Dependências:** Múltiplos componentes de properties
- **Uso:** Painel de propriedades da arquitetura

### **FlowArchitectureToolbar**
- **Arquivo:** `src/components/flow-architecture/FlowArchitectureToolbar.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Button`
- **Uso:** Toolbar da arquitetura

### **FlowNodeBlock**
- **Arquivo:** `src/components/flow-architecture/blocks/FlowNodeBlock.tsx`
- **Status:** ✅ Produção
- **Dependências:** `@xyflow/react`, `lucide-react`
- **Uso:** Bloco visual de node da arquitetura
- **Features:** Ícones por tipo, cores por categoria

### **Flow Architecture Properties** (9 componentes)
- **Arquivo:** `src/components/flow-architecture/properties/`
- **Status:** ✅ Produção
- **Componentes:**
  - `BatchMessagesProperties.tsx`
  - `CheckContinuityProperties.tsx`
  - `ClassifyIntentProperties.tsx`
  - `DetectRepetitionProperties.tsx`
  - `FastTrackRouterProperties.tsx`
  - `GenerateResponseProperties.tsx`
  - `GetChatHistoryProperties.tsx`
  - `GetRagContextProperties.tsx`
  - `SearchDocumentProperties.tsx`

### **FlowArchitectureManager**
- **Arquivo:** `src/components/FlowArchitectureManager.tsx`
- **Status:** ✅ Produção
- **Dependências:** `FlowArchitectureReact`
- **Uso:** Gerenciador da arquitetura de flow

---

## 📄 Documentos & Upload

### **DocumentList**
- **Arquivo:** `src/components/DocumentList.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Table`, `Button`
- **Uso:** Lista de documentos
- **Features:** Busca, filtros, preview, deletar

### **DocumentUpload**
- **Arquivo:** `src/components/DocumentUpload.tsx`
- **Status:** ✅ Produção
- **Dependências:** `DragDropZone`, `Button`
- **Uso:** Upload de documentos
- **Features:** Drag & drop, múltiplos arquivos, progresso

### **DragDropZone**
- **Arquivo:** `src/components/DragDropZone.tsx`
- **Status:** ✅ Produção
- **Dependências:** Nenhuma
- **Uso:** Zona de drag & drop
- **Features:** Feedback visual, validação de tipos

### **ChunksViewer**
- **Arquivo:** `src/components/ChunksViewer.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Badge`
- **Uso:** Visualizador de chunks de documentos
- **Features:** Busca, highlight, metadados

### **MediaUploadButton**
- **Arquivo:** `src/components/MediaUploadButton.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Button`, `Input`
- **Uso:** Botão de upload de mídia
- **Features:** Preview, tipos de arquivo

### **MediaPreview**
- **Arquivo:** `src/components/MediaPreview.tsx`
- **Status:** ✅ Produção
- **Dependências:** Nenhuma
- **Uso:** Preview de mídia (imagem, vídeo, áudio)
- **Features:** Thumbnail, player

---

## 🔔 Notificações & Alertas

### **NotificationBell**
- **Arquivo:** `src/components/NotificationBell.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Badge`, `Popover`
- **Uso:** Sino de notificações
- **Features:** Contador, lista de notificações

### **NotificationManager**
- **Arquivo:** `src/components/NotificationManager.tsx`
- **Status:** ✅ Produção
- **Dependências:** `PushNotificationsProvider`
- **Uso:** Gerenciador de notificações push
- **Features:** Permissões, registro

### **PushNotificationsProvider**
- **Arquivo:** `src/components/PushNotificationsProvider.tsx`
- **Status:** ✅ Produção
- **Dependências:** `@capacitor/push-notifications`
- **Uso:** Provider de notificações push (mobile)

---

## ⚙️ Configurações & Admin

### **BotConfigurationManager**
- **Arquivo:** `src/components/BotConfigurationManager.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Input`, `Select`, `Switch`
- **Uso:** Gerenciador de configurações do bot
- **Features:** Categorias, validação

### **BudgetConfiguration**
- **Arquivo:** `src/components/BudgetConfiguration.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Input`, `Slider`
- **Uso:** Configuração de orçamento
- **Features:** Limites, alertas

### **BudgetProgressBar**
- **Arquivo:** `src/components/BudgetProgressBar.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Progress`
- **Uso:** Barra de progresso de orçamento
- **Features:** Cores por nível (ok, warning, danger)

### **PricingConfigModal**
- **Arquivo:** `src/components/PricingConfigModal.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Dialog`, `Input`, `Table`
- **Uso:** Modal de configuração de preços
- **Features:** Tabela de preços, edição

### **CachePerformanceCard**
- **Arquivo:** `src/components/CachePerformanceCard.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Progress`
- **Uso:** Card de performance de cache
- **Features:** Hit rate, economia

### **AuditLogsViewer**
- **Arquivo:** `src/components/AuditLogsViewer.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Table`, `Badge`
- **Uso:** Visualizador de logs de auditoria
- **Features:** Filtros, busca, paginação

### **FallbackEventsTable**
- **Arquivo:** `src/components/FallbackEventsTable.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Table`
- **Uso:** Tabela de eventos de fallback
- **Features:** Filtros por tipo, data

### **AIGatewayNav**
- **Arquivo:** `src/components/AIGatewayNav.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Button`, `Badge`
- **Uso:** Navegação do AI Gateway
- **Features:** Tabs, badges de status

### **AnalyticsClient**
- **Arquivo:** `src/components/AnalyticsClient.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Tabs`
- **Uso:** Cliente de analytics
- **Features:** Múltiplas abas de métricas

---

## 🎯 Landing Page

### **Hero**
- **Arquivo:** `src/components/landing/Hero.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Button`
- **Uso:** Hero section da landing page
- **Features:** CTA, gradientes

### **Highlights**
- **Arquivo:** `src/components/landing/Highlights.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`
- **Uso:** Destaques da landing page
- **Features:** Cards de features

### **Plans**
- **Arquivo:** `src/components/landing/Plans.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Button`
- **Uso:** Seção de planos
- **Features:** Cards de preços, comparação

### **Security**
- **Arquivo:** `src/components/landing/Security.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`
- **Uso:** Seção de segurança
- **Features:** Badges de segurança

### **FinalCTA**
- **Arquivo:** `src/components/landing/FinalCTA.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Button`
- **Uso:** CTA final da landing page
- **Features:** Gradiente, destaque

---

## 🔐 Autenticação & Segurança

### **AuthMonitor**
- **Arquivo:** `src/components/AuthMonitor.tsx`
- **Status:** ✅ Produção
- **Dependências:** `createBrowserClient`
- **Uso:** Monitor de autenticação
- **Features:** Verifica estado de auth, redirect

### **BiometricAuthButton**
- **Arquivo:** `src/components/BiometricAuthButton.tsx`
- **Status:** ✅ Produção
- **Dependências:** `@aparajita/capacitor-biometric-auth`
- **Uso:** Botão de autenticação biométrica (mobile)
- **Features:** Face ID, Touch ID

### **LogoutButton**
- **Arquivo:** `src/components/LogoutButton.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Button`
- **Uso:** Botão de logout
- **Features:** Confirmação, redirect

---

## 📱 Mobile & Providers

### **DeepLinkingProvider**
- **Arquivo:** `src/components/DeepLinkingProvider.tsx`
- **Status:** ✅ Produção
- **Dependências:** `@capacitor/app`
- **Uso:** Provider de deep linking (mobile)
- **Features:** Navegação por URL

### **AudioRecorder**
- **Arquivo:** `src/components/AudioRecorder.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Button`, `AudioVisualizer`
- **Uso:** Gravador de áudio
- **Features:** Gravação, preview, upload

### **AudioVisualizer**
- **Arquivo:** `src/components/AudioVisualizer.tsx`
- **Status:** ✅ Produção
- **Dependências:** Canvas API
- **Uso:** Visualizador de áudio
- **Features:** Waveform, frequências

### **AudioMessage**
- **Arquivo:** `src/components/AudioMessage.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Button`
- **Uso:** Mensagem de áudio
- **Features:** Player, download

---

## 📋 Templates

### **TemplateList**
- **Arquivo:** `src/components/templates/TemplateList.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Table`
- **Uso:** Lista de templates WhatsApp
- **Features:** Busca, filtros, status

### **TemplateForm**
- **Arquivo:** `src/components/templates/TemplateForm.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Input`, `Textarea`, `Button`
- **Uso:** Formulário de criação/edição de template
- **Features:** Validação, preview

### **TemplatePreview**
- **Arquivo:** `src/components/templates/TemplatePreview.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`
- **Uso:** Preview de template
- **Features:** Renderização visual

### **TemplateStatusBadge**
- **Arquivo:** `src/components/templates/TemplateStatusBadge.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Badge`
- **Uso:** Badge de status do template
- **Variantes:** Pending, Approved, Rejected

### **TemplateViewDialog**
- **Arquivo:** `src/components/templates/TemplateViewDialog.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Dialog`
- **Uso:** Diálogo de visualização de template
- **Features:** Detalhes completos

### **TemplateSelectorDialog**
- **Arquivo:** `src/components/TemplateSelectorDialog.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Dialog`, `TemplateList`
- **Uso:** Seletor de template em diálogo
- **Features:** Busca, filtros

---

## 🎨 Componentes Especiais

### **EmptyState**
- **Arquivo:** `src/components/EmptyState.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Card`, `Button`
- **Uso:** Estado vazio
- **Features:** Ícone, título, descrição, CTA opcional

### **ExportDialog**
- **Arquivo:** `src/components/ExportDialog.tsx`
- **Status:** ✅ Produção
- **Dependências:** `Dialog`, `Button`
- **Uso:** Diálogo de exportação
- **Features:** PNG, SVG, PDF, Excel, CSV
- **Dependências:** `html2canvas`, `jspdf`, `xlsx`

---

## 📊 Estatísticas

- **Total de Componentes:** ~120+
- **Componentes Base (shadcn/ui):** 26
- **Componentes Customizados:** ~94
- **Componentes de Gráficos:** 10
- **Componentes de Flow:** 20+
- **Componentes de Landing:** 5

---

## 🔍 Como Buscar

### **Por Categoria**
Use o índice acima para navegar por categoria.

### **Por Nome**
Use `Ctrl+F` (ou `Cmd+F`) e digite o nome do componente.

### **Por Funcionalidade**
- Gráficos → Seção "Gráficos & Visualizações"
- Formulários → Seção "Filtros & Seletores"
- Listas → Seções específicas (Conversas, Contatos, etc.)

### **Por Arquivo**
Todos os componentes listam o arquivo completo em `src/components/`.

---

## 📝 Legenda

- ✅ **Produção** - Componente em uso ativo
- ✅ **Base** - Componente shadcn/ui (base)
- ✅ **Customizado** - Componente customizado do projeto
- ⏳ **Em Desenvolvimento** - Componente em progresso
- ❌ **Deprecado** - Componente não recomendado

---

## 🔄 Atualização

Este catálogo deve ser atualizado sempre que:
- Novo componente é criado
- Componente é removido
- Status de componente muda
- Dependências são alteradas

**Última atualização:** 2026-01-16

---

## 📚 Documentação Relacionada

- [Como Funciona a Integração UI/UX](./COMO_FUNCIONA_INTEGRACAO_UI_UX.md)
- [Component Database para ChatBot](./COMPONENT_DATABASE_CHATBOT.md)
- [Guia de Compilação Local](../../COMO_COMPILAR_LOCALMENTE.md)

---

**Fim do Catálogo** 🎉

