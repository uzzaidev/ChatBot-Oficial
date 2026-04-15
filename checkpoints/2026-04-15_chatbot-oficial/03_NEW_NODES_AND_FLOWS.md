# Novos Nodes e Fluxos — 2026-04-15

**Referência base:** `2026-03-15_chatbot-oficial/04_ARCHITECTURE_FROM_CODE.md` e `91_MAIN_FLOWS.md`

> Documenta apenas o que foi adicionado ou modificado desde 2026-03-15.

---

## Nodes Novos

### `src/nodes/updateContactMetadata.ts`

**Propósito:** Salvar campos cadastrais coletados pelo bot no contato (`clientes_whatsapp.metadata`).

**Interface:**
```typescript
export interface ContactMetadataInput {
  phone: string
  clientId: string
  fields: Record<string, string | boolean | null>
}

export const updateContactMetadata = async (input: ContactMetadataInput): Promise<void>
```

**Comportamento:**
- Chama RPC `merge_contact_metadata` (merge não-destrutivo)
- Se falhar, loga erro mas NÃO lança exceção — operação não-crítica
- Não bloqueia o fluxo principal

**Quando é chamado:**
- Em `chatbotFlow.ts` ao detectar tool call `registrar_dado_cadastral`

---

### `src/nodes/upsertContactMetadata.ts`

**Propósito:** Variante com detecção automática de dados no corpo da conversa (para casos como integração com `flowExecutor`).

**Quando é chamado:**
- Em `chatbotFlow.ts` (linha ~1090) após processamento de mensagem
- Em `flowExecutor.ts` (linha ~753) ao transicionar de flow interativo para bot

---

## Nodes Modificados

### `src/nodes/checkOrCreateCustomer.ts`

**O que mudou:** SELECT agora inclui coluna `metadata`.

```typescript
// Antes:
.select('telefone, nome, status')

// Depois:
.select('telefone, nome, status, metadata')
```

O `metadata` retornado é passado pelo `chatbotFlow.ts` para o `generateAIResponse.ts`.

---

### `src/nodes/generateAIResponse.ts`

**O que mudou:**

1. **Nova tool: `registrar_dado_cadastral`**
```typescript
{
  name: 'registrar_dado_cadastral',
  description: 'Use quando o usuário fornecer CPF, e-mail, como conheceu, indicação ou objetivo.',
  parameters: {
    campo: { enum: ['cpf', 'email', 'como_conheceu', 'indicado_por', 'objetivo'] },
    valor: { type: 'string' }
  }
}
```

2. **Novo input: `contactMetadata`**
```typescript
export interface GenerateAIResponseInput {
  // ... campos anteriores ...
  contactMetadata?: ContactMetadata  // ← NOVO
}
```

3. **Injeção de contexto** (linha ~378):
```typescript
if (contactMetadata && Object.keys(contactMetadata).length > 0) {
  messages.push({
    role: 'system',
    content: `DADOS JÁ COLETADOS DESTE CONTATO — NÃO pergunte novamente:\n${metaLines.join('\n')}`
  })
}
```

4. **Instrução anti-duplicata de eventos** (linha 203):
Instrução no sistema: verificar histórico por `[SISTEMA] Evento agendado` antes de criar novo evento.

---

### `src/nodes/saveChatMessage.ts`

**O que mudou:** Aceita agora `type: "system"` além de `"human"` e `"ai"`.

**Uso:** Salvar marcadores de eventos criados pelo calendário no histórico de chat.

---

### `src/nodes/handleCalendarToolCall.ts`

**O que mudou:**

1. **Cancelamento por fallback** (linha ~207):
   - Se `event_id` ausente, busca evento por `titulo + data_inicio`
   - Google Calendar: `google-calendar-client.ts` linha 118
   - Microsoft Calendar: `microsoft-calendar-client.ts` linha 169

2. **Marcador de evento no histórico** (linha ~234):
   Após criar evento com sucesso:
   ```typescript
   await saveChatMessage({
     phone, clientId,
     type: 'system',
     content: `[SISTEMA] Evento agendado: ${titulo} em ${data_hora_inicio}. ID: ${eventId}`
   })
   ```

3. **Contato no evento:**
   Se `contactMetadata.email` disponível, passa como participante no evento.

---

## Tool Calls do Bot — Estado Atual

| Tool | Quando dispara | O que faz |
|------|---------------|-----------|
| `transferir_atendimento` | Usuário EXPLICITAMENTE pede humano | Update status, email admin, STOP |
| `buscar_documento` | Usuário pede documento/catálogo | Semantic search + envio de arquivo |
| `enviar_resposta_em_audio` | Configurado no prompt do admin | TTS via OpenAI/ElevenLabs |
| `verificar_agenda` | Perguntas de disponibilidade | Google/Microsoft Calendar |
| `criar_evento_agenda` | Agendar compromisso | Cria evento + salva marcador no chat |
| `cancelar_evento_agenda` | Cancelar compromisso | Cancela por ID ou título+data |
| `registrar_dado_cadastral` | ← **NOVA** — bot coleta CPF/email/etc | Salva em `clientes_whatsapp.metadata` |

---

## Fluxo Atualizado — Coleta de Dados Pré-Agendamento

Novo sub-fluxo inserido no pipeline antes de confirmar visita ou aula experimental:

```
Usuário demonstra interesse em agendar
    ↓
Bot verifica "DADOS JÁ COLETADOS" no contexto
    ↓
Para cada campo ausente (como_conheceu, indicado_por, objetivo, email, cpf):
    Bot pergunta um por vez (conversacional)
    Usuário responde
    Bot dispara tool: registrar_dado_cadastral
        ↓
        updateContactMetadata() → merge_contact_metadata() → DB
    Bot confirma ("Ótimo, anotado!")
    ↓
Todos os dados coletados?
    ↓ SIM
Bot confirma horário disponível (grade: Seg-Qui 10h-13h e 15h-20h / Sex 15h-18h)
    ↓
Confirma agendamento (visita gratuita) ou transfere (aula experimental)
```

---

## Fluxo Calendar — Estado Atual

```
Usuário: "pode marcar para amanhã às 10h?"
    ↓
NODE 12: Generate AI Response
    → Tool call: verificar_agenda (checar disponibilidade)
    ↓
handleCalendarToolCall — verificar_agenda
    → Google/Microsoft Calendar API
    → Retorna slots disponíveis
    ↓
NODE 12 (segunda chamada): AI confirma e chama criar_evento_agenda
    ↓
handleCalendarToolCall — criar_evento_agenda
    → Verifica histórico: busca [SISTEMA] Evento agendado no chat
    → Se já existe evento similar: retorna aviso sem criar
    → Cria evento na API
    → Salva marcador: "[SISTEMA] Evento agendado: ..."
    → Adiciona contato como participante (se email disponível)
    ↓
NODE 14: Envia confirmação ao usuário

---

Usuário: "preciso cancelar aquela reunião"
    ↓
NODE 12: Tool call: cancelar_evento_agenda
    ↓
handleCalendarToolCall — cancelar_evento_agenda
    → Se event_id presente: cancela diretamente
    → Se não: busca por titulo + data_inicio
    → Cancela evento na API
    → Confirma ao usuário
```

---

## Arquivos de Calendário — Localização das Mudanças

| Arquivo | Linha | O que mudou |
|---------|-------|-------------|
| `src/lib/calendar-client.ts` | Interface base | Suporte cancelamento por fallback |
| `src/lib/google-calendar-client.ts` | 118 | Busca evento por título+data para cancelamento |
| `src/lib/microsoft-calendar-client.ts` | 169 | Busca evento por título+data para cancelamento |
| `src/nodes/handleCalendarToolCall.ts` | 207, 234 | Proteção duplicata + marcador no histórico |
| `src/nodes/saveChatMessage.ts` | 14 | Aceita `type: "system"` |
| `src/nodes/generateAIResponse.ts` | 203 | Instrução anti-duplicata |
