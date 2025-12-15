# PLANO — Fast Track para Perguntas Padrão (Cache-friendly)

## Objetivo
Criar um **node opcional** (habilitável/desabilitável por tenant no Flow Architecture) que identifique **perguntas “padrão/FAQ”** e execute um caminho **cache-friendly**:
- **não busca histórico**, **não roda RAG**, **não injeta data/hora dinâmica**
- chama a IA com um prompt mínimo e estável (system prompt + pergunta)

Isso permite cache **dentro do mesmo tenant** quando mensagens são idênticas (ex.: Usuário A e B do mesmo tenant perguntam “quais os planos?”).

## Não-objetivos (para manter o escopo seguro)
- Não fazer cache cross-tenant (risco de vazamento de contexto/dados)
- Não criar “páginas novas” no dashboard além do mínimo necessário para configurar o node via Flow Architecture
- Não implementar um cache próprio de aplicação nesta fase (isso é uma alternativa, mas não é este plano)

## Por que hoje quase nunca dá cache
Mesmo repetindo a mesma pergunta, o `messages[]` muda porque:
- o **histórico cresce** a cada interação
- o **RAG** pode mudar
- hoje o prompt inclui **data/hora atual** (muda sempre)

Então o request não fica idêntico → cache de resposta pronta raramente acontece.

## Proposta de Arquitetura
### Node novo: `fast_track_router`
- Posição no fluxo: **após `batch_messages`** e antes de `get_chat_history/get_rag_context`.
- Responsabilidade: decidir se a mensagem atual é “padrão” (FAQ) e, se for, executar o caminho rápido.

### Heurística de detecção (semântica / “agente”)
Requisito: o roteador precisa capturar variações como:
- “qual o plano?”
- “pode me mandar o plano?”

Proposta (prática, com boa precisão): **roteador semântico por similaridade** com fallback.

O node deve ser alimentado (via config por tenant) com:
1) **lista de mensagens padrão/canônicas** que são elegíveis para Fast Track
2) **threshold de similaridade** (0–1)
3) **modelo** utilizado pelo roteador semântico
4) **exemplos de mensagens** (para melhorar recall em variações)

**Etapa A (barata): normalização + prefilter opcional**
- normaliza a mensagem (trim, lower, remove acentos opcional)
- aplica um prefilter por keywords (opcional) para reduzir chamadas do classificador

**Etapa B (principal): similaridade semântica (IA)**
- um “agente”/roteador (chamada LLM barata, output curto) calcula a similaridade da mensagem atual contra uma lista de mensagens canônicas e decide:
  - `shouldFastTrack` (true/false)
  - `matchedCanonical` (string)
  - `similarity` (0-1)
  - `topic` (opcional, ex.: `faq_planos`, `faq_servicos`)
- input do roteador: **somente a mensagem atual + lista de canônicas + exemplos** (sem histórico) para maximizar reuso/caching e manter isolamento

Formato sugerido para o “catálogo” configurável:
- `fast_track:catalog` (JSON)
  - itens: `{ topic, canonical, examples: string[] }`
  - onde `canonical` é a frase base e `examples` são variações reais que o usuário final pode digitar

Observação: isso adiciona custo por mensagem, mas pode ser minimizado com:
- modelo barato + output curto
- cache interno da decisão por tenant (ex.: “mesma pergunta normalizada” -> mesma decisão por X horas)

### Execução no “Fast Track”
Se detectar FAQ:
- pula:
  - `get_chat_history`
  - `get_rag_context`
  - `check_continuity`
  - `classify_intent`
- chama a IA com:
  - `chatHistory = []`
  - `ragContext = ''`
  - `greetingInstruction = ''`
  - **sem data/hora dinâmica**
  - idealmente com **tools desativadas** (para reduzir variabilidade/efeitos colaterais)

### Ajuste necessário para cache funcionar
Hoje `generateAIResponse` sempre injeta `dateTimeInfo` no prompt. Para cache, precisamos permitir desligar isso.

**Importante (sobre timestamps no frontend):**
- Remover data/hora do **prompt da IA** não afeta a data/hora **salva no banco**.
- A UI de conversas usa `created_at`/timestamps do banco ao listar mensagens.
- O que muda é apenas o “contexto temporal” que a IA recebe no texto do prompt.

Proposta:
- adicionar flag `includeDateTimeInfo?: boolean` (default `true` para manter o comportamento atual)
- no fast track chamar com `includeDateTimeInfo: false`

## Alterações necessárias (arquivos)

### 1) Metadata do Flow Architecture
- **Arquivo**: `src/flows/flowMetadata.ts`
- **Mudanças**:
  - adicionar node `fast_track_router` com:
    - `category: 'auxiliary'`
    - `configurable: true` (habilita/desabilita por tenant)
    - `hasConfig: true`
    - `configKey: 'fast_track:enabled'` (ou similar)
    - `bypassable: true`
    - `dependencies: ['batch_messages']`
  - ajustar ordem do array para refletir execução (entre `batch_messages` e `get_chat_history`)

### 2) Implementação do node
- **Arquivo novo**: `src/nodes/fastTrackRouter.ts`
- **Export**: `src/nodes/index.ts`
- **Função**:
  - inputs: `clientId`, `phone`, `message` (batched), `config` (opcional)
  - fetch configs via `getBotConfigs(clientId, [...])`
  - retorna algo como:
    - `shouldFastTrack: boolean`
    - `reason: 'ai_similarity' | 'keyword_prefilter' | 'disabled' | 'low_similarity' | 'invalid_catalog' | ...`
    - `topic?: string`
    - `similarity?: number`
    - `matchedCanonical?: string`
    - `matchedExample?: string`
    - `matchedRule?: string` (se prefilter por keyword for usado)

### 3) Integração no fluxo
- **Arquivo**: `src/flows/chatbotFlow.ts`
- **Mudanças**:
  - após `batch_messages` (onde `batchedContent` já existe), rodar o node se estiver habilitado
  - se `shouldFastTrack === true`:
    - setar `chatHistory2 = []`, `ragContext = ''`
    - setar `continuityInfo` e `intentInfo` para valores default (ou marcar como skipped)
    - chamar `generateAIResponse` com `includeDateTimeInfo: false` e (preferencialmente) `enableTools: false`
    - logar no Backend Monitor algo como:
      - `FastTrack: true`, `reason`, `matchedRule`
      - e logar que history/rag/continuity/intent foram `skipped: true, reason: 'fast_track'`

### 4) Ajuste no gerador de mensagens
- **Arquivo**: `src/nodes/generateAIResponse.ts`
- **Mudanças**:
  - adicionar no input:
    - `includeDateTimeInfo?: boolean` (default `true`)
  - só adicionar o bloco de `dateTimeInfo` se `includeDateTimeInfo !== false`
  - (opcional) permitir override `enableTools?: boolean` para o fast track

### 5) API do Flow Architecture para ler/salvar config do node
- **Arquivo**: `src/app/api/flow/nodes/[nodeId]/route.ts`
- **Mudanças**:
  - adicionar `fast_track_router` nos maps:
    - `configKeyMap`
    - `getRelatedConfigKeys`
    - `getDefaultConfig`
- Sugestão de chaves:
  - `fast_track:enabled` (boolean)
  - `fast_track:keywords` (string[]) (opcional: prefilter)
  - `fast_track:match_mode` ('contains' | 'starts_with') (opcional: prefilter)
  - `fast_track:router_model` (string) (ex.: modelo barato do provider atual)
  - `fast_track:similarity_threshold` (number 0-1)
  - `fast_track:catalog` (JSON: array `{ topic, canonical, examples[] }`)
  - `fast_track:disable_tools` (boolean)

### 6) UI do Flow Architecture (Properties Panel)
- **Arquivo**: `src/components/flow-architecture/FlowArchitecturePropertiesPanel.tsx`
  - adicionar o painel `FastTrackRouterProperties`
- **Arquivo novo**: `src/components/flow-architecture/properties/FastTrackRouterProperties.tsx`
  - campos:
    - enabled (já existe via switch do node)
    - router_model (select/text)
    - similarity_threshold (input number)
    - catalog (textarea JSON: `{ topic, canonical, examples[] }[]`)
    - keywords (textarea, opcional como prefilter)
    - disable_tools (switch)

### 7) Ícone/registro visual do node
- **Arquivo**: `src/components/flow-architecture/blocks/FlowNodeBlock.tsx`
  - adicionar ícone para `fast_track_router`

## Migração / Banco
Sem migração estrutural obrigatória.
- configs serão persistidos em `bot_configurations` via `PATCH /api/flow/nodes/[nodeId]`.
- opcional: seed de defaults para tenants existentes (pode ser manual via UI).

## Critérios de Aceite
- Quando `fast_track_router` estiver **habilitado** e o classificador semântico decidir fast track:
  - nodes de histórico/RAG não executam
  - `generateAIResponse` roda com prompt estável (sem data/hora)
  - Backend Monitor mostra claramente que entrou em fast track (inclui `matchedCanonical` + `similarity` + `router_model`)
- Quando a pergunta **não** for padrão:
  - fluxo segue normalmente (com histórico/RAG)
- Feature pode ser desabilitada por tenant via Flow Architecture.

## Riscos e Mitigações
- Resposta sem histórico pode perder contexto → restringir a FAQs.
- Variabilidade por tools → default `disable_tools: true` no fast track.
- Cache “HIT” pode depender do provider/ambiente → ainda assim devemos ver `cached_tokens > 0` quando suportado.

## Próximo passo
Se você aprovar este plano, eu implemento em pequenos commits locais (sem `git commit` automático) e valido com `pnpm lint` + dev server.
