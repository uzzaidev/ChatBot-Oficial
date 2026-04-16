# Plano de Arquitetura: Agente Conversacional V2
**Projeto:** UzzApp — ChatBot-Oficial  
**Data:** 2026-04-16  
**Autor:** Pedro + Claude Code  
**Status:** Proposta técnica para revisão antes de implementar

---

## 1. Contexto e Problema

### Estado Atual (V1)

O agente atual é um LLM monolítico com:

- **1 prompt de sistema de ~780 linhas** (`generateAIResponse.ts` + prompt do cliente)
- **7 tools sempre disponíveis** independente do contexto da conversa
- **Regras comportamentais em texto** competindo com a intenção do usuário em tempo real
- **Zero enforcement de código** para a jornada do cliente — tudo depende do modelo seguir o prompt

### Sintoma Observado

```
Usuário: "Quero agendar uma visita"
Bot: [chama verificar_agenda IMEDIATAMENTE]  ← ERRADO
     "O período de ter., 21/04/2026, 11:00 está livre"

Usuário: "Otimo eu gostaria de marcar"
Bot: "Antes de confirmar, como você conheceu?"  ← pergunta tardia, 1 de 4 campos
 
Usuário: "Atraves do Luciano" [x3 repetições]
Bot: [cria evento com 1/4 campos coletados]  ← FALHA CRÍTICA
```

### Causa Raiz (diagnóstico técnico)

**Problema 1 — Degradação de atenção em contexto longo:**  
O Llama 3.3 70B (e qualquer transformer) distribui atenção de forma não uniforme em prompts longos. Regras no meio do prompt (como `ORDEM INVIOLÁVEL` na seção 5 de 8) recebem peso menor que início e fim. A regra existe, mas perde para a pressão imediata da mensagem do usuário.

**Problema 2 — Tools sempre expostas criam atalhos cognitivos:**  
Ao receber `verificar_agenda` como tool disponível, o modelo tem o caminho mais curto para resolver "quero agendar" — verificar a agenda. O modelo não está desobedecendo o prompt; está resolvendo o problema pelo caminho de menor resistência com os instrumentos disponíveis. Remover o instrumento é mais eficaz do que proibir seu uso via texto.

**Problema 3 — Regras de negócio em linguagem natural são ambíguas:**  
`REGRAS DE BLOQUEIO — NÃO chame verificar_agenda antes de coletar TODOS os dados` é uma instrução linguística. O modelo a interpreta com sua distribuição de probabilidades, que inclui a possibilidade de que "quero marcar amanhã às 10h" já seja intenção suficiente para pular a coleta. A instrução e a mensagem do usuário competem — e o usuário ganha.

**Problema 4 — Estado da jornada não é persistido de forma legível pelo modelo:**  
O modelo recebe: sistema de 780 linhas + histórico de chat + metadata já coletada + regras de calendário. Toda vez. Não há separação clara de "você está em qual fase agora". O modelo precisa inferir a fase lendo o histórico, o que é frágil.

---

## 2. Visão da Arquitetura V2

### Princípio Central

> **Não tente convencer o modelo por texto o que ele não pode fazer. Remova o instrumento.**

A V2 não é uma reescrita completa — é uma **camada de controle de intenção** inserida antes do LLM. O modelo continua fazendo o que faz bem: linguagem natural, empatia, adaptação de tom. O código faz o que o modelo faz mal: respeitar ordem, state machine, enforcement de regras de negócio.

### Diagrama de Fluxo V2

```
WhatsApp
  │
  ▼
[01] Parse & Batch (existente)
  │
  ▼
[02] Load Customer + Metadata (existente)
  │
  ▼
[03] ── NOVO ──► ConversationStageDetector
  │               │
  │               ├── stage: "browsing"
  │               ├── stage: "intent_to_schedule"
  │               ├── stage: "collecting_data"
  │               ├── stage: "data_complete"
  │               ├── stage: "calendar_management"
  │               └── stage: "handoff"
  │
  ▼
[04] ── NOVO ──► SkillLoader (baseado no stage)
  │               │
  │               ├── Carrega APENAS o mini-prompt relevante
  │               └── Expõe APENAS as tools relevantes
  │
  ▼
[05] generateAIResponse (reduzido)
  │               │
  │               ├── Recebe: prompt_base + skill_prompt + tools_filtradas
  │               └── NÃO recebe: ferramentas proibidas para o stage
  │
  ▼
[06] Tool Executor (existente)
  │
  ▼
[07] Send + Save (existente)
```

---

## 3. Componente 1: ConversationStageDetector

### Responsabilidade

Determinar em qual fase da jornada a conversa está, **sem usar LLM** — apenas heurísticas de código baseadas em:
1. `contactMetadata` — quais campos já foram coletados
2. Histórico de chat — palavras-chave na última mensagem e nas últimas N mensagens
3. Status do contato — `bot`, `humano`, `transferido`

### Definição dos Stages

```typescript
export type ConversationStage =
  | "browsing"           // Navegando, perguntando informações gerais
  | "intent_to_schedule" // Expressou vontade de agendar mas dados ainda não coletados
  | "collecting_data"    // Em processo de coleta de dados (parcialmente coletados)
  | "data_complete"      // Todos os campos coletados, pode avançar para calendário
  | "calendar_management"// Quer cancelar, remarcar, ver compromissos
  | "handoff"            // Aula experimental/particular — vai para humano
  | "post_schedule"      // Evento já criado, conversa de follow-up
```

### Algoritmo de Detecção

A detecção opera em **cascata de prioridade** — cada verificação retorna imediatamente se a condição for atendida.

```typescript
export const detectConversationStage = (
  input: StageDetectorInput
): ConversationStage => {
  const { lastMessage, chatHistory, contactMetadata, customerStatus } = input;

  // PRIORIDADE 1: Status do contato no banco
  // Se já foi transferido, não alterar o stage
  if (customerStatus === "transferido" || customerStatus === "humano") {
    return "handoff";
  }

  // PRIORIDADE 2: Gatilhos de handoff explícitos
  // Aula experimental e particular SEMPRE vão para humano — sem exceção
  if (matchesHandoffTriggers(lastMessage)) {
    return "handoff";
  }

  // PRIORIDADE 3: Gestão de calendário
  // Usuário quer cancelar, remarcar ou ver compromissos existentes
  if (matchesCalendarManagement(lastMessage, chatHistory)) {
    return "calendar_management";
  }

  // PRIORIDADE 4: Evento já foi criado nesta conversa
  // Verificar no histórico recente se há marcador [SISTEMA] Evento agendado
  if (hasRecentScheduledEvent(chatHistory)) {
    return "post_schedule";
  }

  // PRIORIDADE 5: Intenção de agendar detectada
  if (matchesScheduleIntent(lastMessage, chatHistory)) {
    // Avaliar estado da coleta de dados
    const collectedFields = countCollectedFields(contactMetadata);

    if (collectedFields >= REQUIRED_FIELDS.length) {
      return "data_complete";
    }

    if (collectedFields > 0) {
      return "collecting_data";
    }

    return "intent_to_schedule";
  }

  // DEFAULT: Navegando / perguntas gerais
  return "browsing";
};
```

### Funções de Matching (sem LLM)

```typescript
// Palavras-chave que disparam handoff para humano
const HANDOFF_KEYWORDS = [
  "aula experimental", "aula particular", "particular",
  "falar com professor", "falar com instrutor", "falar com alguém",
  "falar com uma pessoa", "atendente", "humano",
  "Carlos", "Julia", "Fabrício", "Naiana", // professores por nome
];

// Palavras-chave de intenção de agendar visita
const SCHEDULE_INTENT_KEYWORDS = [
  "quero marcar", "pode marcar", "quero agendar", "pode agendar",
  "quero conhecer", "quero visitar", "quero ir", "visita",
  "marcar uma visita", "agendar uma visita",
];

// Palavras-chave de gestão de calendário
const CALENDAR_MANAGEMENT_KEYWORDS = [
  "cancelar", "desmarcar", "cancela", "não posso mais", "não vou conseguir",
  "remarcar", "reagendar", "mudar horário", "trocar horário",
  "meus compromissos", "o que tenho marcado", "tenho algo marcado",
];

// Campos obrigatórios para avançar para o calendário
const REQUIRED_FIELDS = ["como_conheceu", "objetivo", "email", "cpf"] as const;
```

### Por que heurísticas de código e não um LLM de classificação?

**Justificativa técnica:**
1. **Latência:** Um LLM adicional para classificar stage adicionaria 300-800ms por mensagem. Para WhatsApp, isso é perceptível.
2. **Custo:** Cada mensagem já custa uma chamada de LLM. Dobrar as chamadas para classificação não é sustentável em multi-tenant.
3. **Previsibilidade:** Heurísticas de código são 100% determinísticas. "quero marcar" SEMPRE detecta `intent_to_schedule`. Um LLM classificador pode errar.
4. **Manutenção:** Adicionar palavras-chave ao array é trivial. Ajustar um classificador de LLM requer prompting, teste e iteração.

**Limitação conhecida:** Mensagens ambíguas como "está bem" podem não ser detectadas corretamente. Para esses casos, o stage anterior é mantido (persistência de stage — ver Seção 6).

---

## 4. Componente 2: SkillLoader

### Responsabilidade

Dado o stage detectado, carregar:
1. O **mini-prompt** (skill) relevante para aquele momento
2. As **tools** disponíveis para o modelo naquele momento

### Estrutura de Skills

```
src/
  lib/
    agent-skills/
      index.ts                    ← exports all skills
      skill-types.ts              ← interfaces
      skills/
        browsing.skill.ts         ← info, preços, filosofia, horários
        intent-to-schedule.skill.ts ← inicia coleta, qual campo falta
        collecting-data.skill.ts  ← coleta em andamento, confirmações
        data-complete.skill.ts    ← verificar agenda + criar evento
        calendar-management.skill.ts ← cancelar, reagendar, listar
        handoff.skill.ts          ← aula experimental, professor específico
        post-schedule.skill.ts    ← follow-up após agendamento
```

### Interface de Skill

```typescript
export interface AgentSkill {
  name: string;
  
  // Prompt da skill — CURTO, focado, sem regras de outros stages
  systemPrompt: string;
  
  // Tools disponíveis para este stage
  allowedTools: ToolName[];
  
  // Contexto adicional para injetar (ex: campos ainda faltantes)
  buildContext?: (input: SkillContextInput) => string;
}

export type ToolName =
  | "transferir_atendimento"
  | "registrar_dado_cadastral"
  | "verificar_agenda"
  | "criar_evento_agenda"
  | "cancelar_evento_agenda"
  | "alterar_evento_agenda"
  | "buscar_documento";
```

### Mapeamento Stage → Tools Disponíveis

Esta é a peça central da arquitetura. O LLM **literalmente não sabe** que as outras tools existem.

```
Stage                  | Tools Disponíveis
-----------------------|------------------------------------------
browsing               | buscar_documento, transferir_atendimento
intent_to_schedule     | registrar_dado_cadastral, transferir_atendimento
collecting_data        | registrar_dado_cadastral, transferir_atendimento
data_complete          | verificar_agenda, criar_evento_agenda, registrar_dado_cadastral
calendar_management    | cancelar_evento_agenda, alterar_evento_agenda, verificar_agenda
handoff                | transferir_atendimento
post_schedule          | verificar_agenda, cancelar_evento_agenda, alterar_evento_agenda
```

**Por que isso resolve o problema raiz:**

Em `intent_to_schedule`, o modelo recebe `registrar_dado_cadastral` e `transferir_atendimento`. Não recebe `verificar_agenda`. Não importa o que o usuário diga — "quero às 10h de terça", "pode ser segunda" — o modelo **não tem o instrumento** para verificar a agenda. Ele só consegue pedir mais dados ou transferir. O prompt de texto passa a reforçar o que o código já garantiu, em vez de ser a única linha de defesa.

### Exemplos de Mini-Prompts por Skill

#### `browsing.skill.ts`
```typescript
export const browsingSkill: AgentSkill = {
  name: "browsing",
  allowedTools: ["buscar_documento", "transferir_atendimento"],
  systemPrompt: `
Você está na fase de descoberta com este lead.

Seu único objetivo agora: entender quem é essa pessoa e criar conexão.

REGRAS DESTA FASE:
- Responda perguntas sobre horários, valores, filosofia, professores
- Use no máximo 3 frases por mensagem
- Se o usuário demonstrar interesse em agendar, confirme: "Quer que eu te ajude a marcar uma visita?"
- NÃO ofereça marcar sem que o usuário sinalize interesse primeiro
- Se mencionar aula experimental ou professor específico: use transferir_atendimento
  `,
  buildContext: () => "", // sem contexto adicional nesta fase
};
```

#### `collecting-data.skill.ts`
```typescript
export const collectingDataSkill: AgentSkill = {
  name: "collecting_data",
  allowedTools: ["registrar_dado_cadastral", "transferir_atendimento"],
  systemPrompt: `
Você está coletando os dados necessários para agendar a visita.

REGRAS DESTA FASE:
- Colete UM dado por mensagem — nunca faça duas perguntas de uma vez
- Após cada resposta, confirme com "Ótimo!" ou "Perfeito!" antes de pedir o próximo
- Se o usuário mencionar um horário: responda "Ótimo, vou guardar esse horário! Antes de confirmarmos, preciso de mais algumas informações." — e continue a coleta
- Se o usuário repetir a mesma informação: confirme ("Entendido!") e avance para o próximo campo
- NÃO mencione agenda, horários disponíveis nem confirmação de visita até ter TODOS os dados
  `,
  buildContext: (input) => {
    const missing = getMissingFields(input.contactMetadata);
    const collected = getCollectedFields(input.contactMetadata);
    
    return [
      collected.length > 0
        ? `DADOS JÁ COLETADOS (NÃO pergunte novamente): ${collected.join(", ")}`
        : "",
      `PRÓXIMO CAMPO A COLETAR: ${missing[0]}`,
      `CAMPOS AINDA FALTANTES: ${missing.slice(1).join(", ") || "nenhum após este"}`,
    ].filter(Boolean).join("\n");
  },
};
```

#### `data-complete.skill.ts`
```typescript
export const dataCompleteSkill: AgentSkill = {
  name: "data_complete",
  allowedTools: ["verificar_agenda", "criar_evento_agenda", "registrar_dado_cadastral"],
  systemPrompt: `
Todos os dados foram coletados. Agora você pode verificar a agenda e agendar a visita.

FLUXO OBRIGATÓRIO:
1. Chame verificar_agenda para confirmar disponibilidade
2. Apresente a opção disponível: "O horário de [dia] às [hora] está disponível. Posso confirmar a visita?"
3. Aguarde confirmação explícita ("sim", "pode", "confirma", "ok")
4. Só então chame criar_evento_agenda
5. Após criar: confirme APENAS com título e horário — SEM telefone, email ou ID

GRADE DE VISITAS: Seg-Qui 10h-13h e 15h-20h / Sex 15h-18h
Se o horário pedido estiver fora da grade: informe e sugira o mais próximo disponível.
  `,
  buildContext: (input) => {
    const fields = input.contactMetadata;
    return `DADOS DO VISITANTE:\n` +
      `- Como conheceu: ${fields?.como_conheceu}\n` +
      `- Objetivo: ${fields?.objetivo}\n` +
      `- E-mail: ${fields?.email}\n` +
      `- CPF: ${fields?.cpf}`;
  },
};
```

---

## 5. Componente 3: Prompt Base Comprimido

### Problema atual

O prompt do cliente (`prompt.md`) tem **780 linhas** incluindo:
- Identidade e tom (essencial — sempre necessário)
- Horários e grade (essencial — sempre necessário)
- Preços e estratégia comercial (necessário apenas em `browsing`)
- Regras de imagem (necessário em `browsing`)
- Coleta de dados e ORDEM INVIOLÁVEL (substituído pela skill)
- Regras de calendário (substituído pela skill)
- Transferência humana (substituído pela skill)

### Estrutura do Prompt Pós-Refatoração

O prompt do cliente é dividido em **dois blocos**:

**Bloco A — Base (sempre injetado, ~150 linhas)**
```
- Identidade da Umåna (quem somos, filosofia, missão)
- Tom de voz e linguagem (sem emojis, sem markdown, crase correta, "técnicas corporais")
- Professores e horários de aulas (grade semanal completa)
- Regras de imagem (uma por vez, quando enviar cada imagem)
- Informações proibidas (não dar WhatsApp, não comentar concorrentes)
- Contraindicações e saúde (orientar médico sem desencorajar)
```

**Bloco B — Skills (injetado conforme stage)**
```
- Carregado pelo SkillLoader
- Focado e pequeno (~30-60 linhas cada)
- Contém APENAS o que é relevante para aquele momento
```

### Benefício de Tamanho

```
V1: 780 linhas de prompt + 7 tools na mesma chamada
V2: ~150 linhas base + ~40 linhas skill + 2-3 tools
    = ~75% de redução no context window usado pelo prompt
```

Isso aumenta o peso relativo de cada instrução que permanece. Com 150 linhas de base e 40 de skill, **toda regra relevante fica no top 25% do contexto** — onde a atenção do modelo é mais alta.

---

## 6. Persistência de Stage

### Problema

A detecção de stage é feita a cada mensagem. Entre mensagens, o stage pode "resetar" se a heurística não reconhecer a continuação.

**Exemplo problemático:**
```
Usuário: "Quero marcar" → stage: intent_to_schedule
Bot: "Como conheceu a Umåna?"
Usuário: "Através do Luciano"  ← mensagem sem palavra-chave de agendamento
→ stage detector pode retornar "browsing" ← ERRADO
```

### Solução: Stage Persistence via Conversation State

O stage detectado é **salvo na conversa** e só avança (nunca regride) exceto por gatilhos explícitos.

**Opção A — Redis (recomendado para performance):**
```typescript
// Ao detectar novo stage
await redis.set(`stage:${clientId}:${phone}`, newStage, "EX", 3600);

// Ao iniciar processamento
const persistedStage = await redis.get(`stage:${clientId}:${phone}`);
const detectedStage = detectConversationStage(input);

// Stage só avança, nunca regride (exceto reset explícito)
const finalStage = resolveStage(persistedStage, detectedStage);
```

**Opção B — `conversations` table (mais simples, sem Redis adicional):**
```typescript
// Coluna nova: current_stage TEXT na tabela conversations
await supabase
  .from("conversations")
  .update({ current_stage: newStage })
  .eq("phone", phone)
  .eq("client_id", clientId);
```

**Lógica de resolução:**
```typescript
const STAGE_PROGRESSION = [
  "browsing",
  "intent_to_schedule",
  "collecting_data",
  "data_complete",
  "post_schedule",
];

const resolveStage = (
  persisted: ConversationStage | null,
  detected: ConversationStage
): ConversationStage => {
  // Handoff e calendar_management sempre têm prioridade
  if (detected === "handoff" || detected === "calendar_management") {
    return detected;
  }

  // Se não há stage persistido, usar o detectado
  if (!persisted) return detected;

  // Nunca regredir na jornada de agendamento
  const persistedIdx = STAGE_PROGRESSION.indexOf(persisted);
  const detectedIdx = STAGE_PROGRESSION.indexOf(detected);

  if (persistedIdx > detectedIdx) return persisted;
  return detected;
};
```

**Recomendação:** Usar a tabela `conversations` (Opção B) por simplicidade — já existe, está no Supabase, e uma leitura adicional por mensagem é marginal. Redis fica para quando o volume justificar.

---

## 7. Escolha do Modelo por Stage

### Hipótese de Luis

> "Talvez menos reasoning e modelo mais direto que segue bem o que está ali"

### Análise

O Llama 3.3 70B é excelente para raciocínio aberto mas **sobre-pensa fluxos estruturados**. Para stages que são essencialmente formulários conversacionais (`collecting_data`, `data_complete`), um modelo menor e mais diretivo é mais previsível.

**Proposta de roteamento por stage:**

```typescript
const MODEL_BY_STAGE: Record<ConversationStage, ModelConfig> = {
  // Navegação e filosofia — precisa de qualidade de linguagem
  browsing: { provider: "groq", model: "llama-3.3-70b-versatile", temperature: 0.7 },
  
  // Coleta de dados — fluxo estruturado, modelo menor é mais previsível
  intent_to_schedule: { provider: "groq", model: "llama-3.1-8b-instant", temperature: 0.3 },
  collecting_data:    { provider: "groq", model: "llama-3.1-8b-instant", temperature: 0.3 },
  
  // Dados completos — precisa interpretar disponibilidade e confirmar
  data_complete:      { provider: "groq", model: "llama-3.3-70b-versatile", temperature: 0.4 },
  
  // Gestão de calendário — operações bem definidas
  calendar_management: { provider: "groq", model: "llama-3.1-8b-instant", temperature: 0.2 },
  
  // Handoff — mensagem simples + tool call
  handoff:            { provider: "groq", model: "llama-3.1-8b-instant", temperature: 0.3 },
  
  // Pós-agendamento — qualidade de linguagem para follow-up
  post_schedule:      { provider: "groq", model: "llama-3.3-70b-versatile", temperature: 0.6 },
};
```

**Vantagem de custo:** `llama-3.1-8b-instant` é ~10x mais barato que `llama-3.3-70b-versatile`. Stages mecânicos representam ~60% das mensagens em clientes como Umåna — isso pode reduzir custo de API em 40-50%.

**Nota de cautela:** A troca de modelo por stage só faz sentido **após** o tool gating e skills estarem funcionando. Um modelo pequeno com prompt grande e muitas tools é pior, não melhor.

---

## 8. Plano de Implementação — Fases

### Fase 1: Tool Gating (menor risco, maior impacto imediato)

**O que muda:** `generateAIResponse.ts` — filtrar tools baseado em `contactMetadata`.

**Arquivos afetados:**
- `src/nodes/generateAIResponse.ts` — lógica de filtragem de tools
- `src/lib/types.ts` — tipo `ToolGatingContext`

**Implementação:**
```typescript
// Em generateAIResponse.ts, antes de montar o array de tools:

const calendarEnabled =
  config.calendar?.botEnabled !== false &&
  (config.calendar?.google?.enabled || config.calendar?.microsoft?.enabled);

const metadataComplete =
  contactMetadata?.como_conheceu &&
  contactMetadata?.objetivo &&
  contactMetadata?.email &&
  contactMetadata?.cpf;

// Só expõe tools de calendário se:
// 1. Calendário está conectado e ativo
// 2. Todos os campos obrigatórios estão coletados
const exposeCalendarTools = calendarEnabled && metadataComplete;
```

**Por que primeiro:** Zero risco de quebrar outros clientes. Se `contactMetadata` não tiver os campos (cliente sem fluxo de coleta), `metadataComplete` = false e as tools de calendário ficam ocultas — mas o cliente em questão já não usava coleta obrigatória. Flag pode ser condicionado a um campo no config do cliente.

---

### Fase 2: ConversationStageDetector (infraestrutura)

**O que cria:**
- `src/lib/conversation-stage/detector.ts`
- `src/lib/conversation-stage/types.ts`
- `src/lib/conversation-stage/keywords.ts`

**Migração no banco:**
```sql
-- supabase/migrations/TIMESTAMP_add_current_stage_to_conversations.sql
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'browsing';

COMMENT ON COLUMN conversations.current_stage IS
  'Current stage of the conversation journey: browsing | intent_to_schedule | collecting_data | data_complete | calendar_management | handoff | post_schedule';
```

**Integração em `chatbotFlow.ts`:**
```typescript
// Após NODE 9 (get chat history), antes de NODE 12 (generate AI response):

const conversationStage = await detectAndPersistStage({
  lastMessage: batchedContent,
  chatHistory: chatHistory2,
  contactMetadata: customer.metadata,
  customerStatus: customer.status,
  conversationId: conversation?.id,
  clientId: config.id,
});
```

---

### Fase 3: SkillLoader + Mini-Prompts

**O que cria:**
- `src/lib/agent-skills/` (diretório completo)
- 7 skill files

**Integração em `generateAIResponse.ts`:**
```typescript
// Recebe stage como parâmetro adicional
export interface GenerateAIResponseInput {
  // ... campos existentes ...
  conversationStage?: ConversationStage; // ← NOVO
}

// Em generateAIResponse():
const skill = loadSkill(conversationStage, config, contactMetadata);

// Prompt final = base do cliente + skill prompt
messages.push({ role: "system", content: config.prompts.systemPrompt }); // base (~150 linhas)
messages.push({ role: "system", content: skill.systemPrompt });           // skill (~40 linhas)
if (skill.buildContext) {
  messages.push({ role: "system", content: skill.buildContext({ contactMetadata }) });
}

// Tools = skill.allowedTools ∩ tools habilitadas no config do cliente
const tools = filterToolsBySkill(allTools, skill.allowedTools);
```

---

### Fase 4: Roteamento de Modelo por Stage (opcional, após validação)

**O que muda:**
- `src/lib/direct-ai-client.ts` — aceitar override de modelo por stage
- `src/lib/agent-skills/index.ts` — expor `modelConfig` por skill

**Condição de ativação:** Somente após Fases 1-3 validadas em produção. Não implementar antes de confirmar que o comportamento está correto com 70B.

---

### Fase 5: Refatoração do Prompt do Cliente (Umåna)

**O que muda:**
- `CONTATOS UMANA/prommpt Umana/prompt.md` — reduzir de 780 para ~150 linhas (apenas Bloco A)
- As seções de coleta de dados, ordem do fluxo, regras de calendário são removidas do prompt e vivem nas skills

**Condição de ativação:** Somente após Fases 1-4 validadas. O prompt atual funciona (com falhas), as skills são o substituto. Não remover o prompt antes das skills estarem em produção.

---

## 9. Impacto em Outros Clientes

A arquitetura V2 deve ser **opt-in por cliente**. O `ClientConfig` ganha:

```typescript
// src/lib/types.ts
export interface ClientConfig {
  // ... campos existentes ...
  
  agentV2?: {
    enabled: boolean;           // opt-in — default false
    requireMetadataForCalendar: boolean; // Tool gating — default false
    stageAwarePrompting: boolean;        // Skills — default false
  };
}
```

No `config.ts`, ler do `client.settings`:
```typescript
agentV2: {
  enabled: client.settings?.agent_v2_enabled ?? false,
  requireMetadataForCalendar: client.settings?.require_metadata_for_calendar ?? false,
  stageAwarePrompting: client.settings?.stage_aware_prompting ?? false,
},
```

Isso garante que a Umåna pode ser o cliente piloto sem afetar outros clientes.

---

## 10. Métricas de Sucesso

Para validar que a V2 está funcionando melhor:

| Métrica | V1 (atual) | V2 (esperado) |
|---------|-----------|---------------|
| Taxa de chamada `verificar_agenda` antes de coleta completa | ~40% dos casos | 0% (impossível por design) |
| Taxa de evento criado sem confirmação explícita | ~15% | <2% |
| Campos coletados antes de agendar (média) | 1.2/4 | 4/4 |
| Custo de API por conversa (stages mecânicos) | baseline | -40% (com modelo por stage) |
| Tempo médio até agendamento confirmado | baseline | medir |

---

## 11. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Stage detector classifica errado em mensagem ambígua | Médio | Médio | Persistência de stage — não regride sem gatilho explícito |
| Skill prompt muito restritivo bloqueia resposta legítima | Baixo | Alto | Cada skill tem `transferir_atendimento` como saída de emergência |
| Clientes sem fluxo de coleta perdem acesso ao calendário | Baixo | Alto | `requireMetadataForCalendar` é opt-in — default `false` |
| Migração de banco com `current_stage` causa lock | Baixo | Médio | `ADD COLUMN IF NOT EXISTS` — operação segura no Postgres |
| Latência adicional pelo stage detector | Baixo | Baixo | Detector é pure function em código — <1ms |

---

## 12. Ordem de Prioridade Sugerida

```
SPRINT 1 (impacto imediato, reversível)
  ├── [F1] Tool gating em generateAIResponse.ts
  │         Condição: contactMetadata completo para expor tools de calendário
  └── Testar com Umåna — medir se resolve o problema do "pula coleta"

SPRINT 2 (infraestrutura)
  ├── [F2] ConversationStageDetector + migration current_stage
  └── Logar o stage detectado em cada mensagem (sem mudar comportamento ainda)

SPRINT 3 (skills)
  ├── [F3] SkillLoader + 3 skills prioritárias:
  │         collecting_data, data_complete, calendar_management
  └── Testar com prompt do cliente reduzido para Bloco A

SPRINT 4 (otimização)
  ├── [F4] Modelo por stage — testar llama-3.1-8b em collecting_data
  └── [F5] Refatorar prompt do cliente

SPRINT 5 (produção)
  ├── Dashboard de configuração (toggle por feature no settings)
  └── Documentação para outros clientes
```

---

## 13. Referências Internas

- `src/nodes/generateAIResponse.ts` — ponto de integração principal
- `src/flows/chatbotFlow.ts:1169` — onde `generateAIResponse` é chamado
- `src/lib/types.ts:516` — tipo `ClientConfig.calendar`
- `CONTATOS UMANA/prommpt Umana/prompt.md` — prompt atual (780 linhas)
- `docs/prompts/Umana Rio Branco/QA_TESTES_UMANA.md` — testes de referência
- `twin-plans/PLANO_UMANA_MELHORIAS_2026-04.md` — plano anterior de referência
- `checkpoints/2026-04-15_chatbot-oficial/03_NEW_NODES_AND_FLOWS.md` — estado atual documentado
