# ⚡ App Review - Referência Rápida

**Guia rápido para submissão do App Review Meta**  
**Data:** 13 de fevereiro de 2026

---

## 🎯 RESUMO EM 1 MINUTO

### ✅ Pode Submeter AGORA (10 permissões)
- WhatsApp (3 permissões) — ✅ Código 100%
- Conversions API (1 permissão) — ✅ Código 100%
- Meta Ads Read (1 permissão) — ✅ Dashboard completo
- Pages (2 permissões) — ✅ OAuth flow
- Compartilhadas (3 permissões) — ✅ Login/OAuth

### ⛔ NÃO Submeter (16 permissões)
- `ads_management` (Advanced) — ❌ Sem wizard de campanha
- Instagram (3) — ❌ Zero código
- Threads (10) — ❌ Zero código

---

## 📹 SCREENCASTS OBRIGATÓRIOS

### Requisitos Meta (3 obrigatórios):

1. **Fluxo de Login Completo**
   - Logout → Login → Dashboard
   - 30-40 segundos

2. **Concessão de Permissão**
   - Botão → OAuth → Autorizar → Callback
   - 1-2 minutos

3. **Uso de Dados**
   - Funcionalidade usando a permissão
   - 1-2 minutos

### Especificações Técnicas:

| Item | Especificação |
|------|--------------|
| Resolução | 1080p mínimo (1920x1080) |
| Largura | Máx 1440px (ajustar monitor) |
| Formato | MP4 (H.264) |
| Duração | 30s-2min por permissão |
| Áudio | DESATIVADO |
| Software | Camtasia (recomendado) ou OBS |
| Navegação | Mouse (não teclado) |
| Anotações | Destacar uso de permissão |
| Idioma | Inglês ou com legendas |

---

## 📋 CHECKLIST RÁPIDO

### Screenshots (8 obrigatórios)
- [ ] 01 - Embedded Signup (WhatsApp)
- [ ] 02 - Dashboard de Conversas
- [ ] 03 - Bot Respondendo (WhatsApp)
- [ ] 04 - Templates Management
- [ ] 05 - CAPI Events Dashboard
- [ ] 06 - Meta Ads Dashboard
- [ ] 07 - Login/Register
- [ ] 08 - Settings/Vault

### Screencasts (4 obrigatórios)
- [ ] Vídeo 1 - WhatsApp Complete Flow (2-3min)
- [ ] Vídeo 2 - WhatsApp Management (1-2min)
- [ ] Vídeo 3 - Conversions API (2min)
- [ ] Vídeo 4 - Meta Ads Read (1-2min)

### Qualidade
- [ ] Resolução: 1080p+
- [ ] Duração: 30s-2min
- [ ] Áudio: Desativado
- [ ] Anotações: Destacando permissões
- [ ] Idioma: Inglês ou legendas
- [ ] Fluxo completo: Login → Auth → Uso

---

## 🎬 ROTEIROS RÁPIDOS

### `whatsapp_business_messaging` (2-3min)

```
[0:00-0:30] Login completo
[0:30-1:30] Conectar WhatsApp (OAuth)
[1:30-2:00] Configurar chatbot
[2:00-3:00] Enviar mensagem → Bot responde
```

**Anotações:**
- Botão "Conectar WhatsApp"
- Permissão na tela OAuth
- Webhook recebendo mensagem
- Bot enviando resposta

---

### `whatsapp_business_management` (1-2min)

```
[0:00-0:30] Dashboard → Templates
[0:30-1:00] Sync templates da Meta
[1:00-1:30] Criar e submeter template
```

**Anotações:**
- Sync via Management API
- Submit para aprovação

---

### `whatsapp_business_manage_events` (2min)

```
[0:00-0:30] Configurar Dataset ID
[0:30-1:00] Clicar anúncio CTWA → Mensagem
[1:00-1:20] Lead no CRM
[1:20-2:00] Mover card → Evento Purchase enviado
```

**Anotações:**
- Triggering event ao mover card
- Event sent to Conversions API

---

### `ads_read` (1-2min)

```
[0:00-0:30] Conectar Ad Account
[0:30-1:00] Ler campanhas
[1:00-1:30] Insights e métricas
```

**Anotações:**
- Fetching campaigns via API
- Campaign insights

---

## 📁 ESTRUTURA DE ARQUIVOS

```
docs/
├── screenshots/
│   ├── 01-embedded-signup-whatsapp.png
│   ├── 02-dashboard-conversations.png
│   ├── 03-whatsapp-bot-response.png
│   ├── 04-templates-management.png
│   ├── 05-conversions-api-dashboard.png
│   ├── 06-meta-ads-overview.png
│   ├── 07-login-page.png
│   └── 08-settings-vault.png
└── videos/
    ├── whatsapp-business-messaging.mp4
    ├── whatsapp-business-management.mp4
    ├── whatsapp-business-manage-events.mp4
    └── ads-read.mp4
```

---

## ⚡ AÇÕES IMEDIATAS

### HOJE (2-3 horas)
1. Criar pastas `docs/screenshots/` e `docs/videos/`
2. Configurar software de gravação
3. Tirar 8 screenshots principais
4. Gravar screencast de Login/Register

### AMANHÃ (4-6 horas)
1. Gravar screencasts de Templates e Meta Ads
2. Editar vídeos (anotações, zoom)
3. Exportar em formato correto

### DEPOIS (quando OAuth funcionar)
1. Gravar screencasts completos (WhatsApp, CAPI)
2. Revisar tudo
3. Submeter App Review

---

## 📖 DOCUMENTAÇÃO COMPLETA

- **Checklist Completo:** `docs/APP_REVIEW_CHECKLIST_COMPLETE.md`
- **Guia de Screencasts:** `docs/SCREENCAST_GUIDE.md`
- **Status de Implementação:** `docs/META_APP_REVIEW_STATUS.md`
- **Este arquivo:** Referência rápida

---

**Última Atualização:** 13 de fevereiro de 2026

