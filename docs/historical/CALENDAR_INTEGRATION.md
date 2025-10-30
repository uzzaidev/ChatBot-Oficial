# 📅 Integração com Google Calendar - Guia Completo

## Visão Geral

Este documento descreve como adicionar uma **tool de calendário** para que a IA possa:
- ✅ Visualizar disponibilidade do calendário
- ✅ Agendar reuniões automaticamente
- ✅ Listar compromissos existentes
- ✅ Cancelar/reagendar reuniões

---

## Arquitetura da Solução

### Fluxo de Funcionamento

```
1. Cliente ativa "Habilitar Calendário" em /dashboard/settings
2. Cliente configura Google Calendar API Key no Vault
3. Usuário pede: "Quero agendar uma reunião amanhã às 14h"
4. IA detecta intenção → Chama tool "agendar_reuniao"
5. Backend busca Google Calendar API Key do Vault
6. Cria evento no Google Calendar via API
7. Retorna confirmação para o usuário
```

### Componentes Necessários

1. **Google Calendar API** (OAuth 2.0 ou API Key)
2. **Nova Tool Definition** no `generateAIResponse.ts`
3. **Node Handler** para executar a ação (`scheduleCalendarEvent.ts`)
4. **Vault Secret** para armazenar credenciais
5. **UI Toggle** em `/dashboard/settings`
6. **Configuração `enableCalendar`** no `settings` JSON

---

## FASE 1: Configurar Google Calendar API

### 1.1 Criar Projeto no Google Cloud

1. Acesse: https://console.cloud.google.com/
2. Crie novo projeto: **"WhatsApp Chatbot Calendar"**
3. Ative a API:
   - Vá em **"APIs & Services" → "Enable APIs"**
   - Busque por **"Google Calendar API"**
   - Clique em **"Enable"**

### 1.2 Criar Credenciais OAuth 2.0

**Opção A - Service Account (Recomendado para SaaS)**:
```
1. APIs & Services → Credentials → Create Credentials → Service Account
2. Nome: "whatsapp-chatbot-calendar"
3. Role: "Editor" (ou criar role customizada)
4. Criar chave JSON → Download do arquivo
5. Compartilhar calendário com o email da Service Account
   (ex: whatsapp-chatbot@project.iam.gserviceaccount.com)
```

**Opção B - API Key (Apenas leitura, mais simples)**:
```
1. APIs & Services → Credentials → Create Credentials → API Key
2. Restringir API: Google Calendar API
3. Copiar API Key
```

**Opção C - OAuth 2.0 Client ID (Acesso total, requer fluxo de autorização)**:
```
1. APIs & Services → Credentials → Create OAuth Client ID
2. Tipo: Web application
3. Authorized redirect URIs: https://seudominio.com/api/calendar/callback
4. Copiar Client ID e Client Secret
```

### 1.3 Credenciais Necessárias

**Para Service Account** (JSON completo):
```json
{
  "type": "service_account",
  "project_id": "whatsapp-chatbot-xxxxx",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "whatsapp-chatbot@project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
}
```

**Para OAuth 2.0**:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN` (gerado após primeiro login)

---

## FASE 2: Atualizar Database Schema

### 2.1 Adicionar Coluna `enableCalendar` em `settings`

O campo `settings` na tabela `clients` já é `JSONB`, então **não precisa migração SQL**. Apenas adicione a propriedade no objeto:

```json
{
  "enableRAG": false,
  "enableTools": true,
  "enableHumanHandoff": true,
  "enableCalendar": true,  // ← NOVO
  "messageSplitEnabled": true,
  "maxTokens": 2000,
  "temperature": 0.7,
  "maxChatHistory": 10,
  "batchingDelaySeconds": 10,
  "calendarId": "primary"  // ← NOVO (opcional, default "primary")
}
```

### 2.2 Adicionar Secrets no Vault

Veja a estrutura atual do Vault em `tabelas.md`:

```sql
-- Tabela: vault.secrets
CREATE TABLE vault.secrets (
  id uuid PRIMARY KEY,
  name text UNIQUE NOT NULL,
  description text,
  secret text NOT NULL, -- Encrypted by Supabase Vault
  key_id uuid REFERENCES pgsodium.key(id),
  created_at timestamptz DEFAULT now()
);
```

**Secrets a criar** (um por cliente):

```sql
-- Service Account (JSON completo)
INSERT INTO vault.secrets (name, description, secret)
VALUES (
  'google_calendar_service_account_client_1',
  'Google Calendar Service Account JSON for Client 1',
  vault.create_secret('{ "type": "service_account", ... }')
);

-- OU OAuth 2.0 (separado)
INSERT INTO vault.secrets (name, description, secret)
VALUES 
  ('google_client_id_client_1', 'Google OAuth Client ID', vault.create_secret('123456789.apps.googleusercontent.com')),
  ('google_client_secret_client_1', 'Google OAuth Client Secret', vault.create_secret('GOCSPX-...')),
  ('google_refresh_token_client_1', 'Google OAuth Refresh Token', vault.create_secret('1//0g...'));
```

### 2.3 Atualizar `clients` Table

Adicionar colunas para armazenar os IDs dos secrets:

```sql
ALTER TABLE clients
ADD COLUMN google_calendar_secret_id uuid REFERENCES vault.secrets(id),
ADD COLUMN google_calendar_type text CHECK (google_calendar_type IN ('service_account', 'oauth2', 'api_key'));
```

**OU** (mais simples, usar apenas o settings JSON):

```sql
-- Sem alteração na tabela clients
-- Armazenar ID do secret em settings.googleCalendarSecretId
```

---

## FASE 3: Criar Library para Google Calendar

### 3.1 Instalar Dependências

```bash
npm install googleapis
npm install @types/google.auth --save-dev
```

### 3.2 Criar `src/lib/calendar.ts`

```typescript
import { google, calendar_v3 } from 'googleapis'
import { logger } from './logger'

interface CalendarCredentials {
  type: 'service_account' | 'oauth2' | 'api_key'
  serviceAccount?: any // JSON completo da Service Account
  clientId?: string
  clientSecret?: string
  refreshToken?: string
  apiKey?: string
}

interface CalendarEvent {
  summary: string
  description?: string
  location?: string
  startTime: string // ISO 8601
  endTime: string   // ISO 8601
  attendees?: string[] // Array de emails
  timeZone?: string
}

/**
 * Criar cliente Google Calendar autenticado
 */
const createCalendarClient = (credentials: CalendarCredentials): calendar_v3.Calendar => {
  if (credentials.type === 'service_account' && credentials.serviceAccount) {
    const auth = new google.auth.GoogleAuth({
      credentials: credentials.serviceAccount,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })

    return google.calendar({ version: 'v3', auth })
  }

  if (credentials.type === 'oauth2') {
    const oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret
    )

    oauth2Client.setCredentials({
      refresh_token: credentials.refreshToken,
    })

    return google.calendar({ version: 'v3', auth: oauth2Client })
  }

  if (credentials.type === 'api_key' && credentials.apiKey) {
    return google.calendar({ version: 'v3', auth: credentials.apiKey })
  }

  throw new Error('Invalid calendar credentials')
}

/**
 * Listar eventos do calendário
 */
export const listCalendarEvents = async (
  credentials: CalendarCredentials,
  calendarId: string = 'primary',
  timeMin?: string,
  timeMax?: string,
  maxResults: number = 10
): Promise<calendar_v3.Schema$Event[]> => {
  try {
    const calendar = createCalendarClient(credentials)

    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin || new Date().toISOString(),
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    })

    return response.data.items || []
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[calendar] Error listing events', { error: errorMessage })
    throw new Error(`Failed to list calendar events: ${errorMessage}`)
  }
}

/**
 * Criar evento no calendário
 */
export const createCalendarEvent = async (
  credentials: CalendarCredentials,
  event: CalendarEvent,
  calendarId: string = 'primary'
): Promise<calendar_v3.Schema$Event> => {
  try {
    const calendar = createCalendarClient(credentials)

    const eventData: calendar_v3.Schema$Event = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startTime,
        timeZone: event.timeZone || 'America/Sao_Paulo',
      },
      end: {
        dateTime: event.endTime,
        timeZone: event.timeZone || 'America/Sao_Paulo',
      },
      attendees: event.attendees?.map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: `${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
    }

    const response = await calendar.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: eventData,
    })

    logger.info('[calendar] Event created successfully', {
      eventId: response.data.id,
      summary: event.summary,
    })

    return response.data
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[calendar] Error creating event', { error: errorMessage })
    throw new Error(`Failed to create calendar event: ${errorMessage}`)
  }
}

/**
 * Verificar disponibilidade em um horário
 */
export const checkAvailability = async (
  credentials: CalendarCredentials,
  startTime: string,
  endTime: string,
  calendarId: string = 'primary'
): Promise<boolean> => {
  try {
    const calendar = createCalendarClient(credentials)

    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime,
        timeMax: endTime,
        items: [{ id: calendarId }],
      },
    })

    const busySlots = response.data.calendars?.[calendarId]?.busy || []
    return busySlots.length === 0 // True se não tem nada agendado
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[calendar] Error checking availability', { error: errorMessage })
    throw new Error(`Failed to check availability: ${errorMessage}`)
  }
}

/**
 * Cancelar evento
 */
export const deleteCalendarEvent = async (
  credentials: CalendarCredentials,
  eventId: string,
  calendarId: string = 'primary'
): Promise<void> => {
  try {
    const calendar = createCalendarClient(credentials)

    await calendar.events.delete({
      calendarId,
      eventId,
    })

    logger.info('[calendar] Event deleted successfully', { eventId })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[calendar] Error deleting event', { error: errorMessage })
    throw new Error(`Failed to delete calendar event: ${errorMessage}`)
  }
}
```

---

## FASE 4: Criar Tool Definition

### 4.1 Atualizar `src/nodes/generateAIResponse.ts`

Adicionar tool definition para calendário:

```typescript
const CALENDAR_TOOL_DEFINITION = {
  type: 'function',
  function: {
    name: 'agendar_reuniao',
    description: 'Agenda uma reunião no Google Calendar do Luis Fernando Boff. Use APENAS quando o usuário solicitar explicitamente agendar uma reunião, marcar um horário ou consultar disponibilidade.',
    parameters: {
      type: 'object',
      properties: {
        assunto: {
          type: 'string',
          description: 'Título/assunto da reunião (ex: "Consultoria sobre energia solar")',
        },
        data_hora_inicio: {
          type: 'string',
          description: 'Data e hora de início no formato ISO 8601 (ex: "2025-10-30T14:00:00-03:00")',
        },
        data_hora_fim: {
          type: 'string',
          description: 'Data e hora de término no formato ISO 8601 (ex: "2025-10-30T15:00:00-03:00")',
        },
        descricao: {
          type: 'string',
          description: 'Descrição detalhada da reunião (opcional)',
        },
        email_participante: {
          type: 'string',
          description: 'Email do cliente para enviar convite (opcional)',
        },
        verificar_disponibilidade: {
          type: 'boolean',
          description: 'Se true, apenas verifica disponibilidade sem criar evento',
        },
      },
      required: ['assunto', 'data_hora_inicio', 'data_hora_fim'],
    },
  },
}
```

### 4.2 Adicionar Tool ao Array

```typescript
// Em generateAIResponse.ts, linha ~200
const tools = []

// Se Human Handoff habilitado
if (config.settings.enableHumanHandoff) {
  tools.push(HUMAN_HANDOFF_TOOL_DEFINITION)
}

// Se Calendar habilitado
if (config.settings.enableCalendar) {
  tools.push(CALENDAR_TOOL_DEFINITION)
}

// Se não tem nenhuma tool habilitada, passa undefined
const toolsToUse = tools.length > 0 ? tools : undefined
```

---

## FASE 5: Criar Node Handler

### 5.1 Criar `src/nodes/scheduleCalendarEvent.ts`

```typescript
import { createCalendarEvent, checkAvailability } from '@/lib/calendar'
import { ClientConfig } from '@/lib/types'
import { logger } from '@/lib/logger'

interface CalendarToolCall {
  assunto: string
  data_hora_inicio: string
  data_hora_fim: string
  descricao?: string
  email_participante?: string
  verificar_disponibilidade?: boolean
}

export const scheduleCalendarEvent = async (
  toolCall: CalendarToolCall,
  config: ClientConfig
): Promise<string> => {
  try {
    // Validar que o cliente tem credenciais do Google Calendar
    if (!config.apiKeys.googleCalendarServiceAccount && !config.apiKeys.googleRefreshToken) {
      return '❌ Calendário não configurado. Entre em contato com o administrador para configurar a integração com Google Calendar.'
    }

    const credentials = config.apiKeys.googleCalendarServiceAccount
      ? {
          type: 'service_account' as const,
          serviceAccount: JSON.parse(config.apiKeys.googleCalendarServiceAccount),
        }
      : {
          type: 'oauth2' as const,
          clientId: config.apiKeys.googleClientId,
          clientSecret: config.apiKeys.googleClientSecret,
          refreshToken: config.apiKeys.googleRefreshToken,
        }

    const calendarId = config.settings.calendarId || 'primary'

    // Modo 1: Apenas verificar disponibilidade
    if (toolCall.verificar_disponibilidade) {
      const isAvailable = await checkAvailability(
        credentials,
        toolCall.data_hora_inicio,
        toolCall.data_hora_fim,
        calendarId
      )

      if (isAvailable) {
        return `✅ Horário disponível! O dia ${new Date(toolCall.data_hora_inicio).toLocaleDateString('pt-BR')} às ${new Date(toolCall.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} está livre.`
      } else {
        return `❌ Horário indisponível. Já existe um compromisso agendado neste horário. Posso sugerir outro horário?`
      }
    }

    // Modo 2: Verificar disponibilidade E criar evento
    const isAvailable = await checkAvailability(
      credentials,
      toolCall.data_hora_inicio,
      toolCall.data_hora_fim,
      calendarId
    )

    if (!isAvailable) {
      return `❌ Não foi possível agendar. Já existe um compromisso neste horário. Por favor, escolha outro horário.`
    }

    // Criar evento
    const event = await createCalendarEvent(
      credentials,
      {
        summary: toolCall.assunto,
        description: toolCall.descricao || `Reunião agendada via WhatsApp`,
        startTime: toolCall.data_hora_inicio,
        endTime: toolCall.data_hora_fim,
        attendees: toolCall.email_participante ? [toolCall.email_participante] : undefined,
        timeZone: 'America/Sao_Paulo',
      },
      calendarId
    )

    logger.info('[scheduleCalendarEvent] Event created', {
      eventId: event.id,
      summary: toolCall.assunto,
    })

    const dataFormatada = new Date(toolCall.data_hora_inicio).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })

    const horaInicio = new Date(toolCall.data_hora_inicio).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    const horaFim = new Date(toolCall.data_hora_fim).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    let confirmacao = `✅ Reunião agendada com sucesso!\n\n`
    confirmacao += `📅 **${toolCall.assunto}**\n`
    confirmacao += `🗓️ ${dataFormatada}\n`
    confirmacao += `⏰ ${horaInicio} - ${horaFim}\n`

    if (event.hangoutLink) {
      confirmacao += `\n🔗 Link do Google Meet: ${event.hangoutLink}`
    }

    if (toolCall.email_participante) {
      confirmacao += `\n\n📧 Convite enviado para: ${toolCall.email_participante}`
    }

    return confirmacao
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('[scheduleCalendarEvent] Error', { error: errorMessage })
    return `❌ Erro ao agendar reunião: ${errorMessage}. Por favor, tente novamente.`
  }
}
```

---

## FASE 6: Integrar no chatbotFlow

### 6.1 Atualizar `src/flows/chatbotFlow.ts`

Adicionar handler para tool call de calendário:

```typescript
// Após NODE 11 (Generate AI Response)
if (config.settings.enableCalendar && aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
  const calendarToolCall = aiResponse.toolCalls.find(
    (tool) => tool.function.name === 'agendar_reuniao'
  )

  if (calendarToolCall) {
    console.log('[chatbotFlow] Calendar tool called - scheduling event')
    
    const toolArgs = JSON.parse(calendarToolCall.function.arguments)
    const result = await scheduleCalendarEvent(toolArgs, config)

    // Enviar resultado para o usuário
    await sendWhatsAppMessage({
      phone: parsedMessage.phone,
      messages: [result],
      accessToken: config.apiKeys.metaAccessToken,
      phoneNumberId: config.phoneNumberId,
    })

    logger.finishExecution('success')
    return { success: true, calendarEventCreated: true }
  }
}
```

---

## FASE 7: Atualizar TypeScript Types

### 7.1 `src/lib/types.ts`

```typescript
export interface ClientSettings {
  batchingDelaySeconds: number
  maxTokens: number
  temperature: number
  enableRAG: boolean
  enableTools: boolean
  enableHumanHandoff: boolean
  enableCalendar: boolean  // ← NOVO
  messageSplitEnabled: boolean
  maxChatHistory: number
  calendarId?: string  // ← NOVO (opcional, default "primary")
}

export interface ClientApiKeys {
  metaAccessToken: string
  openaiApiKey?: string
  groqApiKey?: string
  googleCalendarServiceAccount?: string  // ← NOVO (JSON completo)
  googleClientId?: string                // ← NOVO (OAuth)
  googleClientSecret?: string            // ← NOVO (OAuth)
  googleRefreshToken?: string            // ← NOVO (OAuth)
}
```

---

## FASE 8: Atualizar Backend API

### 8.1 `src/lib/config.ts` - getClientConfig

Adicionar busca das credenciais do Google Calendar:

```typescript
// Buscar secrets do Google Calendar (se configurado)
let googleCalendarServiceAccount: string | undefined
let googleClientId: string | undefined
let googleClientSecret: string | undefined
let googleRefreshToken: string | undefined

if (client.google_calendar_secret_id) {
  const { data: calendarSecret } = await supabase
    .rpc('get_secret_by_id', { secret_id: client.google_calendar_secret_id })
    .single()

  if (calendarSecret?.decrypted_secret) {
    // Se for Service Account, é um JSON completo
    if (client.google_calendar_type === 'service_account') {
      googleCalendarServiceAccount = calendarSecret.decrypted_secret
    }
    // Se for OAuth, buscar outros secrets
    else if (client.google_calendar_type === 'oauth2') {
      googleClientId = calendarSecret.decrypted_secret // Armazenar clientId
      // Buscar clientSecret e refreshToken (precisam de secrets separados)
    }
  }
}

return {
  // ... outros campos
  apiKeys: {
    metaAccessToken,
    openaiApiKey,
    groqApiKey,
    googleCalendarServiceAccount,  // ← NOVO
    googleClientId,                 // ← NOVO
    googleClientSecret,             // ← NOVO
    googleRefreshToken,             // ← NOVO
  },
  settings: {
    // ... outros settings
    enableCalendar: clientSettings.enableCalendar || false,  // ← NOVO
    calendarId: clientSettings.calendarId || 'primary',      // ← NOVO
  },
}
```

---

## FASE 9: Criar UI em Settings

### 9.1 Atualizar `src/app/dashboard/settings/page.tsx`

Adicionar toggle e campos de configuração:

```tsx
{/* Enable Calendar */}
<div className="flex items-center justify-between">
  <div>
    <Label htmlFor="enable_calendar">Habilitar Calendário</Label>
    <p className="text-xs text-gray-500">
      Permite IA agendar reuniões no Google Calendar
    </p>
  </div>
  <Input
    type="checkbox"
    id="enable_calendar"
    checked={agentConfig.settings.enable_calendar}
    onChange={(e) =>
      setAgentConfig({
        ...agentConfig,
        settings: { ...agentConfig.settings, enable_calendar: e.target.checked },
      })
    }
    disabled={!editingAgent}
    className="w-5 h-5"
  />
</div>
```

### 9.2 Adicionar Seção de Configuração do Google Calendar

```tsx
{/* Google Calendar Configuration (só aparece se enable_calendar = true) */}
{agentConfig.settings.enable_calendar && (
  <Card className="border-blue-200">
    <CardHeader>
      <CardTitle className="text-lg flex items-center gap-2">
        🗓️ Configuração do Google Calendar
      </CardTitle>
      <CardDescription>
        Credenciais para integração com Google Calendar API
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div>
        <Label htmlFor="calendar_type">Tipo de Autenticação</Label>
        <Select
          value={calendarType}
          onValueChange={setCalendarType}
          disabled={!editingSecrets}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Selecione o tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="service_account">Service Account (Recomendado)</SelectItem>
            <SelectItem value="oauth2">OAuth 2.0</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {calendarType === 'service_account' && (
        <div>
          <Label htmlFor="google_calendar_service_account">
            Service Account JSON
          </Label>
          <Textarea
            id="google_calendar_service_account"
            placeholder='{"type": "service_account", "project_id": "...", ...}'
            value={secrets.google_calendar_service_account}
            onChange={(e) =>
              setSecrets({ ...secrets, google_calendar_service_account: e.target.value })
            }
            disabled={!editingSecrets}
            rows={6}
            className="mt-2 font-mono text-xs"
          />
          <p className="text-xs text-gray-500 mt-1">
            Cole aqui o JSON completo da Service Account do Google Cloud
          </p>
        </div>
      )}

      {calendarType === 'oauth2' && (
        <>
          <div>
            <Label htmlFor="google_client_id">Google Client ID</Label>
            <Input
              type="text"
              id="google_client_id"
              value={secrets.google_client_id}
              onChange={(e) => setSecrets({ ...secrets, google_client_id: e.target.value })}
              disabled={!editingSecrets}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="google_client_secret">Google Client Secret</Label>
            <Input
              type="password"
              id="google_client_secret"
              value={secrets.google_client_secret}
              onChange={(e) =>
                setSecrets({ ...secrets, google_client_secret: e.target.value })
              }
              disabled={!editingSecrets}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="google_refresh_token">Google Refresh Token</Label>
            <Input
              type="password"
              id="google_refresh_token"
              value={secrets.google_refresh_token}
              onChange={(e) =>
                setSecrets({ ...secrets, google_refresh_token: e.target.value })
              }
              disabled={!editingSecrets}
              className="mt-2"
            />
          </div>
        </>
      )}

      <div>
        <Label htmlFor="calendar_id">Calendar ID (opcional)</Label>
        <Input
          type="text"
          id="calendar_id"
          placeholder="primary"
          value={agentConfig.settings.calendar_id || 'primary'}
          onChange={(e) =>
            setAgentConfig({
              ...agentConfig,
              settings: { ...agentConfig.settings, calendar_id: e.target.value },
            })
          }
          disabled={!editingAgent}
          className="mt-2"
        />
        <p className="text-xs text-gray-500 mt-1">
          Deixe "primary" para usar o calendário principal
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

---

## FASE 10: Testing & Deployment

### 10.1 Criar Endpoint de Teste

`src/app/api/calendar/test/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getClientConfig } from '@/lib/config'
import { listCalendarEvents } from '@/lib/calendar'

export async function POST(request: NextRequest) {
  try {
    const config = await getClientConfig('DEFAULT_CLIENT_ID') // Trocar por client real

    if (!config.settings.enableCalendar) {
      return NextResponse.json(
        { error: 'Calendar integration not enabled' },
        { status: 400 }
      )
    }

    const credentials = config.apiKeys.googleCalendarServiceAccount
      ? {
          type: 'service_account' as const,
          serviceAccount: JSON.parse(config.apiKeys.googleCalendarServiceAccount),
        }
      : {
          type: 'oauth2' as const,
          clientId: config.apiKeys.googleClientId!,
          clientSecret: config.apiKeys.googleClientSecret!,
          refreshToken: config.apiKeys.googleRefreshToken!,
        }

    const events = await listCalendarEvents(credentials, 'primary', undefined, undefined, 5)

    return NextResponse.json({
      success: true,
      message: 'Calendar connection successful',
      events: events.map((e) => ({
        id: e.id,
        summary: e.summary,
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
      })),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
```

### 10.2 Testar Integração

```bash
# 1. Ativar "Habilitar Calendário" em /dashboard/settings
# 2. Adicionar Service Account JSON no Vault
# 3. Salvar configurações
# 4. Testar no WhatsApp:

"Oi, quero agendar uma reunião amanhã às 14h para falar sobre energia solar"

# Esperado:
# ✅ Reunião agendada com sucesso!
# 📅 **Consultoria sobre energia solar**
# 🗓️ terça-feira, 30 de outubro de 2025
# ⏰ 14:00 - 15:00
# 🔗 Link do Google Meet: https://meet.google.com/xxx-yyyy-zzz
```

---

## Resumo de Arquivos a Criar/Modificar

### Criar:
- ✅ `src/lib/calendar.ts` - Google Calendar API wrapper
- ✅ `src/nodes/scheduleCalendarEvent.ts` - Node handler
- ✅ `src/app/api/calendar/test/route.ts` - Endpoint de teste

### Modificar:
- ✅ `src/lib/types.ts` - Adicionar `enableCalendar`, `calendarId`, secrets do Google
- ✅ `src/lib/config.ts` - Buscar secrets do Google Calendar do Vault
- ✅ `src/nodes/generateAIResponse.ts` - Adicionar CALENDAR_TOOL_DEFINITION
- ✅ `src/flows/chatbotFlow.ts` - Handler para tool call de calendário
- ✅ `src/app/dashboard/settings/page.tsx` - UI para toggle e configuração
- ✅ `migrations/` - SQL para adicionar colunas `google_calendar_secret_id`, `google_calendar_type`

---

## Limitações por Plano (Futuro)

| Plano       | Calendar Enabled | Max Eventos/Mês |
|-------------|------------------|-----------------|
| Básico      | 🔒 Bloqueado     | 0               |
| Pro         | ✅ Habilitado    | 100             |
| Enterprise  | ✅ Habilitado    | Ilimitado       |

---

## Segurança

⚠️ **IMPORTANTE**:
- **NUNCA** retorne credenciais do Google Calendar para o frontend
- **SEMPRE** use Vault para armazenar secrets
- Validar permissões antes de criar eventos
- Implementar rate limiting (max 10 agendamentos/hora por cliente)
- Logs de auditoria para cada evento criado

---

## Próximos Passos

1. ✅ Criar conta no Google Cloud
2. ✅ Habilitar Google Calendar API
3. ✅ Gerar Service Account JSON
4. ✅ Compartilhar calendário com Service Account
5. ✅ Implementar library (`calendar.ts`)
6. ✅ Criar tool definition e node handler
7. ✅ Atualizar UI em Settings
8. ✅ Testar integração end-to-end
9. ✅ Documentar para usuários finais

---

**Pronto para implementar!** 🚀

Siga as fases em ordem e teste cada etapa antes de prosseguir. Em caso de dúvidas, consulte a documentação oficial do Google Calendar API: https://developers.google.com/calendar/api/guides/overview
