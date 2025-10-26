# 📊 Debug Dashboard - Implementação Completa

## ✅ O que Foi Criado

### 1. Sistema de Logging (`src/lib/logger.ts`)
- Logger estruturado com níveis de execução
- Wrapper `executeNode()` para logging automático
- Rastreamento de input/output/erros
- Medição de duração de execução
- Suporte a metadata customizado

### 2. Banco de Dados (`migrations/002_execution_logs.sql`)
- Tabela `execution_logs` com schema completo
- Índices otimizados para performance
- Row Level Security configurado
- Suporte a realtime subscriptions

### 3. API de Debug
- `GET /api/debug/executions` - Lista execuções
- `GET /api/debug/executions?execution_id=<id>` - Logs de execução específica
- `POST /api/test/send-message` - Enviar mensagens de teste

### 4. Dashboard Visual (`src/app/dashboard/debug/page.tsx`)
- Lista de execuções recentes
- Timeline visual de nodes (estilo n8n)
- Visualização de input/output/erros
- Painel de teste integrado
- Atualização em tempo real (opcional)

### 5. Integração com Webhook (`src/app/api/webhook/route.ts`)
- Logger automático no webhook
- Rastreamento de todas as mensagens recebidas
- Execução assíncrona com logging

### 6. Documentação
- `DEBUG-DASHBOARD.md` - Guia completo de uso
- `QUICK-DEBUG.md` - Quick start de 3 passos
- `scripts/test-debug.js` - Script de teste automatizado

---

## 🎯 Como Funciona

### Fluxo de Uma Mensagem

```
WhatsApp
   ↓
Webhook (/api/webhook)
   ↓
Logger.startExecution() → cria execution_id
   ↓
processChatbotMessage()
   ├─ filterStatusUpdates    → logged
   ├─ parseMessage           → logged
   ├─ checkOrCreateCustomer  → logged
   ├─ normalizeMessage       → logged
   ├─ pushToRedis            → logged
   ├─ batchMessages          → logged
   ├─ getChatHistory         → logged
   ├─ getRAGContext          → logged
   ├─ generateAIResponse     → logged
   ├─ formatResponse         → logged
   └─ sendWhatsAppMessage    → logged
   ↓
Logger.finishExecution()
   ↓
Salvo no Supabase (execution_logs)
   ↓
Dashboard atualiza em tempo real
```

### Estrutura de Dados

```typescript
ExecutionLog {
  id: 1234,
  execution_id: "abc-123-def-456",
  node_name: "generateAIResponse",
  input_data: { message: "Olá", chatHistory: [...] },
  output_data: { content: "Oi! Como posso ajudar?", toolCalls: null },
  error: null,
  status: "success",
  duration_ms: 1850,
  timestamp: "2025-10-26T14:30:45.123Z",
  metadata: { from: "5511999999999", source: "whatsapp-webhook" }
}
```

---

## 🚀 Como Usar

### Setup Inicial (UMA VEZ)

```bash
# 1. Rodar migration no Supabase
# Copiar migrations/002_execution_logs.sql e executar no SQL Editor

# 2. (Opcional) Habilitar Realtime
# Supabase → Database → Replication → execution_logs (toggle ON)
```

### Desenvolvimento (DIÁRIO)

```bash
# 1. Iniciar dev server
npm run dev

# 2. Abrir dashboard
open http://localhost:3000/dashboard/debug

# 3. Enviar mensagem de teste
# Usar interface web OU:
node scripts/test-debug.js
```

### Produção

O sistema funciona automaticamente:
- Toda mensagem do WhatsApp é logged
- Acesse `/dashboard/debug` para ver execuções
- Não precisa fazer nada manualmente

---

## 📊 Exemplos Práticos

### Exemplo 1: Debugar Erro

**Problema**: Bot não responde

**Solução**:
1. Acessar `/dashboard/debug`
2. Procurar execução com badge vermelho (erro)
3. Clicar na execução
4. Ver qual node falhou
5. Ler o erro detalhado
6. Corrigir o código

### Exemplo 2: Otimizar Performance

**Problema**: Bot demora muito para responder

**Solução**:
1. Acessar `/dashboard/debug`
2. Clicar em uma execução lenta
3. Olhar `duration_ms` de cada node
4. Identificar qual node está lento
5. Otimizar aquele node específico

**Exemplo real**:
```
⚫ generateAIResponse (5230ms) ← MUITO LENTO!
```
→ Prompt muito grande? Reduzir contexto.

### Exemplo 3: Validar Dados entre Nodes

**Problema**: Node B recebe dados errados

**Solução**:
1. Acessar execução com problema
2. Ver `output_data` do Node A
3. Ver `input_data` do Node B
4. Comparar se estão iguais
5. Se diferentes, há problema na passagem de dados

---

## 🔧 Integrando em Novos Nodes

### Forma Automática (Recomendada)

```typescript
import { getLogger } from '@/lib/logger'

export const meuNode = async (input: any) => {
  const logger = getLogger()
  
  return await logger.executeNode(
    'meuNode',
    async () => {
      // Sua lógica aqui
      const result = await processarAlgo(input)
      return result
    },
    input
  )
}
```

### Forma Manual (Mais Controle)

```typescript
import { createExecutionLogger } from '@/lib/logger'

export const meuNode = async (input: any) => {
  const logger = createExecutionLogger()
  const startTime = Date.now()
  
  await logger.logNodeStart('meuNode', input)
  
  try {
    const result = await processarAlgo(input)
    await logger.logNodeSuccess('meuNode', result, startTime)
    return result
  } catch (error) {
    await logger.logNodeError('meuNode', error)
    throw error
  }
}
```

---

## 📈 Estatísticas do Projeto

### Arquivos Criados

```
src/lib/logger.ts                          - 146 linhas
src/lib/types.ts                           - +14 linhas (tipos)
migrations/002_execution_logs.sql          - 52 linhas
src/app/api/debug/executions/route.ts      - 70 linhas
src/app/api/test/send-message/route.ts     - 97 linhas
src/app/dashboard/debug/page.tsx           - 330 linhas
src/app/api/webhook/route.ts               - +18 linhas (modificado)
scripts/test-debug.js                      - 72 linhas
DEBUG-DASHBOARD.md                         - 450 linhas
QUICK-DEBUG.md                             - 120 linhas
───────────────────────────────────────────────────────
Total: ~1,369 linhas de código + documentação
```

### Features Implementadas

- ✅ Sistema de logging estruturado
- ✅ Banco de dados com migration
- ✅ API de debug
- ✅ Dashboard visual interativo
- ✅ Endpoint de teste
- ✅ Script automatizado de teste
- ✅ Integração com webhook
- ✅ Documentação completa
- ✅ Suporte a realtime (opcional)
- ✅ TypeScript com tipos corretos

---

## 🎓 Conceitos Aprendidos

### 1. Observability (Observabilidade)

Implementamos um sistema de observabilidade completo:
- **Logs**: Rastreamento de execução
- **Métricas**: Duração de cada node
- **Tracing**: Visualização do fluxo completo

### 2. Execution Context (Contexto de Execução)

Cada execução tem um `execution_id` único que agrupa todos os logs relacionados.
Isso permite rastrear uma mensagem desde o webhook até a resposta final.

### 3. Instrumentation (Instrumentação)

Usamos wrappers (`executeNode()`) para adicionar logging sem modificar a lógica dos nodes.
Princípio: **Separation of Concerns** (separação de responsabilidades).

### 4. Developer Experience (DX)

Dashboard visual torna debug MUITO mais fácil:
- Não precisa ler logs no terminal
- Visualização clara do fluxo
- Identificação rápida de problemas

---

## 🔮 Melhorias Futuras (Opcional)

### Fase 1: Filtros e Busca
- [ ] Filtrar por status (success/error)
- [ ] Filtrar por telefone
- [ ] Busca por execution_id
- [ ] Filtro por data/hora

### Fase 2: Estatísticas
- [ ] Tempo médio por node
- [ ] Taxa de erro por node
- [ ] Gráfico de execuções ao longo do tempo
- [ ] Top nodes mais lentos

### Fase 3: Alertas
- [ ] Email quando execução falha
- [ ] Slack notification
- [ ] Telegram bot de alertas

### Fase 4: Exportação
- [ ] Exportar logs em JSON
- [ ] Exportar logs em CSV
- [ ] Download de execução específica

### Fase 5: Integrações
- [ ] Sentry para error tracking
- [ ] DataDog para APM
- [ ] Grafana para dashboards

---

## 📝 Checklist de Uso

### Setup (Uma vez)
- [ ] Rodar migration `002_execution_logs.sql` no Supabase
- [ ] (Opcional) Habilitar Realtime no Supabase
- [ ] Verificar que `.env.local` tem credenciais corretas

### Desenvolvimento (Sempre)
- [ ] Abrir dashboard antes de testar: `/dashboard/debug`
- [ ] Enviar mensagem de teste
- [ ] Verificar que execução apareceu
- [ ] Analisar timeline de nodes
- [ ] Identificar gargalos ou erros

### Produção
- [ ] Monitorar dashboard periodicamente
- [ ] Investigar execuções com erro
- [ ] Otimizar nodes lentos
- [ ] Limpar logs antigos periodicamente (opcional)

---

## 🎉 Resultado Final

Você agora tem:

1. **Visibilidade completa** do fluxo de mensagens
2. **Debug visual** estilo n8n
3. **Testes sem WhatsApp** via endpoint de teste
4. **Rastreamento automático** de todas as execuções
5. **Identificação rápida** de erros e gargalos

**Similar a ter um n8n, mas integrado diretamente no seu código Next.js!**

---

## 📚 Arquivos de Referência

- **Código**: `src/lib/logger.ts` - Sistema de logging
- **Banco**: `migrations/002_execution_logs.sql` - Schema da tabela
- **Dashboard**: `src/app/dashboard/debug/page.tsx` - Interface visual
- **API**: `src/app/api/debug/executions/route.ts` - Endpoints
- **Teste**: `src/app/api/test/send-message/route.ts` - Simulador
- **Docs**: `DEBUG-DASHBOARD.md` - Guia completo
- **Quick Start**: `QUICK-DEBUG.md` - Início rápido

---

**Feito! Sistema de debug completo implementado.** 🚀
