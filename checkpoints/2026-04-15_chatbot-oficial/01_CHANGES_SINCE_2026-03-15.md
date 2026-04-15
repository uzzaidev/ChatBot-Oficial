# Changes Since 2026-03-15 Checkpoint

**Projeto:** ChatBot-Oficial (UzzApp WhatsApp SaaS)
**Período:** 2026-03-15 → 2026-04-15
**Checkpoint anterior:** `2026-03-15_chatbot-oficial/`

> Para arquitetura base, schema completo e flows originais, consulte o checkpoint anterior.
> Este documento documenta APENAS o delta — o que foi adicionado, modificado ou corrigido.

---

## 1. CRM Metadata — Opção A (JSONB em clientes_whatsapp)

### Problema resolvido
O bot coletava CPF, e-mail, como o prospect conheceu a escola e seu objetivo, mas esses dados ficavam apenas no histórico de chat. Na próxima conversa, o bot perguntava tudo de novo.

### Solução implementada
Coluna `metadata JSONB` adicionada em `clientes_whatsapp`. Dados coletados pelo bot são salvos no contato via tool call `registrar_dado_cadastral`, e injetados no contexto da IA nas conversas seguintes com o prefixo `DADOS JÁ COLETADOS`.

### Migrations criadas

**`20260415110000_add_metadata_to_clientes_whatsapp.sql`**
```sql
ALTER TABLE public.clientes_whatsapp
  ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX idx_clientes_whatsapp_metadata_gin
  ON public.clientes_whatsapp USING GIN (metadata);
```

**`20260415113000_create_merge_contact_metadata_rpc.sql`**
```sql
CREATE OR REPLACE FUNCTION merge_contact_metadata(
  p_telefone NUMERIC,
  p_client_id UUID,
  p_metadata JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE clientes_whatsapp
  SET metadata = COALESCE(metadata, '{}') || p_metadata
  WHERE telefone = p_telefone AND client_id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Arquivos novos

**`src/nodes/updateContactMetadata.ts`**
- Função `updateContactMetadata({ phone, clientId, fields })` 
- Chama RPC `merge_contact_metadata` — merge não-destrutivo com `||`
- Não bloqueia fluxo em caso de erro (operação não-crítica)

**`src/nodes/upsertContactMetadata.ts`**
- Variante com upsert automático baseado no conteúdo da conversa
- Integrada em `chatbotFlow.ts` (linha ~1090) e `flowExecutor.ts` (linha ~753)

### Arquivos modificados

**`src/nodes/checkOrCreateCustomer.ts`**
- SELECT agora inclui coluna `metadata`
- Retorna `metadata` como parte de `CustomerRecord`

**`src/lib/types.ts`**
```typescript
export interface ContactMetadata {
  cpf?: string
  email?: string
  como_conheceu?: string
  indicado_por?: string
  objetivo?: string
  [key: string]: string | boolean | null | undefined
}
// CustomerRecord agora inclui: metadata?: ContactMetadata
```

**`src/nodes/generateAIResponse.ts`**
- Aceita `contactMetadata?: ContactMetadata` como input
- Injeta no contexto como mensagem de sistema:
  ```
  DADOS JÁ COLETADOS DESTE CONTATO — NÃO pergunte novamente:
  E-mail: ...
  CPF: ...
  Como conheceu: ...
  ```
- Nova tool adicionada: `registrar_dado_cadastral`
  - Parâmetros: `campo` (enum: cpf | email | como_conheceu | indicado_por | objetivo), `valor`
  - Disparada pelo bot ao receber o dado do usuário

**`src/flows/chatbotFlow.ts`**
- Passa `contactMetadata` para `generateAIResponse()`
- Trata tool call `registrar_dado_cadastral`: chama `updateContactMetadata` e continua sem enviar mensagem ao usuário

### Campos armazenados no metadata

| Campo | Quando coletado | Exemplo |
|-------|----------------|---------|
| `cpf` | Pré-agendamento | `"123.456.789-00"` |
| `email` | Pré-agendamento | `"joao@gmail.com"` |
| `como_conheceu` | Pré-agendamento | `"Instagram"` |
| `indicado_por` | Se for indicação | `"Maria Silva"` |
| `objetivo` | Pré-agendamento | `"Reduzir estresse"` |

### Status
- [x] Código implementado
- [x] TypeScript sem erros (`npx tsc --noEmit`)
- [ ] `supabase db push` pendente (aplicar migrations em produção)
- [ ] Teste E2E no WhatsApp pendente

---

## 2. Calendário — Melhorias

### 2a. Cancelar evento existente sem criar novo

**Problema:** Tool `cancelar_evento_agenda` não estava funcionando corretamente — sem tratamento de fallback quando `event_id` não era fornecido.

**Solução:**
- Lógica de fallback: busca por `titulo + data_inicio` quando `event_id` ausente
- Google: `google-calendar-client.ts` (linha 118)
- Microsoft: `microsoft-calendar-client.ts` (linha 169)

**Commit:** `69662f4 feat(calendar): cancelar evento existente sem criar novo`

**Arquivos modificados:**
- `src/lib/calendar-client.ts`
- `src/lib/google-calendar-client.ts`
- `src/lib/microsoft-calendar-client.ts`
- `src/nodes/handleCalendarToolCall.ts`

### 2b. Histórico de eventos para evitar duplicatas

**Problema:** O bot não lembrava que já havia criado um evento em conversa anterior, podendo duplicar.

**Solução:**
- Ao criar evento com `criar_evento_agenda`, salva mensagem de sistema no `n8n_chat_histories`:
  ```
  [SISTEMA] Evento agendado: {titulo} em {data_hora_inicio}. ID: {event_id}
  ```
- `saveChatMessage.ts` agora aceita `type: "system"` além de `"user"` e `"assistant"`
- Instrução no prompt da IA: verificar histórico antes de criar novo evento

**Arquivo modificado:**
- `src/nodes/saveChatMessage.ts` — suporte a `type: "system"`
- `src/nodes/handleCalendarToolCall.ts` — salvar marcador após criação
- `src/nodes/generateAIResponse.ts` — instrução anti-duplicata (linha 203)

### 2c. Contato adicionado ao evento

- Ao criar evento, o e-mail do contato (se disponível no metadata) é passado como participante
- Implementado em `handleCalendarToolCall.ts`

**Commits relevantes:**
- `deb586c feat(calendar): incluir contato no evento e simplificar faixa de horario`
- `69662f4 feat(calendar): cancelar evento existente sem criar novo`

---

## 3. Templates — Correções e Melhorias

### 3a. Bug 404 ao editar template rascunho

**Problema:** A página de edição de template dinâmico (`/dashboard/templates/[id]/edit`) retornava 404 para templates com status `draft`.

**Causa:** A página de edição dinâmica não existia — só havia a versão estática.

**Solução:** Criada página `src/app/dashboard/templates/[id]/edit/page.tsx`.

### 3b. Suporte a PDF/documento no header de template

**Problema:** Templates só suportavam imagem no header. Clientes precisam enviar PDFs.

**Solução parcial:**
- `src/lib/meta.ts` (linha 475): backend aceita `headerParameters` com `type: "document"`
- `src/app/api/templates/send/route.ts` (linha 43): repassa `headerParameters` e `buttonParameters`

**Pendente:** UI no dashboard para upload de PDF como header (accordion bug também pendente).

---

## 4. Prompt Umåna Yōga — Atualizações

**Arquivo:** `CONTATOS UMANA/prommpt Umana/prompt.md`

### 4a. Coleta de dados pré-agendamento (nova seção)

Antes de confirmar visita ou aula experimental, o bot coleta sequencialmente (um por mensagem):
1. Como conheceu a Umåna
2. Se foi indicação → nome de quem indicou (condicional)
3. Objetivo com o Yōga
4. E-mail
5. CPF

Dados já coletados (nome, número) não são pedidos novamente.

### 4b. Diferença visita × aula experimental

| Tipo | Custo | Prioridade |
|------|-------|-----------|
| Visita presencial | Gratuita | Sempre oferecer primeiro |
| Aula experimental | Tem custo (valor avulso) | Só quando decidida a praticar |

### 4c. Horários de atendimento e visitas

| Dia | Horário |
|-----|---------|
| Segunda a quinta | 10h–13h e 15h–20h |
| Sexta | 15h–18h |
| Sábado e domingo | Sem agendamentos |

Bot não confirma agendamento fora dessa grade.

### 4d. Regras de linguagem adicionadas

- **Crase obrigatória:** "às 10h", "à escola", "à Umåna", "à tarde", "à noite"
- **Vocabulário:** "técnicas corporais" em vez de "posturas básicas" ou "poses"
- **Sem markdown nas mensagens:** proibidos `**`, `*`, `#`, `##`, `###`, backticks

### 4e. Gatilho de transferência humana atualizado

- Aula experimental → transferência para instrutor (tem custo, precisa de humano)
- Visita → bot pode marcar sozinho OU transferir (decisão do usuário)
- Coleta de dados obrigatória em ambos os casos antes da confirmação

---

## 5. Mobile — Câmera e Navegação

**Commits:**
- `2c570df feat(mobile): integrar camera no capacitor e scripts de release`
- `d2aa44d feat(ui): adicionar botao voltar em contatos e conversas`

**O que mudou:**
- Câmera integrada via Capacitor (permissões Android + iOS configuradas)
- Botão "voltar" adicionado nas telas de Contatos e Conversas
- Scripts de release Android atualizados

---

## 6. Itens Pendentes (não implementados neste ciclo)

| Item | Motivo pendente |
|------|----------------|
| `supabase db push` das 2 migrations de metadata | Precisa rodar em produção |
| Teste E2E do cancelamento de evento no WhatsApp | Precisa de ambiente integrado |
| Bug accordion nos templates | Aguarda reprodução exata com cliente |
| PDF header na UI do dashboard de templates | Esforço médio, não priorizado |
| Confirmar termo "Krazy" com cliente Umåna | Não identificado na transcrição |
| View de agendamentos no dashboard (Opção D CRM) | Fase futura |
| crm_field_definitions + crm_field_values (Opção B CRM) | Fase futura |

---

## Referências

- Plano completo: `twin-plans/PLANO_UMANA_MELHORIAS_2026-04.md`
- Plano CRM Opção A: `twin-plans/PLANO_CRM_METADATA_OPCAO_A.md`
- Prompt Umåna: `CONTATOS UMANA/prommpt Umana/prompt.md`
- Planilha referência: Google Sheets "Gestão Casa Rio Branco 2026" → aba "Agendamento de Aulas/Visitas 26"
