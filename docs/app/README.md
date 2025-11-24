# Mobile App Documentation Hub

Central de documentação para o aplicativo mobile WhatsApp SaaS Chatbot usando Capacitor 7.4.4.

## 📋 Table of Contents

- [Quick Start (5 minutos)](#quick-start-5-minutos)
- [Status do Projeto](#status-do-projeto)
- [Navegação por Tarefa](#navegação-por-tarefa)
- [Stack Técnico](#stack-técnico)
- [Estrutura de Documentação](#estrutura-de-documentação)
- [Próximos Passos](#próximos-passos)

---

## Quick Start (5 minutos)

Execute estes 3 comandos para buildar e rodar o app Android:

```bash
npm run build:mobile
npm run cap:sync
npm run cap:open:android
```

**Primeira vez?** Siga o [SETUP.md](./SETUP.md) completo primeiro.

---

## Status do Projeto

### Phase 1 - ✅ COMPLETO (Configuração Base)
- [x] Build estático Next.js funcionando
- [x] Capacitor instalado (Android/iOS 7.4.4)
- [x] Todas as páginas convertidas para `'use client'`
- [x] Features incompatíveis movidas para `*_backup/`
- [x] `capacitor.config.ts` configurado

### Phase 2 - 🚧 EM PROGRESSO (Testing & Optimization)
- [ ] Environment variables configuradas
- [ ] Testing em devices físicos
- [ ] Icons e splash screens customizados
- [ ] Performance otimizada

### Phase 3 - ⏳ PLANEJADO (Features Avançadas)
- [ ] Push notifications (Firebase/APNs)
- [ ] Deep linking (App Links/Universal Links)
- [ ] Deploy Google Play Store
- [ ] Deploy Apple App Store

---

## Navegação por Tarefa

| Tarefa | Documento | Prioridade |
|--------|-----------|------------|
| **Configurar projeto pela primeira vez** | [SETUP.md](./SETUP.md) | 🔴 Essencial |
| **Desenvolver features mobile** | [DEVELOPMENT.md](./DEVELOPMENT.md) | 🔴 Essencial |
| **Configurar environment variables** | [ENV_VARS.md](./ENV_VARS.md) | 🔴 Essencial |
| **Testar em devices/emuladores** | [TESTING.md](./TESTING.md) | 🟡 Alta |
| **Resolver problemas conhecidos** | [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | 🟡 Alta |
| **Configurar ícones e splash screens** | [ICONS_SPLASH.md](./ICONS_SPLASH.md) | 🟡 Alta |
| **Implementar push notifications** | [PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md) | 🟢 Média |
| **Configurar deep linking** | [DEEP_LINKING.md](./DEEP_LINKING.md) | 🟢 Média |
| **Deploy para lojas (Google/Apple)** | [DEPLOY.md](./DEPLOY.md) | 🟢 Média |
| **Entender decisões técnicas** | [MIGRATION_NOTES.md](./MIGRATION_NOTES.md) | ⚪ Baixa |

---

## Stack Técnico

### Frontend
- **Next.js**: 14.2.33 (App Router, static export)
- **React**: 18.3.1
- **TypeScript**: 5.4.5
- **Styling**: Tailwind CSS 3.4.1

### Mobile
- **Capacitor**: 7.4.4
- **Android**: minSdk 22, targetSdk 34
- **iOS**: deploymentTarget 13.0 (requer macOS)

### Backend (Não Modificado)
- **Serverless**: Vercel
- **Database**: Supabase (PostgreSQL + pgvector)
- **AI**: Groq (Llama 3.3 70B), OpenAI (Whisper, GPT-4o)
- **WhatsApp API**: Meta Business API v18.0

### Build Tools
- **npm scripts**: `build:mobile`, `cap:sync`, `cap:open:android`
- **Environment**: Windows-first (PowerShell/cmd)

---

## Estrutura de Documentação

### Prioridade 1 - Essencial
Leia primeiro para começar desenvolvimento mobile:
- **[SETUP.md](./SETUP.md)** - Configuração completa do ambiente Windows
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Workflow diário de desenvolvimento
- **[ENV_VARS.md](./ENV_VARS.md)** - Environment variables mobile (bloqueador crítico)

### Prioridade 2 - Alta
Consulte durante desenvolvimento ativo:
- **[TESTING.md](./TESTING.md)** - Testar em emuladores e devices físicos
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Problemas conhecidos e soluções
- **[ICONS_SPLASH.md](./ICONS_SPLASH.md)** - Assets (ícones, splash screens)

### Prioridade 3 - Média
Necessário para features avançadas e deploy:
- **[PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md)** - Firebase (Android) e APNs (iOS)
- **[DEEP_LINKING.md](./DEEP_LINKING.md)** - App Links (Android) e Universal Links (iOS)
- **[DEPLOY.md](./DEPLOY.md)** - Publicar em Google Play e App Store

### Prioridade 4 - Baixa
Contexto histórico e referência teórica:
- **[MIGRATION_NOTES.md](./MIGRATION_NOTES.md)** - Decisões técnicas e limitações
- **[CAPACITOR_INTEGRATION.md](./CAPACITOR_INTEGRATION.md)** - Documentação teórica original

---

## Próximos Passos

### Se você é novo no projeto:
1. Leia [SETUP.md](./SETUP.md) - Configurar ambiente (30-60min)
2. Execute Quick Start acima
3. Leia [DEVELOPMENT.md](./DEVELOPMENT.md) - Workflow diário
4. Configure [ENV_VARS.md](./ENV_VARS.md) - **CRÍTICO para testes reais**

### Se você já está desenvolvendo:
1. Use [DEVELOPMENT.md](./DEVELOPMENT.md) como referência diária
2. Consulte [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) quando problemas aparecerem
3. Teste com [TESTING.md](./TESTING.md) antes de PRs

### Se você está preparando deploy:
1. Finalize [ICONS_SPLASH.md](./ICONS_SPLASH.md)
2. Implemente features de [PUSH_NOTIFICATIONS.md](./PUSH_NOTIFICATIONS.md)
3. Configure [DEEP_LINKING.md](./DEEP_LINKING.md)
4. Siga [DEPLOY.md](./DEPLOY.md) para publicação

---

## Convenções de Documentação

### Comandos Windows-First
Todos os comandos são testados em PowerShell/cmd Windows:
```bash
# Windows path
cd C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial
npm run build:mobile
```

### Checklists
Use `- [ ]` para tarefas verificáveis:
- [ ] Android Studio instalado
- [ ] Build estático funcionando
- [ ] Environment variables configuradas

### Links Internos
Formato: `[texto](./ARQUIVO.md#seção)`
- Exemplo: [Ver troubleshooting](./TROUBLESHOOTING.md#build-falha)

### Troubleshooting Inline
Cada documento inclui seção de troubleshooting com tabela:
| Problema | Causa | Solução |
|----------|-------|---------|
| Build falha | ... | ... |

---

## Suporte

- **Problemas técnicos**: Consulte [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Questões de setup**: Veja [SETUP.md](./SETUP.md)
- **Workflow development**: Leia [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Issues conhecidas**: GitHub Issues

---

## Recursos Externos

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Next.js Static Export](https://nextjs.org/docs/pages/building-your-application/deploying/static-exports)
- [Android Studio](https://developer.android.com/studio)
- [Meta WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Supabase Docs](https://supabase.com/docs)

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`

**Última Atualização**: 2025-11-23
