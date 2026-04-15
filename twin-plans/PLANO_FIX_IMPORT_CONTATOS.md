# Plano de Correção — Importação de Contatos

**Data:** 2026-03-30
**Status:** Aguardando execução
**Prioridade:** Alta — 100% das importações falham em produção

---

## Contexto

A rota `POST /api/contacts/import` possui dois bugs independentes que, juntos,
tornam a importação completamente inoperante em produção (Vercel).

| # | Bug | Severidade | Efeito visível |
|---|-----|-----------|----------------|
| 1 | Usa `pg` Pool em serverless | Crítico | Rota trava, timeout, erro 500 |
| 2 | Validação de telefone rejeita números curtos | Médio | Todos os números < 10 dígitos são barrados |

---

## Bug 1 — Biblioteca `pg` em ambiente serverless

### Diagnóstico

O arquivo `src/app/api/contacts/import/route.ts` importa:

```typescript
import { query } from "@/lib/postgres"
```

O arquivo `src/lib/postgres.ts` usa a biblioteca `pg` com `Pool`:

```typescript
import { Pool } from 'pg'

pool = new Pool({
  connectionString: getConnectionString(),
  max: 3,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  ...
})
```

### Por que falha em serverless

Em Vercel (serverless), cada requisição é executada em uma função isolada
com ciclo de vida curto. O `Pool` da biblioteca `pg` foi projetado para
processos **long-running** (servidores tradicionais Node.js), onde o pool
de conexões persiste entre requisições.

Em serverless:

1. A função inicia → tenta criar/reusar o Pool
2. O Pool tenta estabelecer conexão com o banco (Supabase Postgres)
3. A conexão fica em estado de negociação (TCP handshake, SSL, autenticação)
4. A função serverless expira (timeout padrão Vercel: 10s)
5. A resposta retorna `500 Erro interno do servidor` ou simplesmente trava

O Supabase já fornece um **connection pooler** (Supavisor, porta 6543) que
resolve exatamente este problema, mas ele é acessado via **Supabase Client**,
não via `pg` direto.

### Regra violada

CLAUDE.md — Critical Technical Decision #1:

> **NEVER** use `pg` library in serverless. **ALWAYS** use Supabase client.

### Solução

Substituir todas as chamadas `query()` da lib `pg` pelo cliente Supabase:

```typescript
// REMOVER
import { query } from "@/lib/postgres"

// ADICIONAR
import { createServerClient } from "@/lib/supabase-server"
```

#### Mapeamento das queries a substituir

**Query 1 — Verificar duplicata:**
```typescript
// ANTES (pg)
const existingQuery = `
  SELECT telefone FROM clientes_whatsapp
  WHERE client_id = $1 AND telefone = $2
`
const existingResult = await query<any>(existingQuery, [clientId, cleanPhone])
const exists = existingResult.rows.length > 0

// DEPOIS (Supabase)
const supabase = createServerClient()
const supabaseAny = supabase as any
const { data: existing } = await supabaseAny
  .from('clientes_whatsapp')
  .select('telefone')
  .eq('client_id', clientId)
  .eq('telefone', cleanPhone)
  .maybeSingle()
const exists = existing !== null
```

> **Nota:** `supabaseAny` é necessário porque o TypeScript não tem os tipos
> gerados para `clientes_whatsapp`. Padrão já usado em todo o codebase
> (ver `src/nodes/checkOrCreateCustomer.ts:78`).

**Query 2 — Inserir contato:**
```typescript
// ANTES (pg)
const insertQuery = `
  INSERT INTO clientes_whatsapp (client_id, telefone, nome, status, created_at, updated_at)
  VALUES ($1, $2, $3, $4, NOW(), NOW())
`
await query(insertQuery, [clientId, cleanPhone, name, status])

// DEPOIS (Supabase)
const { error: insertError } = await supabaseAny
  .from('clientes_whatsapp')
  .insert({
    client_id: clientId,
    telefone: cleanPhone,   // campo NUMERIC no banco — Supabase faz o cast
    nome: name,
    status: status,
  })

if (insertError) throw new Error(insertError.message)
```

> **Atenção ao campo `telefone`:** No banco é do tipo `NUMERIC`, não `TEXT`.
> O Supabase client faz o cast automaticamente ao passar string numérica.
> Não é necessário cast manual `::NUMERIC` como seria em SQL puro.

#### Instanciação do cliente Supabase

O cliente deve ser instanciado **fora do loop** para evitar criar uma nova
instância por contato importado (o que seria ineficiente):

```typescript
export async function POST(request: NextRequest) {
  const clientId = await getClientIdFromSession(request as any)
  const supabase = createServerClient()   // ← instanciar aqui, uma vez
  const supabaseAny = supabase as any

  // loop de importação usa supabaseAny...
}
```

---

## Bug 2 — Validação e normalização de telefone

### Diagnóstico

A validação atual em `import/route.ts` linha 73:

```typescript
if (cleanPhone.length < 10 || cleanPhone.length > 15) {
  result.errors.push({
    row: rowNumber,
    phone: phone,
    error: "Telefone inválido. Deve ter entre 10 e 15 dígitos.",
  })
  continue  // ← contato descartado silenciosamente
}
```

Esta regra foi escrita assumindo que todos os números já viriam no formato
internacional completo. Na prática, os 3 formatos existem na mesma base:

| Formato | Exemplo | Dígitos | Resultado atual |
|---------|---------|---------|-----------------|
| Número local | `992524789` | 9 | ❌ Rejeitado |
| DDD + número | `54992524789` | 11 | ✅ Aceito |
| DDI + DDD + número | `5554992524789` | 13 | ✅ Aceito |

### Impacto no WhatsApp

O WhatsApp exige número no formato internacional completo para entregar
mensagens: `55` + DDD (2 dígitos) + número (8 ou 9 dígitos) = 12 ou 13 dígitos.

Porém, o objetivo da importação é **registrar o contato no banco**. Um número
curto pode ter sido fornecido intencionalmente pelo cliente para pesquisa
interna, ou pode ser um número estrangeiro com outra lógica de formatação.

Portanto, a abordagem correta não é **rejeitar**, mas sim **importar com aviso**.

### Solução — Classificação por faixas

```
< 8 dígitos   → ERRO BLOQUEANTE (claramente inválido)
8–9 dígitos   → IMPORTA + aviso "Número possivelmente incompleto"
10–11 dígitos → NORMALIZA (prefixar "55" se não começar com "55") + importa
12–13 dígitos → ACEITA como está
> 15 dígitos  → ERRO BLOQUEANTE (claramente inválido)
```

#### Lógica de normalização para 10–11 dígitos

```typescript
const normalizeBrazilianPhone = (digits: string): string => {
  // 10 dígitos: DDD (2) + número antigo (8) → provavelmente BR sem DDI
  // 11 dígitos: DDD (2) + número novo com 9 (9) → provavelmente BR sem DDI
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    return '55' + digits
  }
  return digits
}
```

> **Nota:** Não normalizamos 8–9 dígitos porque não sabemos o DDD.
> Normalizamos apenas quando temos DDD (10–11 dígitos) pois o DDI `55`
> pode ser inferido com segurança para bases brasileiras.

#### Por que não normalizar 8–9 dígitos

Se temos apenas o número local (ex: `992524789`), não sabemos:
- Qual o DDD do contato
- Se é um número brasileiro ou estrangeiro

Forçar um DDD padrão seria erro silencioso. Melhor importar e deixar
o usuário corrigir manualmente se necessário.

### Mudança no tipo de retorno

O tipo `ContactImportResult` em `src/lib/types.ts` precisa de um novo campo
para distinguir **erros bloqueantes** de **avisos**:

```typescript
// ANTES
export interface ContactImportResult {
  total: number
  imported: number
  skipped: number
  errors: Array<{
    row: number
    phone: string
    error: string
  }>
}

// DEPOIS
export interface ContactImportResult {
  total: number
  imported: number        // inclui os que vieram com warning
  skipped: number
  errors: Array<{         // erros bloqueantes (contato NÃO importado)
    row: number
    phone: string
    error: string
  }>
  warnings?: Array<{      // avisos (contato FOI importado, mas atenção)
    row: number
    phone: string
    warning: string
  }>
}
```

### Exibição no frontend

O dialog de resultado em `ContactsClient.tsx` deve exibir o novo campo
`warnings` com visual distinto de `errors`:

- `errors` → ícone vermelho `AlertCircle` — "não foi importado"
- `warnings` → ícone amarelo `AlertTriangle` — "importado, mas verifique"

---

## Arquivos a modificar

| Arquivo | O que muda |
|---------|-----------|
| `src/lib/types.ts` | Adicionar `warnings?` em `ContactImportResult` |
| `src/app/api/contacts/import/route.ts` | Fix 1 (Supabase) + Fix 2 (validação) |
| `src/components/ContactsClient.tsx` | Exibir warnings no resultado do import |

> `src/hooks/useContacts.ts` **não precisa mudar** — apenas repassa o
> retorno da API para quem chama, sem inspecionar o conteúdo.

---

## Ordem de execução

```
Passo 1 — src/lib/types.ts
          Adicionar campo warnings? em ContactImportResult
          (sem isso, o TypeScript reclamará nos passos seguintes)

Passo 2 — src/app/api/contacts/import/route.ts
          2a. Substituir pg → Supabase client
          2b. Reescrever lógica de validação/normalização de telefone
          2c. Popular warnings[] no resultado

Passo 3 — src/components/ContactsClient.tsx
          Exibir seção de warnings no modal de resultado da importação
```

---

## Teste após implementação

### Caso 1 — Número local (9 dígitos)
```
CSV: telefone
     992524789
Esperado: importado=1, warnings=["Número possivelmente incompleto"]
```

### Caso 2 — DDD sem DDI (11 dígitos)
```
CSV: telefone
     54992524789
Esperado: importado=1, telefone salvo=5554992524789 (normalizado)
```

### Caso 3 — Completo (13 dígitos)
```
CSV: telefone
     5554992524789
Esperado: importado=1, telefone salvo=5554992524789
```

### Caso 4 — Inválido (4 dígitos)
```
CSV: telefone
     1234
Esperado: errors=["Telefone inválido"]
```

### Caso 5 — Duplicado
```
CSV: telefone (contato já existe no banco)
     5554992524789
Esperado: skipped=1
```

### Caso 6 — Misto (todos os formatos juntos)
```
CSV: telefone
     992524789       ← 9 dígitos → warning
     54992524780     ← 11 dígitos → normaliza para 5554992524780
     5554992524781   ← 13 dígitos → aceita
     123             ← inválido → erro
Esperado: imported=3, errors=1, warnings=1
```

---

## Notas adicionais

### Sobre o campo `telefone` ser NUMERIC no banco

A tabela `clientes_whatsapp` define `telefone` como `NUMERIC`, não `TEXT`.
Isso é legado do sistema de poker integrado ao banco (documentado em CLAUDE.md).

Consequências:
- Zeros à esquerda NÃO são preservados (mas telefones não têm zeros à esquerda)
- Separadores como `+`, `-`, `(`, `)` já são removidos pelo `replace(/\D/g, "")`
- O Supabase client faz o cast `string → numeric` automaticamente no `.insert()`
- Ao ler o telefone do banco, sempre usar `::TEXT` em SQL puro ou tratar como string

### Sobre criar o Supabase client uma única vez

Em imports grandes (centenas de contatos), instanciar o Supabase client
dentro do loop causaria overhead. O cliente deve ser instanciado uma vez
antes do loop e reutilizado em todas as iterações.

### Sobre erros individuais vs erro geral

O design atual (e que deve ser mantido) é: erros em um contato individual
**não abortam** a importação dos demais. Cada contato tem seu próprio
try/catch. O resultado final agrega tudo em `imported`, `skipped`, `errors`
e agora também `warnings`.

---

*Plano criado em 2026-03-30*
*Implementação pendente de aprovação*
