# Plano de Implementação: CRM Kanban para WhatsApp

## Resumo Executivo

Módulo CRM estilo Kanban para gerenciar leads/contatos do WhatsApp com arrastar-e-soltar, automações de status, agendamento de mensagens, e rastreio de origem Meta Ads.

---

## Índice

1. [Estrutura de Arquivos](#1-estrutura-de-arquivos)
2. [Modelagem de Dados](#2-modelagem-de-dados)
3. [Componentes UI](#3-componentes-ui)
4. [APIs](#4-apis)
5. [Hooks](#5-hooks)
6. [Types](#6-types)
7. [Integração com Fluxo Existente](#7-integração-com-fluxo-existente)
8. [Automações](#8-automações)
9. [Backlog em Fases](#9-backlog-em-fases)
10. [Riscos e Mitigações](#10-riscos-e-mitigações)

---

## 1. Estrutura de Arquivos

### Novos Arquivos a Criar

```
src/
├── app/
│   └── dashboard/
│       └── crm/
│           └── page.tsx                        # Página principal do CRM
│
├── components/
│   └── crm/
│       ├── KanbanBoard.tsx                     # Container principal
│       ├── KanbanColumn.tsx                    # Coluna individual
│       ├── KanbanCard.tsx                      # Card reutilizável (COMPONENTE ÚNICO)
│       ├── CardDetailPanel.tsx                 # Painel lateral de detalhes
│       ├── CardStatusBadge.tsx                 # Badge de auto-status
│       ├── CardTagList.tsx                     # Lista de tags do card
│       ├── CardNotes.tsx                       # Seção de notas
│       ├── CardTimeline.tsx                    # Timeline de atividades
│       ├── CardMessages.tsx                    # Preview de mensagens
│       ├── ColumnHeader.tsx                    # Header da coluna
│       ├── ColumnSettingsDialog.tsx            # Dialog de config da coluna
│       ├── TagManagerDialog.tsx                # Dialog de gerenciar tags
│       ├── ScheduleMessageDialog.tsx           # Dialog de agendamento
│       ├── AutomationRulesPanel.tsx            # Painel de automações
│       └── CRMFilters.tsx                      # Filtros do Kanban
│
├── hooks/
│   ├── useCRMColumns.ts                        # Hook para colunas
│   ├── useCRMCards.ts                          # Hook para cards
│   ├── useCRMTags.ts                           # Hook para tags
│   └── useCRMDragDrop.ts                       # Hook para drag-and-drop
│
├── lib/
│   └── types.ts                                # Adicionar tipos CRM (existente)
│
└── app/
    └── api/
        └── crm/
            ├── columns/
            │   ├── route.ts                    # GET, POST
            │   ├── [id]/
            │   │   └── route.ts                # PATCH, DELETE
            │   └── reorder/
            │       └── route.ts                # POST
            ├── cards/
            │   ├── route.ts                    # GET, POST
            │   └── [id]/
            │       ├── route.ts                # GET, PATCH, DELETE
            │       ├── move/
            │       │   └── route.ts            # POST
            │       ├── tags/
            │       │   └── route.ts            # POST, DELETE
            │       └── notes/
            │           └── route.ts            # GET, POST
            ├── tags/
            │   ├── route.ts                    # GET, POST
            │   └── [id]/
            │       └── route.ts                # PATCH, DELETE
            ├── scheduled/
            │   ├── route.ts                    # GET, POST
            │   └── [id]/
            │       └── route.ts                # DELETE
            └── analytics/
                ├── funnel/
                │   └── route.ts                # GET
                └── sources/
                    └── route.ts                # GET

supabase/
└── migrations/
    └── YYYYMMDD_crm_module.sql                 # Migration única
```

### Arquivos Existentes a Modificar

| Arquivo                                  | Modificação                                       |
| ---------------------------------------- | ------------------------------------------------- |
| `src/lib/types.ts`                       | Adicionar interfaces CRM                          |
| `src/flows/chatbotFlow.ts`               | Chamar updateCardAutoStatus e captureLeadSource   |
| `src/nodes/parseMessage.ts`              | Extrair referral data do webhook                  |
| `src/nodes/checkOrCreateCustomer.ts`     | Auto-criar card no CRM                            |
| `src/components/DashboardNavigation.tsx` | Adicionar link para /crm                          |
| `src/app/globals.css`                    | Adicionar classes específicas CRM (se necessário) |
| `docs/tables/tabelas.md`                 | Documentar novas tabelas                          |

---

## 2. Modelagem de Dados

### Migration Completa: `supabase/migrations/YYYYMMDD_crm_module.sql`

```sql
-- =============================================================================
-- CRM MODULE - Migration
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CRM_COLUMNS - Colunas do Kanban
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Column properties
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT DEFAULT 'default',              -- Tailwind color name: 'mint', 'blue', 'gold', etc.
  icon TEXT DEFAULT 'users',                 -- Lucide icon name

  -- Ordering
  position INTEGER NOT NULL DEFAULT 0,

  -- Auto-move rules
  auto_rules JSONB DEFAULT '{}',

  -- System flags
  is_default BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_client_column_slug UNIQUE (client_id, slug),
  CONSTRAINT unique_client_column_position UNIQUE (client_id, position) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX idx_crm_columns_client ON crm_columns(client_id);
CREATE INDEX idx_crm_columns_position ON crm_columns(client_id, position);

-- -----------------------------------------------------------------------------
-- 2. CRM_CARDS - Cards de Leads
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES crm_columns(id) ON DELETE RESTRICT,

  -- Contact reference
  phone NUMERIC NOT NULL,

  -- Card properties
  position INTEGER NOT NULL DEFAULT 0,

  -- Auto-status tracking
  auto_status TEXT DEFAULT 'neutral' CHECK (auto_status IN ('awaiting_attendant', 'awaiting_client', 'neutral')),
  auto_status_updated_at TIMESTAMPTZ,

  -- Assignment
  assigned_to UUID REFERENCES user_profiles(id),
  assigned_at TIMESTAMPTZ,

  -- Lead value
  estimated_value NUMERIC(12,2),
  currency TEXT DEFAULT 'BRL',
  probability INTEGER DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,

  -- Last interaction tracking
  last_message_at TIMESTAMPTZ,
  last_message_direction TEXT CHECK (last_message_direction IN ('incoming', 'outgoing')),
  last_message_preview TEXT,

  -- Timestamps
  moved_to_column_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_card_contact FOREIGN KEY (phone, client_id)
    REFERENCES clientes_whatsapp(telefone, client_id),
  CONSTRAINT unique_client_phone_card UNIQUE (client_id, phone)
);

CREATE INDEX idx_crm_cards_client ON crm_cards(client_id);
CREATE INDEX idx_crm_cards_column ON crm_cards(column_id);
CREATE INDEX idx_crm_cards_assigned ON crm_cards(assigned_to);
CREATE INDEX idx_crm_cards_auto_status ON crm_cards(client_id, auto_status);
CREATE INDEX idx_crm_cards_position ON crm_cards(column_id, position);
CREATE INDEX idx_crm_cards_last_message ON crm_cards(last_message_at DESC);

-- -----------------------------------------------------------------------------
-- 3. CRM_TAGS - Tags
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  color TEXT DEFAULT 'blue',                  -- Tailwind color name
  description TEXT,

  -- System flags
  is_system BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_client_tag_name UNIQUE (client_id, name)
);

CREATE INDEX idx_crm_tags_client ON crm_tags(client_id);

-- -----------------------------------------------------------------------------
-- 4. CRM_CARD_TAGS - Junction Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_card_tags (
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES crm_tags(id) ON DELETE CASCADE,

  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES user_profiles(id),

  PRIMARY KEY (card_id, tag_id)
);

CREATE INDEX idx_card_tags_card ON crm_card_tags(card_id);
CREATE INDEX idx_card_tags_tag ON crm_card_tags(tag_id);

-- -----------------------------------------------------------------------------
-- 5. CRM_NOTES - Anotações
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  created_by UUID REFERENCES user_profiles(id),

  is_pinned BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_crm_notes_card ON crm_notes(card_id);

-- -----------------------------------------------------------------------------
-- 6. SCHEDULED_MESSAGES - Mensagens Agendadas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Target
  phone NUMERIC NOT NULL,
  card_id UUID REFERENCES crm_cards(id) ON DELETE SET NULL,

  -- Message content
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'template')),
  content TEXT,
  template_id UUID,
  template_params JSONB,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'America/Sao_Paulo',

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  wamid TEXT,

  -- Metadata
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_messages_client ON scheduled_messages(client_id);
CREATE INDEX idx_scheduled_messages_pending ON scheduled_messages(status, scheduled_for)
  WHERE status = 'pending';
CREATE INDEX idx_scheduled_messages_card ON scheduled_messages(card_id);

-- -----------------------------------------------------------------------------
-- 7. LEAD_SOURCES - Rastreio de Origem
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone NUMERIC NOT NULL,

  -- Source information
  source_type TEXT NOT NULL CHECK (source_type IN ('meta_ads', 'organic', 'referral', 'manual')),
  source_name TEXT,

  -- Meta Ads specific fields
  meta_campaign_id TEXT,
  meta_campaign_name TEXT,
  meta_adset_id TEXT,
  meta_adset_name TEXT,
  meta_ad_id TEXT,
  meta_ad_name TEXT,

  -- UTM tracking
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Raw data
  raw_referral_data JSONB,

  -- First touch attribution
  first_contact_at TIMESTAMPTZ DEFAULT NOW(),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lead_sources_client ON lead_sources(client_id);
CREATE INDEX idx_lead_sources_phone ON lead_sources(phone, client_id);
CREATE INDEX idx_lead_sources_campaign ON lead_sources(meta_campaign_id);
CREATE INDEX idx_lead_sources_type ON lead_sources(client_id, source_type);

-- -----------------------------------------------------------------------------
-- 8. CRM_AUTOMATION_RULES - Regras de Automação
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,

  -- Rule definition
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('time_in_column', 'no_response', 'message_received', 'tag_added')),
  trigger_config JSONB NOT NULL,

  -- Action
  action_type TEXT NOT NULL CHECK (action_type IN ('move_column', 'add_tag', 'send_message', 'assign_user', 'notify')),
  action_config JSONB NOT NULL,

  -- Status
  is_enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 100,

  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_automation_rules_client ON crm_automation_rules(client_id);
CREATE INDEX idx_automation_rules_enabled ON crm_automation_rules(client_id, is_enabled);

-- -----------------------------------------------------------------------------
-- 9. CRM_ACTIVITY_LOG - Histórico de Atividades
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crm_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES crm_cards(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL CHECK (activity_type IN ('column_move', 'tag_add', 'tag_remove', 'note_add', 'assigned', 'status_change', 'value_change', 'created')),
  description TEXT,

  -- Change tracking
  old_value JSONB,
  new_value JSONB,

  -- Actor
  performed_by UUID REFERENCES user_profiles(id),
  is_automated BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_log_card ON crm_activity_log(card_id);
CREATE INDEX idx_activity_log_client ON crm_activity_log(client_id);
CREATE INDEX idx_activity_log_date ON crm_activity_log(created_at DESC);

-- -----------------------------------------------------------------------------
-- 10. RLS POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE crm_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_card_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activity_log ENABLE ROW LEVEL SECURITY;

-- Service role access for all tables (used by webhook/API)
CREATE POLICY "Service role full access" ON crm_columns FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON crm_cards FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON crm_tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON crm_card_tags FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON crm_notes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON scheduled_messages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON lead_sources FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON crm_automation_rules FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON crm_activity_log FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- 11. HELPER FUNCTION - Move Card Atomically
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION crm_move_card(
  p_card_id UUID,
  p_target_column_id UUID,
  p_target_position INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_column_id UUID;
  v_old_position INTEGER;
  v_max_position INTEGER;
  v_client_id UUID;
BEGIN
  -- Get current card info
  SELECT column_id, position, client_id
  INTO v_old_column_id, v_old_position, v_client_id
  FROM crm_cards WHERE id = p_card_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Card not found';
  END IF;

  -- Get max position in target column if not specified
  IF p_target_position IS NULL THEN
    SELECT COALESCE(MAX(position) + 1, 0) INTO p_target_position
    FROM crm_cards WHERE column_id = p_target_column_id;
  END IF;

  -- If same column, just reorder
  IF v_old_column_id = p_target_column_id THEN
    -- Shift cards in same column
    IF v_old_position < p_target_position THEN
      UPDATE crm_cards SET position = position - 1
      WHERE column_id = v_old_column_id
        AND position > v_old_position
        AND position <= p_target_position;
    ELSE
      UPDATE crm_cards SET position = position + 1
      WHERE column_id = v_old_column_id
        AND position >= p_target_position
        AND position < v_old_position;
    END IF;
  ELSE
    -- Moving to different column
    -- Shift cards in old column
    UPDATE crm_cards SET position = position - 1
    WHERE column_id = v_old_column_id
      AND position > v_old_position;

    -- Shift cards in target column
    UPDATE crm_cards SET position = position + 1
    WHERE column_id = p_target_column_id
      AND position >= p_target_position;
  END IF;

  -- Update the card
  UPDATE crm_cards SET
    column_id = p_target_column_id,
    position = p_target_position,
    moved_to_column_at = CASE
      WHEN v_old_column_id != p_target_column_id THEN NOW()
      ELSE moved_to_column_at
    END,
    updated_at = NOW()
  WHERE id = p_card_id;

  -- Log activity if column changed
  IF v_old_column_id != p_target_column_id THEN
    INSERT INTO crm_activity_log (client_id, card_id, activity_type, old_value, new_value, is_automated)
    VALUES (
      v_client_id,
      p_card_id,
      'column_move',
      jsonb_build_object('column_id', v_old_column_id),
      jsonb_build_object('column_id', p_target_column_id),
      false
    );
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 12. TRIGGER - Auto-create card when contact is created
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_create_crm_card()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_default_column_id UUID;
BEGIN
  -- Get default column for this client
  SELECT id INTO v_default_column_id
  FROM crm_columns
  WHERE client_id = NEW.client_id AND is_default = true
  LIMIT 1;

  -- If no default column exists, skip
  IF v_default_column_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get next position
  DECLARE
    v_next_position INTEGER;
  BEGIN
    SELECT COALESCE(MAX(position) + 1, 0) INTO v_next_position
    FROM crm_cards WHERE column_id = v_default_column_id;

    -- Create card
    INSERT INTO crm_cards (client_id, column_id, phone, position)
    VALUES (NEW.client_id, v_default_column_id, NEW.telefone, v_next_position)
    ON CONFLICT (client_id, phone) DO NOTHING;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_crm_card
AFTER INSERT ON clientes_whatsapp
FOR EACH ROW
EXECUTE FUNCTION auto_create_crm_card();

-- -----------------------------------------------------------------------------
-- 13. SEED DEFAULT COLUMNS (run after migration)
-- -----------------------------------------------------------------------------
-- This will be handled by application code on first CRM access
```

---

## 3. Componentes UI

### 3.1 KanbanCard.tsx (Componente Principal Reutilizável)

```tsx
// src/components/crm/KanbanCard.tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Clock, User, MessageSquare, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CRMCard, CRMTag } from "@/lib/types";
import { CardStatusBadge } from "./CardStatusBadge";
import { CardTagList } from "./CardTagList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// =============================================================================
// TYPES
// =============================================================================
export interface KanbanCardProps {
  card: CRMCard;
  tags: CRMTag[];
  onClick?: () => void;
  onMoveToColumn?: (columnId: string) => void;
  onAssign?: (userId: string | null) => void;
  isDragging?: boolean;
  columns?: Array<{ id: string; name: string }>;
}

// =============================================================================
// COLOR MAPPING (Theme-aware via Tailwind)
// =============================================================================
const TAG_COLORS: Record<string, string> = {
  mint: "bg-uzz-mint/20 text-uzz-mint border-uzz-mint/30",
  blue: "bg-uzz-blue/20 text-uzz-blue border-uzz-blue/30",
  gold: "bg-uzz-gold/20 text-uzz-gold border-uzz-gold/30",
  red: "bg-destructive/20 text-destructive border-destructive/30",
  gray: "bg-muted text-muted-foreground border-border",
  default: "bg-secondary/20 text-secondary border-secondary/30",
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const formatPhone = (phone: string | number): string => {
  const phoneStr = String(phone);
  if (phoneStr.length === 13) {
    // 5511999999999 -> +55 (11) 99999-9999
    return `+${phoneStr.slice(0, 2)} (${phoneStr.slice(2, 4)}) ${phoneStr.slice(
      4,
      9,
    )}-${phoneStr.slice(9)}`;
  }
  return phoneStr;
};

// =============================================================================
// COMPONENT
// =============================================================================
export function KanbanCard({
  card,
  tags,
  onClick,
  onMoveToColumn,
  isDragging = false,
  columns = [],
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const contactName = card.contact?.name || "Sem nome";
  const cardTags = tags.filter((tag) => card.tagIds?.includes(tag.id));

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        // Base styles
        "bg-card border-border cursor-pointer",
        // Hover state
        "hover:border-primary/50 hover:shadow-md",
        // Transitions
        "transition-all duration-200",
        // Dragging state
        isDragging && "opacity-50 shadow-lg border-primary",
        // Auto-status indicator
        card.auto_status === "awaiting_attendant" &&
          "border-l-4 border-l-destructive",
        card.auto_status === "awaiting_client" &&
          "border-l-4 border-l-uzz-mint",
      )}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-3 space-y-3">
        {/* Header: Avatar + Name + Menu */}
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={card.contact?.avatarUrl} />
            <AvatarFallback className="bg-gradient-to-br from-secondary to-primary text-primary-foreground text-sm font-medium">
              {getInitials(contactName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground truncate">
              {contactName}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatPhone(card.phone)}
            </p>
          </div>

          {/* Quick Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {columns.map((col) => (
                <DropdownMenuItem
                  key={col.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToColumn?.(col.id);
                  }}
                >
                  Mover para {col.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Last Message Preview */}
        {card.last_message_preview && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {card.last_message_preview}
          </p>
        )}

        {/* Tags */}
        {cardTags.length > 0 && <CardTagList tags={cardTags} maxVisible={3} />}

        {/* Footer: Status + Time + Assigned */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <CardStatusBadge status={card.auto_status} />

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {card.assigned_to && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[60px]">
                  {card.assignedUser?.name?.split(" ")[0] || "Atribuído"}
                </span>
              </div>
            )}

            {card.last_message_at && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(card.last_message_at), {
                    addSuffix: false,
                    locale: ptBR,
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3.2 CardStatusBadge.tsx

```tsx
// src/components/crm/CardStatusBadge.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type AutoStatus = "awaiting_attendant" | "awaiting_client" | "neutral";

interface CardStatusBadgeProps {
  status: AutoStatus;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<
  AutoStatus,
  {
    label: string;
    icon: typeof AlertCircle;
    className: string;
  }
> = {
  awaiting_attendant: {
    label: "Aguardando resposta",
    icon: AlertCircle,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  awaiting_client: {
    label: "Aguardando cliente",
    icon: Clock,
    className: "bg-uzz-mint/10 text-uzz-mint border-uzz-mint/20",
  },
  neutral: {
    label: "Neutro",
    icon: CheckCircle,
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function CardStatusBadge({ status, size = "sm" }: CardStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-normal",
        config.className,
        size === "sm" && "text-xs px-1.5 py-0",
      )}
    >
      <Icon className={cn(size === "sm" ? "h-3 w-3" : "h-4 w-4")} />
      <span className={size === "sm" ? "hidden sm:inline" : ""}>
        {config.label}
      </span>
    </Badge>
  );
}
```

### 3.3 CardTagList.tsx

```tsx
// src/components/crm/CardTagList.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CRMTag } from "@/lib/types";

interface CardTagListProps {
  tags: CRMTag[];
  maxVisible?: number;
  onRemove?: (tagId: string) => void;
}

const TAG_COLORS: Record<string, string> = {
  mint: "bg-uzz-mint/20 text-uzz-mint border-uzz-mint/30 hover:bg-uzz-mint/30",
  blue: "bg-uzz-blue/20 text-uzz-blue border-uzz-blue/30 hover:bg-uzz-blue/30",
  gold: "bg-uzz-gold/20 text-uzz-gold border-uzz-gold/30 hover:bg-uzz-gold/30",
  red: "bg-destructive/20 text-destructive border-destructive/30 hover:bg-destructive/30",
  gray: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
  default:
    "bg-secondary/20 text-secondary-foreground border-secondary/30 hover:bg-secondary/30",
};

export function CardTagList({
  tags,
  maxVisible = 5,
  onRemove,
}: CardTagListProps) {
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          className={cn(
            "text-xs px-1.5 py-0 font-normal transition-colors",
            TAG_COLORS[tag.color] || TAG_COLORS.default,
          )}
        >
          {tag.name}
        </Badge>
      ))}
      {hiddenCount > 0 && (
        <Badge
          variant="outline"
          className="text-xs px-1.5 py-0 font-normal bg-muted"
        >
          +{hiddenCount}
        </Badge>
      )}
    </div>
  );
}
```

### 3.4 KanbanColumn.tsx

```tsx
// src/components/crm/KanbanColumn.tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { CRMColumn, CRMCard, CRMTag } from "@/lib/types";
import { KanbanCard } from "./KanbanCard";
import { ColumnHeader } from "./ColumnHeader";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface KanbanColumnProps {
  column: CRMColumn;
  cards: CRMCard[];
  tags: CRMTag[];
  allColumns: CRMColumn[];
  onCardClick: (card: CRMCard) => void;
  onCardMove: (cardId: string, columnId: string) => void;
  onEditColumn: () => void;
  onDeleteColumn: () => void;
  isOver?: boolean;
}

const COLUMN_COLORS: Record<string, string> = {
  mint: "border-t-uzz-mint",
  blue: "border-t-uzz-blue",
  gold: "border-t-uzz-gold",
  red: "border-t-destructive",
  gray: "border-t-muted-foreground",
  default: "border-t-primary",
};

export function KanbanColumn({
  column,
  cards,
  tags,
  allColumns,
  onCardClick,
  onCardMove,
  onEditColumn,
  onDeleteColumn,
  isOver = false,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id });

  const sortedCards = [...cards].sort((a, b) => a.position - b.position);
  const cardIds = sortedCards.map((c) => c.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        // Base styles
        "flex flex-col w-[300px] min-w-[300px] max-w-[300px]",
        "bg-surface rounded-lg border border-border",
        // Top accent border
        "border-t-4",
        COLUMN_COLORS[column.color] || COLUMN_COLORS.default,
        // Drop target highlight
        isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background",
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <ColumnHeader
          name={column.name}
          count={cards.length}
          icon={column.icon}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEditColumn}>
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDeleteColumn}
              className="text-destructive focus:text-destructive"
              disabled={column.is_default}
            >
              Excluir coluna
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards List */}
      <ScrollArea className="flex-1 p-2">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sortedCards.map((card) => (
              <KanbanCard
                key={card.id}
                card={card}
                tags={tags}
                columns={allColumns.filter((c) => c.id !== column.id)}
                onClick={() => onCardClick(card)}
                onMoveToColumn={(colId) => onCardMove(card.id, colId)}
              />
            ))}
          </div>
        </SortableContext>

        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">Nenhum card nesta coluna</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
```

### 3.5 KanbanBoard.tsx

```tsx
// src/components/crm/KanbanBoard.tsx
"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CRMColumn, CRMCard, CRMTag } from "@/lib/types";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { CardDetailPanel } from "./CardDetailPanel";
import { ColumnSettingsDialog } from "./ColumnSettingsDialog";

interface KanbanBoardProps {
  columns: CRMColumn[];
  cards: CRMCard[];
  tags: CRMTag[];
  onMoveCard: (
    cardId: string,
    targetColumnId: string,
    position?: number,
  ) => Promise<void>;
  onCreateColumn: (data: Partial<CRMColumn>) => Promise<void>;
  onUpdateColumn: (id: string, data: Partial<CRMColumn>) => Promise<void>;
  onDeleteColumn: (id: string) => Promise<void>;
}

export function KanbanBoard({
  columns,
  cards,
  tags,
  onMoveCard,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
}: KanbanBoardProps) {
  const [activeCard, setActiveCard] = useState<CRMCard | null>(null);
  const [selectedCard, setSelectedCard] = useState<CRMCard | null>(null);
  const [editingColumn, setEditingColumn] = useState<CRMColumn | null>(null);
  const [isCreatingColumn, setIsCreatingColumn] = useState(false);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const card = cards.find((c) => c.id === event.active.id);
      if (card) setActiveCard(card);
    },
    [cards],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (over) {
        // Check if over a column or a card
        const overColumn = columns.find((c) => c.id === over.id);
        if (overColumn) {
          setOverColumnId(overColumn.id);
        } else {
          const overCard = cards.find((c) => c.id === over.id);
          if (overCard) {
            setOverColumnId(overCard.column_id);
          }
        }
      } else {
        setOverColumnId(null);
      }
    },
    [columns, cards],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveCard(null);
      setOverColumnId(null);

      if (!over) return;

      const activeCardId = active.id as string;
      const activeCard = cards.find((c) => c.id === activeCardId);
      if (!activeCard) return;

      // Determine target column
      let targetColumnId: string;
      const overColumn = columns.find((c) => c.id === over.id);
      if (overColumn) {
        targetColumnId = overColumn.id;
      } else {
        const overCard = cards.find((c) => c.id === over.id);
        if (overCard) {
          targetColumnId = overCard.column_id;
        } else {
          return;
        }
      }

      // Only move if column changed
      if (activeCard.column_id !== targetColumnId) {
        await onMoveCard(activeCardId, targetColumnId);
      }
    },
    [cards, columns, onMoveCard],
  );

  const getCardsByColumn = useCallback(
    (columnId: string) => {
      return cards.filter((c) => c.column_id === columnId);
    },
    [cards],
  );

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  return (
    <div className="flex flex-col h-full">
      {/* Board Content */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-4 p-4 min-h-full">
            {sortedColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={getCardsByColumn(column.id)}
                tags={tags}
                allColumns={sortedColumns}
                onCardClick={setSelectedCard}
                onCardMove={onMoveCard}
                onEditColumn={() => setEditingColumn(column)}
                onDeleteColumn={() => onDeleteColumn(column.id)}
                isOver={overColumnId === column.id}
              />
            ))}

            {/* Add Column Button */}
            <Button
              variant="outline"
              className="w-[300px] min-w-[300px] h-auto min-h-[200px] border-dashed flex-col gap-2"
              onClick={() => setIsCreatingColumn(true)}
            >
              <Plus className="h-6 w-6" />
              <span>Adicionar coluna</span>
            </Button>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeCard && (
            <KanbanCard card={activeCard} tags={tags} isDragging />
          )}
        </DragOverlay>
      </DndContext>

      {/* Detail Panel */}
      {selectedCard && (
        <CardDetailPanel
          card={selectedCard}
          tags={tags}
          onClose={() => setSelectedCard(null)}
        />
      )}

      {/* Column Settings Dialog */}
      <ColumnSettingsDialog
        open={!!editingColumn || isCreatingColumn}
        column={editingColumn}
        onClose={() => {
          setEditingColumn(null);
          setIsCreatingColumn(false);
        }}
        onSave={async (data) => {
          if (editingColumn) {
            await onUpdateColumn(editingColumn.id, data);
          } else {
            await onCreateColumn(data);
          }
          setEditingColumn(null);
          setIsCreatingColumn(false);
        }}
      />
    </div>
  );
}
```

### 3.6 CardDetailPanel.tsx

```tsx
// src/components/crm/CardDetailPanel.tsx
"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  X,
  Phone,
  MessageSquare,
  Calendar,
  Tag,
  StickyNote,
  History,
  ExternalLink,
} from "lucide-react";
import { CRMCard, CRMTag } from "@/lib/types";
import { CardStatusBadge } from "./CardStatusBadge";
import { CardTagList } from "./CardTagList";
import { CardNotes } from "./CardNotes";
import { CardTimeline } from "./CardTimeline";
import { CardMessages } from "./CardMessages";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";

interface CardDetailPanelProps {
  card: CRMCard;
  tags: CRMTag[];
  onClose: () => void;
}

const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const formatPhone = (phone: string | number): string => {
  const phoneStr = String(phone);
  if (phoneStr.length === 13) {
    return `+${phoneStr.slice(0, 2)} (${phoneStr.slice(2, 4)}) ${phoneStr.slice(
      4,
      9,
    )}-${phoneStr.slice(9)}`;
  }
  return phoneStr;
};

export function CardDetailPanel({ card, tags, onClose }: CardDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("info");
  const contactName = card.contact?.name || "Sem nome";
  const cardTags = tags.filter((tag) => card.tagIds?.includes(tag.id));

  return (
    <Sheet open onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-gradient-to-br from-secondary to-primary text-primary-foreground text-lg font-medium">
                {getInitials(contactName)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg truncate">
                {contactName}
              </SheetTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {formatPhone(card.phone)}
              </p>
              <div className="mt-2">
                <CardStatusBadge status={card.auto_status} size="md" />
              </div>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Quick Actions */}
        <div className="flex gap-2 p-4 border-b border-border">
          <Button variant="outline" size="sm" asChild className="flex-1">
            <Link href={`/dashboard/conversations?phone=${card.phone}`}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Ver Conversa
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Calendar className="h-4 w-4 mr-2" />
            Agendar
          </Button>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col"
        >
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="info" className="flex-1">
              Info
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex-1">
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1">
              Notas
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              Histórico
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="info" className="p-4 space-y-6 m-0">
              {/* Tags Section */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </h4>
                <CardTagList tags={cardTags} maxVisible={10} />
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-muted-foreground"
                >
                  + Adicionar tag
                </Button>
              </div>

              <Separator />

              {/* Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">
                  Detalhes
                </h4>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Criado em</p>
                    <p className="text-foreground">
                      {format(new Date(card.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Na coluna desde</p>
                    <p className="text-foreground">
                      {formatDistanceToNow(new Date(card.moved_to_column_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Última mensagem</p>
                    <p className="text-foreground">
                      {card.last_message_at
                        ? formatDistanceToNow(new Date(card.last_message_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })
                        : "Nenhuma"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Responsável</p>
                    <p className="text-foreground">
                      {card.assignedUser?.name || "Não atribuído"}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Value */}
              {card.estimated_value && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    Valor Estimado
                  </h4>
                  <p className="text-2xl font-bold text-uzz-mint">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: card.currency || "BRL",
                    }).format(card.estimated_value)}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="messages" className="p-4 m-0">
              <CardMessages phone={card.phone} />
            </TabsContent>

            <TabsContent value="notes" className="p-4 m-0">
              <CardNotes cardId={card.id} />
            </TabsContent>

            <TabsContent value="history" className="p-4 m-0">
              <CardTimeline cardId={card.id} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
```

### 3.7 ColumnHeader.tsx

```tsx
// src/components/crm/ColumnHeader.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";

interface ColumnHeaderProps {
  name: string;
  count: number;
  icon?: string;
}

export function ColumnHeader({
  name,
  count,
  icon = "Users",
}: ColumnHeaderProps) {
  // Dynamically get icon from lucide-react
  const IconComponent =
    (
      LucideIcons as Record<string, React.ComponentType<{ className?: string }>>
    )[icon.charAt(0).toUpperCase() + icon.slice(1)] || LucideIcons.Users;

  return (
    <div className="flex items-center gap-2">
      <IconComponent className="h-4 w-4 text-muted-foreground" />
      <h3 className="font-medium text-foreground">{name}</h3>
      <Badge variant="secondary" className="text-xs">
        {count}
      </Badge>
    </div>
  );
}
```

### 3.8 Page CRM

```tsx
// src/app/dashboard/crm/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { CRMFilters } from "@/components/crm/CRMFilters";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, LayoutGrid, List } from "lucide-react";
import { useCRMColumns } from "@/hooks/useCRMColumns";
import { useCRMCards } from "@/hooks/useCRMCards";
import { useCRMTags } from "@/hooks/useCRMTags";

export default function CRMPage() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState({
    search: "",
    autoStatus: "" as string,
    tagId: "" as string,
    assignedTo: "" as string,
  });

  const router = useRouter();
  const supabase = createBrowserClient();

  // Fetch client_id
  useEffect(() => {
    const fetchClientId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("client_id")
        .eq("id", user.id)
        .single();

      if (profile?.client_id) {
        setClientId(profile.client_id);
      }
      setIsLoading(false);
    };

    fetchClientId();
  }, [supabase, router]);

  // Hooks
  const { columns, createColumn, updateColumn, deleteColumn, reorderColumns } =
    useCRMColumns(clientId);
  const {
    cards,
    moveCard,
    refetch: refetchCards,
  } = useCRMCards(clientId, filters);
  const { tags } = useCRMTags(clientId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-140px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus leads e conversas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle - Hidden on mobile */}
          <div className="hidden md:flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <CRMFilters filters={filters} onFiltersChange={setFilters} tags={tags} />

      {/* Content */}
      {/* Mobile: Tab-based columns */}
      <div className="md:hidden flex-1">
        <Tabs defaultValue={columns[0]?.id} className="h-full flex flex-col">
          <TabsList className="mx-4 overflow-x-auto flex-shrink-0">
            {columns.map((col) => (
              <TabsTrigger
                key={col.id}
                value={col.id}
                className="flex-shrink-0"
              >
                {col.name} ({cards.filter((c) => c.column_id === col.id).length}
                )
              </TabsTrigger>
            ))}
          </TabsList>

          {columns.map((col) => (
            <TabsContent key={col.id} value={col.id} className="flex-1 m-0 p-4">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {cards
                    .filter((c) => c.column_id === col.id)
                    .sort((a, b) => a.position - b.position)
                    .map((card) => (
                      <div key={card.id}>
                        {/* Import and use KanbanCard here */}
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Desktop: Kanban Board */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <KanbanBoard
          columns={columns}
          cards={cards}
          tags={tags}
          onMoveCard={moveCard}
          onCreateColumn={createColumn}
          onUpdateColumn={updateColumn}
          onDeleteColumn={deleteColumn}
        />
      </div>
    </div>
  );
}
```

---

## 4. APIs

### 4.1 GET /api/crm/columns

```typescript
// src/app/api/crm/columns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { getClientIdFromSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from("crm_columns")
      .select("*")
      .eq("client_id", clientId)
      .eq("is_archived", false)
      .order("position", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ columns: data });
  } catch (error) {
    console.error("Error fetching columns:", error);
    return NextResponse.json(
      { error: "Failed to fetch columns" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, color = "default", icon = "users" } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Get next position
    const { data: maxPos } = await supabase
      .from("crm_columns")
      .select("position")
      .eq("client_id", clientId)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    const nextPosition = (maxPos?.position ?? -1) + 1;

    // Create slug from name
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data, error } = await supabase
      .from("crm_columns")
      .insert({
        client_id: clientId,
        name,
        slug,
        color,
        icon,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ column: data });
  } catch (error) {
    console.error("Error creating column:", error);
    return NextResponse.json(
      { error: "Failed to create column" },
      { status: 500 },
    );
  }
}
```

### 4.2 POST /api/crm/cards/[id]/move

```typescript
// src/app/api/crm/cards/[id]/move/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { getClientIdFromSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: cardId } = await params;
    const clientId = await getClientIdFromSession(request);
    if (!clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { column_id, position } = body;

    if (!column_id) {
      return NextResponse.json(
        { error: "column_id is required" },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // Use database function for atomic move
    const { error } = await supabase.rpc("crm_move_card", {
      p_card_id: cardId,
      p_target_column_id: column_id,
      p_target_position: position ?? null,
    });

    if (error) throw error;

    // Fetch updated card
    const { data: card } = await supabase
      .from("crm_cards")
      .select("*, contact:clientes_whatsapp!fk_card_contact(nome, telefone)")
      .eq("id", cardId)
      .single();

    return NextResponse.json({ card });
  } catch (error) {
    console.error("Error moving card:", error);
    return NextResponse.json({ error: "Failed to move card" }, { status: 500 });
  }
}
```

---

## 5. Hooks

### 5.1 useCRMColumns.ts

```typescript
// src/hooks/useCRMColumns.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { CRMColumn } from "@/lib/types";

export function useCRMColumns(clientId: string | null) {
  const [columns, setColumns] = useState<CRMColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchColumns = useCallback(async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      const res = await fetch("/api/crm/columns");
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setColumns(data.columns || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchColumns();
  }, [fetchColumns]);

  const createColumn = async (data: Partial<CRMColumn>) => {
    const res = await fetch("/api/crm/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to create");

    const result = await res.json();
    setColumns((prev) => [...prev, result.column]);
    return result.column;
  };

  const updateColumn = async (id: string, data: Partial<CRMColumn>) => {
    const res = await fetch(`/api/crm/columns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update");

    const result = await res.json();
    setColumns((prev) => prev.map((c) => (c.id === id ? result.column : c)));
    return result.column;
  };

  const deleteColumn = async (id: string) => {
    const res = await fetch(`/api/crm/columns/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete");

    setColumns((prev) => prev.filter((c) => c.id !== id));
  };

  const reorderColumns = async (orderedIds: string[]) => {
    const res = await fetch("/api/crm/columns/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: orderedIds }),
    });
    if (!res.ok) throw new Error("Failed to reorder");

    // Optimistic update
    setColumns((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      return orderedIds.map((id, index) => ({
        ...map.get(id)!,
        position: index,
      }));
    });
  };

  return {
    columns,
    loading,
    error,
    refetch: fetchColumns,
    createColumn,
    updateColumn,
    deleteColumn,
    reorderColumns,
  };
}
```

### 5.2 useCRMCards.ts

```typescript
// src/hooks/useCRMCards.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { CRMCard } from "@/lib/types";

interface CRMCardsFilters {
  search?: string;
  autoStatus?: string;
  tagId?: string;
  assignedTo?: string;
}

export function useCRMCards(
  clientId: string | null,
  filters: CRMCardsFilters = {},
) {
  const [cards, setCards] = useState<CRMCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    if (!clientId) return;

    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.autoStatus) params.set("auto_status", filters.autoStatus);
      if (filters.tagId) params.set("tag_id", filters.tagId);
      if (filters.assignedTo) params.set("assigned_to", filters.assignedTo);

      const res = await fetch(`/api/crm/cards?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setCards(data.cards || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [
    clientId,
    filters.search,
    filters.autoStatus,
    filters.tagId,
    filters.assignedTo,
  ]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const moveCard = async (
    cardId: string,
    targetColumnId: string,
    position?: number,
  ) => {
    // Optimistic update
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              column_id: targetColumnId,
              moved_to_column_at: new Date().toISOString(),
            }
          : c,
      ),
    );

    try {
      const res = await fetch(`/api/crm/cards/${cardId}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ column_id: targetColumnId, position }),
      });

      if (!res.ok) {
        // Revert on failure
        await fetchCards();
        throw new Error("Failed to move card");
      }
    } catch (err) {
      await fetchCards();
      throw err;
    }
  };

  return {
    cards,
    loading,
    error,
    refetch: fetchCards,
    moveCard,
  };
}
```

---

## 6. Types

### Adicionar a `src/lib/types.ts`

```typescript
// =============================================================================
// CRM MODULE TYPES
// =============================================================================

export interface CRMColumn {
  id: string;
  client_id: string;
  name: string;
  slug: string;
  color: string;
  icon: string;
  position: number;
  auto_rules: Record<string, unknown>;
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CRMCard {
  id: string;
  client_id: string;
  column_id: string;
  phone: number;
  position: number;
  auto_status: "awaiting_attendant" | "awaiting_client" | "neutral";
  auto_status_updated_at: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  estimated_value: number | null;
  currency: string;
  probability: number;
  expected_close_date: string | null;
  last_message_at: string | null;
  last_message_direction: "incoming" | "outgoing" | null;
  last_message_preview: string | null;
  moved_to_column_at: string;
  created_at: string;
  updated_at: string;
  // Joined data
  contact?: {
    name: string | null;
    avatarUrl?: string;
  };
  assignedUser?: {
    name: string;
  };
  tagIds?: string[];
}

export interface CRMTag {
  id: string;
  client_id: string;
  name: string;
  color: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
}

export interface CRMNote {
  id: string;
  card_id: string;
  client_id: string;
  content: string;
  created_by: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  author?: {
    name: string;
  };
}

export interface CRMActivityLog {
  id: string;
  client_id: string;
  card_id: string;
  activity_type:
    | "column_move"
    | "tag_add"
    | "tag_remove"
    | "note_add"
    | "assigned"
    | "status_change"
    | "value_change"
    | "created";
  description: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  performed_by: string | null;
  is_automated: boolean;
  created_at: string;
  // Joined data
  performer?: {
    name: string;
  };
}

export interface ScheduledMessage {
  id: string;
  client_id: string;
  phone: number;
  card_id: string | null;
  message_type: "text" | "template";
  content: string | null;
  template_id: string | null;
  template_params: Record<string, unknown> | null;
  scheduled_for: string;
  timezone: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  sent_at: string | null;
  error_message: string | null;
  wamid: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LeadSource {
  id: string;
  client_id: string;
  phone: number;
  source_type: "meta_ads" | "organic" | "referral" | "manual";
  source_name: string | null;
  meta_campaign_id: string | null;
  meta_campaign_name: string | null;
  meta_adset_id: string | null;
  meta_adset_name: string | null;
  meta_ad_id: string | null;
  meta_ad_name: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  raw_referral_data: Record<string, unknown> | null;
  first_contact_at: string;
  created_at: string;
}

export interface CRMAutomationRule {
  id: string;
  client_id: string;
  name: string;
  description: string | null;
  trigger_type:
    | "time_in_column"
    | "no_response"
    | "message_received"
    | "tag_added";
  trigger_config: Record<string, unknown>;
  action_type:
    | "move_column"
    | "add_tag"
    | "send_message"
    | "assign_user"
    | "notify";
  action_config: Record<string, unknown>;
  is_enabled: boolean;
  priority: number;
  created_at: string;
}
```

---

## 7. Integração com Fluxo Existente

### 7.1 Modificar `src/nodes/parseMessage.ts`

Adicionar extração de referral:

```typescript
// Adicionar ao interface ParsedMessage
export interface ParsedMessage {
  // ... campos existentes
  referral?: {
    source_url?: string;
    source_type?: string;
    source_id?: string;
    headline?: string;
    body?: string;
    ctwa_clid?: string;
  };
}

// Na função parseMessage, adicionar:
const referral = webhookMessage.referral;
if (referral) {
  parsedMessage.referral = {
    source_url: referral.source_url,
    source_type: referral.source_type,
    source_id: referral.source_id,
    headline: referral.headline,
    body: referral.body,
    ctwa_clid: referral.ctwa_clid,
  };
}
```

### 7.2 Novo Node: `src/nodes/updateCRMCardStatus.ts`

```typescript
// src/nodes/updateCRMCardStatus.ts
import { createServiceRoleClient } from "@/lib/supabase";

interface UpdateCRMCardStatusInput {
  clientId: string;
  phone: string | number;
  direction: "incoming" | "outgoing";
  messagePreview?: string;
}

export async function updateCRMCardStatus({
  clientId,
  phone,
  direction,
  messagePreview,
}: UpdateCRMCardStatusInput): Promise<void> {
  const supabase = createServiceRoleClient();
  const phoneNumeric = typeof phone === "string" ? parseInt(phone, 10) : phone;

  const newStatus =
    direction === "incoming" ? "awaiting_attendant" : "awaiting_client";

  const { error } = await supabase
    .from("crm_cards")
    .update({
      auto_status: newStatus,
      auto_status_updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      last_message_direction: direction,
      last_message_preview: messagePreview?.substring(0, 100) || null,
      updated_at: new Date().toISOString(),
    })
    .eq("client_id", clientId)
    .eq("phone", phoneNumeric);

  if (error) {
    console.error("[updateCRMCardStatus] Error:", error);
    // Non-blocking - don't throw
  }
}
```

### 7.3 Novo Node: `src/nodes/captureLeadSource.ts`

```typescript
// src/nodes/captureLeadSource.ts
import { createServiceRoleClient } from "@/lib/supabase";

interface ReferralData {
  source_url?: string;
  source_type?: string;
  source_id?: string;
  headline?: string;
  body?: string;
  ctwa_clid?: string;
}

interface CaptureLeadSourceInput {
  clientId: string;
  phone: string | number;
  referral?: ReferralData;
}

export async function captureLeadSource({
  clientId,
  phone,
  referral,
}: CaptureLeadSourceInput): Promise<void> {
  if (!referral) return;

  const supabase = createServiceRoleClient();
  const phoneNumeric = typeof phone === "string" ? parseInt(phone, 10) : phone;

  // Check if source already exists (first-touch attribution)
  const { data: existing } = await supabase
    .from("lead_sources")
    .select("id")
    .eq("client_id", clientId)
    .eq("phone", phoneNumeric)
    .maybeSingle();

  if (existing) {
    // Already have source attribution
    return;
  }

  // Determine source type
  const sourceType = referral.source_type === "ad" ? "meta_ads" : "organic";

  // Insert lead source
  const { error: insertError } = await supabase.from("lead_sources").insert({
    client_id: clientId,
    phone: phoneNumeric,
    source_type: sourceType,
    source_name: referral.headline || null,
    meta_ad_id: referral.source_id || null,
    meta_ad_name: referral.headline || null,
    raw_referral_data: referral,
  });

  if (insertError) {
    console.error("[captureLeadSource] Insert error:", insertError);
    return;
  }

  // Auto-tag if meta_ads
  if (sourceType === "meta_ads") {
    await addSystemTag(supabase, clientId, phoneNumeric, "source:meta_ads");
  }
}

async function addSystemTag(
  supabase: ReturnType<typeof createServiceRoleClient>,
  clientId: string,
  phone: number,
  tagName: string,
) {
  // Get or create system tag
  let { data: tag } = await supabase
    .from("crm_tags")
    .select("id")
    .eq("client_id", clientId)
    .eq("name", tagName)
    .eq("is_system", true)
    .maybeSingle();

  if (!tag) {
    const { data: newTag } = await supabase
      .from("crm_tags")
      .insert({
        client_id: clientId,
        name: tagName,
        color: "blue",
        is_system: true,
      })
      .select("id")
      .single();
    tag = newTag;
  }

  if (!tag) return;

  // Get card ID
  const { data: card } = await supabase
    .from("crm_cards")
    .select("id")
    .eq("client_id", clientId)
    .eq("phone", phone)
    .maybeSingle();

  if (!card) return;

  // Add tag to card
  await supabase
    .from("crm_card_tags")
    .insert({
      card_id: card.id,
      tag_id: tag.id,
    })
    .onConflict("card_id,tag_id")
    .ignore();
}
```

### 7.4 Modificar `src/flows/chatbotFlow.ts`

Adicionar chamadas aos novos nodes:

```typescript
// Após NODE 2 (parseMessage), adicionar:
// NODE 2.5: Capture Lead Source (if referral data exists)
if (parsedMessage.referral) {
  await captureLeadSource({
    clientId: config.id,
    phone: parsedMessage.phone,
    referral: parsedMessage.referral,
  });
}

// Após NODE 8 (saveChatMessage para user), adicionar:
// NODE 8.5: Update CRM Card Status (incoming)
await updateCRMCardStatus({
  clientId: config.id,
  phone: parsedMessage.phone,
  direction: "incoming",
  messagePreview: parsedMessage.content,
});

// Após NODE 14 (sendAndSaveWhatsAppMessages), adicionar:
// NODE 14.5: Update CRM Card Status (outgoing)
await updateCRMCardStatus({
  clientId: config.id,
  phone: parsedMessage.phone,
  direction: "outgoing",
  messagePreview: formattedResponse.substring(0, 100),
});
```

---

## 8. Automações

### 8.1 Cron de Mensagens Agendadas

```typescript
// src/app/api/cron/scheduled-messages/route.ts
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { sendTextMessage } from "@/lib/whatsapp";
import { getClientConfig } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  // Get pending messages due to be sent
  const { data: messages, error } = await supabase
    .from("scheduled_messages")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", now)
    .limit(10);

  if (error) {
    console.error("[Scheduled Messages] Query error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const results = [];

  for (const message of messages || []) {
    try {
      // Get client config for WhatsApp credentials
      const config = await getClientConfig(message.client_id);
      if (!config) {
        throw new Error("Client config not found");
      }

      // Send message
      const result = await sendTextMessage(
        String(message.phone),
        message.content || "",
        config,
      );

      // Update as sent
      await supabase
        .from("scheduled_messages")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          wamid: result.messageId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", message.id);

      results.push({ id: message.id, status: "sent" });
    } catch (err) {
      // Update as failed
      await supabase
        .from("scheduled_messages")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", message.id);

      results.push({ id: message.id, status: "failed", error: String(err) });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
```

---

## 9. Backlog em Fases

### Fase 1: MVP (2-3 semanas) ✅ COMPLETO

- [x] Migration: crm_columns, crm_cards, crm_tags, crm_card_tags
- [x] RLS policies
- [x] Seed colunas padrão (Novo, Qualificando, Proposta, Fechado)
- [x] API: CRUD colunas
- [x] API: CRUD cards + move
- [x] API: CRUD tags
- [x] Componente: KanbanCard (reutilizável)
- [x] Componente: KanbanColumn
- [x] Componente: KanbanBoard com drag-and-drop
- [x] Componente: CardDetailPanel básico
- [x] Hooks: useCRMColumns, useCRMCards, useCRMTags
- [x] Página: /dashboard/crm
- [x] Mobile: Tabs por coluna
- [x] Link na navegação do dashboard

### Fase 2: v1.0 (2-3 semanas) ✅ COMPLETO

- [x] Migration: crm_notes, crm_activity_log, scheduled_messages
- [x] API: CRUD notas
- [x] API: Activity log
- [x] API: Scheduled messages
- [x] Componente: CardNotes
- [x] Componente: CardTimeline
- [x] Componente: ScheduleMessageDialog
- [x] Node: updateCRMCardStatus
- [x] Integração: Auto-status no chatbotFlow
- [x] Cron: Processador de mensagens agendadas
- [x] Filtros: por auto-status, tag, responsável

### Fase 3: v2.0 (3-4 semanas) ✅ COMPLETO

- [x] Migration: lead_sources, crm_automation_rules
- [x] API: Lead sources
- [x] API: Analytics (funnel, sources, response time)
- [x] API: Automation rules
- [x] Node: captureLeadSource
- [x] Integração: Captura de referral Meta Ads no webhook
- [x] Auto-tagging de leads de anúncios
- [x] Componente: AutomationRulesPanel
- [x] Dashboard de analytics
- [x] Relatórios por campanha

---

## 10. Riscos e Mitigações

| Risco                        | Mitigação                                                  |
| ---------------------------- | ---------------------------------------------------------- |
| Cards duplicados             | UNIQUE constraint em `(client_id, phone)` + upsert         |
| Race condition no drag-drop  | Constraint `DEFERRABLE` + função `crm_move_card()` atômica |
| Mensagens fora de ordem      | Usar timestamp do WhatsApp API                             |
| Performance com muitos cards | Virtual scrolling + paginação + índices                    |
| Webhook lento                | Capturar referral cedo + inserção async                    |
| Cores hardcoded              | Usar apenas classes Tailwind (uzz-mint, uzz-blue, etc.)    |
| Mobile responsivo            | Tabs no mobile + Kanban no desktop                         |

---

## Arquivos Críticos (Referência Rápida)

**Criar:**

- `supabase/migrations/YYYYMMDD_crm_module.sql`
- `src/app/dashboard/crm/page.tsx`
- `src/components/crm/*.tsx` (9 componentes)
- `src/hooks/useCRM*.ts` (4 hooks)
- `src/app/api/crm/**/*.ts` (15+ endpoints)
- `src/nodes/updateCRMCardStatus.ts`
- `src/nodes/captureLeadSource.ts`
- `src/app/api/cron/scheduled-messages/route.ts`

**Modificar:**

- `src/lib/types.ts` (adicionar interfaces CRM)
- `src/flows/chatbotFlow.ts` (chamar novos nodes)
- `src/nodes/parseMessage.ts` (extrair referral)
- `src/components/DashboardNavigation.tsx` (link CRM)

---

##  Status de Conclusão

> **PROJETO COMPLETO** - Janeiro 2025

### Resumo da Implementação

Todas as 3 fases do CRM Kanban foram implementadas com sucesso:

| Fase | Status | Descrição |
|------|--------|-----------|
| **Fase 1: MVP** |  100% | Kanban com drag-and-drop, cards, colunas, tags |
| **Fase 2: v1.0** |  100% | Agendamento de mensagens, notas, auto-status |
| **Fase 3: v2.0** |  100% | Analytics, automações, integração Meta Ads |

### Componentes Criados

- KanbanBoard.tsx - Board principal com DnD
- KanbanColumn.tsx - Coluna com header configurável
- KanbanCard.tsx - Card reutilizável com avatar
- CardDetailPanel.tsx - Painel lateral completo
- CardStatusBadge.tsx - Badge de status (dropdown)
- CardTagList.tsx - Lista de tags editável
- CardNotes.tsx - Notas do card
- CardTimeline.tsx - Timeline de atividades
- ScheduleMessageDialog.tsx - Agendamento de mensagens
- CRMAnalyticsDashboard.tsx - Dashboard de métricas
- CRMAutomationPanel.tsx - Regras de automação
- CRMFilters.tsx - Filtros avançados

### APIs Implementadas

- columns/ - CRUD colunas + reorder
- cards/ - CRUD cards + move + tags + notes
- tags/ - CRUD tags
- scheduled/ - CRUD mensagens agendadas
- analytics/ - Funil, origens, métricas
- automation-rules/ - CRUD regras de automação
- settings/ - Configurações do CRM

### Funcionalidades Entregues

**Core:**
- Kanban com drag-and-drop (mouse + touch)
- Criação/edição de colunas personalizadas
- Cores e ícones configuráveis
- Cards com informações do contato
- Painel lateral de detalhes

**Comunicação:**
- Preview das últimas mensagens
- Link direto para conversa
- Agendamento de mensagens futuras

**Rastreamento:**
- Auto-status (Aguardando Atendente/Cliente)
- Timeline de atividades
- Notas por card
- Tags personalizáveis

**Analytics:**
- Dashboard com métricas em tempo real
- Gráfico de funil de conversão
- Origem dos leads (Meta Ads, direto)
- Distribuição por status

**Automações:**
- Regras condicionais (trigger  action)
- Triggers: nova conversa, inatividade, keyword
- Actions: mover coluna, adicionar tag, notificar
- Log de execuções

### Próximos Passos (Opcional)

Ver [META_ADS_INTEGRATION.md](./META_ADS_INTEGRATION.md) para:
- Conversions API (enviar eventos de conversão para Meta)
- Marketing API Insights (métricas de campanhas)
- Dashboard de ROI por campanha

---

*Documentação original: Janeiro 2025*
*Implementação concluída: Janeiro 2025*
