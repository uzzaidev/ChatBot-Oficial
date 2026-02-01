# 🔒 Páginas Administrativas Ocultas

> **IMPORTANTE**: Estas páginas foram removidas da navegação sidebar para simplificar a interface do usuário final.
> Apenas administradores devem acessar estas URLs diretamente.

## URLs de Acesso Direto

| Página | URL | Descrição |
|--------|-----|-----------|
| **Budget Plans** | `/dashboard/admin/budget-plans` | Gerenciamento de planos de orçamento e custos |
| **AI Gateway** | `/dashboard/ai-gateway` | Monitor de cache e requisições AI (OpenAI/Groq) |
| **Arquitetura do Fluxo** | `/dashboard/flow-architecture` | Visualização da arquitetura de fluxos do bot |
| **Backend Monitor** | `/dashboard/backend` | Logs de execução e monitoramento do backend |

---

## Estrutura de Configurações

### Centralização de Configurações (Agentes vs Settings)

| Configuração | Localização | Tabela DB | Escopo |
|--------------|-------------|-----------|--------|
| **Timing (batching, delays)** | Agentes IA | `agents` | Por agente |
| **Comportamento (tone, style)** | Agentes IA | `agents` | Por agente |
| **Modelo IA (provider, model)** | Agentes IA | `agents` | Por agente |
| **TTS (voice, speed)** | Settings → TTS | `clients` | Global (cliente) |
| **Bot Configs (prompts, rules)** | Settings → Bot | `bot_configurations` | Global (cliente) |

### Por que TTS está em Settings?

O TTS é configuração de **infraestrutura** (qual provider, qual voz usar), não comportamento do agente.
- `tts_enabled`: Master switch global
- `tts_provider`: OpenAI ou ElevenLabs
- `tts_model`: Modelo de geração
- `tts_voice`: Voz selecionada
- `tts_speed`: Velocidade da fala

### Por que Bot Configurations está em Settings?

São configurações **globais de processamento**, não específicas de agente:
- Prompts de classificador de intenção
- Regras de comportamento do sistema
- Thresholds numéricos (RAG similarity, etc)
- Configuração de personalidade base

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

- **2026-01-31**: Removidas do sidebar (PR de limpeza de UI)
- Páginas continuam funcionais via URL direta
