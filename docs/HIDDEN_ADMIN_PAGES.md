# 🔒 Páginas Administrativas Ocultas

> **IMPORTANTE**: Estas páginas foram removidas da navegação sidebar para simplificar a interface do usuário final.
> Apenas administradores devem acessar estas URLs diretamente.

## URLs de Acesso Direto

| Página                   | URL                             | Descrição                                       |
| ------------------------ | ------------------------------- | ----------------------------------------------- |
| **Budget Plans**         | `/dashboard/admin/budget-plans` | Gerenciamento de planos de orçamento e custos   |
| **AI Gateway**           | `/dashboard/ai-gateway`         | Monitor de cache e requisições AI (OpenAI/Groq) |
| **Arquitetura do Fluxo** | `/dashboard/flow-architecture`  | Visualização da arquitetura de fluxos do bot    |
| **Backend Monitor**      | `/dashboard/backend`            | Logs de execução e monitoramento do backend     |

---

## ✅ Centralização de Configurações nos Agentes IA

A partir de 2026-01-31, todas as configurações de comportamento do bot foram centralizadas na página **Agentes IA** (`/dashboard/agents`).

### O que foi migrado:

| Antes (Settings/Bot) | Agora (Agentes IA)                         |
| -------------------- | ------------------------------------------ |
| Batching delay       | `batching_delay_seconds` por agente        |
| Max chat history     | `max_chat_history` por agente              |
| Message delay        | `message_delay_ms` por agente              |
| Message split        | `message_split_enabled` por agente         |
| Enable tools         | `enable_tools` por agente                  |
| Enable RAG           | `enable_rag` por agente                    |
| Model/Provider       | `model_provider` + `model_name` por agente |
| Temperature          | `temperature` por agente                   |
| Max tokens           | `max_tokens` por agente                    |

### Como funciona:

1. Quando um agente é ativado (`is_active = true`), suas configurações são usadas pelo backend
2. `getClientConfig()` agora mescla automaticamente as configurações do agente ativo
3. Se nenhum agente estiver ativo, usa os defaults da tabela `clients.settings`

### Páginas removidas:

- ~~`/dashboard/settings/bot`~~ - Substituída por Agentes IA

---

## Estrutura de Configurações Atual

| Configuração                    | Localização    | Tabela DB | Escopo           |
| ------------------------------- | -------------- | --------- | ---------------- |
| **Timing (batching, delays)**   | Agentes IA     | `agents`  | Por agente       |
| **Comportamento (tone, style)** | Agentes IA     | `agents`  | Por agente       |
| **Modelo IA (provider, model)** | Agentes IA     | `agents`  | Por agente       |
| **Prompts compilados**          | Agentes IA     | `agents`  | Por agente       |
| **TTS (voice, speed)**          | Settings → TTS | `clients` | Global (cliente) |

### Por que TTS ainda está em Settings?

O TTS é configuração de **infraestrutura** (qual provider, qual voz usar), não comportamento do agente.

- `tts_enabled`: Master switch global
- `tts_provider`: OpenAI ou ElevenLabs
- `tts_model`: Modelo de geração
- `tts_voice`: Voz selecionada
- `tts_speed`: Velocidade da fala

No futuro, pode ser movido para agente se necessário vozes diferentes por agente.

---

## Uso Recomendado

### Para Administradores

1. **Budget Plans** - Use para:

   - Configurar limites de gastos por cliente
   - Definir alertas de orçamento
   - Visualizar consumo de API

2. **AI Gateway** - Use para:

   - Monitorar cache hits/misses
   - Verificar latência das requisições AI
   - Debug de problemas com providers (OpenAI/Groq)

3. **Arquitetura do Fluxo** - Use para:

   - Entender o fluxo de processamento de mensagens
   - Debug de problemas no pipeline
   - Documentação técnica

4. **Backend Monitor** - Use para:
   - Visualizar logs de execução em tempo real
   - Debug de erros em conversas específicas
   - Monitorar performance do sistema

## Segurança

Estas páginas requerem autenticação e verificam permissões do usuário.
No futuro, implementar verificação de role `admin` para acesso.

## Histórico

- **2026-01-31**:
  - Removidas páginas admin do sidebar
  - Centralização de configs em Agentes IA
  - Removida página `/settings/bot` (substituída por Agentes IA)
  - Backend agora usa configurações do agente ativo via `getActiveAgent()`
- Páginas continuam funcionais via URL direta
