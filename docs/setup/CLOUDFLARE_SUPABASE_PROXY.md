# Cloudflare Worker como Proxy do Supabase

Proxy reverso via Cloudflare Worker para contornar bloqueios de DNS no lado do cliente. Browsers de clientes finais passam a falar com `supabase.uzzai.com.br` em vez de `*.supabase.co` — o Worker faz o caminho até o Supabase de forma transparente.

## Problema

Clientes em redes com DNS comprometido (ISPs ruins, roteadores com cache quebrado, redes corporativas restritivas) não conseguiam resolver `vczfsmymvjvxuxlqswai.supabase.co`, resultando em `ERR_NAME_NOT_RESOLVED` no browser.

**Diagnóstico que confirmou DNS:**

```powershell
nslookup vczfsmymvjvxuxlqswai.supabase.co            # falha na rede problemática
nslookup vczfsmymvjvxuxlqswai.supabase.co 1.1.1.1    # resolve normal via Cloudflare DNS
```

O hostname resolve para IPs Cloudflare (`104.18.x.x`, `172.64.x.x`) — sem bloqueio de SNI ou firewall, apenas falha de resolução no DNS recursivo do cliente.

## Solução

Cloudflare Worker que recebe requests em `supabase.uzzai.com.br/*` e proxia para `vczfsmymvjvxuxlqswai.supabase.co/*`, preservando método, headers (incluindo `apikey` e `Authorization`), body e upgrade de WebSocket. O browser do cliente só precisa resolver `*.uzzai.com.br` — domínio que ele já resolve, senão nem abriria o app.

Cobre REST, Auth, Realtime (WSS) e Storage com o mesmo Worker. Edge Functions não estão em uso neste projeto.

## Arquitetura

```
Cliente (browser) ─HTTPS─► supabase.uzzai.com.br
                          (Cloudflare Worker)
                                  │
                                  └─HTTPS─► vczfsmymvjvxuxlqswai.supabase.co
                                            (Supabase: PostgREST, Auth, Realtime, Storage)
```

App Next.js no Vercel continua hospedando o frontend. Banco continua no Supabase. O Worker é uma camada DNS-only no caminho.

## Código do Worker

```js
const SUPABASE_HOST = 'vczfsmymvjvxuxlqswai.supabase.co'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    url.hostname = SUPABASE_HOST
    url.protocol = 'https:'
    url.port = ''

    return fetch(url, request)
  }
}
```

Cloudflare Workers lida com upgrade de WebSocket transparente quando o request original é repassado via `fetch(url, request)`.

## Setup no Cloudflare

1. **Workers & Pages → Create Worker**
   - Nome: `supabase-proxy`
   - Cola o código acima e faz Deploy

2. **Settings → Domains & Routes → Add → Custom domain**
   - Hostname: `supabase.uzzai.com.br`
   - Cloudflare cria automaticamente:
     - Registro DNS tipo "Worker" no `uzzai.com.br` (Proxied / nuvem laranja)
     - Certificado SSL via Universal SSL

3. **Validação:**
   ```
   https://supabase.uzzai.com.br/rest/v1/
   ```
   Resposta esperada: JSON do Supabase (ex: `{"error":"requested path is invalid"}`). Qualquer JSON do Supabase confirma que o proxy está funcionando.

## Mudanças no App

### `next.config.js`

Adicionado novo hostname em `images.remotePatterns` para permitir carregamento de imagens do Storage via custom domain:

```js
remotePatterns: [
  {
    protocol: 'https',
    hostname: '**.supabase.co',
    pathname: '/storage/v1/object/public/**',
  },
  {
    protocol: 'https',
    hostname: 'supabase.uzzai.com.br',  // adicionado
    pathname: '/storage/v1/object/public/**',
  },
  // ... resto
]
```

O `**.supabase.co` permanece na lista para não quebrar URLs antigas eventualmente salvas no banco.

### Variável de ambiente (Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=https://supabase.uzzai.com.br
```

Aplicado em Production, Preview e Development. Redeploy necessário.

A `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` **não mudam** — são headers que continuam sendo enviados, e o Worker repassa transparente.

## O que NÃO mudou

- **Cliente server-side** (`src/lib/supabase-server.ts`, `src/lib/postgres.ts`): conexões server-to-server continuam apontando para o Supabase direto. Servidor tem DNS bom, não precisa do proxy. Reduz latência e overhead de invocação do Worker.
- **Postgres direto** (porta 6543, `src/lib/postgres.ts`): Custom Domain/Worker não cobre conexão Postgres TCP — só HTTP/HTTPS/WSS. Como roda só server-side, sem problema.
- **Redirect URLs do Auth**: continuam apontando para `chat.luisfboff.com` (URL do app), não muda.
- **Hardcoded URLs no código**: nenhuma encontrada. Todos os clientes Supabase leem `process.env.NEXT_PUBLIC_SUPABASE_URL`.

## Custo

- Cloudflare Workers Free Tier: 100.000 requests/dia
- Acima disso: US$ 5/mês por 10M de requests adicionais
- Estimativa para o uso atual: dentro do free tier

## Como reverter

Se algo quebrar, reversão é instantânea:

1. Vercel → Settings → Environment Variables
2. Troca `NEXT_PUBLIC_SUPABASE_URL` de volta para `https://vczfsmymvjvxuxlqswai.supabase.co`
3. Redeploy

Worker pode permanecer ativo sem efeito (custo zero quando não recebe tráfego).

## Validação pós-deploy

Testar **na rede onde o problema ocorria**:

1. App carrega sem `ERR_NAME_NOT_RESOLVED`
2. Login funciona (Auth via proxy)
3. Tela com realtime atualiza sem refresh (WebSocket via proxy)
4. Upload/download de mídia funciona (Storage via proxy)
5. DevTools → Network: todas as requests para `supabase.uzzai.com.br`, nenhuma para `*.supabase.co`

## Por que funciona

DNS do cliente bloqueava resolução de `*.supabase.co`. Trocando o hostname para `*.uzzai.com.br` (que o cliente já resolve, senão nem entrava no app), o caminho do **navegador até o Cloudflare** funciona normal. A partir daí, o Worker roda no edge da Cloudflare, com infraestrutura de DNS própria — a resolução de `vczfsmymvjvxuxlqswai.supabase.co` acontece dentro da rede da Cloudflare, onde o problema do cliente não existe.

Não há "mágica" de SSL ou firewall — o Cloudflare Worker é literalmente um servidor HTTP que faz um `fetch()` interno. O ganho é que o navegador do cliente nunca precisa resolver hostname problemático.

## Referências

- [Cloudflare Workers — Fetch API](https://developers.cloudflare.com/workers/runtime-apis/fetch/)
- [Cloudflare Workers — Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare Workers — WebSockets](https://developers.cloudflare.com/workers/runtime-apis/websockets/)
