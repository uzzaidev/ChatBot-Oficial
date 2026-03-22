# iOS Launch Checklist

> **Data:** 2026-03-22
> **Base:** Estado real do projeto apos setup do Xcode
> **Objetivo:** Publicar o app na App Store

---

## Legenda

- `[ ]` Pendente
- `[~]` Parcialmente feito
- `[x]` Concluido

---

## Fase 0: Resolver Identidade do App ✅ CONCLUIDA

> **Concluida em:** 2026-03-22
> **Identidade escolhida:** `UzzApp` / `com.uzzai.uzzapp`

- [x] Escolher identidade final: **UzzApp** (`com.uzzai.uzzapp`)
- [x] `capacitor.config.ts` (raiz) — ja estava com `com.uzzai.uzzapp`
- [x] `ios/App/App/capacitor.config.json` — atualizado de `com.chatbot.app` → `com.uzzai.uzzapp`
- [x] `ios/App/App/Info.plist` — CFBundleDisplayName, CFBundleURLName, NSFaceIDUsageDescription
- [x] `ios/App/App/config.xml` — `<name>UzzApp</name>`
- [x] `ios/App/App/public/index.html` — `<title>UzzApp</title>`
- [x] `project.pbxproj` — `PRODUCT_BUNDLE_IDENTIFIER = com.uzzai.uzzapp` (Debug + Release)
- [x] Atualizar `docs/ios/APP_STORE_CONNECT_COPY.md` — ja estava com UzzApp/com.uzzai.uzzapp (ok)
- [x] App ID `com.uzzai.uzzapp` registrado no Apple Developer Portal
- [x] App record criado no App Store Connect
- [x] Build compilando sem erros apos alinhamento

---

## Fase 1: Sync e Validacao do Build ✅ CONCLUIDA

> **Concluida em:** 2026-03-22
> **Depende de:** Fase 0 concluida

- [x] Executar `npx cap sync ios` na raiz do projeto
- [x] Verificar se `ios/App/Podfile` manteve `platform :ios, '17.4'`
- [x] Verificar se `post_install` do Podfile mantem `SWIFT_VERSION = 5.0` e `IPHONEOS_DEPLOYMENT_TARGET = 17.4`
- [x] Executar `cd ios/App && pod install`
- [x] Abrir `ios/App/App.xcworkspace` no Xcode (NAO o `.xcodeproj`)
- [x] Verificar no Xcode:
  - [x] Scheme `App` selecionado
  - [x] TARGETS > App > General > Bundle Identifier correto
  - [x] TARGETS > App > General > Deployment Target = 17.4
  - [x] TARGETS > App > Signing & Capabilities > Team selecionado
  - [x] TARGETS > App > Signing & Capabilities > "Automatically manage signing" ativo
- [x] Build no simulador (Cmd+B) — deve compilar sem erros
- [x] Run no simulador (Cmd+R) — app abre e carrega a URL remota (login nao funciona no simulador/Mac virtual — validar em device real)

**Estado atual:**
- [x] Deployment target 17.4 em todos os 4 lugares do `project.pbxproj`
- [x] Pods instalados (7 pods, Podfile.lock presente)
- [x] Workspace configurada (App + Pods)
- [x] Scheme compartilhado criado
- [x] Arquivos de recurso restaurados (capacitor.config.json, config.xml, public/)
- [x] Build passou no simulador
- [x] `cap sync ios` executado com sucesso (5 plugins sincronizados)
- [x] `pod install` executado via Homebrew CocoaPods 1.16.2
- [x] Build compilou sem erros apos sync + pod install

**Notas do sync:**
- `cap sync` atualizou Podfile paths de `./node_modules/.pnpm/...` para `../../node_modules/...`
- `cap sync` sobrescreveu `config.xml` (restaurado manualmente)
- `cap sync` adicionou `packageClassList` ao `capacitor.config.json`
- Versoes dos pods mudaram (Capacitor 7.6.0 → 7.4.4) por apontar para root `node_modules`

---

## Fase 2: Teste em Device Real

> **Depende de:** Fase 1 concluida

### Pre-requisitos

- [ ] Device iOS fisico conectado ao Mac
- [ ] Device registrado no Apple Developer Portal
- [ ] Provisioning profile gerado para o bundle ID escolhido

### Testes funcionais

- [ ] App abre e carrega `https://uzzapp.uzzai.com.br`
- [ ] Login funciona (email/senha)
- [ ] Navegacao principal funciona (dashboard, conversas, CRM)
- [ ] Face ID / Touch ID funciona (permissao solicitada, autenticacao ok)
- [ ] Push notifications:
  - [ ] Permissao solicitada no primeiro launch
  - [ ] Notificacao recebida com app em foreground
  - [ ] Notificacao recebida com app em background
  - [ ] Tap na notificacao abre o app no contexto correto
- [ ] Deep link `uzzapp://` funciona (se aplicavel)
- [ ] App volta do background corretamente (nao perde estado)
- [ ] Rede offline mostra feedback adequado
- [ ] Status bar com estilo correto (light content)

---

## Fase 3: Assets e Branding

> **Pode ser feita em paralelo com Fases 1-2**

### Icone do App

- [x] Icone 1024x1024 em `Assets.xcassets/AppIcon.appiconset/` — icone original do app (criatura com olho)
- [x] Sem transparencia (Apple rejeita) — fundo azul solido
- [x] Sem cantos arredondados (iOS aplica automaticamente) — ok

### Splash Screen

- [x] Imagens light mode (1x, 2x, 3x) em `Assets.xcassets/Splash.imageset/`
- [x] Imagens dark mode (1x, 2x, 3x) em `Assets.xcassets/Splash.imageset/`
- [ ] Verificar se o visual esta adequado ao branding final

### Screenshots (App Store)

- [ ] iPhone 6.7" (1290x2796) — minimo 2, recomendado 5-8
- [ ] iPhone 6.5" (1284x2778) — opcional mas recomendado
- [ ] iPad 12.9" (2048x2732) — obrigatorio se suporta iPad
- [ ] Screenshots mostram funcionalidade real (Apple rejeita mockups genericos)

---

## Fase 4: App Store Connect ✅ CONCLUIDA

> **Concluida em:** 2026-03-22
> **Depende de:** Fase 0 (identidade definida)

### Configuracao do App Record

- [x] Login em [App Store Connect](https://appstoreconnect.apple.com)
- [x] Criar app record
  - Bundle ID: `com.uzzai.uzzapp`
  - Nome: `UzzApp`
  - Idioma principal: Portugues (Brasil)
  - SKU: `uzzapp-ios`

### Metadados

- [x] Nome do app: `UzzApp`
- [x] Subtitulo: `Atendimento WhatsApp com IA`
- [x] Descricao (ver `APP_STORE_CONNECT_COPY.md`)
- [x] Keywords: `whatsapp,chatbot,atendimento,crm,automacao,ia,vendas,suporte`
- [x] Categoria: Business
- [x] Screenshots carregadas
- [x] Icone do app (carregado automaticamente do build)

### URLs Obrigatorias

- [x] Privacy Policy URL acessivel e funcional
  - `https://uzzapp.uzzai.com.br/privacy` — conteudo real, LGPD compliant
- [x] Support URL acessivel e funcional
  - `https://uzzapp.uzzai.com.br/support` — conteudo real, emails de contato

### App Review Information

- [x] Conta demo funcional:
  - Email: `demo@uzzai.com.br`
  - Senha: `Google1@`
  - [ ] Testar que a conta funciona no app iOS (pendente — Mac virtual)
- [x] Nome do contato para review: `Pedro Pagliarin`
- [x] Email de contato: `pedro.pagliarin@uzzai.com.br`
- [x] Telefone de contato: `+5554991590379`
- [x] Notes for reviewer escritas (fluxo de teste, observacoes sobre OAuth)

### App Privacy

- [ ] Preencher questionario de privacidade:
  - Data Types: Contact Info, Identifiers, Usage Data
  - Purposes: App Functionality, Account Management, Analytics
  - Linked to User: Yes
  - Tracking: No

---

## Fase 5: Archive e Upload

> **Depende de:** Fases 1-4 concluidas

- [ ] No Xcode: selecionar destino "Any iOS Device (arm64)"
- [ ] Verificar versao e build number em TARGETS > App > General:
  - Marketing Version (ex: `1.0.0`)
  - Current Project Version (ex: `1`)
- [ ] Product > Archive
- [ ] Aguardar archive concluir
- [ ] No Organizer: Distribute App > App Store Connect
- [ ] Upload concluido sem erros
- [ ] Aguardar processing no App Store Connect (aparece em "Activity")

---

## Fase 6: TestFlight

> **Depende de:** Fase 5 concluida e build processada

- [ ] Build aparece no App Store Connect > TestFlight
- [ ] Adicionar compliance info (se solicitado — geralmente "No" para encryption)
- [ ] Preencher "What to Test" (ver `APP_STORE_CONNECT_COPY.md`)
- [ ] Adicionar testadores internos (equipe)
- [ ] Enviar convites
- [ ] Testadores conseguem instalar e abrir o app
- [ ] Validar funcionalidades criticas:
  - [ ] Login
  - [ ] Dashboard
  - [ ] Push notifications
  - [ ] Biometria
  - [ ] Retorno de background

---

## Fase 7: Submissao para Review

> **Depende de:** Fase 6 validada com sucesso

- [ ] No App Store Connect: criar nova versao (ou usar a existente)
- [ ] Selecionar build do TestFlight
- [ ] Todos os metadados preenchidos (Fase 4)
- [ ] Todas as screenshots carregadas (Fase 3)
- [ ] Conta demo funcional confirmada
- [ ] Submit for Review
- [ ] Aguardar review (tipicamente 1-3 dias)

### Se rejeitado

Motivos mais comuns e como resolver:

| Motivo | Fix |
|--------|-----|
| App e apenas um wrapper web | Demonstrar uso de biometria, push, status bar |
| Privacy Policy nao acessivel | Corrigir URL ou conteudo da pagina |
| Conta demo nao funciona | Verificar credenciais e testar no app |
| Crash durante review | Testar em device real com iOS 17.4+ |
| Falta Sign in with Apple | Adicionar se houver outros logins sociais no iOS |
| Missing usage descriptions | Verificar Info.plist (NSFaceIDUsageDescription, etc.) |

---

## Referencia Rapida: Arquivos-Chave

| Arquivo | Funcao |
|---------|--------|
| `capacitor.config.ts` | Fonte da verdade para `cap sync` |
| `ios/App/App/capacitor.config.json` | Config usada pelo runtime iOS |
| `ios/App/App/Info.plist` | Metadata do app iOS |
| `ios/App/App/config.xml` | Config Cordova (legacy) |
| `ios/App/Podfile` | Dependencias nativas |
| `ios/App/App.xcodeproj/project.pbxproj` | Build settings do Xcode |
| `docs/ios/APP_STORE_CONNECT_COPY.md` | Textos prontos para App Store |
| `docs/ios/IOS_XCODE_SETUP_LOG.md` | Registro do setup feito |

---

## Ordem de Execucao Resumida

```
Fase 0: Decidir identidade ──┐
                              ├──> Fase 1: Sync + Build
Fase 3: Assets (paralelo) ───┤
                              ├──> Fase 2: Teste device real
Fase 4: App Store Connect ───┘
                              ↓
                        Fase 5: Archive + Upload
                              ↓
                        Fase 6: TestFlight
                              ↓
                        Fase 7: Submissao
```
