# 🎨 Components Showcase - Guia de Uso

**Página visual para ver todos os componentes do projeto**

---

## 🚀 Como Acessar

### **1. Iniciar o Servidor de Desenvolvimento**

```bash
pnpm dev
# ou
npm run dev
```

### **2. Acessar a Página**

Abra no navegador:
```
http://localhost:3000/components-showcase
```

---

## ✨ Funcionalidades

### **📊 Visualização de Componentes**

- ✅ **Preview Visual** - Veja como cada componente aparece
- ✅ **Informações Detalhadas** - Arquivo, dependências, descrição
- ✅ **Categorias** - Organizado por tipo de componente
- ✅ **Busca** - Encontre componentes rapidamente
- ✅ **Estatísticas** - Total de componentes, base vs customizados

### **🔍 Busca e Filtros**

1. **Busca por Nome**
   - Digite no campo de busca
   - Busca em nome e descrição

2. **Filtro por Categoria**
   - Clique nos botões de categoria
   - Veja contagem de componentes por categoria

### **📋 Categorias Disponíveis**

- **Todos** - Todos os componentes
- **Base (shadcn/ui)** - Componentes base do shadcn
- **Dashboard & Métricas** - Componentes de dashboard
- **Filtros & Seletores** - Filtros de data, seletores
- **Conversas & Mensagens** - Componentes de chat
- **Contatos & Clientes** - Gerenciamento de contatos
- **Flows & Arquitetura** - Editor de flows
- **Documentos & Upload** - Upload e visualização
- **Notificações** - Notificações e alertas
- **Configurações** - Configurações e admin
- **Landing Page** - Componentes da landing
- **Autenticação** - Auth e segurança
- **Mobile** - Componentes mobile

---

## 📝 Estrutura da Página

### **Header**
- Título com gradiente UZZ.AI
- Descrição da página

### **Filtros**
- Campo de busca
- Botões de categoria com contadores

### **Estatísticas**
- Total de componentes
- Componentes base
- Componentes customizados
- Componentes filtrados

### **Grid de Componentes**
- Cards com preview
- Informações do componente
- Código fonte (arquivo)
- Dependências

---

## 🎯 Componentes Renderizáveis

Alguns componentes são renderizados diretamente na página:

- ✅ **Button** - Todas as variantes
- ✅ **Card** - Estrutura completa
- ✅ **Badge** - Diferentes variantes
- ✅ **Input** - Campo de texto
- ✅ **Textarea** - Campo multilinha
- ✅ **Select** - Seletor dropdown
- ✅ **Checkbox** - Checkbox
- ✅ **Switch** - Toggle
- ✅ **Slider** - Controle deslizante
- ✅ **Progress** - Barra de progresso
- ✅ **Alert** - Alertas
- ✅ **Avatar** - Avatar de usuário
- ✅ **Tooltip** - Tooltips
- ✅ **Dialog** - Modais
- ✅ **Popover** - Popovers
- ✅ **Dropdown Menu** - Menus dropdown
- ✅ **Alert Dialog** - Diálogos de confirmação
- ✅ **Tabs** - Abas
- ✅ **Separator** - Separadores
- ✅ **Scroll Area** - Área com scroll
- ✅ **Sheet** - Sidebars móveis
- ✅ **Toast** - Notificações toast
- ✅ **MetricCard** - Card de métrica
- ✅ **EmptyState** - Estado vazio
- ✅ **StatusBadge** - Badge de status

### **Componentes Não Renderizáveis**

Alguns componentes não podem ser renderizados diretamente (requerem contexto, props específicas, etc.):

- ⚠️ Componentes de página completa
- ⚠️ Componentes que requerem hooks específicos
- ⚠️ Componentes que dependem de dados do servidor

Esses componentes mostram:
- 📄 Informações do componente
- 📍 Localização do arquivo
- 🔗 Dependências
- 📝 Descrição

---

## 🔧 Adicionar Novos Componentes

Para adicionar um novo componente à showcase:

### **1. Componente Renderizável**

```typescript
{
  id: 'meu-componente',
  name: 'MeuComponente',
  category: 'dashboard', // ou outra categoria
  file: 'src/components/MeuComponente.tsx',
  description: 'Descrição do componente',
  status: 'custom', // ou 'base'
  dependencies: ['Card', 'Button'], // opcional
  component: MeuComponente, // Importar o componente
  props: { /* props para preview */ }
}
```

### **2. Componente Não Renderizável**

```typescript
{
  id: 'meu-componente',
  name: 'MeuComponente',
  category: 'dashboard',
  file: 'src/components/MeuComponente.tsx',
  description: 'Descrição do componente',
  status: 'custom',
  dependencies: ['Card', 'Button']
  // Sem 'component' e 'props'
}
```

### **3. Adicionar à Lista**

Edite `src/app/components-showcase/page.tsx`:

- Se renderizável: adicione em `components[]`
- Se não renderizável: adicione em `additionalComponents[]`

---

## 🎨 Customização

### **Cores e Estilos**

A página usa o tema dark padrão do projeto:
- Background: `#0f1419`
- Cards: `#1a1f26`
- Cores UZZ.AI: mint, blue, gold, silver

### **Layout**

- Grid responsivo: 1 coluna (mobile), 2 colunas (desktop)
- Cards com hover effect
- Gradientes nos botões ativos

---

## 📊 Estatísticas

A página mostra automaticamente:
- **Total:** Todos os componentes catalogados
- **Base:** Componentes shadcn/ui
- **Customizados:** Componentes customizados do projeto
- **Filtrados:** Componentes visíveis após filtros

---

## 🔗 Links Relacionados

- [Catálogo Completo de Componentes](./CATALOGO_COMPONENTES.md)
- [Como Funciona a Integração UI/UX](./COMO_FUNCIONA_INTEGRACAO_UI_UX.md)
- [Component Database para ChatBot](./COMPONENT_DATABASE_CHATBOT.md)

---

## ✅ Checklist

Ao adicionar um novo componente:

- [ ] Componente está funcionando
- [ ] Adicionado à lista em `components-showcase/page.tsx`
- [ ] Categoria correta selecionada
- [ ] Descrição clara
- [ ] Dependências listadas
- [ ] Arquivo correto especificado
- [ ] Preview funciona (se renderizável)

---

**Última atualização:** 2026-01-16

