# Plano de Implementação – Melhorias Umåna Yōga
**Data:** 2026-04-15
**Origem:** Transcrição de reunião + análise de planilha Google Sheets (Gestão Casa Rio Branco 2026)
**Escopo:** Melhorias no agente/prompt + sistema global UzzApp (multi-tenant)

---

## ⚠️ Aviso para quem for implementar

Antes de começar qualquer item:
- Leia o CLAUDE.md do projeto para regras de banco, migrações e padrões de código
- Consulte `docs/tables/tabelas.md` antes de qualquer query ou migration
- TODA mudança de banco deve ser feita via `supabase migration new <nome>` — NUNCA diretamente no dashboard
- Esta plataforma é multi-tenant: qualquer mudança global afeta TODOS os clientes. Teste com client_id isolado antes de ativar em produção
- A planilha de referência para o workflow da Umåna está em: Google Sheets "Gestão Casa Rio Branco 2026" → aba "Agendamento de Aulas/Visitas 26"

---

## 1. Prompt / Agente (já resolvidos nesta sessão)

### Checklist
- [x] Acento correto: Yōga com macron (ō) — consistente em todo o prompt
- [x] Proibir ### em títulos nas mensagens ao usuário
- [x] Proibir ** (asterisco negrito) nas mensagens ao usuário
- [x] Usar "técnicas corporais" em vez de "posturas básicas"
- [x] Diferença visita (gratuita) vs aula experimental (tem custo)
- [x] Horários de atendimento/visitas: Seg-Qui 10h–13h e 15h–20h / Sex 15h–18h
- [x] Fluxo de coleta de dados pré-agendamento (nome já tem, número já tem, pedir: como conheceu, indicação, objetivo, e-mail, CPF)
- [ ] Verificar "Krazy" — termo mencionado na transcrição mas não identificado. **Confirmar com o cliente o que é esse termo/sistema antes de implementar.**

---

## 2. Calendário – Histórico de Eventos

### Problema
O bot não lembrava que já havia agendado um evento na conversa. Na próxima interação, poderia criar um evento duplicado.

### Causa provável
O `n8n_chat_histories` armazena mensagens de texto, mas eventos criados via tool call não deixam rastro legível no histórico que o bot consulta.

### Checklist
- [ ] Ao criar um evento via `criar_evento_agenda`, salvar uma mensagem de sistema no `n8n_chat_histories` com o formato:
  ```
  [SISTEMA] Evento agendado: {titulo} em {data_hora_inicio}. ID: {event_id}
  ```
- [ ] Adicionar instrução no prompt do agente: "Antes de criar um novo evento, verifique no histórico se já existe uma mensagem de sistema com '[SISTEMA] Evento agendado' para este contato."
- [ ] Testar o fluxo completo: criar evento → encerrar conversa → retornar → verificar se bot reconhece o evento existente

### Arquivo relevante
`src/flows/chatbotFlow.ts` — bloco de tool call `criar_evento_agenda` (linhas ~1294–1551)

---

## 3. Cancelamento de Evento – Verificação

### Problema
Cancelamento de evento foi implementado mas não foi validado end-to-end em produção.

### Checklist
- [ ] Testar via WhatsApp: pedir ao bot para cancelar um evento existente
- [ ] Verificar se `cancelar_evento_agenda` está recebendo `event_id` ou `titulo + data_inicio` corretamente
- [ ] Verificar nos logs do Google Calendar se o evento foi removido
- [ ] Verificar se o bot responde com confirmação de cancelamento
- [ ] Se falhar por falta de `event_id`: implementar busca por título + data como fallback

### Arquivo relevante
`src/flows/chatbotFlow.ts` — tool call `cancelar_evento_agenda`

---

## 4. Templates – PDF como Mídia

### Problema
Os templates atuais suportam apenas imagem no header. Clientes precisam enviar PDFs junto com templates.

### Contexto técnico
A Meta API v18 suporta `header.type = "document"` em templates de mídia. O sistema atual só implementa `image`.

### Checklist
- [ ] Verificar se o template aprovado pela Meta permite header tipo `document`
- [ ] No componente de criação de template (dashboard), adicionar opção "Documento (PDF)" além de "Imagem"
- [ ] Atualizar o payload de envio para aceitar `type: "document"` com `link` e `filename`
- [ ] Atualizar a migration/tabela de templates se necessário para suportar `media_type: "image" | "document" | "video"`
- [ ] Testar envio via WhatsApp com PDF real

### Arquivos relevantes
- Componente de templates no dashboard
- Rota de envio de templates (`/api/templates`)

---

## 5. Bug – 404 ao Editar Template Rascunho

### Problema
Ao abrir um template salvo como rascunho para edição, a página retorna 404.

### Hipóteses
- A rota de edição não trata `status = "draft"` — só encontra templates com status `"approved"` ou `"active"`
- O ID do rascunho não é persistido corretamente ao salvar

### Checklist
- [ ] Reproduzir: criar template → salvar como rascunho → tentar editar
- [ ] Verificar a rota `GET /api/templates/[id]` — confirmar que a query não filtra por status
- [ ] Verificar se o ID retornado ao salvar rascunho é o mesmo usado na URL de edição
- [ ] Corrigir a query para incluir todos os status ao buscar por ID
- [ ] Re-testar o fluxo completo de edição de rascunho

---

## 6. Bug – Accordion de Templates

### Problema
O componente accordion no dashboard de templates apresenta comportamento inesperado (não especificado — verificar com o cliente).

### Checklist
- [ ] Confirmar com o cliente qual é o comportamento exato do bug (expandir? colapsar? estado incorreto?)
- [ ] Identificar o componente accordion no dashboard de templates
- [ ] Verificar se o estado é local (useState) ou compartilhado — possível conflito entre itens
- [ ] Corrigir e testar com múltiplos templates abertos simultaneamente

---

## 7. Workflow de Agendamentos – Integração com Planilha/CRM

### Contexto
A Umåna usa uma planilha Google Sheets ("Agendamento de Aulas/Visitas 26") com as colunas:
`Mês | Dia | Responsável pelo agendamento | Nome do Prospect | Tipo de agendamento | Horário | Instrutor | Reservou vaga no Tecnofit? | Aviso no Slack? | Agendou mensagem?`

O objetivo é que, quando o bot confirmar uma visita ou aula experimental, esses dados sejam registrados automaticamente nesse workflow — sem intervenção manual.

### Opções de implementação (ver seção abaixo)

---

## Opções de CRM — Armazenamento Escalável de Dados do Lead

> Contexto: A UzzApp é uma plataforma SaaS multi-tenant. Qualquer solução de CRM deve funcionar para TODOS os clientes, não apenas para a Umåna. A Umåna tem campos específicos (Tecnofit, Slack, instrutor responsável) que outros clientes não terão.

---

### Opção A — JSONB `metadata` em `clientes_whatsapp` (mais simples)

**O que é:** Adicionar uma coluna `metadata JSONB` na tabela `clientes_whatsapp`. Cada cliente salva campos arbitrários como JSON nesse campo.

**Exemplo:**
```json
{
  "cpf": "123.456.789-00",
  "email": "joao@gmail.com",
  "como_conheceu": "Instagram",
  "indicado_por": "Maria Silva",
  "objetivo_yoga": "Reduzir estresse",
  "tecnofit_reservado": true,
  "slack_avisado": false
}
```

**Pros:**
- Implementação rápida (1 migration, ajuste na API)
- Sem schema adicional
- Funciona para qualquer cliente sem configuração prévia

**Contras:**
- Sem validação de tipos
- Campos não padronizados entre clientes (um chama de "cpf", outro de "CPF")
- Difícil de filtrar/indexar em queries complexas
- Sem UI de configuração — campos surgem "informalmente"

**Quando usar:** MVP rápido, cliente único ou poucos clientes com campos simples.

---

### Opção B — Tabela `contact_custom_fields` com definição por cliente (escalável)

**O que é:** Duas tabelas novas:
1. `crm_field_definitions` — define quais campos cada cliente usa (nome, tipo, obrigatório)
2. `crm_field_values` — armazena os valores preenchidos por contato

**Estrutura:**
```sql
-- Define os campos que o cliente quer coletar
CREATE TABLE crm_field_definitions (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  field_key TEXT NOT NULL,        -- ex: "cpf", "objetivo_yoga"
  field_label TEXT NOT NULL,      -- ex: "CPF", "Objetivo com o Yōga"
  field_type TEXT NOT NULL,       -- "text" | "boolean" | "date" | "select"
  is_required BOOLEAN DEFAULT false,
  collect_via_bot BOOLEAN DEFAULT true,  -- se o bot deve perguntar
  display_order INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Armazena os valores por contato
CREATE TABLE crm_field_values (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  contact_phone NUMERIC REFERENCES clientes_whatsapp(telefone),
  field_key TEXT NOT NULL,
  field_value TEXT,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'bot'  -- "bot" | "manual" | "import"
);
```

**Pros:**
- Cada cliente configura seus próprios campos via dashboard
- O bot consulta `crm_field_definitions` para saber o que coletar
- Dados estruturados, consultáveis, indexáveis
- Funciona para Umåna (cpf, objetivo, tecnofit) e para qualquer outro cliente

**Contras:**
- Implementação mais longa (2 migrations, API, UI no dashboard)
- Queries mais complexas (JOIN entre tabelas)

**Quando usar:** Solução definitiva escalável para o SaaS.

---

### Opção C — Google Sheets como destino via API (integração direta)

**O que é:** Quando o bot confirmar um agendamento, chamar a Google Sheets API para inserir uma linha na planilha do cliente.

**Pros:**
- A Umåna continua usando a planilha que já conhece
- Zero mudança no processo atual da equipe
- Implementação isolada para esse cliente

**Contras:**
- Não escalável — cada cliente teria sua própria planilha e configuração de OAuth
- Credenciais de service account por cliente (complexidade no Vault)
- Fragilidade: se a planilha for renomeada/movida, quebra
- Não serve para outros clientes sem muito trabalho adicional

**Quando usar:** Solução de curto prazo específica para Umåna, com intenção de migrar depois.

---

### Opção D — View dedicada no dashboard UzzApp (substituir planilha)

**O que é:** Criar uma página no dashboard da Umåna chamada "Agendamentos" que replica e substitui a planilha Google Sheets, com os dados vindos do próprio banco.

Colunas da view (baseadas na planilha):
`Mês | Dia | Responsável | Prospect | Tipo | Horário | Instrutor | Tecnofit | Slack | Mensagem agendada`

Dados populados automaticamente quando o bot confirma um agendamento.

**Pros:**
- Tudo dentro da plataforma — sem dependência externa
- Dados em tempo real, sem sincronização
- Escalável: cada cliente pode ter sua view de agendamentos
- Base para futura funcionalidade de CRM de outros clientes

**Contras:**
- Maior esforço de desenvolvimento (nova página, componentes, lógica)
- Requer que a equipe da Umåna mude o hábito de usar Google Sheets

**Quando usar:** Solução definitiva de médio prazo.

---

## Recomendação

Para a Umåna agora:
- **Fase 1 (rápido):** Opção A (JSONB metadata) para salvar CPF, email, como conheceu, objetivo — 1 migration, coleta imediata
- **Fase 2 (escalável):** Opção B (crm_field_definitions + crm_field_values) como estrutura definitiva do SaaS
- **Fase 3 (UX):** Opção D — view de agendamentos no dashboard substituindo a planilha

A Opção C (Google Sheets direto) pode ser usada como ponte temporária se a Umåna precisar da planilha funcionando antes das fases 1 e 2 estarem prontas.

---

## Ordem de Prioridade de Implementação

| # | Item | Impacto | Esforço | Prioridade |
|---|------|---------|---------|-----------|
| 1 | Salvar dados coletados no contato (Opção A — JSONB) | Alto | Baixo | URGENTE |
| 2 | Bug 404 ao editar template rascunho | Alto | Baixo | URGENTE |
| 3 | Verificar cancelamento de evento | Alto | Baixo | ALTA |
| 4 | Histórico de eventos no contexto do bot | Médio | Médio | ALTA |
| 5 | crm_field_definitions + crm_field_values (Opção B) | Alto | Alto | MÉDIA |
| 6 | PDF em templates | Médio | Médio | MÉDIA |
| 7 | View de agendamentos no dashboard (Opção D) | Alto | Alto | BAIXA |
| 8 | Bug accordion templates | Baixo | Baixo | BAIXA |
| 9 | Confirmar termo "Krazy" com cliente | ? | Baixo | CONFIRMAR |

---

*Gerado em: 2026-04-15*
*Referência visual: Google Sheets "Gestão Casa Rio Branco 2026" → aba "Agendamento de Aulas/Visitas 26"*
