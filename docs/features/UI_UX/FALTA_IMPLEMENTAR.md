# ⏳ UI/UX: O que FALTA Implementar

**Data:** 2026-01-16
**Status:** ⏳ Requer mudanças no banco de dados, hooks e integrações
**Complexidade:** ALTA

---

## 📋 Índice

- [1. Dashboard Analytics Completo](#1-dashboard-analytics-completo)
- [2. Sistema de Settings Avançado](#2-sistema-de-settings-avançado)
- [3. Perfil do Usuário](#3-perfil-do-usuário)
- [4. RBAC Visual](#4-rbac-visual)
- [5. Notificações em Tempo Real](#5-notificações-em-tempo-real)
- [6. Exportação de Dados](#6-exportação-de-dados)
- [7. Agendamento de Mensagens](#7-agendamento-de-mensagens)

---

## 1. Dashboard Analytics Completo

### 📊 O que falta implementar

**Descrição:**
Dashboard principal com métricas em tempo real, gráficos de tendência, análise de conversas e custos.

### 🗄️ Tabelas necessárias no banco

#### 1.1. Tabela `dashboard_metrics`

**Status:** ❌ NÃO EXISTE

```sql
-- Migration: supabase migration new create_dashboard_metrics

CREATE TABLE IF NOT EXISTS public.dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Métricas de Conversas
  total_conversations INTEGER DEFAULT 0,
  active_conversations INTEGER DEFAULT 0,
  resolved_conversations INTEGER DEFAULT 0,
  transferred_conversations INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,

  -- Métricas de Mensagens
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER, -- Tempo médio em milissegundos

  -- Métricas de Performance
  uptime_percentage DECIMAL(5,2) DEFAULT 99.00,
  error_rate_percentage DECIMAL(5,2) DEFAULT 0.00,
  latency_p95_ms INTEGER,

  -- Métricas de Custos
  cost_today_usd DECIMAL(10,4) DEFAULT 0,
  cost_month_usd DECIMAL(10,4) DEFAULT 0,
  cost_per_conversation_usd DECIMAL(10,4) DEFAULT 0,

  -- Metadados
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_dashboard_metrics_client_date
  ON public.dashboard_metrics(client_id, snapshot_date DESC);

CREATE INDEX idx_dashboard_metrics_created
  ON public.dashboard_metrics(created_at DESC);

-- RLS
ALTER TABLE public.dashboard_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client metrics"
  ON public.dashboard_metrics FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Trigger de Updated At
CREATE TRIGGER update_dashboard_metrics_updated_at
  BEFORE UPDATE ON public.dashboard_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.dashboard_metrics IS 'Métricas diárias do dashboard por cliente';
COMMENT ON COLUMN public.dashboard_metrics.snapshot_date IS 'Data do snapshot (uma linha por dia por cliente)';
```

#### 1.2. Tabela `conversation_stats` (Agregação de Conversas)

**Status:** ❌ NÃO EXISTE

```sql
-- Migration: supabase migration new create_conversation_stats

CREATE TABLE IF NOT EXISTS public.conversation_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Agregação por período
  period_type TEXT NOT NULL CHECK (period_type IN ('hour', 'day', 'week', 'month')),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Contadores
  total INTEGER DEFAULT 0,
  bot_handled INTEGER DEFAULT 0,
  human_transferred INTEGER DEFAULT 0,
  resolved INTEGER DEFAULT 0,
  avg_messages_per_conversation DECIMAL(10,2),

  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_stats_client_period
  ON public.conversation_stats(client_id, period_type, period_start DESC);

-- RLS
ALTER TABLE public.conversation_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client stats"
  ON public.conversation_stats FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE public.conversation_stats IS 'Estatísticas agregadas de conversas por período';
```

### 🔧 Hooks necessários

#### 1.3. Hook: `useDashboardMetrics`

**Arquivo:** `src/hooks/useDashboardMetrics.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface DashboardMetrics {
  totalConversations: number
  activeConversations: number
  messagesSent: number
  avgResponseTimeMs: number
  costToday: number
  // ... outros campos
}

export const useDashboardMetrics = (clientId: string) => {
  const supabase = createClientComponentClient()

  return useQuery({
    queryKey: ['dashboard-metrics', clientId],
    queryFn: async (): Promise<DashboardMetrics> => {
      const { data, error } = await supabase
        .from('dashboard_metrics')
        .select('*')
        .eq('client_id', clientId)
        .eq('snapshot_date', new Date().toISOString().split('T')[0])
        .single()

      if (error) throw error

      return {
        totalConversations: data.total_conversations,
        activeConversations: data.active_conversations,
        messagesSent: data.messages_sent,
        avgResponseTimeMs: data.avg_response_time_ms,
        costToday: data.cost_today_usd,
      }
    },
    refetchInterval: 30000, // 30 segundos
  })
}
```

#### 1.4. Hook: `useConversationStats`

**Arquivo:** `src/hooks/useConversationStats.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { subDays, format } from 'date-fns'

type PeriodType = 'hour' | 'day' | 'week' | 'month'

interface ConversationStat {
  periodStart: string
  total: number
  botHandled: number
  humanTransferred: number
  resolved: number
}

export const useConversationStats = (
  clientId: string,
  periodType: PeriodType = 'day',
  days: number = 30
) => {
  const supabase = createClientComponentClient()

  return useQuery({
    queryKey: ['conversation-stats', clientId, periodType, days],
    queryFn: async (): Promise<ConversationStat[]> => {
      const startDate = subDays(new Date(), days)

      const { data, error } = await supabase
        .from('conversation_stats')
        .select('*')
        .eq('client_id', clientId)
        .eq('period_type', periodType)
        .gte('period_start', startDate.toISOString())
        .order('period_start', { ascending: true })

      if (error) throw error

      return data.map(stat => ({
        periodStart: stat.period_start,
        total: stat.total,
        botHandled: stat.bot_handled,
        humanTransferred: stat.human_transferred,
        resolved: stat.resolved,
      }))
    },
  })
}
```

### 📦 Componentes necessários

#### 1.5. Componentes de Gráficos

**Dependências a instalar:**

```bash
npm install recharts date-fns @tanstack/react-query
```

**Componente:** `src/components/charts/ConversationsChart.tsx`

```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useConversationStats } from '@/hooks/useConversationStats'

interface ConversationsChartProps {
  clientId: string
}

export const ConversationsChart = ({ clientId }: ConversationsChartProps) => {
  const { data, isLoading } = useConversationStats(clientId, 'day', 30)

  if (isLoading) {
    return <div className="h-[300px] skeleton" />
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="periodStart"
          tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          stroke="#6b7280"
        />
        <YAxis stroke="#6b7280" />
        <Tooltip
          contentStyle={{
            background: 'white',
            border: '2px solid #1ABC9C',
            borderRadius: '8px'
          }}
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#1ABC9C"
          strokeWidth={2}
          name="Total"
        />
        <Line
          type="monotone"
          dataKey="botHandled"
          stroke="#2E86AB"
          strokeWidth={2}
          name="Bot"
        />
        <Line
          type="monotone"
          dataKey="humanTransferred"
          stroke="#FFD700"
          strokeWidth={2}
          name="Transferidas"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### ⏱️ Tempo estimado de implementação

- **Migrations (tabelas + RLS + triggers):** 2 horas
- **Hooks (React Query):** 2 horas
- **Componentes de gráficos:** 4 horas
- **Integração na página dashboard:** 2 horas
- **Testes e ajustes:** 2 horas

**TOTAL:** ~12 horas

---

## 2. Sistema de Settings Avançado

### ⚙️ O que falta implementar

**Descrição:**
Página de configurações completa com:
- Perfil do usuário
- Alterar senha
- Configurações do Agent (System Prompt, Formatter, RAG, etc.)
- Variáveis de ambiente (Meta, OpenAI, Groq)
- Toggle switches visuais
- Sliders para parâmetros (temperature, max_tokens)

### 🗄️ Tabelas necessárias

#### 2.1. Tabela `bot_configurations`

**Status:** ❌ NÃO EXISTE (mas campos estão em `clients.settings` como JSONB)

**Recomendação:** Criar tabela dedicada para versionamento e auditoria.

```sql
-- Migration: supabase migration new create_bot_configurations

CREATE TABLE IF NOT EXISTS public.bot_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Prompts
  system_prompt TEXT NOT NULL,
  formatter_prompt TEXT,

  -- RAG Settings
  rag_enabled BOOLEAN DEFAULT false,
  rag_threshold DECIMAL(3,2) DEFAULT 0.70 CHECK (rag_threshold >= 0 AND rag_threshold <= 1),
  rag_max_documents INTEGER DEFAULT 3 CHECK (rag_max_documents BETWEEN 1 AND 5),
  rag_max_file_size_mb INTEGER DEFAULT 10 CHECK (rag_max_file_size_mb BETWEEN 1 AND 20),

  -- Function Calling
  function_calling_enabled BOOLEAN DEFAULT true,
  human_handoff_enabled BOOLEAN DEFAULT false,

  -- Model Settings
  max_tokens INTEGER DEFAULT 6000 CHECK (max_tokens BETWEEN 100 AND 8000),
  temperature DECIMAL(3,2) DEFAULT 1.00 CHECK (temperature >= 0 AND temperature <= 2),
  max_chat_history INTEGER DEFAULT 15 CHECK (max_chat_history BETWEEN 1 AND 50),

  -- Metadata
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bot_configs_client ON public.bot_configurations(client_id);
CREATE INDEX idx_bot_configs_active ON public.bot_configurations(client_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.bot_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client configs"
  ON public.bot_configurations FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own client configs"
  ON public.bot_configurations FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Trigger
CREATE TRIGGER update_bot_configurations_updated_at
  BEFORE UPDATE ON public.bot_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.bot_configurations IS 'Configurações do bot por cliente (versionado)';
```

#### 2.2. Tabela `config_change_history` (Auditoria)

**Status:** ❌ NÃO EXISTE

```sql
-- Migration: supabase migration new create_config_change_history

CREATE TABLE IF NOT EXISTS public.config_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Rastreamento
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_config_history_client ON public.config_change_history(client_id, created_at DESC);

-- RLS
ALTER TABLE public.config_change_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view config history"
  ON public.config_change_history FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE public.config_change_history IS 'Histórico de mudanças nas configurações do bot';
```

### 🔧 Hooks necessários

#### 2.3. Hook: `useBotConfig`

**Arquivo:** `src/hooks/useBotConfig.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface BotConfig {
  systemPrompt: string
  formatterPrompt: string
  ragEnabled: boolean
  ragThreshold: number
  ragMaxDocuments: number
  functionCallingEnabled: boolean
  maxTokens: number
  temperature: number
  maxChatHistory: number
}

export const useBotConfig = (clientId: string) => {
  const supabase = createClientComponentClient()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['bot-config', clientId],
    queryFn: async (): Promise<BotConfig> => {
      const { data, error } = await supabase
        .from('bot_configurations')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .single()

      if (error) throw error

      return {
        systemPrompt: data.system_prompt,
        formatterPrompt: data.formatter_prompt,
        ragEnabled: data.rag_enabled,
        ragThreshold: data.rag_threshold,
        ragMaxDocuments: data.rag_max_documents,
        functionCallingEnabled: data.function_calling_enabled,
        maxTokens: data.max_tokens,
        temperature: data.temperature,
        maxChatHistory: data.max_chat_history,
      }
    },
  })

  const updateConfig = useMutation({
    mutationFn: async (updates: Partial<BotConfig>) => {
      const { error } = await supabase
        .from('bot_configurations')
        .update({
          system_prompt: updates.systemPrompt,
          formatter_prompt: updates.formatterPrompt,
          rag_enabled: updates.ragEnabled,
          rag_threshold: updates.ragThreshold,
          rag_max_documents: updates.ragMaxDocuments,
          function_calling_enabled: updates.functionCallingEnabled,
          max_tokens: updates.maxTokens,
          temperature: updates.temperature,
          max_chat_history: updates.maxChatHistory,
          updated_at: new Date().toISOString(),
        })
        .eq('client_id', clientId)
        .eq('is_active', true)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-config', clientId] })
    },
  })

  return {
    config: data,
    isLoading,
    updateConfig: updateConfig.mutate,
    isUpdating: updateConfig.isPending,
  }
}
```

### 📦 Componentes necessários

#### 2.4. Componente: `ToggleSwitch`

**Arquivo:** `src/components/ui/ToggleSwitch.tsx`

```tsx
interface ToggleSwitchProps {
  enabled: boolean
  onChange: (enabled: boolean) => void
  label: string
  description?: string
}

export const ToggleSwitch = ({ enabled, onChange, label, description }: ToggleSwitchProps) => (
  <div className="flex items-center justify-between py-4">
    <div>
      <label className="font-semibold text-[#1C1C1C]">{label}</label>
      {description && <p className="text-sm text-[#6b7280] mt-1">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative w-12 h-6 rounded-full transition-colors',
        enabled ? 'bg-[#1ABC9C]' : 'bg-[#e5e7eb]'
      )}
      aria-pressed={enabled}
      aria-label={`Toggle ${label}`}
    >
      <span
        className={cn(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform',
          enabled ? 'left-6.5' : 'left-0.5'
        )}
      />
    </button>
  </div>
)
```

#### 2.5. Componente: `SliderControl`

**Arquivo:** `src/components/ui/SliderControl.tsx`

```tsx
interface SliderControlProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  hint?: string
}

export const SliderControl = ({ label, value, min, max, step = 1, onChange, hint }: SliderControlProps) => (
  <div className="py-4">
    <div className="flex items-center justify-between mb-2">
      <label className="font-semibold text-[#1C1C1C]">{label}</label>
      <span className="text-[#1ABC9C] font-bold">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-2 bg-[#e5e7eb] rounded-lg appearance-none cursor-pointer accent-[#1ABC9C]"
      aria-label={label}
    />
    {hint && <p className="text-xs text-[#6b7280] mt-1">{hint}</p>}
  </div>
)
```

### ⏱️ Tempo estimado de implementação

- **Migrations (tabelas + RLS):** 2 horas
- **Hooks (useBotConfig):** 1 hora
- **Componentes (Toggle, Slider):** 2 horas
- **Página de Settings completa:** 6 horas
- **Testes e validação:** 2 horas

**TOTAL:** ~13 horas

---

## 3. Perfil do Usuário

### 👤 O que falta implementar

**Descrição:**
Seção de perfil do usuário com:
- Edição de nome completo
- Email (não editável)
- Avatar (upload de imagem)
- Alterar senha
- Preferências (idioma, timezone, notificações)

### 🗄️ Tabelas necessárias

#### 3.1. Atualizar `user_profiles`

**Status:** ✅ EXISTE, mas faltam campos

```sql
-- Migration: supabase migration new alter_user_profiles_add_avatar

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": false}'::jsonb;

COMMENT ON COLUMN public.user_profiles.avatar_url IS 'URL da foto de perfil no Supabase Storage';
COMMENT ON COLUMN public.user_profiles.notification_preferences IS 'Preferências de notificação (email, push)';
```

#### 3.2. Storage Bucket para Avatars

**Status:** ❌ NÃO EXISTE

```sql
-- Criar bucket no Supabase Storage (via Dashboard ou código)
-- Nome: 'avatars'
-- Public: false
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- RLS policies para o bucket (criar via Dashboard ou supabase-js)
```

**Código para criar bucket:**

```typescript
// src/lib/setup-storage.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setupAvatarBucket() {
  const { data, error } = await supabase.storage.createBucket('avatars', {
    public: false,
    fileSizeLimit: 2097152, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  })

  if (error) {
    console.error('Error creating bucket:', error)
  } else {
    console.log('Bucket created:', data)
  }

  // RLS policy: usuários podem fazer upload do próprio avatar
  await supabase.storage
    .from('avatars')
    .createPolicy({
      name: 'Users can upload own avatar',
      definition: `(auth.uid()::text = (storage.foldername(name))[1])`,
      bucket_id: 'avatars',
      operation: 'INSERT',
    })
}
```

### 🔧 Hooks necessários

#### 3.3. Hook: `useUserProfile`

**Arquivo:** `src/hooks/useUserProfile.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface UserProfile {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  phone: string | null
  timezone: string
  language: string
  notificationPreferences: {
    email: boolean
    push: boolean
  }
}

export const useUserProfile = () => {
  const supabase = createClientComponentClient()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async (): Promise<UserProfile> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url,
        phone: profile.phone,
        timezone: profile.timezone,
        language: profile.language,
        notificationPreferences: profile.notification_preferences,
      }
    },
  })

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: updates.fullName,
          phone: updates.phone,
          timezone: updates.timezone,
          language: updates.language,
          notification_preferences: updates.notificationPreferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
    },
  })

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
    },
  })

  return {
    profile: data,
    isLoading,
    updateProfile: updateProfile.mutate,
    uploadAvatar: uploadAvatar.mutate,
    isUpdating: updateProfile.isPending || uploadAvatar.isPending,
  }
}
```

### ⏱️ Tempo estimado de implementação

- **Migration (avatar, preferences):** 30 minutos
- **Storage setup (bucket + RLS):** 1 hora
- **Hook (useUserProfile):** 1.5 horas
- **Componente de upload de avatar:** 2 horas
- **Página de perfil completa:** 3 horas
- **Testes:** 1 hora

**TOTAL:** ~9 horas

---

## 4. RBAC Visual

### 🔐 O que falta implementar

**Descrição:**
Sistema de controle de acesso baseado em funções (Role-Based Access Control) com UI visual:
- Roles: Super Admin, Admin, User
- Badges de role no menu
- Condicionais visuais (hide/show com base em role)
- Página de gerenciamento de usuários (Admin)

### 🗄️ Tabelas necessárias

#### 4.1. Tabela `user_roles`

**Status:** ❌ NÃO EXISTE

```sql
-- Migration: supabase migration new create_user_roles

CREATE TYPE user_role_enum AS ENUM ('super_admin', 'admin', 'user');

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,

  role user_role_enum NOT NULL DEFAULT 'user',

  -- Metadata
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, client_id)
);

CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_client ON public.user_roles(client_id);

-- RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view team roles"
  ON public.user_roles FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can assign roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

COMMENT ON TABLE public.user_roles IS 'Roles de usuários por cliente (RBAC)';
```

#### 4.2. Função: `get_user_role`

```sql
-- Função helper para obter role do usuário
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID, p_client_id UUID)
RETURNS user_role_enum AS $$
  SELECT role FROM user_roles
  WHERE user_id = p_user_id AND client_id = p_client_id
  LIMIT 1;
$$ LANGUAGE SQL STABLE;
```

### 🔧 Hooks necessários

#### 4.3. Hook: `useUserRole`

**Arquivo:** `src/hooks/useUserRole.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type UserRole = 'super_admin' | 'admin' | 'user'

export const useUserRole = (clientId: string) => {
  const supabase = createClientComponentClient()

  return useQuery({
    queryKey: ['user-role', clientId],
    queryFn: async (): Promise<UserRole> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('client_id', clientId)
        .single()

      if (error) throw error

      return data.role as UserRole
    },
  })
}
```

### 📦 Componentes necessários

#### 4.4. Componente: `RoleGuard`

**Arquivo:** `src/components/RoleGuard.tsx`

```tsx
import { useUserRole } from '@/hooks/useUserRole'
import { ReactNode } from 'react'

type UserRole = 'super_admin' | 'admin' | 'user'

interface RoleGuardProps {
  clientId: string
  allowedRoles: UserRole[]
  children: ReactNode
  fallback?: ReactNode
}

export const RoleGuard = ({ clientId, allowedRoles, children, fallback = null }: RoleGuardProps) => {
  const { data: userRole, isLoading } = useUserRole(clientId)

  if (isLoading) {
    return <div className="skeleton h-10 w-full" />
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
```

**Uso em páginas:**

```tsx
// src/app/dashboard/admin/page.tsx
import { RoleGuard } from '@/components/RoleGuard'

export default function AdminPage() {
  return (
    <RoleGuard
      clientId={clientId}
      allowedRoles={['admin', 'super_admin']}
      fallback={<div>Acesso negado. Você não tem permissão para acessar esta página.</div>}
    >
      <div>Conteúdo restrito a admins...</div>
    </RoleGuard>
  )
}
```

### ⏱️ Tempo estimado de implementação

- **Migrations (user_roles, funções):** 1.5 horas
- **Hook (useUserRole):** 30 minutos
- **Componente RoleGuard:** 1 hora
- **Atualizar navegação com RoleGuard:** 2 horas
- **Página de gerenciamento de usuários:** 4 horas
- **Testes:** 2 horas

**TOTAL:** ~11 horas

---

## 5. Notificações em Tempo Real

### 🔔 O que falta implementar

**Descrição:**
Sistema de notificações em tempo real usando Supabase Realtime:
- Notificação de novas conversas
- Notificação de transferências para humano
- Badge no ícone de notificação
- Dropdown com lista de notificações

### 🗄️ Tabelas necessárias

#### 5.1. Tabela `notifications`

**Status:** ❌ NÃO EXISTE

```sql
-- Migration: supabase migration new create_notifications

CREATE TYPE notification_type_enum AS ENUM ('new_conversation', 'human_transfer', 'system_alert', 'message_received');

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Se NULL, notificação para todos do client

  -- Conteúdo
  type notification_type_enum NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- URL para onde a notificação leva (ex: /dashboard/conversations/123)

  -- Estado
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB, -- Dados adicionais (ex: conversation_id, customer_name)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_client ON public.notifications(client_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, read) WHERE read = false;

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    (user_id IS NULL AND client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    ))
  );

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

COMMENT ON TABLE public.notifications IS 'Notificações em tempo real para usuários';
```

### 🔧 Hooks necessários

#### 5.2. Hook: `useNotifications`

**Arquivo:** `src/hooks/useNotifications.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect } from 'react'

interface Notification {
  id: string
  type: 'new_conversation' | 'human_transfer' | 'system_alert' | 'message_received'
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

export const useNotifications = () => {
  const supabase = createClientComponentClient()
  const queryClient = useQueryClient()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<Notification[]> => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      return data.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        read: n.read,
        createdAt: n.created_at,
      }))
    },
  })

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })

          // Mostrar notificação do navegador
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(payload.new.title, {
              body: payload.new.message,
              icon: '/favicon.ico',
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const unreadCount = notifications?.filter(n => !n.read).length ?? 0

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
  }
}
```

### 📦 Componentes necessários

#### 5.3. Componente: `NotificationBell`

**Arquivo:** `src/components/NotificationBell.tsx`

```tsx
import { Bell } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const NotificationBell = () => {
  const { notifications, unreadCount, markAsRead } = useNotifications()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative p-2 hover:bg-gray-100 rounded-lg">
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#1ABC9C] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold">Notificações</h3>
        </div>
        {notifications?.length === 0 ? (
          <div className="px-4 py-6 text-center text-[#6b7280]">
            Nenhuma notificação
          </div>
        ) : (
          notifications?.map(notification => (
            <div
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              className={cn(
                'px-4 py-3 border-b cursor-pointer hover:bg-gray-50',
                !notification.read && 'bg-[#dcfce7]'
              )}
            >
              <p className="font-semibold text-sm">{notification.title}</p>
              <p className="text-xs text-[#6b7280] mt-1">{notification.message}</p>
              <p className="text-[10px] text-[#B0B0B0] mt-2">
                {formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </p>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

### ⏱️ Tempo estimado de implementação

- **Migration (notifications):** 1 hora
- **Hook (useNotifications + Realtime):** 3 horas
- **Componente NotificationBell:** 2 horas
- **Integração com eventos (criar notificações):** 3 horas
- **Testes Realtime:** 2 horas

**TOTAL:** ~11 horas

---

## 6. Exportação de Dados

### 📊 O que falta implementar

**Descrição:**
Exportar dados do dashboard para CSV/Excel:
- Exportar conversas (filtros: data, status)
- Exportar métricas (período customizado)
- Exportar usage logs (custos)
- Botão "Exportar" em cada página

### 🗄️ Tabelas necessárias

**Status:** ✅ Tabelas existem (`conversations`, `messages`, `usage_logs`)

Não há necessidade de novas tabelas, apenas APIs de exportação.

### 📦 Dependências necessárias

```bash
npm install papaparse xlsx
npm install --save-dev @types/papaparse
```

### 🔧 APIs necessárias

#### 6.1. API: `POST /api/export/conversations`

**Arquivo:** `src/app/api/export/conversations/route.ts`

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'

export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { clientId, startDate, endDate, status } = await request.json()

  // Validar autenticação
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Buscar conversas
  let query = supabase
    .from('conversations')
    .select('*')
    .eq('client_id', clientId)

  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)
  if (status) query = query.eq('status', status)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Converter para CSV
  const csv = Papa.unparse(data)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="conversations_${new Date().toISOString()}.csv"`,
    },
  })
}
```

### 📦 Componentes necessários

#### 6.2. Componente: `ExportButton`

**Arquivo:** `src/components/ExportButton.tsx`

```tsx
import { Download } from 'lucide-react'
import { useState } from 'react'

interface ExportButtonProps {
  endpoint: string
  filename: string
  filters?: Record<string, any>
}

export const ExportButton = ({ endpoint, filename, filters = {} }: ExportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('Erro ao exportar dados')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-2 bg-[#2E86AB] text-white rounded-lg hover:bg-[#2E86AB]/90 disabled:opacity-50"
    >
      <Download className="w-4 h-4" />
      {isExporting ? 'Exportando...' : 'Exportar'}
    </button>
  )
}
```

### ⏱️ Tempo estimado de implementação

- **APIs de exportação (3 rotas):** 3 horas
- **Componente ExportButton:** 1 hora
- **Integração em páginas:** 2 horas
- **Testes de exportação:** 1 hora

**TOTAL:** ~7 horas

---

## 7. Agendamento de Mensagens

### 📅 O que falta implementar

**Descrição:**
Agendar envio de mensagens do WhatsApp para data/hora futura:
- Interface para criar agendamento
- Timezone-aware
- Lista de mensagens agendadas
- Cancelar agendamento
- Worker/Cron para processar

### 🗄️ Tabelas necessárias

#### 7.1. Tabela `scheduled_messages`

**Status:** ❌ NÃO EXISTE

```sql
-- Migration: supabase migration new create_scheduled_messages

CREATE TYPE scheduled_status_enum AS ENUM ('pending', 'sent', 'failed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Destinatário
  phone TEXT NOT NULL,

  -- Mensagem
  message_content TEXT NOT NULL,
  media_url TEXT,
  template_id TEXT, -- Se usar template do WhatsApp

  -- Agendamento
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/Sao_Paulo',

  -- Status
  status scheduled_status_enum DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  error_message TEXT,

  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (scheduled_for > created_at)
);

CREATE INDEX idx_scheduled_messages_status ON public.scheduled_messages(status, scheduled_for);
CREATE INDEX idx_scheduled_messages_client ON public.scheduled_messages(client_id, scheduled_for DESC);

-- RLS
ALTER TABLE public.scheduled_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client scheduled messages"
  ON public.scheduled_messages FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create scheduled messages"
  ON public.scheduled_messages FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND
    client_id IN (
      SELECT client_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own scheduled messages"
  ON public.scheduled_messages FOR UPDATE
  USING (created_by = auth.uid());

COMMENT ON TABLE public.scheduled_messages IS 'Mensagens agendadas para envio futuro';
```

### 🔧 Worker/Cron necessário

#### 7.2. Cron Job: Processar mensagens agendadas

**Arquivo:** `src/cron/process-scheduled-messages.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage } from '@/lib/whatsapp'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function processScheduledMessages() {
  const now = new Date().toISOString()

  // Buscar mensagens pendentes que devem ser enviadas agora
  const { data: messages, error } = await supabase
    .from('scheduled_messages')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .limit(100)

  if (error) {
    console.error('Error fetching scheduled messages:', error)
    return
  }

  for (const message of messages) {
    try {
      // Enviar mensagem via WhatsApp API
      await sendWhatsAppMessage({
        phone: message.phone,
        content: message.message_content,
        mediaUrl: message.media_url,
        clientId: message.client_id,
      })

      // Marcar como enviada
      await supabase
        .from('scheduled_messages')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', message.id)
    } catch (error) {
      console.error(`Error sending message ${message.id}:`, error)

      // Marcar como falha
      await supabase
        .from('scheduled_messages')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', message.id)
    }
  }

  console.log(`Processed ${messages.length} scheduled messages`)
}
```

**Configurar Cron (Vercel Cron Jobs):**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/process-scheduled-messages",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**API Route:**

```typescript
// src/app/api/cron/process-scheduled-messages/route.ts
import { processScheduledMessages } from '@/cron/process-scheduled-messages'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await processScheduledMessages()

  return NextResponse.json({ success: true })
}
```

### 📦 Componentes necessários

#### 7.3. Componente: `ScheduleMessageForm`

```tsx
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const ScheduleMessageForm = ({ clientId }: { clientId: string }) => {
  const supabase = createClientComponentClient()
  const queryClient = useQueryClient()

  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')

  const scheduleMessage = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('scheduled_messages').insert({
        client_id: clientId,
        phone,
        message_content: message,
        scheduled_for: new Date(scheduledFor).toISOString(),
        created_by: user.id,
      })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-messages'] })
      alert('Mensagem agendada com sucesso!')
    },
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); scheduleMessage.mutate() }}>
      <input
        type="tel"
        placeholder="Telefone (ex: 5554999999999)"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
      />
      <textarea
        placeholder="Mensagem"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
      />
      <input
        type="datetime-local"
        value={scheduledFor}
        onChange={(e) => setScheduledFor(e.target.value)}
        required
      />
      <button type="submit" disabled={scheduleMessage.isPending}>
        {scheduleMessage.isPending ? 'Agendando...' : 'Agendar Mensagem'}
      </button>
    </form>
  )
}
```

### ⏱️ Tempo estimado de implementação

- **Migration (scheduled_messages):** 1 hora
- **Worker/Cron (processar mensagens):** 3 horas
- **Componente ScheduleMessageForm:** 2 horas
- **Lista de mensagens agendadas:** 2 horas
- **Testes e validação:** 2 horas

**TOTAL:** ~10 horas

---

## 📊 Resumo de Tempo Total

| Feature | Tempo Estimado |
|---------|----------------|
| 1. Dashboard Analytics Completo | ~12 horas |
| 2. Sistema de Settings Avançado | ~13 horas |
| 3. Perfil do Usuário | ~9 horas |
| 4. RBAC Visual | ~11 horas |
| 5. Notificações em Tempo Real | ~11 horas |
| 6. Exportação de Dados | ~7 horas |
| 7. Agendamento de Mensagens | ~10 horas |
| **TOTAL GERAL** | **~73 horas** (~2 semanas de trabalho full-time) |

---

## 🚀 Ordem Recomendada de Implementação

1. **Dashboard Analytics** (Maior impacto para usuários)
2. **Settings Avançado** (Core functionality)
3. **Perfil do Usuário** (User experience)
4. **RBAC Visual** (Security + UX)
5. **Notificações** (Engagement)
6. **Exportação de Dados** (Business intelligence)
7. **Agendamento** (Nice to have)

---

## 📝 Notas Importantes

### Dependências a instalar

```bash
# Analytics e gráficos
npm install recharts date-fns @tanstack/react-query

# Exportação
npm install papaparse xlsx
npm install --save-dev @types/papaparse

# Notificações (Supabase Realtime já incluído)

# RBAC (sem dependências extras)
```

### Configurações do Doppler

Após criar as novas tabelas, adicionar no Doppler (se necessário):

```env
# Cron Secret (para validar requests)
CRON_SECRET=generate_random_secret_here

# (Outras variáveis já configuradas)
```

---

## ✅ Próximos Passos

1. Revisar este documento com a equipe
2. Priorizar features (pode começar apenas com Dashboard Analytics)
3. Criar migrations no Supabase
4. Implementar hooks e componentes
5. Testar em ambiente de desenvolvimento
6. Deploy em produção (Doppler está pronto!)

---

**Documentação criada em:** 2026-01-16
**Autor:** Claude Code
**Status:** ⏳ Aguardando aprovação e priorização
