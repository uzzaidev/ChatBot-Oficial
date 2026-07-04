# Playbook — Rejeições comuns da Apple App Review e como resolver

> **Objetivo:** documentar os motivos de rejeição mais frequentes da Apple App
> Review, com a causa raiz, a correção e a lição para evitar em futuros apps.
>
> Portado do playbook do projeto irmão **Convoca** (2026-06) e ampliado com a
> rejeição real do **UzzApp** (2026-03-24). Aplica-se a qualquer app iOS.

---

## 0. Fluxo geral de correção

```
Apple rejeita → ler mensagem no App Store Connect → identificar guideline →
corrigir → decidir se precisa novo build → resubmeter → reply (opcional)
```

**Quando precisa de novo build vs. apenas resubmeter:**

| Tipo de mudança | Novo build? | Ação |
|---|---|---|
| App Privacy labels, textos do listing, screenshots | Não | Editar no ASC → resubmeter mesma build |
| Código (nova API, fix de UI, novo botão) | **Sim** | Commit → push → CI gera build → esperar TestFlight → selecionar nova build → resubmeter |
| Remover framework/SDK não usado | **Sim** | Rebuild necessário |

---

## 1. UzzApp — rejeição real de 2026-03-24 (referência deste repo)

Submissão 1.0 (build 2), revisada em iPad Air 11-inch (iPadOS 26.3.1). 4 achados:

### 1.1. Guideline 2.1(b) — Information Needed (modelo de negócio)

**Mensagem da Apple:** perguntou quem usa conteúdo pago, onde é comprado, que
tipo de assinatura é desbloqueada dentro do app.

**Resposta correta para o UzzApp:** é uma plataforma B2B SaaS de chatbot/
atendimento via WhatsApp. A assinatura é da empresa/agência que usa a
plataforma, comprada **fora do app** (dashboard web `uzzapp.uzzai.com.br` /
Stripe). Não há conteúdo digital de consumo pessoal, moeda virtual ou
assinatura desbloqueada dentro do app mobile — o app é só um cliente de
gestão do serviço já contratado. Enquadramento: **Guideline 3.1.3(b) —
Multiplatform Services** (serviço de negócio multiplataforma comprado fora do
app), análogo a Slack, Shopify, HubSpot.

### 1.2. Guideline 4.2 — Minimum Functionality

**Mensagem da Apple:** "não é suficientemente diferente de navegar no site...
push, Core Location ou compartilhamento não bastam."

**Correção aplicada neste repo:**
- Bottom tab bar nativa (`src/components/NativeBottomTabBar.tsx`) — UI que só
  existe no app, sempre visível.
- Câmera nativa real (`src/lib/nativeCamera.ts`, `@capacitor/camera`) em vez
  de input HTML puro.
- Banner de rede nativo (`src/components/NativeNetworkBanner.tsx`).
- Haptics em ações-chave (`src/lib/haptics.ts`).
- Biometria, push e deep linking já existiam e continuam sendo destacados nos
  Review Notes.

**Lição:** a Apple citou push/location/share explicitamente como
insuficientes *sozinhos* — a defesa forte é uma combinação de: (1) bugs reais
corrigidos, (2) UI que só existe no app nativo (não é replicável só com CSS
responsivo), (3) funcionalidades nativas de verdade (câmera, biometria).

### 1.3. Guideline 2.1(a) — App Completeness (bugs)

**Bug 1 — relogin a cada reabertura do app (iOS).**
Causa raiz: `CapacitorCookies`/`CapacitorHttp` sempre `enabled: true` sem
diferenciar iOS — mesma classe de bug do login NextAuth do Convoca, aqui
afetando a persistência da sessão do Supabase (`@supabase/ssr`, cookie-based)
entre relançamentos do app. Fix: branch `CAPACITOR_PLATFORM=ios` em
`capacitor.config.ts` desligando os dois plugins no iOS (ver
`docs/playbooks/ios-ci-sem-mac/README.md`).

**Bug 2 — sem botão de voltar em "Contatos, Caixa de Entrada".**
Causa raiz: `DashboardLayoutClient.tsx` renderizava rotas full-screen
(`/dashboard/conversations`, `/dashboard/chat`) sem sidebar nem qualquer
outro jeito de voltar ao menu no app nativo. Fix: header com botão "Menu" +
bottom tab bar nativa nessas rotas.

### 1.4. Guideline 2.1(a) — Performance (crash)

**Sintoma:** Base de Conhecimento → Selecionar arquivo → Take Photo → crash.

**Causa raiz:** `<input type="file" accept="image/*">` puro deixa a
WKWebView injetar seu próprio action sheet nativo de câmera, sem controle do
app sobre qualidade/resolução — fotos de câmeras modernas (12MP+) podem
estourar o limite de memória do processo da WebView.

**Fix:** botão "Adicionar foto" dedicado usando `@capacitor/camera`
(`Camera.getPhoto()`, `quality: 70`, `width: 1600`), fora da WebView. O input
de arquivo nativo perde os tipos de imagem no accept (só documentos), então a
Apple/iOS não oferece mais o sheet de câmera por esse caminho.

---

## 2. Guideline 5.1.2(i) — Privacy: Data Use and Sharing (Tracking)

### Mensagem da Apple
> "The app privacy information indicates the app collects data in order to track the user... However, the app does not use AppTrackingTransparency."

### Causa raiz
Ao preencher o App Privacy no App Store Connect, marcou-se que os dados são
usados para **tracking**. Se o app não faz tracking, é erro de preenchimento.

### Definição de tracking (Apple)
Tracking = cruzar dados coletados no seu app com dados de terceiros para
publicidade OU compartilhar com data brokers. Se o app só usa os dados para
funcionalidade própria (login, push, chatbot), **não é tracking**.

### Correção
1. App Store Connect → Privacidade do app → Editar
2. Para cada tipo de dado → "Os dados são usados para rastrear o usuário?" → **Não**
3. Publicar → resubmeter a mesma build

### Lição
Antes de submeter, revisar a pré-visualização do App Privacy. Se aparecer
"Dados usados para rastrear você" sem SDK de ads/tracking, está errado.

---

## 3. Guideline 5.1.1(v) — Account Deletion

### Mensagem da Apple
> "The app supports account creation but does not include an option to initiate account deletion... requires users to send an email."

### Causa raiz
A Apple não aceita exclusão de conta só por email (exceto indústrias
reguladas como bancos/saúde). O usuário deve conseguir excluir a conta
**dentro do app**, no máximo com uma tela de confirmação.

### Correção aplicada no UzzApp (preventiva)
- `DELETE /api/user/me` (`src/app/api/user/me/route.ts`) apaga o login do
  usuário (user_profiles + auth.users via `admin.deleteUser`).
- Botão "Excluir minha conta" em `/dashboard/settings` → confirmação → DELETE
  → signOut → redirect ao login.
- `src/app/delete-account/page.tsx` (pública) menciona os dois caminhos.

### Lição
Implementar exclusão in-app **antes** da primeira submissão. Checklist:
endpoint que apaga de verdade, botão com confirmação (máx. 2 toques), signOut
após excluir.

---

## 4. Guideline 2.1 — App Completeness (crash ou tela em branco)

### Causa comum em apps Capacitor (WebView)
O app carrega uma URL ao vivo (`server.url`). Se o site estiver fora do ar,
retornar redirect para login, ou o certificado SSL expirar, o app mostra tela
em branco ou trava.

### Prevenção
- Garantir que a URL de produção responde HTTP 200
- Páginas públicas (privacidade, termos, exclusão de conta) não podem cair em
  redirect de autenticação
- Testar no device/emulador antes de submeter (não só no browser)

---

## 5. Guideline 4 — Design: layout cortado no iPad

### Causa comum em apps Capacitor (WebView)
Sidebar fixo com `h-screen` não respeita os safe area insets do iPadOS.
Botões na parte inferior (ex.: "Sair"/logout) ficam cortados.

### Correção
1. `viewport-fit=cover` no meta viewport (UzzApp já tem isso em
   `src/app/layout.tsx` → `export const viewport`)
2. `padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px))` em
   blocos fixos
3. `min-h-0` no container flex, `shrink-0` em blocos fixos
4. Testar o layout em resolução de iPad (1024×1366) antes de submeter — a
   Apple testa em iPads reais

---

## 6. Guideline 2.1(b) — Information Needed: modelo de negócio (genérico)

### Quando acontece
Apps com telas de "pagamento", "cobrança", "assinatura" — mesmo sem processar
pagamentos reais — disparam essa pergunta.

### Quando IAP NÃO é necessário
- App é uma ferramenta de gestão B2B com assinatura vendida fora do app
  (Guideline 3.1.3(b) — Multiplatform Services)
- App registra pagamentos feitos fora do app (PIX, cartão via gateway
  externo, transferência) — só controle/registro
- Não há conteúdo digital desbloqueável, assinatura premium ou moeda virtual
  vendidos dentro do binário

### Lição
Se o app tem qualquer tela de "pagamento"/"cobrança"/"assinatura", incluir
nos **Review Notes** uma nota explicando o modelo de negócio e por que não
precisa de IAP, mesmo sem a Apple perguntar.

---

## 7. Checklist pré-submissão (evitar rejeições comuns)

- [ ] **Account deletion** funciona in-app (botão, sem email)
- [ ] **App Privacy** preenchido com tracking = Não (se não usa ads/analytics de terceiros)
- [ ] **Screenshots** de iPhone E iPad enviados
- [ ] **Privacy Policy URL** retorna HTTP 200 sem redirect
- [ ] **Conta demo** populada com dados reais
- [ ] **Review Notes** explicam o que o reviewer vai ver ao logar
- [ ] **Review Notes** explicam modelo de negócio se há telas de pagamento/assinatura
- [ ] **Build testada** no device real via TestFlight (não só simulador)
- [ ] **Layout testado em iPad** (1024×1366, safe areas)
- [ ] **Sessão sobrevive a relançamento** do app (cookies/CapacitorHttp corretos no iOS)
- [ ] **Navegação de volta** existe em toda tela full-screen do app nativo
- [ ] **Captura de foto** usa plugin nativo, não `<input capture>` puro
- [ ] **Páginas públicas** não redirecionam pra login (testar em aba anônima)
- [ ] **Copyright** preenchido (ex: "© 2026 Uzz.Ai Ltda")
- [ ] **Content Rating** respondido

---

## 8. Comunicação com a Apple

- Responda **sempre em inglês** na thread do App Store Connect
- Seja direto: "We fixed X. The new build Y includes the fix."
- Se discordar da rejeição, use "Reply" e explique — a Apple aceita contestações educadas
- Tempo médio de revisão: 1-3 dias (conta nova pode demorar mais)

---

## TL;DR

```
Rejeição mais comum #1: App Privacy com tracking = Sim (quando não tem)
  → Fix: editar labels no ASC, mesma build

Rejeição mais comum #2: Exclusão de conta por email
  → Fix: implementar DELETE + botão no perfil, novo build

Rejeição mais comum #3: 4.2 Minimum Functionality ("é só um site")
  → Fix: navegação nativa (tab bar), câmera nativa, corrigir bugs reais, novo build

Rejeição mais comum #4: bugs reais (sessão cai, sem botão de voltar, crash)
  → Fix: caso a caso — ver seção 1 (UzzApp) para os 3 exemplos concretos

Rejeição mais comum #5: Apple pergunta sobre modelo de negócio (2.1b)
  → Fix: reply explicando 3.1.3(b)/3.1.3(e), mesma build

Regra de ouro: tudo que é só no ASC = mesma build
              tudo que é código = novo build via CI
```
