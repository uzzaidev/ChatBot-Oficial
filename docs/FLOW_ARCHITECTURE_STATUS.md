# 🎛️ Status da Arquitetura de Fluxo - Flow Architecture Manager

## ⚠️ Status Atual: **EM DESENVOLVIMENTO / TESTE**

Este documento descreve o status atual do Flow Architecture Manager e sua integração com o chatflow em produção.

---

## 📊 Status da Implementação

### ✅ Funcionalidades Implementadas

1. **Visualização Completa do Fluxo**
   - ✅ Diagrama Mermaid interativo com 14 nós
   - ✅ Categorização por cores (preprocessing, analysis, auxiliary, generation, output)
   - ✅ Exibição de todas as conexões e dependências

2. **Interface de Configuração**
   - ✅ Clique em nós para abrir configurações
   - ✅ Renderização dinâmica de todos os campos de configuração
   - ✅ Suporte a diferentes tipos de dados (string, number, boolean, arrays, objects)
   - ✅ Seleção de modelos (Groq/OpenAI)
   - ✅ Configuração de temperatura, max tokens, prompts

3. **Ativar/Desativar Nós**
   - ✅ Toggle para habilitar/desabilitar nós
   - ✅ Feedback visual imediato (nós desabilitados aparecem em cinza tracejado)
   - ✅ Rotas de bypass automáticas (linhas pontilhadas amarelas)
   - ✅ Persistência no banco de dados (tenant-specific)

4. **Persistência de Dados**
   - ✅ Salva configurações em `bot_configurations` table
   - ✅ Isolamento por tenant (`client_id`)
   - ✅ Carrega estados salvos ao abrir a página

5. **Autenticação e Segurança**
   - ✅ Autenticação via cookies
   - ✅ API routes protegidas
   - ✅ Configurações específicas por cliente

---

## ⚠️ Status de Integração com Chatflow

### 🔴 **IMPORTANTE: AINDA NÃO ESTÁ ATIVO NO CHATFLOW REAL**

O Flow Architecture Manager é atualmente uma **interface de visualização e configuração**, mas as alterações feitas NÃO afetam o chatflow em produção ainda.

#### Por que?

1. **Chatflow atual usa n8n workflow (`IA.json`)**
   - O processamento real de mensagens está no n8n
   - O n8n não lê as configurações de `bot_configurations` dinamicamente
   - O workflow n8n está configurado estaticamente

2. **Falta de Integração**
   - As configurações salvas no banco não são consumidas pelo n8n
   - Os nós habilitados/desabilitados não afetam o fluxo do n8n
   - É necessário migrar a lógica do n8n para usar as configurações do banco

---

## 🎯 O Que Funciona Agora

### ✅ Funcionalidades Ativas

| Funcionalidade | Status | Descrição |
|----------------|--------|-----------|
| Visualização do fluxo | ✅ Ativo | Diagrama mostra a arquitetura completa |
| Edição de configurações | ✅ Ativo | Salva no banco `bot_configurations` |
| Enable/Disable nós | ✅ Ativo | Salva estado no banco |
| Bypass routes | ✅ Ativo | Mostra rotas alternativas |
| Multi-tenant | ✅ Ativo | Cada cliente tem suas configs |
| Persistência | ✅ Ativo | Configs salvam e carregam do banco |

### 🔴 Funcionalidades NÃO Ativas (Ainda)

| Funcionalidade | Status | O Que Falta |
|----------------|--------|-------------|
| Aplicar configs no chatflow | 🔴 Inativo | n8n precisa ler do banco |
| Habilitar/desabilitar nós no flow | 🔴 Inativo | n8n não verifica estado |
| Usar modelo selecionado | 🔴 Inativo | n8n usa config estática |
| Aplicar prompts editados | 🔴 Inativo | n8n usa prompts hardcoded |

---

## 🚀 Próximos Passos para Ativação

Para tornar o Flow Architecture Manager funcional no chatflow real, é necessário:

### Fase 1: Migração do n8n para Next.js

1. **Criar API routes para processamento de mensagens**
   - Substituir webhook do n8n por `/api/chat/process`
   - Ler configurações de `bot_configurations`
   - Implementar lógica de cada nó em TypeScript

2. **Implementar lógica de cada nó**
   - Criar handlers para cada tipo de nó
   - Verificar se nó está habilitado antes de executar
   - Usar configurações do banco (prompts, temperature, etc.)

3. **Implementar sistema de bypass**
   - Pular nós desabilitados
   - Usar rotas alternativas quando disponíveis

### Fase 2: Integração com LLM

1. **Configurar providers dinâmicos**
   - Ler `primary_model_provider` do banco
   - Usar modelo configurado (groq_model ou openai_model)
   - Aplicar temperature e max_tokens configurados

2. **Aplicar prompts dinâmicos**
   - Ler `system_prompt` do banco
   - Usar prompt específico de cada nó
   - Permitir override por tenant

### Fase 3: Migração Gradual

1. **Executar ambos em paralelo**
   - Manter n8n como fallback
   - Testar novo sistema com subset de usuários
   - Comparar resultados

2. **Desativar n8n gradualmente**
   - Migrar clientes um por vez
   - Monitorar erros e performance
   - Rollback se necessário

---

## 📝 Como Usar Agora

### Para Visualizar

1. Acesse `/dashboard/flow-architecture`
2. Visualize o fluxo completo do chatbot
3. Entenda como os nós se conectam

### Para Configurar (Teste)

1. Clique em um nó configurável (com ⚙️)
2. Edite as configurações desejadas
3. Salve (persiste no banco)
4. **NOTA**: As alterações são salvas mas NÃO afetam o chatflow ainda

### Para Testar Bypass Routes

1. Desabilite um nó (ex: batch_messages)
2. Observe as rotas pontilhadas amarelas
3. Veja como o fluxo se adapta visualmente

---

## 🔧 Configurações Disponíveis

### Nó: Generate AI Response

Configurações do modelo principal:

- **primary_model_provider**: groq ou openai
- **groq_model**: Modelo Groq (ex: llama-3.3-70b-versatile)
- **openai_model**: Modelo OpenAI (ex: gpt-4o)
- **temperature**: 0.0 a 2.0 (criatividade)
- **max_tokens**: Número máximo de tokens na resposta
- **system_prompt**: Prompt do sistema (personalidade do bot)
- **formatter_prompt**: Prompt para formatação de resposta

### Outros Nós Configuráveis

- **batch_messages**: batching:delay_seconds
- **get_chat_history**: chat_history:max_messages
- **get_rag_context**: rag:enabled
- **check_continuity**: continuity:new_conversation_threshold_hours
- **classify_intent**: intent_classifier:use_llm
- **detect_repetition**: repetition_detector:similarity_threshold
- **process_media**: media_processing:config

---

## ❓ Perguntas Frequentes

### As configurações que eu salvo funcionam?

**Resposta**: As configurações são salvas no banco de dados corretamente e são específicas por tenant. Porém, o chatflow atual (n8n) NÃO as lê ainda. É necessário migrar a lógica para Next.js.

### Quando vai funcionar para real?

**Resposta**: Após a migração do n8n para Next.js (Fases 1-3 acima). Isso requer desenvolvimento adicional.

### Posso usar para documentação?

**Resposta**: Sim! O diagrama é uma excelente ferramenta para:
- Entender a arquitetura do chatbot
- Documentar o fluxo para novos desenvolvedores
- Planejar melhorias e otimizações
- Visualizar dependências entre nós

### E se eu desabilitar um nó crítico?

**Resposta**: Atualmente, não afeta nada em produção. Quando integrado, o sistema usará rotas de bypass ou pulará o nó conforme configurado.

---

## 🎯 Conclusão

O Flow Architecture Manager é uma **ferramenta de visualização e planejamento** robusta e funcional, com:

- ✅ Interface completa implementada
- ✅ Persistência de dados funcionando
- ✅ Multi-tenant operacional
- ✅ Visualização de bypass routes
- ✅ Configuração de modelos LLM

Mas ainda é necessário **integrar com o chatflow real** para que as configurações afetem o comportamento do bot em produção.

**Prazo estimado para integração completa**: 2-4 sprints (dependendo da complexidade da migração do n8n)

---

**Última Atualização**: 14 de Novembro de 2025  
**Status**: Em Desenvolvimento / Teste  
**Prioridade**: Alta (requer migração para ativação)
