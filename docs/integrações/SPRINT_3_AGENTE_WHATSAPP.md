# Sprint 3 — Agente WhatsApp + Detecção de Intenção

**Objetivo:** Integrar o fluxo de IA do chatbot com o Tecnofit: o agente detecta interesse em aulas experimentais, coleta dados via WhatsApp, consulta informações de clientes e registra solicitações no sistema.

**Resultado esperado ao final deste sprint:**
- 3 novas tools no agente de IA para interações com Tecnofit
- Node `handleTecnofitToolCall.ts` com toda a lógica de negócio
- Fluxo completo: prospect mensagem → agente detecta → coleta dados → cria CRM card → notifica academia
- System prompt atualizado para contexto de academia

**Depende de:** Sprint 1 (config), Sprint 2 (adapter, tabela `tecnofit_trial_requests`)

**Próximo sprint depende deste:** Sprint 4 (UI de trial requests usa dados deste sprint)

---

## Contexto: Como o agente funciona hoje

> **Ler antes de começar:** `src/nodes/generateAIResponse.ts` e `src/flows/chatbotFlow.ts`
>
> O agente já usa tool calls para:
> - `transferir_atendimento` → handoff para humano
> - `subagente_diagnostico` → diagnóstico especial
>
> O padrão é: tool call retorna dados → `chatbotFlow.ts` redireciona para o handler correto → handler executa lógica → resposta enviada ao WhatsApp.

---

## Tarefa 3.1 — Definição das Tools no Agente

> **Arquivo:** `src/nodes/generateAIResponse.ts`
>
> **O que fazer:** Localizar onde as tools atuais (`transferir_atendimento`, etc.) são definidas e adicionar as 3 novas tools Tecnofit no mesmo formato.

**Checklist 3.1:**

- [ ] Abrir `src/nodes/generateAIResponse.ts`
- [ ] Localizar o array de `tools` (formato OpenAI/Groq function calling)
- [ ] Verificar se Tecnofit está habilitado antes de incluir as tools:
  ```typescript
  // Incluir tools Tecnofit apenas se a integração estiver ativa
  const tecnofitTools = clientConfig?.tecnofit?.enabled ? [
    // ... tools abaixo ...
  ] : [];

  const tools = [
    ...existingTools,
    ...tecnofitTools,
  ];
  ```

- [ ] Adicionar tool `listar_modalidades_academia`:
  ```json
  {
    "type": "function",
    "function": {
      "name": "listar_modalidades_academia",
      "description": "Lista as atividades e modalidades disponíveis na academia (musculação, natação, crossfit, yoga, etc). Use quando o cliente perguntar o que tem disponível, quais atividades a academia oferece, ou antes de sugerir uma aula experimental.",
      "parameters": {
        "type": "object",
        "properties": {},
        "required": []
      }
    }
  }
  ```

- [ ] Adicionar tool `consultar_cliente_academia`:
  ```json
  {
    "type": "function",
    "function": {
      "name": "consultar_cliente_academia",
      "description": "Consulta informações de um cliente ou aluno no sistema da academia (Tecnofit). Use quando o cliente perguntar sobre seu plano, frequência, contratos ou dados cadastrais. Pode buscar por telefone ou CPF.",
      "parameters": {
        "type": "object",
        "properties": {
          "telefone": {
            "type": "string",
            "description": "Número de telefone do cliente (apenas dígitos, sem formatação). Usar o telefone da conversa atual se não especificado."
          },
          "cpf": {
            "type": "string",
            "description": "CPF do cliente (opcional, apenas dígitos)"
          }
        },
        "required": []
      }
    }
  }
  ```

- [ ] Adicionar tool `agendar_aula_experimental`:
  ```json
  {
    "type": "function",
    "function": {
      "name": "agendar_aula_experimental",
      "description": "Registra uma solicitação de aula experimental (aula grátis para conhecer a academia). Use quando o cliente demonstrar interesse em: conhecer a academia, fazer uma aula experimental, aula grátis, aula teste, visitar a academia, ou iniciar uma matrícula. IMPORTANTE: sempre colete nome e telefone antes de chamar esta função.",
      "parameters": {
        "type": "object",
        "properties": {
          "nome": {
            "type": "string",
            "description": "Nome completo do interessado"
          },
          "telefone": {
            "type": "string",
            "description": "Telefone de contato (apenas dígitos). Se não fornecido pelo cliente, usar o telefone da conversa atual."
          },
          "email": {
            "type": "string",
            "description": "Email do interessado (opcional)"
          },
          "modalidade": {
            "type": "string",
            "description": "Atividade ou modalidade de interesse (ex: musculação, natação, crossfit, yoga). Opcional."
          },
          "dias_preferencia": {
            "type": "array",
            "items": { "type": "string" },
            "description": "Dias da semana preferidos (ex: ['segunda', 'quarta', 'sexta']). Opcional."
          },
          "horario_preferencia": {
            "type": "string",
            "enum": ["manhã", "tarde", "noite"],
            "description": "Período do dia preferido. Opcional."
          },
          "observacoes": {
            "type": "string",
            "description": "Observações adicionais sobre o interesse ou necessidades específicas. Opcional."
          }
        },
        "required": ["nome", "telefone"]
      }
    }
  }
  ```

- [ ] Verificar `npx tsc --noEmit` após as alterações

---

## Tarefa 3.2 — Handler de Tool Calls `src/nodes/handleTecnofitToolCall.ts`

> **Criar arquivo:** `src/nodes/handleTecnofitToolCall.ts`
>
> **Referência:** Ver `src/nodes/handleHumanHandoff.ts` para o padrão de como um handler de tool call é estruturado.

### 3.2.A — Handler `listar_modalidades_academia`

**Checklist 3.2.A:**

- [ ] Criar função `handleListarModalidades(clientId, credentials)`:
  ```typescript
  export async function handleListarModalidades(
    clientId: string,
    credentials: TecnofitCredentials
  ): Promise<string>
  ```
  - Tentar buscar do cache Redis: `tecnofit:modalities:{clientId}`
  - Se não está em cache: chamar `listModalities()` do `tecnofit.ts`
  - Salvar no Redis com TTL de 3600s
  - Formatar resposta em texto amigável:
    ```
    As modalidades disponíveis são:
    • Musculação
    • Natação
    • CrossFit
    • Yoga
    (... etc ...)
    ```
  - Se API não disponível (credenciais ainda não configuradas): retornar mensagem padrão genérica
  - Se lista vazia: retornar `'As atividades disponíveis serão informadas pela nossa equipe!'`

---

### 3.2.B — Handler `consultar_cliente_academia`

**Checklist 3.2.B:**

- [ ] Criar função `handleConsultarCliente(params, clientId, credentials, prospectPhone)`:
  ```typescript
  export async function handleConsultarCliente(
    params: { telefone?: string; cpf?: string },
    clientId: string,
    credentials: TecnofitCredentials,
    prospectPhone: string  // telefone da conversa WhatsApp (fallback)
  ): Promise<string>
  ```

  **Lógica de busca:**
  - [ ] Determinar o telefone de busca: `params.telefone || prospectPhone`
  - [ ] Normalizar telefone para busca

  **Busca 1 — No CRM local (mais rápido):**
  - [ ] SELECT em `crm_cards` onde `phone = normalizedPhone AND client_id = clientId`
  - [ ] Se encontrado e tem `custom_fields.tecnofit_id`: buscar mais dados no Tecnofit

  **Busca 2 — Na API Tecnofit (se CPF fornecido ou não achou no CRM):**
  - [ ] Se `params.cpf`: `listCustomers(..., { cpf: params.cpf })`
  - [ ] Se não achou por CPF e tem telefone: tentar `listCustomers(..., { type: 'customer' })` e filtrar localmente
  - [ ] Se não encontrou em nenhuma busca: retornar mensagem amigável de não encontrado

  **Formatação da resposta:**
  - [ ] Se encontrou: formatar em texto amigável:
    ```
    Encontrei seu cadastro! Veja suas informações:

    👤 Nome: {nome}
    📋 Tipo: Aluno / Prospect
    📊 Status: {status}

    Posso te ajudar com mais alguma informação?
    ```
  - [ ] Não incluir CPF ou dados sensíveis na resposta do WhatsApp
  - [ ] Não incluir contratos/planos (endpoint separado não implementado ainda)

---

### 3.2.C — Handler `agendar_aula_experimental`

> Esta é a função mais importante do Sprint 3. Ela cria o registro de agendamento, CRM card, e notifica a academia.

**Checklist 3.2.C:**

- [ ] Criar função `handleAgendarAulaExperimental(params, clientId, sessionId, conversationId)`:
  ```typescript
  export async function handleAgendarAulaExperimental(
    params: {
      nome: string;
      telefone: string;
      email?: string;
      modalidade?: string;
      dias_preferencia?: string[];
      horario_preferencia?: 'manhã' | 'tarde' | 'noite';
      observacoes?: string;
    },
    clientId: string,
    sessionId: string,
    conversationId?: string
  ): Promise<string>
  ```

  **Passo 1 — Validar dados mínimos:**
  - [ ] Se `params.nome` está vazio: retornar `'Para agendar, preciso do seu nome completo. Pode me informar?'`
  - [ ] Se `params.telefone` está vazio: retornar `'Para agendar, preciso do seu telefone de contato. Qual seria?'`
  - [ ] Normalizar telefone: `normalizePhone(params.telefone)`

  **Passo 2 — Verificar se já existe solicitação pendente:**
  - [ ] SELECT em `tecnofit_trial_requests` onde `client_id = clientId AND prospect_phone = normalizedPhone AND status = 'pending'`
  - [ ] Se já existe: retornar mensagem informando que já há uma solicitação ativa

  **Passo 3 — Criar/atualizar CRM card:**
  - [ ] Verificar se há card existente para este telefone em `crm_cards`
  - [ ] Se não existe: criar novo card com dados do prospect
  - [ ] `card.title` = `params.nome`
  - [ ] `card.phone` = `normalizedPhone`
  - [ ] `card.description` inclui dados de interesse e preferências
  - [ ] `custom_fields.trial_requested_at` = `new Date().toISOString()`

  **Passo 4 — Criar `tecnofit_trial_requests`:**
  - [ ] INSERT em `tecnofit_trial_requests` com todos os dados coletados
  - [ ] `status = 'pending'`
  - [ ] `crm_card_id` = card criado/encontrado
  - [ ] `whatsapp_session_id` = `sessionId`
  - [ ] `conversation_id` = `conversationId` (se disponível)

  **Passo 5 — Notificar academia:**
  - [ ] Chamar `notifyTrialRequest(clientId, trialData)` (ver Tarefa 3.3)

  **Passo 6 — Retornar confirmação para o prospect:**
  - [ ] Montar mensagem de confirmação amigável:
    ```
    Perfeito, {nome}! Sua aula experimental foi registrada! 🎉

    Veja o que registrei:
    {se modalidade: • Modalidade: {modalidade}}
    {se dias: • Dias preferidos: {dias}}
    {se horário: • Período: {horario}}

    Nossa equipe entrará em contato em breve para confirmar o melhor horário para você.

    Aguarde nosso contato! 😊
    ```

---

## Tarefa 3.3 — Notificações para Academia

> **Criar arquivo:** `src/lib/tecnofit-notifications.ts`

**Checklist 3.3:**

- [ ] Criar função `notifyTrialRequest(clientId, trialData)`:
  ```typescript
  export async function notifyTrialRequest(
    clientId: string,
    trialData: TecnofitTrialRequest
  ): Promise<void>
  ```

  **Buscar config do cliente:**
  - [ ] SELECT `name`, `notification_email` de `clients` onde `id = clientId`

  **Enviar email:**
  - [ ] Reutilizar função de email existente (`src/lib/gmail.ts` ou equivalente)
  - [ ] Assunto: `🏋️ Nova Solicitação de Aula Experimental — {prospectName}`
  - [ ] Corpo do email (HTML):
    ```html
    <h2>Nova solicitação de aula experimental</h2>
    <table>
      <tr><td><strong>Nome:</strong></td><td>{nome}</td></tr>
      <tr><td><strong>Telefone:</strong></td><td>{telefone}</td></tr>
      <tr><td><strong>Email:</strong></td><td>{email ou N/A}</td></tr>
      <tr><td><strong>Modalidade:</strong></td><td>{modalidade ou Não informado}</td></tr>
      <tr><td><strong>Dias preferidos:</strong></td><td>{dias ou Não informado}</td></tr>
      <tr><td><strong>Período:</strong></td><td>{horario ou Não informado}</td></tr>
      <tr><td><strong>Observações:</strong></td><td>{obs ou Nenhuma}</td></tr>
      <tr><td><strong>Data da solicitação:</strong></td><td>{createdAt formatado}</td></tr>
    </table>
    <p><a href="{dashboardUrl}/crm">Ver no CRM</a></p>
    ```
  - [ ] Destinatário: `notification_email` do cliente
  - [ ] Em caso de falha no envio: logar erro mas NÃO lançar exceção (não deve quebrar o fluxo do chatbot)

- [ ] Criar função `buildTrialRequestEmail(trialData)`:
  - Retorna `{ subject, htmlBody, textBody }`
  - Separar a construção do email da lógica de envio

---

## Tarefa 3.4 — Integração no Flow Principal

> **Arquivo:** `src/flows/chatbotFlow.ts`
>
> **O que fazer:** Adicionar roteamento para os novos tool calls Tecnofit após o `generateAIResponse`.
>
> **Padrão:** Ver como `transferir_atendimento` é tratado — seguir o mesmo padrão.

**Checklist 3.4:**

- [ ] Abrir `src/flows/chatbotFlow.ts`

- [ ] Localizar onde os tool calls são verificados após `generateAIResponse`
  - Buscar por `toolCall` ou `transferir_atendimento` no arquivo

- [ ] Adicionar verificação para tools Tecnofit:
  ```typescript
  if (toolCall?.function?.name === 'listar_modalidades_academia') {
    const response = await handleListarModalidades(clientId, tecnofitCredentials);
    // enviar resposta ao WhatsApp
  }

  if (toolCall?.function?.name === 'consultar_cliente_academia') {
    const params = JSON.parse(toolCall.function.arguments);
    const response = await handleConsultarCliente(params, clientId, credentials, phone);
    // enviar resposta ao WhatsApp
  }

  if (toolCall?.function?.name === 'agendar_aula_experimental') {
    const params = JSON.parse(toolCall.function.arguments);
    const response = await handleAgendarAulaExperimental(params, clientId, sessionId, conversationId);
    // enviar resposta ao WhatsApp
  }
  ```

- [ ] Garantir que as credenciais Tecnofit são passadas corretamente para os handlers:
  - Obter de `config.tecnofit` (já carregado no início do flow)
  - Se `config.tecnofit?.enabled === false`: tools não devem aparecer no agente (verificar Tarefa 3.1)

- [ ] Testar que o flow não quebra quando `tecnofit` está `undefined` (cliente sem integração)

---

## Tarefa 3.5 — API Route de Trial Requests

> **Arquivo:** `src/app/api/integrations/tecnofit/trial-requests/route.ts`

**Checklist 3.5:**

- [ ] Criar `src/app/api/integrations/tecnofit/trial-requests/route.ts`

- [ ] Implementar `GET` (listar solicitações):
  - Autenticação obrigatória
  - Query params: `status` (filtro), `page`, `limit`
  - SELECT `*` de `tecnofit_trial_requests` onde `client_id = clientId`
  - JOIN com `crm_cards` para dados adicionais (opcional)
  - ORDER BY `created_at DESC`
  - Retornar lista paginada

- [ ] Implementar `PATCH /:id` (atualizar status):
  - **Arquivo:** `src/app/api/integrations/tecnofit/trial-requests/[id]/route.ts`
  - Body: `{ status: 'confirmed' | 'cancelled' | 'contacted', confirmedBy?, cancellationReason? }`
  - Validar que `id` pertence ao `clientId` do usuário logado
  - UPDATE em `tecnofit_trial_requests`
  - Se `status = 'confirmed'`: setar `confirmed_at = NOW()`
  - Retornar registro atualizado

---

## Tarefa 3.6 — System Prompt Base para Academia

> **Importante:** O system prompt padrão é configurado no dashboard por cada cliente. O que fazemos aqui é criar um **prompt sugerido** que pode ser copiado para o settings.

**Checklist 3.6:**

- [ ] Criar arquivo `docs/integrações/TECNOFIT_PROMPT_SUGERIDO.md`:
  - Prompt de exemplo para academia com integração Tecnofit ativa
  - Instruções de quando usar cada tool
  - Exemplos de diálogo esperado
  - Instruções de como adaptar para a academia específica

- [ ] Conteúdo sugerido para o prompt de exemplo:
  ```
  Você é o assistente virtual da {nome da academia}.
  Seu papel é:
  - Responder perguntas sobre a academia (horários, planos, localização)
  - Apresentar as modalidades disponíveis
  - Registrar interesse em aulas experimentais (aulas grátis para conhecer)
  - Consultar informações de alunos cadastrados quando solicitado

  IMPORTANTE:
  - Sempre seja simpático e use linguagem informal
  - Ao detectar interesse em conhecer a academia, use a tool 'agendar_aula_experimental'
  - Antes de agendar, SEMPRE colete o nome completo do interessado
  - O telefone já está disponível (é o número que está conversando com você)
  - Confirme os dados antes de registrar

  Palavras que indicam interesse em aula experimental:
  "quero conhecer", "aula experimental", "aula grátis", "aula teste",
  "quero experimentar", "posso visitar", "como faço para me matricular",
  "quanto custa", "quero começar", "tenho interesse"
  ```

---

## Tarefa 3.7 — Testes de Diálogo

**Checklist 3.7 — Simular conversas no WhatsApp (quando credenciais disponíveis):**

- [ ] Testar: `"Quero fazer uma aula experimental"`
  - Agente deve pedir nome e confirmar telefone
  - Registrar em `tecnofit_trial_requests`
  - Email de notificação deve ser enviado

- [ ] Testar: `"Que atividades vocês têm?"`
  - Agente deve chamar `listar_modalidades_academia`
  - Retornar lista formatada

- [ ] Testar: `"Quero saber meu plano"`
  - Agente deve chamar `consultar_cliente_academia` com o telefone da conversa
  - Se encontrado: mostrar dados formatados
  - Se não encontrado: mensagem amigável

- [ ] Testar: `"Quero ir amanhã de manhã para musculação"`
  - Agente deve identificar: interesse em experimental, modalidade = musculação, horário = manhã
  - Coletar nome se não tiver
  - Registrar com os dados coletados

- [ ] Testar: prospect que já tem solicitação pendente
  - Segunda solicitação deve informar que já há uma aberta

- [ ] Testar flow sem Tecnofit habilitado (cliente sem integração)
  - Tools não devem aparecer
  - Fluxo normal do chatbot não deve ser afetado

---

## Definição de "Done" — Sprint 3

- [ ] 3 tools definidas em `generateAIResponse.ts` (condicionadas ao `tecnofit.enabled`)
- [ ] `src/nodes/handleTecnofitToolCall.ts` completo
- [ ] `src/lib/tecnofit-notifications.ts` com envio de email
- [ ] Roteamento adicionado em `chatbotFlow.ts`
- [ ] API routes de trial requests (GET e PATCH) funcionais
- [ ] `npx tsc --noEmit` sem erros
- [ ] Pelo menos 3 cenários de diálogo testados manualmente
- [ ] Commit: `feat: Sprint 3 - Tecnofit WhatsApp agent tools and trial scheduling`
