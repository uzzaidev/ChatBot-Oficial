# Schema Updates — 2026-04-15

**Referência base:** `2026-03-15_chatbot-oficial/08_SUPABASE_SCHEMA_FROM_MIGRATIONS.md`
**Total de migrations:** 140 (eram 129 em 2026-03-15 → +11 migrations)

> Este documento documenta APENAS as mudanças de schema desde 2026-03-15.
> Para o schema completo, consulte o checkpoint anterior.

---

## Novas Migrations (2026-03-15 → 2026-04-15)

### Calendário

| Migration | Propósito |
|-----------|-----------|
| `*_calendar_*` | Integração Google/Microsoft Calendar (criação, verificação, cancelamento de eventos) |

### CRM Metadata (2026-04-15)

| Migration | Propósito |
|-----------|-----------|
| `20260415110000_add_metadata_to_clientes_whatsapp.sql` | Coluna JSONB metadata + índice GIN |
| `20260415113000_create_merge_contact_metadata_rpc.sql` | RPC `merge_contact_metadata` |

---

## Alteração: `clientes_whatsapp`

### Coluna adicionada

```sql
metadata JSONB NOT NULL DEFAULT '{}'::jsonb
```

**Índice:**
```sql
CREATE INDEX idx_clientes_whatsapp_metadata_gin
  ON public.clientes_whatsapp USING GIN (metadata);
```

**Schema completo atualizado da tabela:**
```sql
CREATE TABLE clientes_whatsapp (
  telefone    NUMERIC NOT NULL,
  nome        TEXT,
  status      TEXT DEFAULT 'bot',   -- 'bot' | 'humano' | 'transferido' | 'fluxo_inicial'
  client_id   UUID REFERENCES clients(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  metadata    JSONB NOT NULL DEFAULT '{}',   -- ← NOVO
  PRIMARY KEY (telefone, client_id)
);
```

**Campos metadata utilizados atualmente:**

| Campo | Tipo | Quem preenche | Descrição |
|-------|------|---------------|-----------|
| `cpf` | string | Bot (tool call) | CPF do contato |
| `email` | string | Bot (tool call) | E-mail do contato |
| `como_conheceu` | string | Bot (tool call) | Como ficou sabendo da escola |
| `indicado_por` | string | Bot (tool call) | Nome de quem indicou (se aplicável) |
| `objetivo` | string | Bot (tool call) | Objetivo declarado com o Yōga |

> O campo é livre — outros clientes podem usar outras chaves sem migration adicional.

---

## Nova RPC: `merge_contact_metadata`

```sql
CREATE OR REPLACE FUNCTION merge_contact_metadata(
  p_telefone NUMERIC,
  p_client_id UUID,
  p_metadata JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE clientes_whatsapp
  SET metadata = COALESCE(metadata, '{}') || p_metadata
  WHERE telefone = p_telefone AND client_id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Comportamento:** Merge não-destrutivo com operador `||` do PostgreSQL. Chaves existentes são mantidas; apenas as chaves do `p_metadata` são inseridas/atualizadas.

**Chamada TypeScript:**
```typescript
await supabase.rpc('merge_contact_metadata', {
  p_telefone: Number(phone),
  p_client_id: clientId,
  p_metadata: { cpf: '123...', email: 'x@y.com' },
})
```

---

## Alteração: `n8n_chat_histories` — Novo tipo de mensagem

A tabela não foi alterada estruturalmente, mas agora aceita mensagens com `type: "system"` além de `"human"` e `"ai"`.

**Uso:** Ao criar evento no calendário, salva marcador:
```json
{
  "type": "system",
  "content": "[SISTEMA] Evento agendado: Reunião em 2026-04-16T10:00:00-03:00. ID: abc123"
}
```

Esse marcador é incluído no histórico que a IA recebe, evitando criação duplicada de eventos.

---

## Status das Migrations

| Migration | Status |
|-----------|--------|
| `20260415110000_add_metadata_to_clientes_whatsapp.sql` | ⚠️ Criada, aguarda `supabase db push` |
| `20260415113000_create_merge_contact_metadata_rpc.sql` | ⚠️ Criada, aguarda `supabase db push` |
| Migrations de calendário | ✅ Aplicadas em produção |

**Comando para aplicar:**
```bash
supabase db push
```

---

## Guia rápido — Consultas ao metadata

```sql
-- Ver todos contatos com CPF coletado (de um cliente)
SELECT telefone, nome, metadata->>'cpf' AS cpf
FROM clientes_whatsapp
WHERE client_id = 'uuid-do-cliente'
  AND metadata ? 'cpf';

-- Ver como os prospects conheceram a escola
SELECT metadata->>'como_conheceu' AS origem, COUNT(*) AS total
FROM clientes_whatsapp
WHERE client_id = 'uuid-do-cliente'
  AND metadata ? 'como_conheceu'
GROUP BY origem
ORDER BY total DESC;

-- Contatos com metadata completo (todos os campos preenchidos)
SELECT telefone, nome, metadata
FROM clientes_whatsapp
WHERE client_id = 'uuid-do-cliente'
  AND metadata ? 'cpf'
  AND metadata ? 'email'
  AND metadata ? 'objetivo';
```
