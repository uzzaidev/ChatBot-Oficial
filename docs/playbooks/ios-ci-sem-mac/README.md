# Playbook — iOS sem Mac: GitHub Actions + fastlane

> **Objetivo:** publicar o UzzApp na App Store sem possuir ou alugar um Mac.
> O build, assinatura e upload acontecem no runner `macos-26` do GitHub Actions,
> que tem Xcode 26.5 instalado — exatamente o que a Apple exige desde 28/04/2026.
>
> **Projeto:** UzzApp · Bundle ID: `com.uzzai.uzzapp` · iOS target: 17.4
>
> Portado do playbook do projeto irmão **Convoca** (`docs/playbooks/ios-ci-sem-mac`
> daquele repo), que já publicou com esta exata estratégia usando a **mesma conta
> Apple Developer** (Team ID `2YRXNXGL8K`, Uzz.Ai Ltda).
>
> **Pré-requisito único pago:** Apple Developer Program (US$ 99/ano) — já ativo ✅

---

## Visão Geral dos Sprints

```
iOS-S1 (1–2h)    Contas no Apple Developer + Firebase iOS      [manual: browser]
iOS-S2 (1h)      fastlane match — certificados + provisioning  [GitHub Actions]
iOS-S3 (30min)   GitHub secrets + disparar CI + TestFlight
iOS-S4 (1–2h)    App Store Connect — screenshots + listing + submit  [manual]
```

Cada sprint pode ser executado **inteiro no Windows**, sem abrir o Xcode.

### Playbooks de apoio

| Playbook | Uso |
|---|---|
| `docs/playbooks/github-secrets-via-cli/README.md` | **S3**: configura os 6 secrets com 1 comando |
| `docs/playbooks/app-screenshots-headless/README.md` | **S4**: captura screenshots iPhone (1320×2868) via headless |
| `docs/playbooks/firebase-push-via-cli/README.md` | **S1**: registrar app iOS + APNs no Firebase via CLI |
| `docs/playbooks/app-store-review-rejeicoes/README.md` | Rejeições comuns da Apple e como resolver |

### Arquivos já criados no repo (scaffolding)

| Arquivo | Papel |
|---|---|
| `Gemfile` | dependência do fastlane |
| `fastlane/Appfile` | `app_identifier` + `team_id` |
| `fastlane/Matchfile` | aponta para o repo privado de certs (`uzzapp-certs`) |
| `fastlane/Fastfile` | lanes `setup_certs` (1x) e `beta` (a cada release) |
| `.github/workflows/ios-match-bootstrap.yml` | roda `setup_certs` uma vez |
| `.github/workflows/ios-release.yml` | build + archive + upload TestFlight |
| `scripts/setup-ios-ci-secrets.mjs` | configura os 6 secrets do GitHub via `gh` CLI |

### O que ainda exige browser (Apple/Firebase — não tem API pública)

| Etapa | Onde | Tempo |
|---|---|---|
| Criar repo privado `uzzapp-certs` | github.com/new | 2 min |
| Registrar App ID + capabilities | developer.apple.com | 5 min |
| Criar app no App Store Connect | appstoreconnect.apple.com | 5 min |
| Baixar API Key `.p8` (role **Admin**) | appstoreconnect.apple.com | 2 min |
| Registrar app iOS no Firebase existente (`uzzapp`) | console.firebase.google.com | 5 min |
| Criar APNs Auth Key `.p8` | developer.apple.com | 5 min |

---

## Sprint iOS-S1 — Contas e identidade

### S1-1 · Criar repo privado para os certs

```powershell
gh repo create uzzapp-certs --private --add-readme
```

### S1-2 · Apple Developer Portal — registrar App ID

URL: https://developer.apple.com/account/resources/identifiers/list

1. **Certificates, Identifiers & Profiles → Identifiers → (+)**
2. Selecionar **App IDs → App**
3. Preencher:
   - Description: `UzzApp`
   - Bundle ID: **Explicit** → `com.uzzai.uzzapp`
4. Capabilities a habilitar:
   - ✅ Push Notifications
   - ✅ Associated Domains
5. **Register** — Team ID já é conhecido: `2YRXNXGL8K` (mesma conta do Convoca)

> ⚠️ Bundle ID é **imutável após o 1º submit**. `com.uzzai.uzzapp` já foi usado
> na submissão rejeitada em 2026-03-24 — mantenha o mesmo.

### S1-3 · App Store Connect — o app já existe

O app `UzzApp` já existe no App Store Connect (da submissão anterior, rejeitada
em 2026-03-24). Não é preciso criar de novo — só gerar uma nova build e
resubmeter a versão.

### S1-4 · App Store Connect API Key — para o CI não usar senha

URL: https://appstoreconnect.apple.com/access/integrations/api → **Generate API Key**

| Campo | Valor |
|---|---|
| Name | `uzzapp-ci-admin` |
| Access | **Admin** ⚠️ |

> ⚠️ **CRÍTICO:** a role precisa ser **Admin** — só Admin pode criar
> Distribution Certificates via API (fastlane match falha com role Developer).

Baixe o `.p8` imediatamente (só aparece uma vez). **Nunca** coloque na pasta do
repo — o `.gitignore` já protege `*.p8`, mas salve fora do projeto (ex.:
`C:\Users\pedro\uzzapp-ios-setup\`).

Anote:
```
APP_STORE_CONNECT_API_KEY_ID       → Key ID
APP_STORE_CONNECT_API_ISSUER_ID    → Issuer ID (UUID)
APP_STORE_CONNECT_API_KEY_CONTENT  → conteúdo do .p8
```

### S1-5 · Firebase — registrar app iOS + APNs

> Firebase já existe para Android (projeto `uzzapp`, ver
> `android/app/google-services.json`). Só adicionar o app iOS.
>
> Passo a passo via CLI: `docs/playbooks/firebase-push-via-cli/README.md` (§4).

1. Firebase Console → projeto `uzzapp` → ⚙️ Configurações do projeto
2. **Adicionar app → iOS+** → Bundle ID `com.uzzai.uzzapp`
3. Baixar `GoogleService-Info.plist` → salvar em
   `ios/App/App/GoogleService-Info.plist` (já está no `.gitignore`)

**APNs Auth Key (.p8):**

1. Apple Developer → Certificates, IDs & Profiles → **Keys → (+)**
2. Key Name: `UzzApp APNs`, habilitar **Apple Push Notifications service (APNs)**
3. Baixar a key `.p8` (só aparece uma vez)
4. Firebase Console → Configurações → Cloud Messaging → **Apple app configuration**
   → upload da APNs Auth Key + Key ID + Team ID

### Checklist S1

- [ ] Repo `uzzapp-certs` criado (privado)
- [ ] App ID `com.uzzai.uzzapp` com Push Notifications + Associated Domains
- [ ] API Key **Admin** `.p8` baixada — anotar Key ID + Issuer ID
- [ ] App iOS registrado no Firebase (`uzzapp`)
- [ ] `GoogleService-Info.plist` salvo em `ios/App/App/`
- [ ] APNs Auth Key criada e uploadada no Firebase (dev **e** produção)

---

## Sprint iOS-S2 — fastlane match (certificados sem Mac)

Os arquivos `Gemfile`, `fastlane/Appfile`, `fastlane/Matchfile` e
`fastlane/Fastfile` já existem neste repo (portados do Convoca, com
`app_identifier`/`BUNDLE_ID` trocados para `com.uzzai.uzzapp`). Não é
necessário rodar `fastlane init`.

> ⚠️ Não adicione `apple_id`/`username` nos arquivos — com API Key, o
> fastlane não usa senha da Apple, só o token `.p8`.

### S2-1 · Gerar MATCH_GIT_BASIC_AUTHORIZATION

```powershell
$token = gh auth token
$b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("uzzaidev:$token"))
gh secret set MATCH_GIT_BASIC_AUTHORIZATION --repo uzzaidev/ChatBot-Oficial --body $b64
```

### S2-2 · Rodar o bootstrap (1x)

```
GitHub Actions → iOS Match Bootstrap (roda 1x) → Run workflow
```

Resultado: Distribution Certificate + `AppStore_com.uzzai.uzzapp.mobileprovision`
aparecem criptografados no repo `uzzapp-certs`.

### Checklist S2

- [ ] `MATCH_PASSWORD` escolhida e configurada como secret
- [ ] `MATCH_GIT_BASIC_AUTHORIZATION` configurado
- [ ] Workflow `ios-match-bootstrap` executado com sucesso
- [ ] Distribution Certificate + Provisioning Profile no repo `uzzapp-certs`

---

## Sprint iOS-S3 — Workflow GitHub Actions

### S3-1 · Secrets no GitHub — automatizado

```powershell
node scripts/setup-ios-ci-secrets.mjs
```

Configura os 6 secrets: `APP_STORE_CONNECT_API_KEY_ID`,
`APP_STORE_CONNECT_API_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_CONTENT`,
`MATCH_PASSWORD`, `MATCH_GIT_BASIC_AUTHORIZATION`,
`GOOGLE_SERVICE_INFO_PLIST_BASE64`.

### S3-2 · Disparar o workflow

```
GitHub Actions → iOS Release → Run workflow
  app_version: 2.1.0
  build_number: (deixar vazio = usa o run number do GitHub)
```

Tempo esperado: 20–35 min (menos com cache de CocoaPods).

> **Custo:** runner macOS conta 10x no cota do GitHub Actions. Plano Free:
> 2.000 min/mês → ~200 min macOS → dispare só quando for enviar para revisão,
> não em todo push.

### S3-3 · Validar no TestFlight

1. App Store Connect → TestFlight → aguardar processamento (~10–30 min)
2. Instalar no iPhone/iPad via TestFlight
3. Testar especificamente os 4 problemas da rejeição anterior (ver
   `docs/playbooks/app-store-review-rejeicoes/README.md` → seção "UzzApp"):
   - Login sobrevive a um relançamento do app?
   - Base de Conhecimento → "Adicionar foto" não crasha?
   - Conversas/Contatos têm como voltar ao menu principal?
   - Push chega no device?

---

## Sprint iOS-S4 — App Store Connect e Resubmissão

### S4-1 · Universal Links

`src/app/.well-known/apple-app-site-association/route.ts` já está criado e é
público (sem auth). Validar em produção:

```
https://uzzapp.uzzai.com.br/.well-known/apple-app-site-association
```

### S4-2 · Screenshots

Ver `docs/playbooks/app-screenshots-headless/README.md`. Obrigatório iPhone
6.9" (1320×2868); a rejeição anterior citou teste em **iPad Air 11-inch** —
gerar também screenshots de iPad.

### S4-3 · Reenviar para revisão

1. App Store Connect → UzzApp → selecionar a build nova do TestFlight
2. Reply na thread de rejeição explicando os 4 pontos corrigidos (modelo de
   negócio, funcionalidade nativa, bugs) — ver playbook de rejeições
3. **Submit for Review**

---

## Secrets consolidados (referência rápida)

| Secret | Fonte |
|---|---|
| `APP_STORE_CONNECT_API_KEY_ID` | API Key Admin (`uzzapp-ci-admin`) |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Issuer ID (UUID) |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | conteúdo do `.p8` |
| `MATCH_PASSWORD` | senha escolhida para criptografar os certs |
| `MATCH_GIT_BASIC_AUTHORIZATION` | base64 de `uzzaidev:<gh_token>` |
| `GOOGLE_SERVICE_INFO_PLIST_BASE64` | base64 do `GoogleService-Info.plist` iOS |

## Referências

- [GitHub Actions runner-images — macos-26](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md)
- [fastlane match docs](https://docs.fastlane.tools/actions/match/)
- [fastlane gym docs](https://docs.fastlane.tools/actions/gym/)
- [fastlane pilot (TestFlight) docs](https://docs.fastlane.tools/actions/pilot/)
