# Migração para Next.js 16

Data: 2026-01-22

## Resumo

Migração do projeto de Next.js 14 para Next.js 16, incluindo todas as breaking changes necessárias.

---

## Alterações no package.json

```diff
- "next": "^14.2.33",
+ "next": "^16",

- "eslint-config-next": "^15.1.8",
+ "eslint-config-next": "^16",

- "dev": "next dev",
+ "dev": "next dev --webpack",
```

**Nota:** O flag `--webpack` força o uso do Webpack ao invés do Turbopack no modo dev.

---

## Alterações no next.config.js

### serverExternalPackages (antes serverComponentsExternalPackages)

```diff
- experimental: {
-   serverActions: {
-     bodySizeLimit: '10mb',
-   },
-   serverComponentsExternalPackages: ['pdf-parse'],
- },
+ serverExternalPackages: ['pdf-parse', 'fluent-ffmpeg', '@ffmpeg-installer/ffmpeg'],
+ turbopack: {},
```

**Mudanças:**
- `serverComponentsExternalPackages` movido de `experimental` para raiz como `serverExternalPackages`
- `serverActions` removido (agora é padrão no Next.js 16)
- `turbopack: {}` adicionado para compatibilidade com config webpack

---

## Renomeação do Middleware

O arquivo `middleware.ts` foi renomeado para `proxy.ts`:

```diff
- middleware.ts
+ proxy.ts
```

E a função exportada também foi renomeada:

```diff
- export async function middleware(request: NextRequest) {
+ export async function proxy(request: NextRequest) {
```

---

## Route Handlers - params como Promise

No Next.js 16, o parâmetro `params` em route handlers é agora uma **Promise**.

### Antes (Next.js 14)

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  // ...
}
```

### Depois (Next.js 16)

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ...
}
```

### Arquivos Afetados

- `src/app/api/admin/invites/[id]/route.ts`
- `src/app/api/admin/users/[id]/route.ts`
- `src/app/api/customers/[phone]/status/route.ts`
- `src/app/api/debug/webhook-config/[clientId]/route.ts`
- `src/app/api/documents/[filename]/route.ts`
- `src/app/api/flow/nodes/[nodeId]/route.ts`
- `src/app/api/flows/[flowId]/route.ts`
- `src/app/api/messages/[phone]/route.ts`
- `src/app/api/templates/[templateId]/route.ts`
- `src/app/api/templates/[templateId]/send/route.ts`
- `src/app/api/templates/[templateId]/submit/route.ts`
- `src/app/api/webhook/[clientId]/route.ts`
- `src/app/api/contacts/[phone]/route.ts`

---

## cookies() retorna Promise

No Next.js 16, a função `cookies()` de `next/headers` retorna uma **Promise**.

### Antes (Next.js 14)

```typescript
import { cookies } from 'next/headers'

export const createServerClient = () => {
  const cookieStore = cookies()
  // ...
}
```

### Depois (Next.js 16)

```typescript
import { cookies } from 'next/headers'

export const createServerClient = async () => {
  const cookieStore = await cookies()
  // ...
}
```

### Arquivos Modificados

- `src/lib/supabase.ts` - `createServerClient()` agora é async
- `src/lib/supabase-server.ts` - `createServerClient()` e `createRouteHandlerClient()` agora são async

### Impacto em Todo o Projeto

Como as funções de criação de cliente Supabase agora são async, **todos os arquivos que as usam** precisaram adicionar `await`:

```diff
- const supabase = createServerClient()
+ const supabase = await createServerClient()

- const supabase = createRouteHandlerClient(request)
+ const supabase = await createRouteHandlerClient(request)
```

**70+ arquivos foram atualizados** para adicionar `await`.

---

## Tipos Atualizados

Onde havia `ReturnType<typeof createServerClient>`, foi necessário usar `Awaited<>`:

```diff
- async function requireAdmin(supabase: ReturnType<typeof createServerClient>) {
+ async function requireAdmin(supabase: Awaited<ReturnType<typeof createServerClient>>) {
```

### Arquivos Afetados

- `src/app/api/admin/clients/apply-ai-config/route.ts`
- `src/app/api/ai-gateway/models/route.ts`
- `src/app/api/ai-gateway/models/test/route.ts`

---

## Checklist de Migração

- [x] Atualizar `next` para `^16`
- [x] Atualizar `eslint-config-next` para `^16`
- [x] Adicionar `--webpack` ao script dev
- [x] Mover `serverComponentsExternalPackages` para `serverExternalPackages`
- [x] Remover `experimental.serverActions`
- [x] Adicionar `turbopack: {}` ao config
- [x] Renomear `middleware.ts` para `proxy.ts`
- [x] Atualizar todos os route handlers com params dinâmicos
- [x] Tornar `createServerClient()` async
- [x] Tornar `createRouteHandlerClient()` async
- [x] Adicionar `await` em todas as chamadas dessas funções
- [x] Atualizar tipos com `Awaited<>`
- [x] Executar `pnpm run build` sem erros

---

## Comandos para Aplicar

```bash
# Instalar dependências atualizadas
pnpm install

# Verificar build
pnpm run build

# Iniciar em dev (com webpack)
pnpm run dev
```

---

## Referências

- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-16)
