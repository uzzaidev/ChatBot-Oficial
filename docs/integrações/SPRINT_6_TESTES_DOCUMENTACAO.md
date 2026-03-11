# Sprint 6 — Testes, Polimento e Documentação

**Objetivo:** Garantir qualidade, robustez e confiabilidade da integração completa. Validar todos os cenários críticos, ajustar tratamento de erros, e documentar a integração para facilitar manutenção futura.

**Resultado esperado ao final deste sprint:**
- Todos os fluxos críticos testados manualmente
- Tratamento de erros robusto em todos os pontos
- `docs/tables/tabelas.md` atualizado com as novas tabelas
- `CLAUDE.md` atualizado com seção Tecnofit
- Guia de setup para configuração da integração

**Depende de:** Todos os sprints anteriores (1–5) concluídos

---

## Tarefa 6.1 — Auditoria de Segurança

> Antes de qualquer teste, garantir que a integração é segura.

**Checklist 6.1:**

### Secrets e credenciais

- [ ] Verificar que `apiKey` e `apiSecret` nunca aparecem em:
  - `console.log()` ou `console.error()`
  - Corpo de respostas HTTP (GET `/api/client/tecnofit-config` não deve retornar valores)
  - Logs de erro (`error.message` pode conter URL com credenciais em alguns casos de axios)
  - Banco de dados fora do Vault

- [ ] Verificar que todos os logs de sync registram apenas `clientId` e contagens (nunca dados sensíveis de clientes):
  - CPF não deve aparecer em logs
  - Email não deve aparecer em logs

### Autenticação das rotas

- [ ] Verificar que TODAS as rotas abaixo têm `getClientIdFromSession()`:
  - `POST /api/integrations/tecnofit/sync`
  - `GET /api/integrations/tecnofit/status`
  - `GET /api/integrations/tecnofit/customers`
  - `GET /api/integrations/tecnofit/companies`
  - `GET /api/integrations/tecnofit/trial-requests`
  - `PATCH /api/integrations/tecnofit/trial-requests/[id]`
  - `GET /api/client/tecnofit-config`
  - `POST /api/client/tecnofit-config`
  - `DELETE /api/client/tecnofit-config`

- [ ] Verificar que `PATCH /api/integrations/tecnofit/trial-requests/[id]` valida que o `id` pertence ao `clientId` do usuário autenticado (prevenir IDOR — Insecure Direct Object Reference)

### RLS Policies

- [ ] Testar RLS na tabela `tecnofit_sync_metadata`:
  - Usuário de cliente A não consegue ver dados do cliente B
  - Service role consegue ler/escrever todos

- [ ] Testar RLS na tabela `tecnofit_trial_requests`:
  - Idem para isolamento multi-tenant

### Cron endpoint

- [ ] Verificar que `GET /api/cron/tecnofit-sync` sem o header `Authorization: Bearer {CRON_SECRET}` retorna 401
- [ ] Verificar que com o secret correto retorna 200

---

## Tarefa 6.2 — Testes do Cliente HTTP

**Checklist 6.2:**

> **Arquivo de teste:** `src/app/api/test/tecnofit-connection/route.ts`

### Autenticação

- [ ] **Credenciais inválidas:**
  - POST `/auth/login` com api_key ou api_secret errados
  - Verificar que retorna erro 401 e mensagem descritiva (não expõe as credenciais)

- [ ] **Cache de token:**
  - Fazer 2 chamadas seguidas ao `getTecnofitToken()`
  - Verificar no log que o segundo chamado usa o cache (não faz novo login)

- [ ] **Token expirado (simulado):**
  - Manualmente setar `expiresAt` para timestamp passado no `tokenCache`
  - Fazer chamada — deve fazer login automático e renovar

### Rate limiting

- [ ] Criar endpoint de teste: `src/app/api/test/tecnofit-rate-limit/route.ts`
  - Faz 10 chamadas seguidas para a API Tecnofit
  - Mede tempo total — deve levar pelo menos 6 segundos (10 × 600ms de delay)
  - Verifica que nenhuma request retornou 429

- [ ] **Simulação de 429:**
  - Mockar resposta 429 com `Retry-After: 5`
  - Verificar que o interceptor aguarda 5 segundos antes de retry
  - Verificar que o retry funciona após o delay

---

## Tarefa 6.3 — Testes do Sync de Contatos

**Checklist 6.3:**

> Estes testes podem ser feitos com dados mock (sem credenciais reais)

### Criar endpoint de mock

- [ ] Criar `src/app/api/test/tecnofit-sync-mock/route.ts`:
  - Aceita query param `?scenario=<nome>`
  - Gera dados mock baseados no cenário
  - Executa `syncTecnofitClients()` com clientes fictícios
  - Útil para testar toda a lógica sem precisar da API real

**Cenários a testar:**

- [ ] **Cenário `basic`** — 5 clientes simples:
  - Verificar que 5 CRM cards foram criados
  - Verificar que 5 lead_sources foram criados com `source_type = 'tecnofit'`
  - Verificar que `tecnofit_sync_metadata.synced_count = 5`

- [ ] **Cenário `no_phone`** — 3 clientes, 1 sem telefone:
  - Verificar que o cliente sem telefone tem `phone = 'tecnofit_{id}'`
  - Sync deve completar sem errors (warning, não erro crítico)

- [ ] **Cenário `deduplication`** — rodar o mesmo sync 2x:
  - Após 2 execuções: deve existir apenas 5 cards (não 10)
  - `tecnofit_id` dos cards deve ser preservado

- [ ] **Cenário `update`** — sincronizar cliente existente com dados atualizados:
  - Primeiro sync: cliente "João" → CRM card criado
  - Segundo sync: mesmo `tecnofit_id`, nome "João Silva" (atualizado)
  - Verificar que o card tem nome atualizado, não foi criado novo

- [ ] **Cenário `large`** — 200 clientes:
  - Simula 2 páginas de 100 clientes
  - Verificar que todos 200 são importados
  - Verificar que `tecnofit_sync_metadata` mostra `synced_count = 200`

- [ ] **Cenário `partial_error`** — 10 clientes, 2 com dados inválidos:
  - Verificar que 8 foram sincronizados com sucesso
  - Verificar que `error_count = 2` no metadata
  - Verificar que `errorDetails` contém mensagem sobre os 2 erros
  - Sync NÃO deve ter parado nos erros parciais

---

## Tarefa 6.4 — Testes do Agente WhatsApp

**Checklist 6.4:**

> Testes de diálogo real no WhatsApp (requer ambiente funcional)

### Fluxo de aula experimental

- [ ] **Cenário 1 — Fluxo completo:**
  - Mensagem: `"Olá, quero fazer uma aula experimental"`
  - Agente deve perguntar nome e confirmar telefone
  - Usuário informa nome: "Maria Silva"
  - Agente confirma e pergunta modalidade (opcional)
  - Usuário diz "musculação"
  - Agente confirma e registra
  - Verificar que `tecnofit_trial_requests` tem o registro correto
  - Verificar que CRM card foi criado
  - Verificar que email de notificação foi enviado

- [ ] **Cenário 2 — Dados incompletos:**
  - Mensagem: `"quero conhecer a academia"`
  - Agente deve pedir nome
  - Usuário não informa nome na primeira resposta
  - Agente deve insistir educadamente
  - Após fornecer nome: registrar normalmente

- [ ] **Cenário 3 — Solicitação duplicada:**
  - Fazer a mesma solicitação duas vezes com o mesmo telefone
  - Segunda solicitação deve informar que já há uma pedido ativo
  - Não criar registro duplicado em `tecnofit_trial_requests`

- [ ] **Cenário 4 — Listar modalidades:**
  - Mensagem: `"O que vocês têm de atividade?"`
  - Agente deve chamar tool `listar_modalidades_academia`
  - Retornar lista formatada
  - Cache Redis deve ser populado após primeira chamada

- [ ] **Cenário 5 — Consultar próprio cadastro:**
  - Mensagem: `"Quero saber se já sou cadastrado"`
  - Agente deve chamar `consultar_cliente_academia`
  - Se encontrado no CRM: mostrar dados básicos
  - Se não encontrado: mensagem amigável

### Validar que flow normal não foi quebrado

- [ ] Enviar mensagem aleatória que não é sobre academia → resposta normal do agente
- [ ] Pedir handoff humano → `transferir_atendimento` ainda funciona
- [ ] Cliente sem Tecnofit habilitado → tools não aparecem, fluxo normal

---

## Tarefa 6.5 — Testes da UI

**Checklist 6.5:**

### Página de Settings

- [ ] Abrir `/dashboard/settings` — seção Tecnofit aparece
- [ ] Preencher API Key com menos de 21 chars → erro de validação inline
- [ ] Preencher API Secret com menos de 26 chars → erro de validação inline
- [ ] Clicar "Testar Conexão" sem credenciais → mensagem de erro amigável
- [ ] Salvar configuração → toast de sucesso
- [ ] Recarregar página → campos mostram placeholder `'••••'` (secreto salvo)
- [ ] Clicar "Remover Integração" → dialog de confirmação → remoção funciona

### Página Tecnofit

- [ ] Abrir `/dashboard/tecnofit`
- [ ] Status card mostra "Nunca sincronizado" se for o primeiro acesso
- [ ] Clicar "Sincronizar Agora" → spinner aparece
- [ ] Durante sync: polling de status atualiza a UI a cada 3s
- [ ] Após sync: tabela de clientes é populada
- [ ] Busca por nome funciona (com debounce)
- [ ] Filtro por tipo (aluno/prospect) funciona
- [ ] Paginação funciona
- [ ] Aba "Aulas Experimentais" mostra solicitações
- [ ] Botão "Confirmar" em trial request atualiza status e badge

### Responsividade

- [ ] Abrir em mobile (375px) — tabelas têm scroll horizontal
- [ ] Abrir em tablet (768px) — layout ajusta corretamente
- [ ] Sidebar mostra link "Tecnofit" se integração estiver ativa

---

## Tarefa 6.6 — Testes do Cron

**Checklist 6.6:**

- [ ] Testar manualmente via endpoint de teste:
  ```bash
  curl "http://localhost:3000/api/test/tecnofit-cron?clientId=SEU_UUID" \
    -H "Authorization: Bearer $(echo $CRON_SECRET)"
  ```

- [ ] Verificar log de saída mostra todos os clientes processados
- [ ] Verificar que clientes sem `tecnofit_auto_sync = true` são pulados
- [ ] Verificar que clientes com sync recente (intervalo não atingido) são pulados
- [ ] Verificar que circuit breaker bloqueia cliente com muitos erros

---

## Tarefa 6.7 — Tratamento de Erros e Edge Cases

**Checklist 6.7:**

### API Tecnofit offline

- [ ] Simular Tecnofit retornando 500:
  - `syncTecnofitClients()` deve: capturar erro, atualizar metadata com `status = 'error'`, retornar resultado com `success: false`
  - Dashboard deve mostrar badge vermelho "Erro" com mensagem

- [ ] Simular timeout de rede (>15s):
  - Verificar que axios retorna `ECONNABORTED`
  - Não deve ficar travado em `status = 'syncing'` para sempre

### Configuração inválida

- [ ] Chamar sync com `tecnofit_enabled = false`:
  - API route deve retornar 400 com mensagem clara

- [ ] Chamar sync com secrets configurados mas inválidos (expirados ou revogados):
  - Login falha → metadata atualizado com erro → resposta 400 com mensagem sobre credenciais

### Banco de dados

- [ ] `crm_columns` não existe para o cliente:
  - `getDefaultCRMColumnId()` deve retornar erro descritivo, não crash com `null`

- [ ] `tecnofit_trial_requests` INSERT falha (ex: constraint violation):
  - `handleAgendarAulaExperimental()` não deve quebrar o fluxo do chatbot
  - Deve logar o erro e retornar mensagem amigável ao prospect

---

## Tarefa 6.8 — Atualizar Documentação

**Checklist 6.8:**

### `docs/tables/tabelas.md`

- [ ] Adicionar tabela `tecnofit_sync_metadata`:
  - Todas as colunas com tipos e descrições
  - RLS policies

- [ ] Adicionar tabela `tecnofit_trial_requests`:
  - Todas as colunas com tipos, enums e descrições
  - Índices criados
  - RLS policies

- [ ] Adicionar coluna `tecnofit_*` na tabela `clients`:
  - Documentar que `tecnofit_api_key_secret_id` e `tecnofit_api_secret_secret_id` são referências ao Vault

### `CLAUDE.md`

- [ ] Adicionar na seção "Key Entry Points":
  ```
  | **Tecnofit HTTP Client** | `src/lib/tecnofit.ts` |
  | **Tecnofit Adapter/Sync** | `src/lib/tecnofit-adapter.ts` |
  | **Tecnofit Tool Handlers** | `src/nodes/handleTecnofitToolCall.ts` |
  | **Tecnofit Dashboard** | `/dashboard/tecnofit` |
  ```

- [ ] Adicionar seção "Integração Tecnofit":
  ```markdown
  ### Integração Tecnofit (Academia)

  **Status:** ✅ Implementado

  **Funcionalidades:**
  - Importação de alunos/prospects → CRM cards
  - Detecção de interesse em aulas experimentais via WhatsApp
  - Agendamento de aulas experimentais (coleta dados → notifica academia)
  - Sync automático diário (cron 3h Brasília)
  - Cache Redis para modalidades e empresas

  **Configuração:** `/dashboard/settings` → seção Tecnofit

  **Arquivos chave:**
  - `src/lib/tecnofit.ts` — HTTP client
  - `src/lib/tecnofit-adapter.ts` — Sync e mapeamento
  - `src/nodes/handleTecnofitToolCall.ts` — Tool calls do agente
  - `src/lib/tecnofit-notifications.ts` — Email de notificação

  **Tabelas:** `tecnofit_sync_metadata`, `tecnofit_trial_requests`

  **Limitação importante:** API v1 Tecnofit não suporta agendamento de turmas.
  O bot coleta intenção → cria CRM card → notifica academia → humano confirma no Tecnofit.
  ```

### Criar guia de setup

- [ ] Criar `docs/integrações/TECNOFIT_SETUP_GUIDE.md`:

  **Conteúdo:**
  ```markdown
  # Guia de Configuração — Integração Tecnofit

  ## Pré-requisitos
  1. Conta ativa no sistema Tecnofit
  2. Módulo "API Aberta" contratado (contatar gerente Tecnofit)

  ## Passo 1: Obter credenciais
  1. Login no sistema Tecnofit
  2. Ir em Loja de Adicionais → API Aberta
  3. Solicitar ativação com seu gerente
  4. Após ativação, gerar api_key (21 chars) e api_secret (26 chars)

  ## Passo 2: Configurar no dashboard
  1. Acessar /dashboard/settings
  2. Localizar seção "Integração Tecnofit"
  3. Preencher API Key e API Secret
  4. Clicar "Testar Conexão" para validar
  5. Habilitar a integração
  6. Salvar

  ## Passo 3: Primeira sincronização
  1. Acessar /dashboard/tecnofit
  2. Clicar "Sincronizar Agora"
  3. Aguardar conclusão (pode demorar alguns minutos para academias grandes)

  ## Passo 4: Configurar o agente
  1. Acessar /dashboard/agents
  2. Atualizar o system prompt com contexto da academia
  3. Ver exemplo em: docs/integrações/TECNOFIT_PROMPT_SUGERIDO.md

  ## Troubleshooting
  | Problema | Causa | Solução |
  |---|---|---|
  | Erro 401 no teste de conexão | Credenciais inválidas | Verificar api_key (21 chars) e api_secret (26 chars) |
  | Sync travado em "Sincronizando" | Timeout ou erro de rede | Aguardar 15min e verificar logs. Pode reiniciar. |
  | 0 clientes importados | Academia sem clientes OR filtro de data | Verificar se academia tem clientes ativos no Tecnofit |
  | Tool "agendar aula" não aparece | Integração não habilitada | Verificar tecnofit_enabled = true nas settings |
  ```

---

## Tarefa 6.9 — Checklist Final de Qualidade

**Checklist 6.9:**

### TypeScript

- [ ] `npx tsc --noEmit` — **zero erros**
- [ ] Sem uso de `any` desnecessário (todos os retornos da API Tecnofit devem ter interface)
- [ ] Sem `@ts-ignore` adicionados por esta integração

### Build

- [ ] `npm run build` completa sem erros
- [ ] Verificar se não há warnings de build relacionados à integração

### Lint

- [ ] `npm run lint` — sem erros nem warnings

### Runtime

- [ ] Abrir browser, navegar para `/dashboard/tecnofit` — sem erros no console
- [ ] Abrir browser, navegar para `/dashboard/settings` — seção Tecnofit renderiza
- [ ] Verificar Network tab: nenhuma request fazendo leak de credenciais

---

## Definição de "Done" — Sprint 6 (= Integração Completa)

- [ ] Todos os cenários de teste críticos passando
- [ ] Zero erros de TypeScript (`npx tsc --noEmit`)
- [ ] Build `npm run build` passa
- [ ] Segurança: nenhum dado sensível em logs ou responses
- [ ] `docs/tables/tabelas.md` atualizado
- [ ] `CLAUDE.md` atualizado com seção Tecnofit
- [ ] `TECNOFIT_SETUP_GUIDE.md` criado
- [ ] `TECNOFIT_PROMPT_SUGERIDO.md` criado
- [ ] Commit final: `feat: Tecnofit integration complete - contacts sync and trial class scheduling`

---

## Resumo de Todos os Commits por Sprint

```
feat: Sprint 1 - Tecnofit infrastructure base
  - 4 migrations SQL aplicadas
  - TypeScript interfaces
  - getClientConfig() com secrets Tecnofit
  - src/lib/tecnofit.ts HTTP client

feat: Sprint 2 - Tecnofit contact sync and API routes
  - src/lib/tecnofit-adapter.ts
  - API routes: sync, status, customers, companies, config

feat: Sprint 3 - Tecnofit WhatsApp agent tools and trial scheduling
  - 3 tools no agente de IA
  - src/nodes/handleTecnofitToolCall.ts
  - src/lib/tecnofit-notifications.ts
  - Trial requests API routes

feat: Sprint 4 - Tecnofit dashboard UI
  - /dashboard/tecnofit page
  - Settings section
  - TecnofitCustomersTable, TrialRequestsTable, SyncStatusCard

feat: Sprint 5 - Auto sync cron job and Redis cache
  - /api/cron/tecnofit-sync
  - vercel.json cron schedule
  - Cache Redis para dados estáticos
  - Sync incremental

feat: Tecnofit integration complete - contacts sync and trial class scheduling
  - Testes validados
  - Documentação atualizada
  - CLAUDE.md e tabelas.md atualizados
```
