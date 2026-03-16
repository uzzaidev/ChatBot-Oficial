# Sprint 4 — Dashboard UI

**Objetivo:** Criar todas as interfaces administrativas para a integração Tecnofit: configuração de credenciais, monitoramento de sincronização, visualização de clientes importados e gestão de solicitações de aulas experimentais.

**Resultado esperado ao final deste sprint:**
- Seção "Tecnofit" em `/dashboard/settings` para configurar credenciais
- Página `/dashboard/tecnofit` com status, clientes e trial requests
- Link no sidebar do dashboard
- Todos os componentes React funcionais e responsivos

**Depende de:** Sprint 1 (config), Sprint 2 (API routes de sync e customers), Sprint 3 (API routes de trial requests)

**Próximo sprint depende deste:** Sprint 5 (cron config exposta no dashboard)

---

## Referências de Código Existente

Antes de criar qualquer componente, **ler estes arquivos** para entender os padrões visuais:

| Arquivo | O que estudar |
|---|---|
| `src/app/dashboard/meta-ads/page.tsx` | Estrutura de uma página de integração |
| `src/app/dashboard/settings/page.tsx` | Padrão de formulários de configuração |
| `src/app/dashboard/crm/page.tsx` | Tabelas e filtros |
| `src/components/ui/` | Componentes shadcn disponíveis (Button, Card, Badge, Table, Input, etc.) |

---

## Tarefa 4.1 — Seção Tecnofit em Settings

> **Arquivo a modificar:** `src/app/dashboard/settings/page.tsx`
>
> **Componente a criar:** `src/components/tecnofit/TecnofitSettings.tsx`

### 4.1.A — Componente TecnofitSettings

**Criar:** `src/components/tecnofit/TecnofitSettings.tsx`

**Checklist 4.1.A — Estado e dados:**

- [ ] Criar estado local:
  ```typescript
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [companyId, setCompanyId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  ```

- [ ] `useEffect` ao montar: GET `/api/client/tecnofit-config`
  - Setar `enabled`, `autoSync`, `companyId`, `hasExistingConfig`
  - `apiKey` e `apiSecret` nunca são retornados pela API (segurança)
  - Se `hasApiKey: true`, mostrar placeholder `'••••••••••••••••••••'` (21 pontos)
  - Se `hasApiSecret: true`, mostrar placeholder `'••••••••••••••••••••••••••'` (26 pontos)

**Checklist 4.1.A — Funções:**

- [ ] Função `handleSave()`:
  - Validações client-side:
    - Se `apiKey` foi digitado (não é placeholder): verificar `apiKey.length === 21`
    - Se `apiSecret` foi digitado: verificar `apiSecret.length === 26`
    - Mostrar erro inline se inválido
  - `setIsSaving(true)`
  - POST `/api/client/tecnofit-config` com dados alterados
  - Em caso de sucesso: toast "Configuração salva com sucesso"
  - Em caso de erro: toast com a mensagem de erro
  - `setIsSaving(false)`

- [ ] Função `handleTestConnection()`:
  - `setIsTesting(true)`, `setTestResult('idle')`
  - GET `/api/test/tecnofit-connection`
  - Em caso de sucesso (200): `setTestResult('success')`, `setTestMessage('Conexão OK — {n} empresas encontradas')`
  - Em caso de erro: `setTestResult('error')`, `setTestMessage(error.message)`
  - `setIsTesting(false)`

- [ ] Função `handleRemoveIntegration()`:
  - Exibir dialog de confirmação: `'Tem certeza? Isso removerá as credenciais e desativará a integração.'`
  - Se confirmado: DELETE `/api/client/tecnofit-config`
  - Limpar estado local
  - Toast de confirmação

**Checklist 4.1.A — Renderização:**

- [ ] Seção header:
  - Ícone de academia/halteres
  - Título: `'Integração Tecnofit'`
  - Descrição: `'Sincronize alunos e prospects do seu sistema Tecnofit com o CRM do chatbot.'`
  - Badge de status: `'Ativo'` (verde) ou `'Inativo'` (cinza)

- [ ] Card de credenciais:
  - Campo API Key: `<Input type="password" placeholder="api_key (21 caracteres)" maxLength={21} />`
  - Campo API Secret: `<Input type="password" placeholder="api_secret (26 caracteres)" maxLength={26} />`
  - Helper text: `'Obtenha suas chaves em: Tecnofit → Loja de Adicionais → API Aberta'`
  - Campo Company ID: `<Input placeholder="ID da unidade (para multi-empresa, opcional)" />`
  - Exibir indicador `✓ Chave salva` se `hasExistingConfig && !apiKey_editado`

- [ ] Card de opções:
  - Toggle "Habilitar integração Tecnofit": `enabled`
  - Toggle "Sincronização automática diária": `autoSync`
  - Descrição do toggle autoSync: `'Sincroniza automaticamente às 3h da manhã'`

- [ ] Botões:
  - `<Button onClick={handleTestConnection} disabled={isTesting}>Testar Conexão</Button>`
  - `<Button onClick={handleSave} disabled={isSaving}>Salvar Configurações</Button>`
  - (Separado) `<Button variant="destructive" onClick={handleRemoveIntegration}>Remover Integração</Button>`

- [ ] Resultado do teste de conexão:
  - Se `testResult === 'success'`: badge verde com ícone ✓ e mensagem
  - Se `testResult === 'error'`: badge vermelho com ícone ✗ e mensagem de erro

---

### 4.1.B — Incluir componente em Settings

**Checklist 4.1.B:**

- [ ] Abrir `src/app/dashboard/settings/page.tsx`
- [ ] Localizar onde outras seções de configuração são adicionadas (seguir padrão existente)
- [ ] Importar e adicionar `<TecnofitSettings />` na página
- [ ] Garantir que aparece em uma seção própria com título visível

---

## Tarefa 4.2 — Página Principal `/dashboard/tecnofit`

> **Criar:** `src/app/dashboard/tecnofit/page.tsx`
>
> **Criar componentes:** `src/components/tecnofit/`

### 4.2.A — Layout da página

**Checklist 4.2.A:**

- [ ] Criar arquivo `src/app/dashboard/tecnofit/page.tsx`
- [ ] Marcar como `'use client'` (componente interativo)
- [ ] Importar componentes que serão criados nas subtarefas abaixo
- [ ] Estrutura da página:
  ```
  <PageHeader>
    Tecnofit
    <Button>Sincronizar Agora</Button>
  </PageHeader>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <StatsCard> Total de Clientes </StatsCard>
    <StatsCard> Prospects </StatsCard>
    <StatsCard> Aulas Experimentais Pendentes </StatsCard>
  </div>

  <SyncStatusCard />

  <Tabs>
    <TabsList>
      <TabsTrigger>Clientes Importados</TabsTrigger>
      <TabsTrigger>Aulas Experimentais</TabsTrigger>
    </TabsList>
    <TabsContent>
      <TecnofitCustomersTable />
    </TabsContent>
    <TabsContent>
      <TrialRequestsTable />
    </TabsContent>
  </Tabs>
  ```

---

### 4.2.B — Componente SyncStatusCard

**Criar:** `src/components/tecnofit/SyncStatusCard.tsx`

**Checklist 4.2.B:**

- [ ] Props: nenhuma (busca próprios dados)

- [ ] `useEffect` ao montar: GET `/api/integrations/tecnofit/status`

- [ ] Estado:
  ```typescript
  const [syncData, setSyncData] = useState<TecnofitSyncMetadata | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  ```

- [ ] Função `handleStartSync()`:
  - `setIsSyncing(true)`
  - POST `/api/integrations/tecnofit/sync`
  - Iniciar polling: a cada 3 segundos, GET `/api/integrations/tecnofit/status`
  - Quando `status !== 'syncing'`: parar polling, `setIsSyncing(false)`, recarregar dados
  - Limite de polling: máximo 10 minutos (timeout de segurança)

- [ ] Renderização:
  - Título: `'Sincronização com Tecnofit'`
  - Se `status === 'never_synced'`: mostrar card com mensagem "Nunca sincronizado" e botão de sync
  - Se `status === 'syncing'`: mostrar spinner + `'Sincronizando... X clientes processados'`
  - Se `status === 'idle'`: mostrar data/hora da última sync + stats
  - Se `status === 'error'`: mostrar badge vermelho, última mensagem de erro, botão de retry
  - Card exibe: última sync, clientes sincronizados, erros, duração (se disponível)

- [ ] Botão `'Sincronizar Agora'`:
  - Disabled quando `isSyncing`
  - Loading spinner quando `isSyncing`
  - Text: `'Sincronizando...'` quando ativo, `'Sincronizar Agora'` quando inativo

---

### 4.2.C — Componente TecnofitCustomersTable

**Criar:** `src/components/tecnofit/TecnofitCustomersTable.tsx`

**Checklist 4.2.C:**

- [ ] Estado:
  ```typescript
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'customer' | 'prospect'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  ```

- [ ] `useEffect` ao montar e quando filtros mudam: GET `/api/integrations/tecnofit/customers?search=&type=&page=`

- [ ] Debounce de 400ms no campo de busca (evitar muitas requests ao digitar)

- [ ] Colunas da tabela:
  | Coluna | Dado | Observações |
  |---|---|---|
  | Nome | `title` | Link para CRM card |
  | Telefone | `phone` | Formatado: (11) 99999-9999 |
  | Tipo | `custom_fields.client_type` | Badge "Aluno" (verde) ou "Prospect" (amarelo) |
  | Status | `custom_fields.tecnofit_status` | Badge com cor |
  | Tecnofit ID | `custom_fields.tecnofit_id` | Texto cinza, menor |
  | Sincronizado em | `created_at` | Data/hora formatada |
  | Ações | — | Botão "Ver no CRM" |

- [ ] Filtros acima da tabela:
  - `<Input placeholder="Buscar por nome..." />` com debounce
  - `<Select>` para tipo: Todos, Aluno, Prospect

- [ ] Empty state:
  - Se nenhum cliente importado: card com ícone + texto "Nenhum cliente sincronizado ainda. Clique em 'Sincronizar Agora' para importar."
  - Se busca sem resultados: "Nenhum resultado para '{search}'"

- [ ] Paginação:
  - Componente `<Pagination>` já existente no projeto (verificar em `src/components/ui/`)
  - Mostrar: `Página {page} de {totalPages}` + botões anterior/próximo

---

### 4.2.D — Componente TrialRequestsTable

**Criar:** `src/components/tecnofit/TrialRequestsTable.tsx`

**Checklist 4.2.D:**

- [ ] Estado:
  ```typescript
  const [requests, setRequests] = useState<TecnofitTrialRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  ```

- [ ] `useEffect`: GET `/api/integrations/tecnofit/trial-requests?status=&page=`

- [ ] Colunas da tabela:
  | Coluna | Dado | Observações |
  |---|---|---|
  | Nome | `prospect_name` | |
  | Telefone | `prospect_phone` | Formatado + link WhatsApp |
  | Modalidade | `preferred_modality` | `'—'` se não informado |
  | Preferência | `preferred_days + preferred_time` | Formato: "Seg/Qua - manhã" |
  | Status | `status` | Badge colorido |
  | Data | `created_at` | Relativa: "há 2 horas" |
  | Ações | — | Botões de ação |

- [ ] Badges de status:
  - `pending` → Badge amarelo "Pendente"
  - `contacted` → Badge azul "Contatado"
  - `confirmed` → Badge verde "Confirmado"
  - `cancelled` → Badge cinza "Cancelado"
  - `no_show` → Badge vermelho "Não compareceu"

- [ ] Ações por linha:
  - Status `pending`: botão "Confirmar" (verde) + botão "Cancelar" (cinza)
  - Status `contacted`: botão "Confirmar" (verde) + botão "Cancelar" (cinza)
  - Status `confirmed`: sem botões (ou "Desfazer")
  - Status `cancelled`: sem botões

- [ ] Função `handleUpdateStatus(id, newStatus)`:
  - `setUpdatingId(id)`
  - PATCH `/api/integrations/tecnofit/trial-requests/{id}` com `{ status: newStatus }`
  - Em sucesso: atualizar item na lista localmente (sem refetch)
  - Toast de confirmação
  - `setUpdatingId(null)`

- [ ] Empty state: "Nenhuma solicitação de aula experimental ainda."

- [ ] Filtro de status acima da tabela

---

### 4.2.E — Cards de Estatísticas

**Checklist 4.2.E:**

- [ ] Na `page.tsx`, buscar estatísticas ao montar:
  ```typescript
  // GET /api/integrations/tecnofit/customers → total
  // GET /api/integrations/tecnofit/trial-requests?status=pending → count
  ```

- [ ] 3 cards de stats:
  ```
  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
  │  👥 Clientes    │  │  🎯 Prospects   │  │  📅 Pendentes   │
  │     1.234       │  │       89        │  │       12        │
  │ sincronizados   │  │  no sistema     │  │  aulas exper.   │
  └─────────────────┘  └─────────────────┘  └─────────────────┘
  ```

---

## Tarefa 4.3 — Navegação (Sidebar)

> **Arquivo:** localizar onde o sidebar/navigation do dashboard é definido
>
> Buscar por: `src/components/DashboardNavigation.tsx` ou equivalente

**Checklist 4.3:**

- [ ] Abrir o arquivo de navegação do dashboard
- [ ] Localizar onde outros itens como "CRM", "Analytics", etc. são definidos
- [ ] Adicionar item Tecnofit:
  ```typescript
  {
    label: 'Tecnofit',
    href: '/dashboard/tecnofit',
    icon: Dumbbell,  // importar de 'lucide-react'
    // Mostrar apenas se tecnofit_enabled = true OU se é admin
  }
  ```
- [ ] Importar ícone `Dumbbell` de `lucide-react`
- [ ] Testar que o link aparece e navega corretamente

---

## Tarefa 4.4 — Hooks React

### 4.4.A — Hook `useTecnofitSync`

**Criar:** `src/hooks/useTecnofitSync.ts`

**Checklist 4.4.A:**

- [ ] Implementar hook:
  ```typescript
  export function useTecnofitSync() {
    // Retorna:
    // - syncStatus: TecnofitSyncMetadata | null
    // - isSyncing: boolean
    // - startSync: () => Promise<void>
    // - refreshStatus: () => Promise<void>
  }
  ```

- [ ] `startSync()`:
  - POST `/api/integrations/tecnofit/sync`
  - Iniciar polling automático do status a cada 3s
  - Parar polling quando `status !== 'syncing'`
  - `isSyncing` reflete o estado real baseado no `status` do banco

- [ ] `refreshStatus()`: GET `/api/integrations/tecnofit/status` e atualizar estado

---

### 4.4.B — Hook `useTrialRequests`

**Criar:** `src/hooks/useTrialRequests.ts`

**Checklist 4.4.B:**

- [ ] Implementar hook:
  ```typescript
  export function useTrialRequests(filters?: { status?: string; page?: number }) {
    // Retorna:
    // - requests: TecnofitTrialRequest[]
    // - pagination: { page, totalPages, total }
    // - isLoading: boolean
    // - updateStatus: (id: string, status: string) => Promise<void>
    // - refresh: () => void
  }
  ```

---

## Tarefa 4.5 — Responsividade e Acessibilidade

**Checklist 4.5:**

- [ ] Testar em viewport mobile (375px): tabelas devem ter scroll horizontal
- [ ] Testar em viewport tablet (768px): layout deve ajustar
- [ ] Botões com estado `loading` devem ter `disabled` (evitar double-click)
- [ ] Loading states em todas as tabelas (skeleton ou spinner)
- [ ] Error states: se a API retornar erro, mostrar mensagem amigável (não crash)
- [ ] Verificar que não há `console.error` não tratados no browser

---

## Definição de "Done" — Sprint 4

- [ ] `TecnofitSettings` em `/dashboard/settings` funcionando (GET e POST)
- [ ] Botão "Testar Conexão" retorna feedback correto
- [ ] Página `/dashboard/tecnofit` renderiza sem erros
- [ ] `SyncStatusCard` inicia e monitora sync corretamente
- [ ] `TecnofitCustomersTable` lista, filtra e pagina clientes
- [ ] `TrialRequestsTable` lista e permite confirmar/cancelar solicitações
- [ ] Link no sidebar aparece e navega corretamente
- [ ] Sem erros no console do browser
- [ ] Responsivo em mobile e desktop
- [ ] Commit: `feat: Sprint 4 - Tecnofit dashboard UI`
