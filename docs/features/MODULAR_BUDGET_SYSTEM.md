# Sistema Modular de Budget

## Visão Geral

Sistema flexível de controle de orçamento com **3 modos**: Tokens, Reais (BRL), ou Híbrido (ambos).

## Modos de Budget

### 1. **Modo Tokens** (`budget_mode = 'tokens'`)
- Rastreia apenas **quantidade de tokens**
- Ideal para: Planos com limite fixo de tokens
- Exemplo: "1 milhão de tokens/mês"

```sql
{
  budget_mode: 'tokens',
  token_limit: 1000000,
  current_tokens: 450000,
  token_usage_percentage: 45.0,
  -- BRL fields ignored
}
```

### 2. **Modo Reais** (`budget_mode = 'brl'`)
- Rastreia apenas **custo em R$**
- Ideal para: Planos com orçamento fixo mensal
- Exemplo: "R$ 500/mês"

```sql
{
  budget_mode: 'brl',
  brl_limit: 500.00,
  current_brl: 245.50,
  brl_usage_percentage: 49.1,
  -- Token fields ignored
}
```

### 3. **Modo Híbrido** (`budget_mode = 'both'`) ⭐ RECOMENDADO
- Rastreia **AMBOS** (tokens E reais) simultaneamente
- Pausa quando **QUALQUER** limite for atingido
- Ideal para: Controle total com dupla proteção
- Exemplo: "1M tokens OU R$ 500/mês - o que vier primeiro"

```sql
{
  budget_mode: 'both',

  -- Token limit
  token_limit: 1000000,
  current_tokens: 850000,    -- 85%
  token_usage_percentage: 85.0,

  -- BRL limit
  brl_limit: 500.00,
  current_brl: 450.00,        -- 90%
  brl_usage_percentage: 90.0,

  -- Pausa quando QUALQUER atingir 100%
  pause_at_limit: true,
  is_paused: false,
  pause_reason: null
}
```

## Como Funciona

### 1. Tracking Unificado

**TODAS** as APIs são rastreadas pelo mesmo sistema:

```typescript
// TTS (Text-to-Speech)
trackUnifiedUsage({
  clientId: '...',
  apiType: 'tts',
  provider: 'openai',
  modelName: 'tts-1-hd',
  characters: 5000,
  phone: '5555999...',
})

// Chat
trackUnifiedUsage({
  apiType: 'chat',
  provider: 'openai',
  modelName: 'gpt-4o',
  inputTokens: 1000,
  outputTokens: 500,
})

// Whisper
trackUnifiedUsage({
  apiType: 'whisper',
  modelName: 'whisper-1',
  seconds: 120, // 2 minutos
})

// Vision
trackUnifiedUsage({
  apiType: 'vision',
  images: 10,
})
```

### 2. Incremento Automático

Função `increment_unified_budget()` **sempre** rastreia ambos:

```sql
-- Chamada
increment_unified_budget(
  p_client_id := 'abc123',
  p_tokens := 1500,      -- Tokens usados
  p_cost_brl := 0.15     -- Custo em R$
)

-- Resultado baseado no modo:
-- Modo 'tokens': Incrementa current_tokens
-- Modo 'brl': Incrementa current_brl
-- Modo 'both': Incrementa AMBOS
```

### 3. Verificação de Limite

Função `check_budget_available()` verifica se pode continuar:

```sql
-- Modo 'tokens': Verifica apenas token_limit
-- Modo 'brl': Verifica apenas brl_limit
-- Modo 'both': Verifica AMBOS (nega se QUALQUER atingiu)

-- Exemplo (modo 'both'):
{
  token_limit: 1000000,
  current_tokens: 900000,  -- 90% ✅ OK
  brl_limit: 500.00,
  current_brl: 505.00,     -- 101% ❌ LIMITE!

  -- Resultado: PAUSADO (limite BRL atingido)
  pause_reason: 'brl_limit'
}
```

## Conversão Token → Reais

Usa tabela `ai_models_registry` com preços atualizados:

```sql
SELECT
  gateway_identifier,
  input_price_per_million,  -- USD por 1M tokens
  output_price_per_million
FROM ai_models_registry
WHERE gateway_identifier = 'openai/gpt-4o';

-- Resultado:
-- input: $2.5 / 1M tokens
-- output: $10.0 / 1M tokens

-- Conversão automática USD → BRL (taxa do dia)
```

## Configuração no Admin

### Interface de Configuração

**Página:** `/dashboard/admin/budget-plans`

**Campos:**

```typescript
interface BudgetConfig {
  planName: string              // 'free', 'basic', 'pro', 'enterprise'
  budgetMode: 'tokens' | 'brl' | 'both'

  // Token budget
  tokenLimit: number            // Ex: 1000000

  // BRL budget
  brlLimit: number              // Ex: 500.00

  // Period
  budgetPeriod: 'daily' | 'weekly' | 'monthly'

  // Auto-pause
  pauseAtLimit: boolean         // true = auto-pause ao atingir limite

  // Alerts
  alert80: boolean              // Alerta em 80%
  alert90: boolean              // Alerta em 90%
  alert100: boolean             // Alerta em 100%

  notificationEmail: string     // Email para alertas
}
```

### Exemplos de Configuração

#### Plano Free (500k tokens OU R$ 50 - o que vier primeiro)
```json
{
  "planName": "free",
  "budgetMode": "both",
  "tokenLimit": 500000,
  "brlLimit": 50.00,
  "budgetPeriod": "monthly",
  "pauseAtLimit": true
}
```

#### Plano Basic (Apenas R$ 500/mês)
```json
{
  "planName": "basic",
  "budgetMode": "brl",
  "tokenLimit": 0,           // Ignored
  "brlLimit": 500.00,
  "budgetPeriod": "monthly",
  "pauseAtLimit": true
}
```

#### Plano Pro (10M tokens/mês - sem limite de reais)
```json
{
  "planName": "pro",
  "budgetMode": "tokens",
  "tokenLimit": 10000000,
  "brlLimit": 0,              // Ignored
  "budgetPeriod": "monthly",
  "pauseAtLimit": false       // Apenas alerta, não pausa
}
```

#### Plano Enterprise (Ilimitado)
```json
{
  "planName": "enterprise",
  "budgetMode": "brl",        // Modo não importa
  "tokenLimit": 0,
  "brlLimit": 0,              // 0 = unlimited
  "budgetPeriod": "monthly",
  "pauseAtLimit": false
}
```

## Analytics - Visualização por Role

### Tenant (Cliente)

Vê **apenas custo total consolidado**:

```
┌─────────────────────────────────────┐
│ Uso do Mês                          │
├─────────────────────────────────────┤
│ Tokens: 850,000 / 1,000,000 (85%)  │
│ Custo: R$ 450,00 / R$ 500,00 (90%) │
│                                     │
│ ███████████████████░░ 90%           │
│                                     │
│ ⚠️ Atenção: Próximo ao limite       │
└─────────────────────────────────────┘
```

**NÃO mostra:**
- Diferença entre Gateway vs Legacy
- Breakdown por API type (escondido do cliente)

### Admin (Super Admin)

Vê **breakdown detalhado**:

```
┌─────────────────────────────────────┐
│ Cliente: ACME Corp                  │
├─────────────────────────────────────┤
│ Modo: Híbrido (Tokens + BRL)       │
│                                     │
│ Tokens: 850k / 1M (85%)             │
│ Custo: R$ 450 / R$ 500 (90%) ⚠️    │
│                                     │
│ Por API Type:                       │
│ • Chat:      R$ 300 (66%)          │
│ • TTS:       R$ 80 (18%)           │
│ • Whisper:   R$ 40 (9%)            │
│ • Vision:    R$ 30 (7%)            │
│                                     │
│ Por Provider:                       │
│ • OpenAI:    R$ 380 (84%)          │
│ • Groq:      R$ 70 (16%)           │
│                                     │
│ Via Gateway:  R$ 350 (78%)         │
│ Direto:       R$ 100 (22%)         │
└─────────────────────────────────────┘
```

## Reset de Budget (Cron Job)

Budget reseta automaticamente baseado em `budget_period`:

```typescript
// Diariamente: Reseta todo dia às 00:00
// Semanalmente: Reseta toda segunda-feira
// Mensalmente: Reseta no dia 1 de cada mês

// Função: reset_budget_usage(client_id)
// Reseta:
// - current_tokens → 0
// - current_brl → 0
// - percentages → 0
// - alert flags → false
// - is_paused → false
```

## Mudança de Plano

### Fácil para Admin:

1. Acessa `/dashboard/admin/budget-plans`
2. Seleciona cliente
3. Escolhe modo:
   - ☑️ Tokens
   - ☑️ Reais
   - ☑️ Ambos
4. Define limites
5. Salva

**Efeito imediato!** Próxima requisição já usa nova config.

### Exemplo de Mudança:

```typescript
// Cliente estava em modo BRL
{
  budget_mode: 'brl',
  brl_limit: 500.00,
  current_brl: 450.00  // Já gastou R$ 450
}

// Admin muda para modo HÍBRIDO
UPDATE client_budgets
SET
  budget_mode = 'both',
  token_limit = 1000000,
  brl_limit = 500.00
WHERE client_id = '...';

// Resultado:
{
  budget_mode: 'both',
  token_limit: 1000000,
  current_tokens: 0,        // Reset
  brl_limit: 500.00,
  current_brl: 450.00,      // Mantém histórico
}

// Agora rastreia AMBOS!
```

## API Endpoints

### GET `/api/budget/status`
Retorna status do budget do cliente atual:

```json
{
  "budgetMode": "both",
  "tokenLimit": 1000000,
  "currentTokens": 850000,
  "tokenUsagePercentage": 85.0,
  "brlLimit": 500.00,
  "currentBRL": 450.00,
  "brlUsagePercentage": 90.0,
  "isPaused": false,
  "pauseReason": null,
  "status": "WARNING",
  "nextResetAt": "2024-01-01T00:00:00Z"
}
```

### POST `/api/admin/budget/configure`
(Admin only) Configura budget de um cliente:

```json
{
  "clientId": "abc123",
  "budgetMode": "both",
  "tokenLimit": 2000000,
  "brlLimit": 1000.00,
  "budgetPeriod": "monthly",
  "pauseAtLimit": true
}
```

## Testes

### Cenário 1: Modo Tokens
```sql
-- Config
token_limit: 100000
budget_mode: 'tokens'

-- Uso
Chat: 50k tokens, R$ 25
TTS: 0 tokens, R$ 30
Vision: 0 tokens, R$ 20

-- Resultado:
current_tokens: 50000 (50%)
current_brl: 75.00 (IGNORED)
Status: NORMAL ✅
```

### Cenário 2: Modo BRL
```sql
-- Config
brl_limit: 100.00
budget_mode: 'brl'

-- Uso
Chat: 80k tokens, R$ 40
TTS: 0 tokens, R$ 35
Vision: 0 tokens, R$ 30

-- Resultado:
current_tokens: 80000 (IGNORED)
current_brl: 105.00 (105%)
Status: PAUSED 🔴
pause_reason: 'brl_limit'
```

### Cenário 3: Modo Híbrido
```sql
-- Config
token_limit: 100000
brl_limit: 100.00
budget_mode: 'both'

-- Uso
Chat: 95k tokens, R$ 48

-- Resultado:
current_tokens: 95000 (95%)  ⚠️ Crítico
current_brl: 48.00 (48%)     ✅ OK
Status: CRITICAL (não pausado ainda)

-- Próximo uso
Chat: 10k tokens, R$ 5

-- Resultado:
current_tokens: 105000 (105%) 🔴 LIMITE!
current_brl: 53.00 (53%)      ✅ OK
Status: PAUSED
pause_reason: 'token_limit'
```

## Vantagens do Sistema Modular

1. ✅ **Flexibilidade total**: Admin escolhe o modo ideal
2. ✅ **Fácil mudança**: Troca de modo sem perder dados
3. ✅ **Dupla proteção**: Modo híbrido previne surpresas
4. ✅ **Tracking preciso**: Usa preços reais da tabela registry
5. ✅ **Consolidado**: TODAS as APIs rastreadas (Gateway + TTS + Whisper + Vision)
6. ✅ **Auto-pause**: Protege contra estouro de budget
7. ✅ **Alertas**: 80%, 90%, 100%
8. ✅ **Reset automático**: Diário/semanal/mensal via cron
