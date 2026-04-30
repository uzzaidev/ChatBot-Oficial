# UzzApp / ChatBot Oficial

Aplicação full-stack para atendimento, automação de CRM e chatbot de WhatsApp com IA. O projeto roda em Next.js, usa Supabase como banco e camada de segurança, integra a Meta WhatsApp Cloud API e mantém fluxos multi-tenant com credenciais por cliente.

Produção atual: `https://uzzapp.uzzai.com.br`

## Stack Atual

| Área | Tecnologia |
| --- | --- |
| App web | Next.js 16, App Router, React 18, TypeScript |
| UI | Tailwind CSS, Radix/shadcn, lucide-react, Recharts |
| Backend | Rotas serverless em `src/app/api/*` |
| Banco | Supabase PostgreSQL, pgvector, Realtime, RLS |
| Segredos | Supabase Vault por cliente |
| IA | Direct AI Client por tenant, OpenAI, Groq e provedores via AI SDK |
| WhatsApp | Meta WhatsApp Business Cloud API |
| Fila/cache | Redis/Upstash para batching e deduplicação |
| Mobile | Capacitor 7, Android e iOS |
| Deploy | Vercel |
| Testes | Jest, Vitest e Playwright |

## Arquitetura Em 1 Minuto

O webhook principal recebe eventos da Meta em `src/app/api/webhook/[clientId]/route.ts`. A partir dele, o fluxo em `src/flows/chatbotFlow.ts` executa etapas de filtragem, parsing, mídia, batching, histórico, RAG, geração de resposta, handoff humano, CRM e observabilidade.

As credenciais sensíveis dos clientes ficam no Supabase Vault. O `.env.local` deve conter apenas variáveis de infraestrutura local, como Supabase, banco e chaves necessárias para desenvolvimento.

O app também possui módulos de qualidade e operação: traces, avaliações, ground truth, review queue, crons de reconciliação e relatórios diários.

## Quick Start Local

Pré-requisitos:

- Node.js 18+
- npm
- Acesso ao Supabase do projeto
- Redis/Upstash configurado quando testar batching real

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

Crie um `.env.local` local com as variáveis necessárias para Supabase, banco e serviços usados no ambiente de desenvolvimento. Não commite `.env.local` nem credenciais de clientes.

## Scripts Principais

| Comando | Uso |
| --- | --- |
| `npm run dev` | Servidor local com `next dev --webpack` |
| `npm run build` | Build de produção |
| `npm run start` | Servir build local |
| `npm run lint` | ESLint no repositório |
| `npm test` | Testes Jest |
| `npm run test:vitest` | Testes Vitest |
| `npm run test:e2e` | Playwright |
| `npm run build:mobile` | Build mobile Capacitor |
| `npm run cap:sync` | Sincroniza Capacitor |
| `npm run cap:open:android` | Abre Android Studio |
| `npm run cap:open:ios` | Abre Xcode |
| `npm run db:export` | Exporta schema do banco |
| `npm run db:map` | Mapeia usos de Supabase no código |
| `npm run contacts:xlsx-to-csv -- arquivo.xlsx` | Converte planilhas de contatos para CSV |
| `npm run export:features-pdf` | Gera PDF a partir de `docs/UZZAPP_FEATURES_CLIENTE.html` |

O repositório tem `package-lock.json` e `pnpm-lock.yaml`, mas o fluxo documentado aqui usa npm.

## Estrutura Do Repositório

| Caminho | Conteúdo |
| --- | --- |
| `src/app` | Páginas, layouts e rotas API do Next.js |
| `src/flows` | Orquestração principal do chatbot |
| `src/nodes` | Etapas atômicas do processamento de mensagens |
| `src/lib` | Clientes, helpers, integrações, políticas, tracing e serviços |
| `src/components` | Componentes de UI e módulos do dashboard |
| `tests` | Testes unitários e de integração |
| `supabase` | Configuração, migrations e seeds |
| `db` | Guias e utilitários operacionais de banco |
| `scripts` | CLIs, exports, validações, migrações e automações locais |
| `docs` | Documentação técnica, runbooks, planos e materiais comerciais |
| `docs/presentations` | Apresentações HTML comerciais avulsas |
| `docs/ui` | Mockups e estudos de interface |
| `data/contacts/umana` | Planilhas e CSVs de contatos da Umana |
| `assets/branding` | Artefatos de marca que não são servidos diretamente pelo app |
| `public/assets` | Assets servidos em runtime pelo Next.js |
| `android` / `ios` | Projetos nativos Capacitor |
| `resources` | Ícone e splash base do Capacitor |
| `twin-plans` | Planos históricos e documentação de execução |
| `checkpoints` | Snapshots históricos de trabalho |

Arquivos de configuração de framework, como `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.mjs`, `jest.config.js`, `vitest.config.ts`, `components.json`, `vercel.json`, `proxy.ts` e `capacitor.config.ts`, ficam no root porque as ferramentas esperam encontrá-los ali.

## Dados E Secrets

- Variáveis locais ficam em `.env.local`.
- Credenciais de clientes devem ficar no Supabase Vault, não em código.
- Arquivos gerados como `.next/`, `node_modules/` e `*.tsbuildinfo` não fazem parte da fonte.
- Os fundos de chat usados pelo app ficam em `public/assets/chat-backgrounds/`.
- Dados importáveis de clientes ficam em `data/contacts/*`.

## Banco E Migrations

Use migrations em `supabase/migrations` para mudanças de schema. Para guias operacionais, veja:

- `db/MIGRATION_WORKFLOW.md`
- `docs/database/README.md`
- `docs/tables/tabelas.md`

Comandos úteis:

```bash
npm run db:export
npm run db:map
```

## Mobile

O mobile usa Capacitor. A configuração atual em `capacitor.config.ts` carrega a aplicação de produção via `server.url`.

Comandos úteis:

```bash
npm run build:mobile
npm run cap:sync
npm run cap:open:android
npm run cap:open:ios
```

Documentação principal: `docs/app/README.md`.

## Operação

Os crons de produção estão em `vercel.json`:

- `/api/cron/inactivity-check`
- `/api/cron/crm-executions-cleanup`
- `/api/cron/crm-dlq-retry`
- `/api/cron/crm-scheduled-actions`
- `/api/cron/enforce-grace-period`
- `/api/cron/traces-reconcile`
- `/api/cron/quality-daily-report`

Runbook de qualidade: `docs/runbooks/quality-operations.md`.

## Documentação Curada

- `CLAUDE.md`: contexto operacional detalhado para agentes
- `AGENTS.md`: regras locais de agentes e memória ByteRover
- `docs/NEXTJS16_MIGRATION.md`: notas da migração para Next.js 16
- `docs/MACROPROCESSOS-UZZAPP.md`: visão operacional do produto
- `docs/MANUAL_CRM_AUTOMATION_V2.md`: automações de CRM
- `docs/features/ground-truth.md`: validação e qualidade de respostas
- `docs/features/ai_gateway/`: documentação histórica do AI Gateway
- `docs/app/README.md`: fluxo mobile e Capacitor
- `scripts/README.md`: scripts operacionais e migrações pontuais

## Convenções De Organização

- Root é reservado para configs, manifestos, locks e docs de entrada.
- Scripts executáveis ficam em `scripts/`.
- Materiais comerciais e apresentações ficam em `docs/presentations/`.
- Mockups e estudos visuais ficam em `docs/ui/`.
- Dados de clientes ficam em `data/contacts/<cliente>/`.
- Assets servidos pelo app ficam em `public/`; assets fonte ou de marca ficam em `assets/`.
- Documentos antigos podem permanecer em `docs/`, `twin-plans/` e `checkpoints/`, mas novos documentos devem entrar em uma pasta temática.
