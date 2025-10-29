# Guia de Configuração de Preços

## Visão Geral

O sistema de configuração de preços permite que você customize os valores cobrados por cada modelo de IA, permitindo um controle preciso dos custos exibidos no dashboard de analytics.

## Como Funciona

### 1. Tabela de Configuração (`pricing_config`)

A tabela `pricing_config` armazena preços personalizados por:
- **Cliente** (multi-tenant)
- **Provider** (openai, groq, whisper)
- **Modelo** (gpt-4, gpt-3.5-turbo, llama-3.3-70b, etc.)

### 2. Preços Padrão

Ao rodar a migration `012_pricing_config.sql`, os seguintes preços padrão são inseridos:

| Provider | Modelo | Prompt ($/1K) | Completion ($/1K) | Unidade |
|----------|--------|---------------|-------------------|---------|
| OpenAI | gpt-4 | $0.03 | $0.06 | per_1k_tokens |
| OpenAI | gpt-4-turbo | $0.01 | $0.03 | per_1k_tokens |
| OpenAI | gpt-4o | $0.005 | $0.015 | per_1k_tokens |
| OpenAI | gpt-3.5-turbo | $0.0015 | $0.002 | per_1k_tokens |
| Groq | llama-3.1-70b-versatile | $0.00 | $0.00 | per_1k_tokens |
| Groq | llama-3.3-70b-versatile | $0.00 | $0.00 | per_1k_tokens |
| Whisper | whisper-1 | $0.006 | $0.00 | per_minute |

### 3. Cálculo Dinâmico de Custos

A função `calculateCost` em `src/lib/usageTracking.ts`:
1. Busca preços na tabela `pricing_config`
2. Se não encontrar, usa preços padrão (hardcoded)
3. Calcula custo baseado na unidade (per_1k_tokens ou per_minute)

## Como Usar no Dashboard

### Passo 1: Executar Migration

No Supabase SQL Editor, execute:

```sql
-- Execute o arquivo migrations/012_pricing_config.sql
```

Isso criará:
- Tabela `pricing_config`
- Funções helper (get_model_pricing, upsert_pricing_config)
- Políticas RLS
- Preços padrão para todos os clientes

### Passo 2: Acessar Configuração de Preços

1. Navegue até `/dashboard/analytics`
2. Clique no botão **"Configurar Preços"** (ícone de engrenagem) no canto superior direito
3. Uma modal abrirá mostrando todos os modelos configurados

### Passo 3: Editar Preços

Na tabela de configuração:

1. **Editar**: Clique em "Editar" na linha do modelo que deseja alterar
2. **Modificar valores**:
   - Digite o novo preço para **Prompt** ($/1K tokens)
   - Digite o novo preço para **Completion** ($/1K tokens)
3. **Salvar**: Clique em "Salvar" para confirmar
4. **Cancelar**: Clique em "Cancelar" para descartar alterações

### Passo 4: Resetar para Padrão

Para voltar aos preços padrão:
1. Clique em "Resetar" na linha do modelo
2. O preço padrão será restaurado

## Exemplo de Uso

### Cenário: OpenAI aumentou o preço do GPT-4

**Antes**:
- GPT-4 Prompt: $0.03/1K
- GPT-4 Completion: $0.06/1K

**Novo Preço da OpenAI**:
- GPT-4 Prompt: $0.04/1K
- GPT-4 Completion: $0.08/1K

**Passos**:
1. Acesse `/dashboard/analytics`
2. Clique em "Configurar Preços"
3. Encontre a linha "OpenAI - gpt-4"
4. Clique em "Editar"
5. Altere:
   - Prompt: `0.04000`
   - Completion: `0.08000`
6. Clique em "Salvar"

**Resultado**: Todos os custos calculados a partir desse momento usarão os novos preços.

## API Endpoints

### GET `/api/pricing-config`

Busca todas as configurações de preço do cliente autenticado.

**Response**:
```json
{
  "pricingConfigs": [
    {
      "id": "uuid",
      "client_id": "uuid",
      "provider": "openai",
      "model": "gpt-4",
      "prompt_price": 0.03,
      "completion_price": 0.06,
      "unit": "per_1k_tokens",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST `/api/pricing-config`

Atualiza ou cria uma configuração de preço.

**Request Body**:
```json
{
  "provider": "openai",
  "model": "gpt-4",
  "prompt_price": 0.04,
  "completion_price": 0.08,
  "unit": "per_1k_tokens"
}
```

**Response**:
```json
{
  "message": "Configuração salva com sucesso",
  "config": { ... }
}
```

### DELETE `/api/pricing-config`

Remove uma configuração (volta para preço padrão).

**Request Body**:
```json
{
  "provider": "openai",
  "model": "gpt-4"
}
```

**Response**:
```json
{
  "message": "Configuração resetada para padrão"
}
```

## Funções do Banco de Dados

### `get_model_pricing(client_id, provider, model)`

Busca preço de um modelo específico.

```sql
SELECT * FROM get_model_pricing(
  'client-uuid',
  'openai',
  'gpt-4'
);
```

**Retorna**:
- `prompt_price`
- `completion_price`
- `unit`

### `upsert_pricing_config(client_id, provider, model, prompt_price, completion_price, unit)`

Insere ou atualiza uma configuração de preço.

```sql
SELECT * FROM upsert_pricing_config(
  'client-uuid',
  'openai',
  'gpt-4',
  0.04,
  0.08,
  'per_1k_tokens'
);
```

## Comportamento de Fallback

Se a busca no banco falhar:
1. Sistema usa `getDefaultPricing()` com preços hardcoded
2. Nenhum erro é lançado (graceful degradation)
3. Log de warning é registrado no console

## Estrutura de Arquivos

```
migrations/
  └── 012_pricing_config.sql          # Criação da tabela

src/
  ├── app/api/pricing-config/
  │   └── route.ts                    # API endpoints (GET, POST, DELETE)
  ├── components/
  │   ├── AnalyticsClient.tsx         # Dashboard analytics (botão de config)
  │   └── PricingConfigModal.tsx      # Modal de configuração
  ├── lib/
  │   └── usageTracking.ts            # Cálculo de custos dinâmico
  └── docs/
      └── PRICING_CONFIG_GUIDE.md     # Este arquivo
```

## Segurança (RLS)

A tabela `pricing_config` possui Row Level Security (RLS) habilitado:

- **SELECT**: Usuários só veem configurações do próprio cliente
- **INSERT**: Usuários só podem criar configurações para seu cliente
- **UPDATE**: Usuários só podem atualizar configurações do próprio cliente
- **DELETE**: Usuários só podem deletar configurações do próprio cliente

## Troubleshooting

### Problema: Modal não abre

**Solução**: Verifique se a migration 012 foi executada:
```sql
SELECT COUNT(*) FROM pricing_config;
```

### Problema: Preços não estão sendo aplicados

**Solução**:
1. Verifique se o `client_id` está correto
2. Confirme que o `provider` e `model` batem exatamente com o código
3. Veja logs do console para erros de banco de dados

### Problema: Erro ao salvar configuração

**Solução**:
1. Verifique autenticação (deve estar logado)
2. Confirme que o usuário tem `client_id` na tabela `users`
3. Veja logs da API em `/api/pricing-config`

## Atualizações Futuras

Melhorias planejadas:
- [ ] Histórico de alterações de preços
- [ ] Alertas quando preços da API mudam
- [ ] Import/Export de configurações
- [ ] Preços por região geográfica
- [ ] Suporte a descontos em volume

## Suporte

Para problemas ou dúvidas:
1. Verifique este guia
2. Consulte logs do console do navegador
3. Verifique logs da API no servidor
4. Revise a migration para estrutura correta da tabela
