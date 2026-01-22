# 📚 Índice de Documentação - ChatBot Oficial

**Última atualização:** 2024-12-17

---

## 🎯 Documentos Principais (Raiz do Projeto)

### **Configuração e Setup**
| Documento | Descrição | Status |
|-----------|-----------|--------|
| [README.md](README.md) | Overview do projeto, tech stack, setup inicial | ✅ Completo |
| [CLAUDE.md](CLAUDE.md) | Guia para Claude Code (instruções, patterns, FAQ) | ✅ Atualizado |
| [AGENTS.md](AGENTS.md) | Configuração de agentes e workflows | ✅ Completo |

### **AI Gateway & Tracking**
| Documento | Descrição | Status |
|-----------|-----------|--------|
| [FASE7_TRACKING_UNIFICADO.md](FASE7_TRACKING_UNIFICADO.md) | ⭐ **NOVO** - Implementação completa FASE 7 (Whisper + TTS) | ✅ Completo |
| [VALIDACAO_TRACKING_API.md](VALIDACAO_TRACKING_API.md) | Tabela de validação - O que passa pelo Gateway | ✅ Completo |
| [MAPEAMENTO_CHAMADAS_API.md](MAPEAMENTO_CHAMADAS_API.md) | Mapeamento completo de todas as chamadas de API | ✅ Completo |
| [AI_GATEWAY_CACHE_EXPLAINED.md](AI_GATEWAY_CACHE_EXPLAINED.md) | Explicação detalhada do cache (input vs response) | ✅ Completo |
| [CACHE_FIX_1024_TOKENS.md](CACHE_FIX_1024_TOKENS.md) | Fix do limite de 1024 tokens para prompt cache | ✅ Completo |

### **Histórico e Mudanças**
| Documento | Descrição | Status |
|-----------|-----------|--------|
| [CHANGELOG.md](CHANGELOG.md) | Histórico completo de mudanças no projeto | ✅ Atualizado |

---

## 📂 Documentação Detalhada (`docs/`)

### **Features - AI Gateway** (`docs/features/ai_gateway/`)

| Documento | Descrição | Relevância |
|-----------|-----------|------------|
| [AI_GATEWAY_QUICKSTART.md](docs/features/ai_gateway/AI_GATEWAY_QUICKSTART.md) | ⭐ Quick start - Setup em 5 minutos | 🔥 ESSENCIAL |
| [AI_GATEWAY.md](docs/features/ai_gateway/AI_GATEWAY.md) | Documentação técnica completa do Gateway | 🔥 ESSENCIAL |
| [BUDGET_SYSTEM.md](docs/features/ai_gateway/BUDGET_SYSTEM.md) | Sistema de budget e enforcement | 🔥 IMPORTANTE |
| [SETUP_GUIDE.md](docs/features/ai_gateway/SETUP_GUIDE.md) | Guia passo a passo de configuração | 📘 Útil |
| [TESTING_GUIDE.md](docs/features/ai_gateway/TESTING_GUIDE.md) | Como testar o Gateway | 📘 Útil |
| [PRODUCTION_PLAN.md](docs/features/ai_gateway/PRODUCTION_PLAN.md) | Plano de deploy para produção | 📘 Útil |
| [IMPLEMENTATION_STATUS.md](docs/features/ai_gateway/IMPLEMENTATION_STATUS.md) | Status de implementação por fase | 📊 Status |
| [COMPLETION_SUMMARY.md](docs/features/ai_gateway/COMPLETION_SUMMARY.md) | Resumo final de implementação | 📊 Status |
| [CHANGES_SUMMARY.md](docs/features/ai_gateway/CHANGES_SUMMARY.md) | Resumo de mudanças feitas | 📊 Status |
| [CHECKLIST.md](docs/features/ai_gateway/CHECKLIST.md) | Checklist de implementação | ✅ Checklist |

### **Bugfixes** (`docs/bugfix/`)

| Documento | Descrição | Data |
|-----------|-----------|------|
| [2025-12-15-ai-gateway-tools-tracking-analytics.md](docs/bugfix/2025-12-15-ai-gateway-tools-tracking-analytics.md) | Fix de tracking e analytics | 2025-12-15 |

### **Database** (`docs/tables/`)

| Documento | Descrição | Relevância |
|-----------|-----------|------------|
| [tabelas.md](docs/tables/tabelas.md) | ⚠️ **CRÍTICO** - Schema completo do banco | 🔥 CRÍTICO |

### **Setup & Architecture** (`docs/setup/`)

| Documento | Descrição |
|-----------|-----------|
| [ARCHITECTURE.md](docs/setup/ARCHITECTURE.md) | Arquitetura completa do sistema |

---

## 🎯 Guias Rápidos por Tarefa

### **Quero configurar o AI Gateway pela primeira vez**
1. [AI_GATEWAY_QUICKSTART.md](docs/features/ai_gateway/AI_GATEWAY_QUICKSTART.md) - Setup inicial
2. [SETUP_GUIDE.md](docs/features/ai_gateway/SETUP_GUIDE.md) - Passo a passo
3. [TESTING_GUIDE.md](docs/features/ai_gateway/TESTING_GUIDE.md) - Testar

### **Quero entender como funciona o tracking**
1. [VALIDACAO_TRACKING_API.md](VALIDACAO_TRACKING_API.md) - Tabela de validação
2. [FASE7_TRACKING_UNIFICADO.md](FASE7_TRACKING_UNIFICADO.md) - Implementação FASE 7
3. [MAPEAMENTO_CHAMADAS_API.md](MAPEAMENTO_CHAMADAS_API.md) - Todas as chamadas

### **Quero entender o cache**
1. [AI_GATEWAY_CACHE_EXPLAINED.md](AI_GATEWAY_CACHE_EXPLAINED.md) - Input vs Response cache
2. [CACHE_FIX_1024_TOKENS.md](CACHE_FIX_1024_TOKENS.md) - Limite de 1024 tokens

### **Quero modificar o banco de dados**
1. ⚠️ **SEMPRE ler primeiro:** [docs/tables/tabelas.md](docs/tables/tabelas.md)
2. Depois criar migration: `supabase migration new nome`

### **Quero implementar budget limits**
1. [BUDGET_SYSTEM.md](docs/features/ai_gateway/BUDGET_SYSTEM.md) - Como funciona
2. [FASE7_TRACKING_UNIFICADO.md](FASE7_TRACKING_UNIFICADO.md) - Validação

### **Quero contribuir com o projeto**
1. [CLAUDE.md](CLAUDE.md) - Patterns e guidelines
2. [CHANGELOG.md](CHANGELOG.md) - Histórico de mudanças

---

## 📊 Tabelas de Referência Rápida

### **APIs e Tracking**

Consulte: [VALIDACAO_TRACKING_API.md](VALIDACAO_TRACKING_API.md)

```
| API        | Gateway? | Tracking            | conversationId |
|------------|----------|---------------------|----------------|
| Chat       | ✅ YES   | gateway_usage_logs  | ✅ YES         |
| Vision     | ✅ YES   | gateway_usage_logs  | ✅ YES         |
| PDF        | ✅ YES   | gateway_usage_logs  | ✅ YES         |
| Embeddings | ⚠️ DIRECT| gateway_usage_logs  | ✅ YES         |
| Whisper    | ❌ NO    | gateway_usage_logs  | ⚠️ OPTIONAL    |
| TTS        | ❌ NO    | gateway_usage_logs  | ⚠️ OPTIONAL    |
```

### **Pricing por Provider**

Consulte: [FASE7_TRACKING_UNIFICADO.md](FASE7_TRACKING_UNIFICADO.md#pricing)

```
| Provider    | Service  | Pricing                |
|-------------|----------|------------------------|
| OpenAI      | Whisper  | $0.006 / minute        |
| OpenAI      | TTS      | $7.50-$15 / 1M chars   |
| ElevenLabs  | TTS      | $0.30 / 1K chars       |
| Groq        | Chat     | Free (rate limited)    |
| OpenAI      | Chat     | By token (see models)  |
```

---

## 🔍 Como Encontrar Informação

### **Por Tópico:**

- **Gateway Setup** → [AI_GATEWAY_QUICKSTART.md](docs/features/ai_gateway/AI_GATEWAY_QUICKSTART.md)
- **Tracking** → [FASE7_TRACKING_UNIFICADO.md](FASE7_TRACKING_UNIFICADO.md)
- **Budget** → [BUDGET_SYSTEM.md](docs/features/ai_gateway/BUDGET_SYSTEM.md)
- **Cache** → [AI_GATEWAY_CACHE_EXPLAINED.md](AI_GATEWAY_CACHE_EXPLAINED.md)
- **Database** → [docs/tables/tabelas.md](docs/tables/tabelas.md)
- **Architecture** → [docs/setup/ARCHITECTURE.md](docs/setup/ARCHITECTURE.md)

### **Por Status de Implementação:**

- ✅ **Completo:** FASE 6, FASE 7, FASE 8, conversationId propagation
- ⏳ **Em Progresso:** Validação de tracking
- ⬜ **Pendente:** Email alerts, Cron job, Bloqueio ativo

---

## 📝 Convenções de Documentação

### **Emojis Usados:**
- ⭐ = Novo documento
- 🔥 = Essencial/Crítico
- ⚠️ = Importante/Cuidado
- ✅ = Completo/Feito
- ⏳ = Em progresso
- ⬜ = Pendente
- 📘 = Útil
- 📊 = Status/Metrics

### **Estrutura de Documentos:**
1. **Título** com emoji
2. **Data e Status**
3. **Resumo Executivo**
4. **Seções detalhadas**
5. **Tabelas de referência**
6. **Próximos passos**
7. **Checklist** (quando aplicável)

---

## 🚀 Última Sessão (2024-12-17)

### **O Que Foi Implementado:**

✅ **Legacy Removal:**
- groq.ts comentado (130 linhas)
- generateChatCompletionOpenAI() comentado (90 linhas)

✅ **FASE 7 - Tracking Unificado:**
- Whisper → gateway_usage_logs
- TTS (OpenAI + ElevenLabs) → gateway_usage_logs
- Cache hits também trackados

✅ **Dashboard de Validação:**
- `/dashboard/ai-gateway/validation` criado
- `/api/admin/validate-billing` criado
- Validações automáticas implementadas

### **Documentação Criada:**
- [FASE7_TRACKING_UNIFICADO.md](FASE7_TRACKING_UNIFICADO.md) - Completo
- [DOCS_INDEX.md](DOCS_INDEX.md) - Este arquivo

### **Próximos Passos:**
1. Testar todo o tracking
2. Validar custos com provider dashboards
3. Email alerts (FASE 2)
4. Cron job (FASE 3)
5. Ativar bloqueio (por último)

---

## 📞 Suporte

- **Issues:** https://github.com/seu-repo/issues
- **Claude Code:** https://claude.com/claude-code
- **Documentação Oficial:** Ver links acima

---

**Última atualização:** 2024-12-17 - FASE 7 Completa + Dashboard de Validação
