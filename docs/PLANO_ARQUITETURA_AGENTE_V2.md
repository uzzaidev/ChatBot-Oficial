# Plano de Arquitetura: Agente Conversacional V2 — Motor de Políticas Global
**Projeto:** UzzApp — ChatBot-Oficial  
**Data:** 2026-04-16 (rev.3 — guardrails operacionais adicionados)  
**Autor:** Pedro + Luis + Claude Code  
**Status:** Proposta técnica revisada — pronta para Sprint 1

---

## 0. Contexto da Revisão

A versão anterior deste plano estava correta na **direção arquitetural** mas ainda acoplada ao funil de agendamento da Umåna (stages de visita, campos CPF/email fixos, keywords de professores, flags específicas de calendário). Este documento substitui a v1 com uma **arquitetura global** que serve agenda, suporte, vendas, e-commerce, documentos e qualquer funil que venha a existir na plataforma.

**O que foi mantido da v1:**
- Tool gating / capability gating
- Skills / mini-prompts por contexto
- Persistência de state
- Opt-in por cliente
- Redução do prompt base
- Roteamento de modelo por contexto
- Heurística barata antes de LLM

**O que foi generalizado:**
- `ConversationStageDetector` → `PolicyStateResolver`
- `REQUIRED_FIELDS` hardcoded → `SlotSchema` configurável por capability/cliente
- Keywords fixas no código → `TenantLexicon` em camadas
- `requireMetadataForCalendar` → `CapabilityPolicy` genérico
- `current_stage TEXT` → `policy_context JSONB`
- Skills com semântica do cliente → Skills genéricas + camada de configuração do tenant
- Métricas só de agenda → métricas globais + métricas por capability

**Princípio central que permanece:**

> **Não tente convencer o modelo por texto o que ele não pode fazer. Remova o instrumento.**

---

## 1. Diagnóstico: Por que o V1 Falha

### Sintoma observado (caso Umåna)

```
Usuário: "Quero agendar uma visita"
Bot: [chama verificar_agenda IMEDIATAMENTE]  ← ERRADO
     "O período de ter., 21/04/2026, 11:00 está livre"

Usuário: "Otimo eu gostaria de marcar"
Bot: "Antes de confirmar, como você conheceu?"  ← tardio, 1 de 4 campos

Usuário: "Atraves do Luciano" [x3 repetições]
Bot: [cria evento com 1/4 campos coletados]  ← FALHA CRÍTICA
```

### Três causas raiz

**Causa 1 — Degradação de atenção em contexto longo:**  
O Llama 3.3 70B distribui atenção de forma não uniforme em prompts longos. Regras enterradas no meio de 780 linhas recebem peso menor. A regra existe, mas perde para a pressão imediata da mensagem do usuário.

**Causa 2 — Tools sempre expostas criam atalhos cognitivos:**  
Ao receber `verificar_agenda` disponível, o modelo tem o caminho mais curto para resolver "quero agendar". Não está desobedecendo o prompt — está resolvendo pelo caminho de menor resistência com os instrumentos disponíveis. Remover o instrumento é mais eficaz do que proibir por texto.

**Causa 3 — State da jornada não é persistido de forma legível:**  
O modelo recebe 780 linhas + histórico + metadata + regras toda vez. Não há separação clara de "você está em qual fase agora". O modelo infere a fase lendo o histórico — o que é frágil.

---

## 2. Visão da Arquitetura V2

### Diagrama de Fluxo Global

```
WhatsApp / Canal de entrada
  │
  ▼
[01] Parse & Batch (existente)
  │
  ▼
[02] Load Customer + Metadata (existente)
  │
  ▼
[03] ─── NOVO ──► PolicyStateResolver
  │                │
  │                ├── Lê: last_message, chat_history, metadata, tenant_lexicon
  │                ├── Consulta: CapabilityRegistry do cliente
  │                └── Resolve: PolicyState + ActiveCapability + missing_slots
  │
  ▼
[04] ─── NOVO ──► CapabilityPolicyEngine
  │                │
  │                ├── Verifica: slot_schema (campos obrigatórios do capability)
  │                ├── Avalia: unlock_conditions (quando tools ficam disponíveis)
  │                └── Produz: ToolAccessPolicy + allowed_tools[]
  │
  ▼
[05] ─── NOVO ──► SkillLoader
  │                │
  │                ├── Carrega: skill global (behavior + constraints)
  │                ├── Mescla: camada do tenant (tom, vocabulário, oferta)
  │                └── Produz: compiled_skill_prompt
  │
  ▼
[06] generateAIResponse (reduzido)
  │   Recebe: base_prompt + compiled_skill_prompt + allowed_tools[]
  │   NÃO recebe: tools bloqueadas pela policy
  │
  ▼
[07] Tool Executor (existente — handleCalendarToolCall, etc.)
  │
  ▼
[08] Send + Save + Update policy_context (existente + novo)
```

### Camadas do Motor

| Camada | Global? | Config por cliente? | Responsável |
|--------|---------|---------------------|-------------|
| PolicyStateResolver | ✅ | ⚠️ lexicon + regras | código |
| CapabilityPolicyEngine | ✅ | ✅ capability + unlock | config |
| SlotManager | ✅ | ✅ schema por tenant | config |
| ToolAccessPolicy | ✅ | ✅ por capability | config |
| SkillLoader | ✅ | ✅ conteúdo/tom/oferta | config + arquivo |
| PromptCompiler | ✅ | ✅ base_prompt do tenant | config |
| TenantLexicon | ✅ | ✅ keywords por cliente | config |
| StatePersistence | ✅ | — | código + DB |
| Metrics | ✅ | ✅ por capability | observabilidade |

---

## 3. Componente 1: PolicyStateResolver

### Responsabilidade

Determinar em qual estado de política a conversa está — **sem usar LLM**. Heurísticas de código combinadas com o `TenantLexicon` configurável.

### PolicyState (genérico, independente de funil)

```typescript
export type PolicyState =
  | "discovery"        // Navegando, perguntas abertas, sem intenção clara
  | "qualification"    // Intenção detectada, capability ativada, slots não iniciados
  | "slot_collection"  // Capability ativa, coletando campos obrigatórios
  | "action_ready"     // Todos os slots preenchidos, ação pode ser executada
  | "action_execution" // Tool de ação sendo executada (schedule, ticket, document)
  | "post_action"      // Ação concluída, conversa de follow-up
  | "handoff"          // Transferência para humano
  | "support"          // Suporte/dúvida livre sem capability ativa
```

**Por que não mais `intent_to_schedule`, `collecting_data`, `data_complete`:**  
Esses nomes são semântica de um funil. `slot_collection` e `action_ready` descrevem o **mecanismo** — funcionam para agenda, abertura de ticket, coleta de documento, qualificação de lead. A semântica de negócio fica no `ActiveCapability`, não no state.

### ActiveCapability (o que o cliente faz com o state)

```typescript
export type CapabilityId =
  | "calendar_booking"     // Agendar compromisso
  | "lead_qualification"   // Qualificar lead comercial
  | "support_ticket"       // Abrir chamado de suporte
  | "document_request"     // Coletar solicitação documental
  | "onboarding_flow"      // Onboarding guiado
  | string;                // Capabilities customizadas por cliente
```

### Algoritmo de Resolução (cascata de prioridade)

```typescript
export const resolvePolicyState = (input: PolicyResolverInput): PolicyResolution => {
  const { lastMessage, chatHistory, contactMetadata, customerStatus, tenantLexicon, capabilityRegistry } = input;

  // P1: Status do contato no banco — estado mais autoritativo
  if (customerStatus === "transferido" || customerStatus === "humano") {
    return { state: "handoff", capability: null };
  }

  // P2: Gatilhos de handoff — do léxico do tenant (não hardcoded)
  if (matchesLexicon(lastMessage, tenantLexicon.handoff_triggers)) {
    return { state: "handoff", capability: null };
  }

  // P3: Estado persistido que não deve ser reclassificado
  // (ver Seção 6 — persistência)
  const persisted = input.persistedContext;
  if (persisted && isNonRegressiveState(persisted.state)) {
    // Verificar se o state avançou
    const advanced = checkStateAdvancement(persisted, lastMessage, contactMetadata, tenantLexicon);
    if (!advanced) return { state: persisted.state, capability: persisted.capability };
  }

  // P4: Gestão de ação existente (cancelar, reagendar, status)
  if (matchesLexicon(lastMessage, tenantLexicon.action_management_triggers)) {
    return { state: "support", capability: detectManagementCapability(chatHistory, capabilityRegistry) };
  }

  // P5: Detecção de capability — qual funil o usuário quer ativar?
  const detectedCapability = detectCapability(lastMessage, chatHistory, tenantLexicon, capabilityRegistry);

  if (detectedCapability) {
    const slotStatus = evaluateSlots(contactMetadata, detectedCapability.slotSchema);

    if (slotStatus.allComplete) return { state: "action_ready",    capability: detectedCapability.id };
    if (slotStatus.anyCollected) return { state: "slot_collection", capability: detectedCapability.id };
    return                              { state: "qualification",   capability: detectedCapability.id };
  }

  // DEFAULT
  return { state: "discovery", capability: null };
};
```

### TenantLexicon — Keywords sem hardcode

```typescript
export interface TenantLexicon {
  // Gatilhos de handoff (global + cliente)
  handoff_triggers: LexiconLayer;
  
  // Gatilhos de ativação de capability (por capability_id)
  capability_triggers: Record<CapabilityId, LexiconLayer>;
  
  // Gatilhos de gestão de ação existente
  action_management_triggers: LexiconLayer;
}

export interface LexiconLayer {
  global: string[];          // Defaults do produto — válidos para todos os clientes
  client_specific: string[]; // Termos específicos do cliente (nomes, serviços, jargão)
}
```

**Configuração no banco (client.settings JSONB):**
```json
{
  "tenant_lexicon": {
    "handoff_triggers": {
      "global": ["atendente", "humano", "pessoa real", "falar com alguém"],
      "client_specific": ["Carlos", "Julia", "aula experimental", "aula particular"]
    },
    "capability_triggers": {
      "calendar_booking": {
        "global": ["quero agendar", "pode marcar", "quero marcar"],
        "client_specific": ["quero conhecer", "quero visitar", "fazer uma visita"]
      }
    },
    "action_management_triggers": {
      "global": ["cancelar", "desmarcar", "remarcar", "reagendar"],
      "client_specific": []
    }
  }
}
```

**Por que keywords não podem morar no core como lista fixa:**  
Nomes de professores, tipos de serviço, jargões do negócio são semântica do cliente. No core, isso criaria acoplamento entre a plataforma e um cliente específico. A camada `client_specific` do léxico dá ao cliente controle total sobre seus gatilhos sem tocar no código.

---

## 4. Componente 2: CapabilityPolicyEngine + SlotSchema

### SlotSchema — Campos configuráveis por capability/cliente

```typescript
export interface SlotSchema {
  capability_id: CapabilityId;
  slots: SlotDefinition[];
}

export interface SlotDefinition {
  key: string;           // Ex: "email", "cpf", "empresa", "numero_pedido"
  label: string;         // Ex: "E-mail de contato"
  type: SlotType;        // "email" | "cpf" | "cnpj" | "text" | "date" | "phone" | "select"
  required: boolean;     // Obrigatório para desbloquear a ação
  validator?: string;    // Nome do validador (ex: "cpf_format", "email_format")
  unlock_condition?: string; // Expressão — quando pedir este slot (ex: "slots.goal is filled")
}

export type SlotType = "email" | "cpf" | "cnpj" | "text" | "date" | "phone" | "number" | "select";
```

**Exemplo — Umåna (calendar_booking):**
```json
{
  "capability_id": "calendar_booking",
  "slots": [
    { "key": "como_conheceu", "label": "Como conheceu a Umåna",  "type": "text",  "required": true },
    { "key": "objetivo",      "label": "Objetivo com a prática", "type": "text",  "required": true },
    { "key": "email",         "label": "E-mail de contato",      "type": "email", "required": true },
    { "key": "cpf",           "label": "CPF",                    "type": "cpf",   "required": true }
  ]
}
```

**Exemplo — cliente de suporte técnico (support_ticket):**
```json
{
  "capability_id": "support_ticket",
  "slots": [
    { "key": "nome",       "label": "Nome completo",   "type": "text",   "required": true },
    { "key": "empresa",    "label": "Empresa",          "type": "text",   "required": true },
    { "key": "descricao",  "label": "Descrição do problema", "type": "text", "required": true }
  ]
}
```

**Exemplo — cliente de documentos (document_request):**
```json
{
  "capability_id": "document_request",
  "slots": [
    { "key": "tipo_doc", "label": "Tipo de documento", "type": "select", "required": true,
      "options": ["declaração", "contrato", "certidão"] },
    { "key": "nome",     "label": "Nome completo",      "type": "text",   "required": true }
  ]
}
```

**Por que REQUIRED_FIELDS não pode ser global hardcoded:**  
CPF, e-mail, como_conheceu e objetivo são campos específicos do funil da Umåna. Um cliente de suporte precisa de empresa e descrição. Um e-commerce precisa de número de pedido. O motor não conhece campos — ele conhece `required_slots`, `validators` e `unlock_conditions`. A semântica dos campos fica no `SlotSchema` do cliente.

### CapabilityPolicy — Controle de acesso às tools

```typescript
export interface CapabilityPolicy {
  capability_id: CapabilityId;
  tool_access: "always" | "contextual" | "disabled";
  unlock_when_slots_complete: boolean;
  allowed_tools_when_locked: ToolName[];    // Tools antes de slots completos
  allowed_tools_when_unlocked: ToolName[];  // Tools após slots completos
}
```

**Exemplo — calendar_booking:**
```typescript
{
  capability_id: "calendar_booking",
  tool_access: "contextual",
  unlock_when_slots_complete: true,
  allowed_tools_when_locked: ["registrar_dado_cadastral", "transferir_atendimento"],
  allowed_tools_when_unlocked: ["verificar_agenda", "criar_evento_agenda", "registrar_dado_cadastral"]
}
```

**Exemplo — lead_qualification (sem tool gate):**
```typescript
{
  capability_id: "lead_qualification",
  tool_access: "always",
  unlock_when_slots_complete: false,
  allowed_tools_when_locked: ["registrar_dado_cadastral", "buscar_documento"],
  allowed_tools_when_unlocked: ["registrar_dado_cadastral", "buscar_documento", "transferir_atendimento"]
}
```

**Por que `requireMetadataForCalendar` não escala:**  
É uma flag de caso. Com 10 tipos de capability, você teria 10 flags. O `CapabilityPolicy` com `tool_access: "contextual"` é o mecanismo genérico — funciona para qualquer capability, não apenas para calendário.

---

## 5. Componente 3: SkillLoader — Duas Camadas

### Arquitetura de Skill em Duas Camadas

```
Skill Global (src/lib/agent-skills/global/)
  ├── discovery.skill.ts        ← comportamento universal de descoberta
  ├── slot-collection.skill.ts  ← comportamento universal de coleta
  ├── action-ready.skill.ts     ← comportamento universal pré-execução
  ├── post-action.skill.ts      ← comportamento universal pós-ação
  └── handoff.skill.ts          ← comportamento universal de handoff

Camada do Tenant (client.settings ou arquivo por cliente)
  └── tone, vocabulary, offer, examples, restrictions
```

### Interface de Skill com Camadas

```typescript
export interface AgentSkill {
  id: string;
  policy_state: PolicyState;
  
  // CAMADA GLOBAL — universal, agnóstico de cliente
  global_prompt: string;          // objetivo do state, regras de comportamento, política de tool use
  
  // CAMADA DO TENANT — injetada em runtime
  tenant_prompt?: string;         // tom, vocabulário, oferta, restrições de negócio
  
  // Contexto dinâmico — gerado em runtime pelo SkillLoader
  buildContext?: (input: SkillContextInput) => string;
  
  // Tools permitidas — definidas pela CapabilityPolicy, não pela skill
  // (skill não conhece tools — quem define é o CapabilityPolicyEngine)
}
```

### Exemplo — `slot-collection.skill.ts` (global, sem semântica de cliente)

```typescript
export const slotCollectionSkill: AgentSkill = {
  id: "slot_collection",
  policy_state: "slot_collection",
  
  global_prompt: `
Você está coletando informações necessárias para avançar com o que o usuário quer.

REGRAS UNIVERSAIS DESTA FASE:
- Colete UM campo por mensagem — nunca duas perguntas de uma vez
- Após cada resposta, confirme antes de pedir o próximo
- Se o usuário mencionar a ação que quer antes de coletar tudo: 
  confirme que anotou e continue a coleta
- Se o usuário repetir a mesma informação: confirme e avance para o próximo campo
- NÃO execute nenhuma ação (criar, cancelar, agendar) até ter todos os campos
  `,
  
  // Contexto específico é gerado pelo buildContext com dados do cliente
  buildContext: (input: SkillContextInput) => {
    const schema = input.capabilityPolicy?.slotSchema;
    if (!schema) return "";
    
    const missing = getMissingSlots(input.contactMetadata, schema);
    const collected = getCollectedSlots(input.contactMetadata, schema);
    
    return [
      collected.length > 0
        ? `CAMPOS JÁ COLETADOS (não pergunte novamente): ${collected.map(s => s.label).join(", ")}`
        : "",
      missing.length > 0
        ? `PRÓXIMO CAMPO A COLETAR: ${missing[0].label}`
        : "",
      missing.length > 1
        ? `CAMPOS AINDA FALTANTES: ${missing.slice(1).map(s => s.label).join(", ")}`
        : "",
    ].filter(Boolean).join("\n");
  },
};
```

**Por que a skill não tem semântica de "visita" ou "agendamento":**  
A skill global descreve o **comportamento** para o estado de coleta. "O que está sendo coletado" é fornecido pelo `buildContext` em runtime, lendo o `SlotSchema` do cliente. Assim a mesma skill funciona para coleta de dados de visita, abertura de ticket ou qualificação de lead.

---

## 6. Persistência de State — `policy_context JSONB`

### Por que não `current_stage TEXT`

Um campo de texto simples comporta apenas o nome do estado. Em produção, você vai precisar responder perguntas como:
- "Qual capability está ativa?"
- "Quais slots já foram coletados nesta conversa?"
- "Quais tools estão permitidas agora?"
- "Em qual versão da policy este contexto foi criado?"

### Estrutura do `policy_context`

```typescript
export interface PolicyContext {
  state: PolicyState;
  capability: CapabilityId | null;
  slot_schema_id: string | null;
  missing_slots: string[];           // slots que ainda faltam
  allowed_tools: ToolName[];         // resolvidos no último turno
  rag_mode: "full" | "minimal" | "off";
  history_mode: "full" | "minimal";
  version: string;                   // "v2" — para migrações futuras
  last_updated_at: string;           // ISO timestamp
}
```

**Exemplo em produção:**
```json
{
  "state": "slot_collection",
  "capability": "calendar_booking",
  "slot_schema_id": "calendar_v1",
  "missing_slots": ["objetivo", "email", "cpf"],
  "allowed_tools": ["registrar_dado_cadastral"],
  "rag_mode": "minimal",
  "history_mode": "full",
  "version": "v2",
  "last_updated_at": "2026-04-16T14:30:00-03:00"
}
```

### Migration

```sql
-- supabase/migrations/TIMESTAMP_add_policy_context_to_conversations.sql

ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS policy_context JSONB DEFAULT NULL;

COMMENT ON COLUMN conversations.policy_context IS
  'V2 policy engine context: state, capability, missing_slots, allowed_tools, etc.';

CREATE INDEX IF NOT EXISTS idx_conversations_policy_state
  ON conversations ((policy_context->>'state'));
```

### Lógica de Progressão (não regressão)

```typescript
const STATE_ORDER: PolicyState[] = [
  "discovery",
  "qualification",
  "slot_collection",
  "action_ready",
  "action_execution",
  "post_action",
];

const resolveFinalContext = (
  persisted: PolicyContext | null,
  resolved: PolicyResolution,
): PolicyContext => {
  // Handoff e support sempre têm prioridade
  if (resolved.state === "handoff" || resolved.state === "support") {
    return buildContext(resolved);
  }

  if (!persisted) return buildContext(resolved);

  // Nunca regredir na progressão da jornada
  const persistedIdx = STATE_ORDER.indexOf(persisted.state);
  const resolvedIdx = STATE_ORDER.indexOf(resolved.state);

  if (persistedIdx > resolvedIdx) {
    // Manter state mas atualizar missing_slots (podem ter mudado)
    return { ...persisted, missing_slots: resolved.missing_slots, last_updated_at: now() };
  }

  return buildContext(resolved);
};
```

---

## 7. Roteamento de Modelo por PolicyState

### Hipótese

> "Menos reasoning, modelo mais direto que segue bem o que está ali"

### Análise

O Llama 3.3 70B sobre-pensa fluxos estruturados. Para estados mecânicos (`slot_collection`, `handoff`), um modelo menor e mais diretivo é mais previsível e ~10x mais barato.

### Configuração por State

```typescript
const MODEL_BY_STATE: Record<PolicyState, ModelConfig> = {
  // Estados abertos — precisam de qualidade de linguagem e raciocínio
  discovery:         { provider: "groq", model: "llama-3.3-70b-versatile", temperature: 0.7 },
  post_action:       { provider: "groq", model: "llama-3.3-70b-versatile", temperature: 0.6 },
  support:           { provider: "groq", model: "llama-3.3-70b-versatile", temperature: 0.6 },

  // Estados de formulário — modelo menor é mais previsível e barato
  qualification:     { provider: "groq", model: "llama-3.1-8b-instant",    temperature: 0.3 },
  slot_collection:   { provider: "groq", model: "llama-3.1-8b-instant",    temperature: 0.3 },
  handoff:           { provider: "groq", model: "llama-3.1-8b-instant",    temperature: 0.3 },

  // Estados de decisão — precisam interpretar disponibilidade e confirmar
  action_ready:      { provider: "groq", model: "llama-3.3-70b-versatile", temperature: 0.4 },
  action_execution:  { provider: "groq", model: "llama-3.3-70b-versatile", temperature: 0.4 },
};
```

**Impacto esperado em custo:** `slot_collection` e `qualification` representam ~60% das mensagens em clientes de agendamento. Rotear para `llama-3.1-8b-instant` pode reduzir custo de API em 40-50% nesses clientes.

**Condição de ativação:** Somente após PolicyStateResolver + CapabilityPolicyEngine + SkillLoader validados. Não trocar modelo antes do comportamento estar correto com o modelo maior.

---

## 8. PromptCompiler — Montagem Final

O `generateAIResponse.ts` atual monta o prompt empilhando mensagens de sistema. Na V2, essa montagem passa a ser explícita:

```typescript
export const compilePrompt = (input: PromptCompilerInput): CompiledPrompt => {
  const { config, skill, policyContext, contactMetadata, tenantLexicon } = input;

  const messages: SystemMessage[] = [];

  // 1. Base do cliente — identidade, tom, grade, regras universais (~150 linhas)
  messages.push({ role: "system", content: config.prompts.systemPrompt });

  // 2. Data/hora (apenas se não for estado mecânico)
  if (policyContext.state !== "slot_collection" && policyContext.state !== "handoff") {
    messages.push({ role: "system", content: buildDateTimeContext() });
  }

  // 3. Skill global — regras de comportamento para este state
  messages.push({ role: "system", content: skill.global_prompt });

  // 4. Contexto dinâmico da skill — slots faltantes, dados coletados
  if (skill.buildContext) {
    const ctx = skill.buildContext({ contactMetadata, policyContext });
    if (ctx) messages.push({ role: "system", content: ctx });
  }

  // 5. Dados já coletados — nunca perguntar novamente
  const collectedData = buildCollectedDataContext(contactMetadata, policyContext);
  if (collectedData) messages.push({ role: "system", content: collectedData });

  // 6. Regras operacionais por capability (ex: regras de calendário)
  const opRules = buildOperationalRules(policyContext, config);
  if (opRules) messages.push({ role: "system", content: opRules });

  return { messages, model: MODEL_BY_STATE[policyContext.state] };
};
```

**Resultado em tamanho:**
```
V1: ~780 linhas de prompt + 7 tools em toda conversa
V2: ~150 base + ~40 skill global + ~20 contexto dinâmico = ~210 linhas
    + 2-3 tools relevantes para o state
    = ~73% de redução no context window
```

---

## 9. Métricas em Duas Famílias

### Família 1 — Métricas Globais de Plataforma (independente de funil)

| Métrica | O que mede | Alerta se |
|---------|-----------|-----------|
| `tool_call_policy_violation_rate` | Tool chamada fora da policy | > 0% (deve ser impossível na V2) |
| `state_regression_rate` | State regredindo sem gatilho | > 5% |
| `handoff_rate` | Conversas que chegam ao handoff | desvio > 20% do baseline |
| `avg_cost_per_conversation` | Custo médio por conversa | crescimento > 10% mês |
| `avg_turns_to_action` | Turnos até executar ação | > 8 turnos |
| `fallback_rate` | Respostas de fallback/erro | > 3% |
| `p95_latency_ms` | Latência do 95° percentil | > 3000ms |
| `slot_save_failure_rate` | `registrar_dado_cadastral` sem sucesso | > 1% |

### Família 2 — Métricas por Capability

**calendar_booking:**
```
- % de action_ready sem todos os slots completos
- % de criar_evento_agenda chamado sem confirmação explícita  
- % de eventos duplicados detectados
- taxa de cancelamento bem-sucedido
```

**support_ticket:**
```
- % de ticket aberto com campos obrigatórios faltando
- tempo médio de resolução após handoff
```

**lead_qualification:**
```
- % de leads com score mínimo antes de transferir
- taxa de conversão qualificado → handoff
```

**Separação global + capability garante que você não prende a arquitetura a um único funil.**

---

## 10. Plano de Implementação — 5 Sprints

### Sprint 1 — Tool Gating (menor risco, maior impacto imediato)

**Objetivo:** Garantir que tools de ação só aparecem quando a policy permite. Zero mudança arquitetural, máximo impacto no comportamento.

**Arquivos:**
- `src/nodes/generateAIResponse.ts` — filtrar tools via `CapabilityPolicy` simples
- `src/lib/types.ts` — adicionar `agentV2` ao `ClientConfig`

**Implementação mínima viável:**
```typescript
// generateAIResponse.ts — antes de montar tools

const v2Config = config.agentV2;
const useToolGating = v2Config?.requireSlotsForCalendar ?? false;

const metadataComplete = useToolGating
  ? evaluateRequiredSlots(contactMetadata, config.slotSchema ?? DEFAULT_CALENDAR_SCHEMA)
  : true;

const exposeCalendarTools =
  config.calendar?.botEnabled !== false &&
  (config.calendar?.google?.enabled || config.calendar?.microsoft?.enabled) &&
  metadataComplete;
```

**Config no banco (opt-in Umåna):**
```json
{
  "agent_v2_enabled": true,
  "require_slots_for_calendar": true,
  "slot_schema": {
    "capability_id": "calendar_booking",
    "slots": [
      { "key": "como_conheceu", "required": true },
      { "key": "objetivo",      "required": true },
      { "key": "email",         "required": true },
      { "key": "cpf",           "required": true }
    ]
  }
}
```

**Critério de conclusão:** Bot da Umåna nunca chama `verificar_agenda` antes de `contactMetadata` estar completo. Testar com os casos CAL-09 do QA.

---

### Sprint 2 — PolicyStateResolver + StatePersistence

**Objetivo:** Detectar e persistir o state da conversa sem afetar o comportamento atual. Logar, não agir.

**Novos arquivos:**
```
src/lib/policy-engine/
  types.ts
  state-resolver.ts
  tenant-lexicon.ts
  slot-manager.ts
```

**Migration:**
```sql
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS policy_context JSONB DEFAULT NULL;
```

**Integração em `chatbotFlow.ts`:** Resolver o state e logar — não mudar o que vai para o LLM ainda.

**Critério de conclusão:** Dashboard de debug mostra `policy_context` correto em todas as conversas de teste.

---

### Sprint 3 — SkillLoader + Mini-Prompts

**Objetivo:** Substituir o prompt monolítico por base + skill compilada.

**Novos arquivos:**
```
src/lib/agent-skills/
  index.ts
  skill-compiler.ts
  global/
    discovery.skill.ts
    slot-collection.skill.ts
    action-ready.skill.ts
    post-action.skill.ts
    handoff.skill.ts
    support.skill.ts
```

**Condição de ativação:** `agent_v2_stage_aware_prompting: true` no `client.settings`. Piloto só na Umåna.

**Prompt do cliente:** Reduzir de 780 para ~150 linhas — apenas Bloco A (identidade, tom, grade, regras universais). As seções de coleta de dados e fluxo de calendário saem do prompt e vivem nas skills.

**Critério de conclusão:** QA completo passando — Testadores 1-12 + bateria CAL-01 a CAL-09.

---

### Sprint 4 — Roteamento de Modelo por State

**Objetivo:** Usar `llama-3.1-8b-instant` em `slot_collection` e `handoff`.

**Condição de ativação:** Somente após Sprint 3 validado. Não mudar modelo antes do comportamento estar correto.

**Critério de conclusão:** Custo por conversa reduzido, qualidade mantida em QA.

---

### Sprint 5 — Generalização para Outros Clientes

**Objetivo:** Tornar a arquitetura disponível como produto para todos os clientes via dashboard.

**O que cria:**
- Interface no dashboard para configurar `SlotSchema` por capability
- Interface para configurar `TenantLexicon` (handoff triggers, capability triggers)
- Interface para habilitar/desabilitar capabilities por cliente
- Métricas por capability no dashboard de analytics

---

## 11. Opt-in por Cliente — Contrato de Config

```typescript
// src/lib/types.ts
export interface ClientConfig {
  // ... campos existentes ...
  
  agentV2?: {
    enabled: boolean;
    
    // Sprint 1
    requireSlotsForAction: boolean;
    slotSchema?: SlotSchema[];
    
    // Sprint 2
    statePersistenceEnabled: boolean;
    tenantLexicon?: TenantLexicon;
    
    // Sprint 3
    stageAwarePromptingEnabled: boolean;
    
    // Sprint 4
    modelRoutingByStateEnabled: boolean;
  };
}
```

**Garantia:** Clientes sem `agentV2` na config continuam com o comportamento V1 exatamente como hoje. Zero risco de regressão.

---

## 12. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| PolicyStateResolver classifica errado em mensagem ambígua | Médio | Médio | Persistência de state — não regride sem gatilho explícito |
| SlotSchema incompleto bloqueia capability para sempre | Baixo | Alto | `handoff` sempre disponível como saída de emergência em toda skill |
| Latência adicional pelo resolver | Baixo | Baixo | Pure function em código — <1ms |
| `policy_context` JSONB cresce sem controle | Baixo | Baixo | Estrutura tipada + TTL via `last_updated_at` |
| Outros clientes afetados por mudança | Baixo | Alto | `agent_v2_enabled: false` é o default — completamente opt-in |
| Skill global muito restritiva bloqueia resposta legítima | Baixo | Médio | `support` state sempre expõe `buscar_documento` e `transferir_atendimento` |

---

---

## ADENDO — Guardrails Operacionais da V2

> Rev.3 — Quatro guardrails que completam a fundação antes de chamar o plano de blueprint oficial da plataforma. Nenhum deles muda o que foi decidido nas seções anteriores; eles adicionam as regras de operação que garantem que a V2 não reproduza as falhas da V1 em outro formato.

---

### Guardrail 1: ResponseValidator — Camada Pós-LLM

#### Por que existe

O CapabilityPolicyEngine garante que o modelo não recebe tools proibidas. O SkillLoader garante que o prompt instrui o comportamento correto. Mas o modelo ainda pode:

- Afirmar que executou uma ação que não executou
- Responder fora do estado atual (ex: propor horário durante `slot_collection`)
- Pular confirmação explícita antes de tool de criação
- Gerar texto incompatível com o `policy_context` vigente

Sem validação pós-LLM, a arquitetura ainda depende parcialmente de "o modelo vai seguir o prompt". O ResponseValidator fecha essa lacuna.

#### Responsabilidade

```
Onde fica no pipeline: entre o generateAIResponse() e o formatResponse/send

[06] generateAIResponse → AIResponse (raw)
  │
  ▼
[06b] ResponseValidator
  │    ├── Valida aderência ao PolicyState
  │    ├── Valida aderência ao ActiveCapability
  │    ├── Valida uso/ausência de tool esperada
  │    └── Aciona: pass | regenerate | fallback
  │
  ▼
[07] Tool Executor / formatResponse / send
```

#### Interface

```typescript
export interface ValidationResult {
  valid: boolean;
  action: "pass" | "regenerate" | "fallback";
  reason?: string;
  fallback_message?: string;
}

export const validateResponse = (
  response: AIResponse,
  policyContext: PolicyContext,
): ValidationResult => {
  // Regra 1: Durante slot_collection, resposta não deve propor horários nem confirmar ação
  if (policyContext.state === "slot_collection") {
    if (containsScheduleConfirmation(response.content)) {
      return {
        valid: false,
        action: "regenerate",
        reason: "slot_collection: proposed schedule before slots complete",
      };
    }
  }

  // Regra 2: Durante action_ready, tool call de criação exige confirmação explícita no histórico
  if (policyContext.state === "action_ready") {
    const hasCreationToolCall = response.toolCalls?.some(tc =>
      ["criar_evento_agenda", "open_ticket"].includes(tc.function.name)
    );
    if (hasCreationToolCall && !hasExplicitConfirmation(response)) {
      return {
        valid: false,
        action: "regenerate",
        reason: "action_ready: creation tool called without explicit confirmation",
      };
    }
  }

  // Regra 3: Tool chamada não deve estar fora de allowed_tools
  if (response.toolCalls) {
    const violation = response.toolCalls.find(
      tc => !policyContext.allowed_tools.includes(tc.function.name as ToolName)
    );
    if (violation) {
      return {
        valid: false,
        action: "fallback",
        reason: `policy_violation: tool ${violation.function.name} not in allowed_tools`,
        fallback_message: "Desculpe, não consegui processar isso agora. Pode repetir?",
      };
    }
  }

  return { valid: true, action: "pass" };
};
```

#### Regras de ResponseValidator por PolicyState

| PolicyState | Regras de validação |
|-------------|---------------------|
| `slot_collection` | Não propor horário; não confirmar ação; não usar tool de ação |
| `action_ready` | Tool de criação exige confirmação no histórico recente |
| `handoff` | Apenas `transferir_atendimento` é tool válida |
| `discovery` | Nenhuma tool de ação (só `buscar_documento`) |
| `post_action` | Não criar novo evento sem intenção explícita do usuário |
| `action_management` | Apenas tools de cancelamento/alteração |

**Quando usar `regenerate` vs `fallback`:**
- `regenerate`: o modelo entendeu o contexto mas desobedeceu uma regra — vale tentar de novo com instrução adicional
- `fallback`: violação de policy (tool fora da lista) — não tentar de novo, retornar mensagem segura

---

### Guardrail 2: PolicyState Refinado — Separação do `support`

#### Problema

O estado `support` na rev.2 acumulava três semânticas distintas:
1. Suporte livre / dúvidas sem capability ativa
2. Gestão de ação existente (cancelar, remarcar)
3. Follow-up após ação concluída

Isso cria um "estado saco de gatos" que dificulta tool gating e skill loading precisos.

#### Solução: Separar em três estados distintos

```typescript
export type PolicyState =
  | "discovery"          // Navegando, sem intenção ou capability ativa
  | "qualification"      // Intenção detectada, capability ativada, slots não iniciados
  | "slot_collection"    // Capability ativa, coletando campos obrigatórios
  | "action_ready"       // Todos os slots preenchidos, aguardando confirmação
  | "action_execution"   // Tool de ação sendo executada
  | "post_action"        // Ação concluída, conversa de follow-up imediato
  | "action_management"  // ← NOVO: cancelar, remarcar, ver status de ação existente
  | "support_freeform"   // ← NOVO: dúvidas livres, sem capability ou ação associada
  | "handoff"            // Transferência para humano
```

**O que foi removido:** `support` genérico.  
**O que foi adicionado:** `action_management` + `support_freeform`.

#### Mapeamento de tools por estado refinado

```
action_management  → cancelar_evento_agenda, alterar_evento_agenda, verificar_agenda
support_freeform   → buscar_documento, transferir_atendimento
```

Isso elimina a ambiguidade: quando o usuário diz "quero cancelar", o resolver retorna `action_management` — não `support`. Tools e skill são precisas para o contexto.

---

### Guardrail 3: Matriz de Precedência — Fonte da Verdade

#### Por que formalizar

Em runtime, podem colidir:
- Capability persistida no `policy_context` (da mensagem anterior)
- Capability recém-detectada (da mensagem atual)
- Gatilho de handoff (prioridade de negócio)
- Trigger de gestão de ação (cancelar o que foi feito)

Sem uma matriz explícita, o resolver vai tratar esses casos de forma ad hoc e o comportamento será inconsistente entre clientes.

#### Matriz de Precedência (ordem decrescente de prioridade)

| Prioridade | Condição | State resultante | Justificativa |
|-----------|----------|-----------------|---------------|
| **1** | `customerStatus === "transferido" \| "humano"` | `handoff` | Status do banco é autoritativo — supera qualquer detecção |
| **2** | Matches `handoff_triggers` do lexicon | `handoff` | Intenção explícita de transferência supera capability ativa |
| **3** | `capability` em execução + matches `action_management_triggers` | `action_management` | Gestão do que já foi agendado/criado tem prioridade sobre novo fluxo |
| **4** | `policy_context.state` é `action_ready` ou `action_execution` | manter | Não interromper fluxo de confirmação em andamento |
| **5** | Nova capability detectada com score > threshold | nova capability | Usuário mudou de assunto explicitamente |
| **6** | `policy_context.state` persistido (non-regressive) | manter | Continuidade da jornada em andamento |
| **7** | Nenhuma capability detectada | `discovery` ou `support_freeform` | Default seguro |

#### Regras de conflito de capability

```typescript
// Quando duas capabilities batem ao mesmo tempo:
// Ex: usuário diz "quero marcar uma visita e também cancelar a de ontem"

const resolveCapabilityConflict = (
  detected: CapabilityMatch[],
  persisted: CapabilityId | null,
): CapabilityResolution => {
  // Regra 1: action_management sempre vence sobre nova capability
  const hasManagement = detected.some(c => c.is_management_intent);
  if (hasManagement) {
    return { capability: persisted, state: "action_management" };
  }

  // Regra 2: Se só uma capability detectada, usar ela
  if (detected.length === 1) {
    return { capability: detected[0].id, state: resolveStateFromSlots(detected[0]) };
  }

  // Regra 3: Múltiplas — manter a persistida, responder à nova como suporte
  // (bot responde à dúvida mas não troca de capability no meio do fluxo)
  if (persisted) {
    return { capability: persisted, state: "support_freeform" };
  }

  // Regra 4: Sem persistida — usar a de maior score
  const highest = detected.sort((a, b) => b.score - a.score)[0];
  return { capability: highest.id, state: resolveStateFromSlots(highest) };
};
```

#### Lifecycle do `policy_context`

```typescript
export interface PolicyContextLifecycle {
  // Quando expirar (horas de inatividade)
  expiration_hours: number;       // Default: 48h — conversa retomada depois disso requalifica

  // Condições de reset (volta para discovery)
  reset_conditions: ResetCondition[];

  // Condições de retomada (mantém context)
  resume_conditions: ResumeCondition[];
}

// Condições de reset
const DEFAULT_RESET_CONDITIONS: ResetCondition[] = [
  { type: "state_is",        value: "handoff",    action: "reset_to_discovery_on_resume" },
  { type: "inactive_hours",  value: 48,           action: "reset_capability_keep_slots" },
  { type: "inactive_hours",  value: 168,          action: "full_reset" }, // 7 dias
  { type: "explicit_phrase", value: "recomeçar",  action: "full_reset" },
];

// Condições de retomada
const DEFAULT_RESUME_CONDITIONS: ResumeCondition[] = [
  { inactive_less_than_hours: 2,   action: "full_resume"              }, // <2h: mantém tudo
  { inactive_less_than_hours: 48,  action: "resume_keep_slots_requalify_capability" }, // 2-48h: slots mantidos, capability requalifica
  { inactive_more_than_hours: 48,  action: "reset_capability_keep_slots" }, // >48h: slots mantidos, capability resetada
];
```

**Regras práticas:**
- Conversa retomada em < 2h → mantém `policy_context` completo, sem requalificar
- Conversa retomada em 2-48h → mantém slots coletados, requalifica capability pela nova mensagem
- Conversa retomada em > 48h → mantém slots (usuário não precisa repetir CPF/email), capability volta a discovery
- Handoff encerrado → volta para `discovery` ou `post_action` dependendo de como o humano encerrou
- `full_reset` apenas por: +7 dias de inatividade ou frase explícita de reinício

---

### Guardrail 4: Compatibilidade com o Legado

#### Contexto

O projeto tem dívida técnica conhecida que pode criar conflitos com a V2:

1. **`pg` em serverless** — documentado como proibido no CLAUDE.md mas ainda presente em pontos críticos
2. **Histórico duplicado** — `n8n_chat_histories` (histórico do bot) e `messages` (UI) coexistem
3. **Schema parcialmente desatualizado** — `docs/tables/tabelas.md` pode ter divergências do banco real
4. **`generateAIResponse.ts` com 764 linhas** — ponto de integração que vai receber mudanças da V2

#### Contrato de Compatibilidade da V2

Toda implementação da V2 **deve** respeitar:

```
REGRAS DE COMPATIBILIDADE — obrigatórias para qualquer PR da V2

1. NENHUMA query nova usando `pg` ou `Pool`
   → Usar SEMPRE Supabase client (createServiceRoleClient ou createServerClient)
   → Motivo: pg causa hang em serverless (Vercel). Documentado e verificado.

2. policy_context APENAS via Supabase client
   → Leitura: supabase.from("conversations").select("policy_context")
   → Escrita: supabase.from("conversations").update({ policy_context: ... })
   → Nunca via RPC raw ou pg

3. Toda operação com client_id explícito
   → Nenhum SELECT sem WHERE client_id = ?
   → Motivo: RLS e isolamento multi-tenant

4. Histórico de chat = n8n_chat_histories (fonte oficial do bot)
   → A tabela `messages` é para a UI — não misturar nas queries do pipeline
   → PolicyStateResolver e SkillLoader leem de n8n_chat_histories

5. Não depender de colunas não confirmadas no schema
   → Antes de ler/escrever qualquer coluna nova, criar migration
   → Consultar docs/tables/tabelas.md e verificar com o banco real

6. generateAIResponse.ts deve permanecer como ponto único de chamada ao LLM
   → Não criar novos arquivos que chamem callDirectAI() diretamente
   → ResponseValidator, SkillLoader e PolicyStateResolver são pré-processadores,
     não chamam o LLM eles mesmos

7. Toda feature nova é opt-in via client.settings
   → Default de todos os campos agentV2 é false/undefined
   → Nunca ativar por default para todos os clientes
```

#### Separação de responsabilidades: CapabilityPolicyEngine vs Skill

Para evitar que, com o tempo, a skill volte a concentrar regra de negócio e reproduza o prompt monolítico em outro formato:

```
CapabilityPolicyEngine decide:           Skill decide:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Quais tools estão disponíveis         ✅ Como se comportar neste state
✅ Se slots estão completos              ✅ Tom da conversa neste momento
✅ Unlock conditions                     ✅ Como perguntar o próximo slot
✅ Tool access policy (always/contextual) ✅ Como confirmar dados coletados
✅ Modo de RAG (full/minimal/off)        ✅ Como responder durante este state
✅ Modo de histórico                     ✅ Formato e tamanho das respostas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ NÃO decide comportamento conversacional ❌ NÃO decide tools ou acesso
❌ NÃO decide tom ou vocabulário           ❌ NÃO decide se slots estão ok
❌ NÃO decide formato das respostas        ❌ NÃO decide unlock conditions
```

**Regra prática:** Se você está tentando colocar um `if` de negócio dentro de uma skill, está na camada errada. Coloca na `CapabilityPolicy`. Se está tentando colocar texto de instrução dentro do `CapabilityPolicyEngine`, também está errado — vai para a skill.

---

## 13. Estado Final do Diagrama de Fluxo (rev.3)

```
WhatsApp / Canal de entrada
  │
  ▼
[01] Parse & Batch
  │
  ▼
[02] Load Customer + Metadata + policy_context persistido
  │
  ▼
[03] PolicyStateResolver
  │   ├── Aplica matriz de precedência (Guardrail 3)
  │   ├── Lê TenantLexicon do client.settings
  │   ├── Avalia SlotSchema via SlotManager
  │   └── Resolve: PolicyState + ActiveCapability + missing_slots
  │
  ▼
[04] CapabilityPolicyEngine
  │   ├── Determina allowed_tools[] para o state
  │   ├── Define rag_mode e history_mode
  │   └── Produz: ToolAccessPolicy
  │
  ▼
[05] SkillLoader
  │   ├── Carrega skill global (behavior layer)
  │   ├── Mescla camada do tenant (tone/vocab/offer)
  │   ├── Executa buildContext() com dados do runtime
  │   └── Produz: compiled_skill_prompt
  │
  ▼
[06] generateAIResponse (reduzido)
  │   ├── Recebe: base_prompt + compiled_skill_prompt + allowed_tools[]
  │   ├── NÃO recebe: tools bloqueadas pela policy
  │   └── Retorna: AIResponse (raw)
  │
  ▼
[06b] ResponseValidator (Guardrail 1)
  │    ├── Valida aderência ao PolicyState
  │    ├── Valida tool calls contra allowed_tools[]
  │    └── Decide: pass | regenerate | fallback
  │
  ▼
[07] Tool Executor (handleCalendarToolCall, etc.)
  │
  ▼
[08] Send + Save
  │
  ▼
[09] Update policy_context na conversations (Guardrail 2 + lifecycle Guardrail 3)
```

---

## 14. Referências Internas

- `src/nodes/generateAIResponse.ts` — ponto de integração principal (764 linhas)
- `src/flows/chatbotFlow.ts:1169` — onde `generateAIResponse` é chamado
- `src/lib/types.ts:516` — tipo `ClientConfig.calendar`
- `data/contacts/umana/prommpt Umana/prompt.md` — prompt atual (780 linhas)
- `docs/prompts/Umana Rio Branco/QA_TESTES_UMANA.md` — casos de teste
- `checkpoints/2026-04-15_chatbot-oficial/03_NEW_NODES_AND_FLOWS.md` — estado atual
- `twin-plans/PLANO_UMANA_MELHORIAS_2026-04.md` — plano anterior
