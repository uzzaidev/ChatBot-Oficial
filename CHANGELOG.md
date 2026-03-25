# Changelog

Gerado automaticamente por IA a cada push no `main`.

## 2026-03-25

### fix
- Ajustado callback do `FB.login` para ser síncrono, evitando rejeição do SDK ao usar função assíncrona
  - Arquivos: `src/components/EmbeddedSignupButton.tsx`
  - Evidência: mudança de callback async para função síncrona que chama handler async internamente
  - Confiança: alta

## 2026-03-25

### fix
- Corrigida condição de corrida na inicialização do SDK do Facebook, definindo `fbAsyncInit` antes do carregamento do script e usando a estratégia `afterInteractive` para garantir a ordem correta de carregamento.
- Removida inicialização duplicada do SDK, unificando a lógica dentro do hook `useEffect`.
- Adicionados logs para facilitar o debug do estado do SDK e das chamadas de login.
- Arquivos: `src/components/EmbeddedSignupButton.tsx`
- Evidência: alteração da ordem de definição de `fbAsyncInit` e mudança da estratégia de carregamento do script para `afterInteractive`.
- Confiança: alta

## 2026-03-25

### feat
- Atualizado o SDK do Facebook para a versão v25.0 no componente EmbeddedSignupButton
  - Arquivos: `src/components/EmbeddedSignupButton.tsx`
  - Confiança: alta

## 2026-03-25

### feat
- Adicionado importação do componente `EmbeddedSignupButton` na página de configurações
  - Arquivos: `src/app/dashboard/settings/page.tsx`
  - Confiança: alta

## 2026-03-25

### feat
- Integrado componente `EmbeddedSignupButton` para migração do WhatsApp no painel de configurações, substituindo o botão com lógica manual de migração.
- Arquivos: `src/app/dashboard/settings/page.tsx`
- Confiança: alta

## 2026-03-25

### fix
- Corrigido espaçamento na entrada do changelog relacionada às atualizações de branding UzzApp
  - Arquivos: `README.md`
  - Evidência: ajuste de espaço em linha do README
  - Confiança: alta

## 2026-03-25

### feat
- Implementada funcionalidade de signup embutido via Facebook JS SDK com suporte a modo coexistência para WhatsApp Business App e Cloud API no mesmo número. Inclui endpoint API (`src/app/api/auth/meta/embedded-signup/route.ts`), componente React (`src/components/EmbeddedSignupButton.tsx`) e página de teste (`src/app/test-oauth/page.tsx`) com UI para escolher entre modo coexistência e OAuth tradicional.
- Adicionada coluna `onboarding_type` na tabela `clients` para indicar o tipo de onboarding (`cloud_api` ou `coexistence`).
- Ajustado registro de PIN dinâmico para registro de número via Meta API (`src/lib/meta-oauth.ts`).
- Melhorias no estilo para impressão no arquivo `UzzApp_Apresentacao_Comercial.html`.

  - Arquivos: `src/app/api/auth/meta/embedded-signup/route.ts`, `src/components/EmbeddedSignupButton.tsx`, `src/app/test-oauth/page.tsx`, `supabase/migrations/20260325180609_add_onboarding_type_to_clients.sql`, `src/lib/meta-oauth.ts`, `UzzApp_Apresentacao_Comercial.html`
  - Confiança: alta

## 2026-03-24

### refactor
- Atualizadas URLs para refletir a nova marca UzzApp em  documentação, configuração e código
- Adicionada apresentação comercial em HTML detalhando funcionalidades e diferenciais da plataforma UzzApp
- Incluído glossário técnico para facilitar entendimento dos termos usados no projeto
- Ajustes em arquivos de configuração e rotas para alinhamento com a nova identidade visual e URLs
  - Arquivos: `.gitignore`, `README.md`, `UzzApp_Apresentacao_Comercial.html`, `memory/glossary.md`, `src/app/api/vault/secrets/route.ts`, `src/app/api/webhook/[clientId]/route.ts`, `src/lib/config.ts`, `supabase/migrations/DYNAMIC_PROVIDER_SELECTION.md`, `supabase/migrations/MULTI_TENANT_MIGRATION.md`, `supabase/migrations/VERCEL_DEPLOYMENT.md`, `supabase/migrations/WEBHOOK_CONFIGURATION.md`
  - Confiança: alta

## 2026-03-24

### chore
- Atualizado valor do plano mensal de R$ 249,90 para R$ 247,90 nas páginas de preços e landing page
  - Arquivos: `src/app/precos/page.tsx`, `src/components/landing/Plans.tsx`
  - Confiança: alta

## 2026-03-23

### fix
- Corrigido erro de digitação na descrição da imagem de fundo da área de conversas no plano de personalização visual
  - Arquivos: `docs/PLANO2.md`
  - Evidência: correção de palavra "conversasss" para "conversas"
  - Confiança: alta

## 2026-03-23

### fix
- Corrigido erro de digitação na descrição da imagem de fundo da área de conversas no documento de planejamento
  - Arquivos: `docs/PLANO2.md`
  - Evidência: correção de palavra "conversasss" para "conversas"
  - Confiança: alta

## 2026-03-23

### fix
- Corrigido erro de digitação na descrição da imagem de fundo da área de conversas no documento de planejamento
  - Arquivos: `docs/PLANO2.md`
  - Evidência: correção de "conversass" para "conversas"
  - Confiança: alta

## 2026-03-23

### feat
- Remodelado dashboard de analytics do CRM com novo layout, estilo visual aprimorado e componentes reutilizáveis para melhor responsividade e usabilidade.
- Refeito dashboard OpenAI Analytics com novo componente shell, gráficos redesenhados para melhor leitura em mobile e desktop, filtros e exportação CSV aprimorados.
- Atualizados gráficos de tendências de Meta Ads com novo shell, controles refinados e melhor adaptação para dispositivos móveis.
- Refatorado componente CustomizableChart para suporte a múltiplos tipos de gráficos com gradientes, legendas responsivas, exportação PNG/SVG e visual mais moderno.
- Atualizado DashboardMetricsView com novo layout editorial, melhorias visuais, persistência de configuração atualizada e melhor experiência mobile-first.
- Criado componente AnalyticsShell para padronizar estrutura visual de dashboards e gráficos analíticos.
- Ajustes gerais de estilo CSS para dashboards analíticos, incluindo novos painéis, chips e responsividade.
  - Arquivos principais: `src/app/dashboard/openai-analytics/page.tsx`, `src/components/crm/CRMAnalyticsDashboard.tsx`, `src/components/meta-ads/MetaAdsTrendCharts.tsx`, `src/components/CustomizableChart.tsx`, `src/components/DashboardMetricsView.tsx`, `src/components/AnalyticsShell.tsx`, `src/app/globals.css`
  - Confiança: alta

## 2026-03-23

### feat
- Melhorada a função de truncamento do diff para incluir resumo de arquivos alterados (diffstat) extraído via comando git, além de aumentar limite máximo de caracteres para 120k.
- Implementado fallback automático para modelo alternativo (`openai/gpt-4o-mini`) caso o modelo primário (`openai/gpt-4.1-mini`) retorne erro 413 (payload muito grande).
- Refatorado script de geração de changelog para modularizar chamadas à API e aprimorar logs.
  - Arquivos: `.github/scripts/generate-changelog.mjs`
  - Confiança: alta

## 2026-03-20

### refactor
- Atualizado o layout do componente KanbanBoard para melhorar o alinhamento e o comportamento de rolagem, ajustando a estrutura do div e a disposição dos elementos
  - Arquivos: `src/components/crm/KanbanBoard.tsx`
  - Confiança: alta

## 2026-03-20

### feat
- Adicionado suporte a rolagem horizontal no componente KanbanBoard e melhorias no layout na página CRMPage
  - Arquivos: `src/components/crm/KanbanBoard.tsx`, `src/app/dashboard/crm/page.tsx`
  - Confiança: alta

### fix
- Ajustada a cor do texto de mensagens de chat para branco no arquivo `globals.css`
  - Arquivos: `src/app/globals.css`
  - Evidência: mudanças nas variáveis de cores relacionadas ao chat
  - Confiança: alta

### refactor
- Implementada lógica de scroll com wheel para o KanbanBoard, melhorando a experiência de navegação horizontal
  - Arquivos: `src/components/crm/KanbanBoard.tsx`
  - Confiança: alta

## 2026-03-20

### feat
- Melhorada a responsividade do layout no dashboard de CRM e na Kanban board, ajustando classes CSS para garantir melhor adaptação em diferentes tamanhos de tela
  - Arquivos: `src/app/dashboard/crm/page.tsx`, `src/components/crm/KanbanBoard.tsx`
  - Confiança: alta

## 2026-03-20

### feat
- Adicionado geração automática de changelog via GitHub Models API
  - Arquivos: `.github/changelog-instructions.md`, `.github/scripts/generate-changelog.mjs`, `.github/workflows/ai-changelog.yml`, `CHANGELOG.md`, `vercel.json`
  - Confiança: alta
