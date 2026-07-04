# Playbook — Firebase Cloud Messaging (push) num app Capacitor, via CLI/agente

> **Objetivo:** configurar push notifications (FCM) para um app Capacitor
> quase 100% pelo terminal, minimizando cliques no console.
>
> Portado do playbook do Convoca (2026-06-19). Adaptado para o UzzApp, que já
> tem o projeto Firebase criado (`uzzapp`) e o app Android já registrado
> (`android/app/google-services.json`) — só falta registrar o app **iOS** no
> mesmo projeto.
>
> **Filosofia:** o console do Firebase é necessário em **um único ponto**
> (aceitar os Termos de Serviço + criar/ativar o projeto — já feito para o
> UzzApp). Registrar o app iOS e gerar credenciais dá para fazer via CLI.

---

## 0. Valores já conhecidos deste projeto

| Placeholder | Valor UzzApp |
|---|---|
| `<PROJECT_ID>` | `uzzapp` |
| `<PACKAGE>` (Android, já registrado) | `com.uzzai.uzzapp` |
| App iOS a registrar | `com.uzzai.uzzapp` |

---

## 1. Registrar o app iOS no projeto Firebase existente — via API

```bash
TOKEN=$(gcloud auth application-default print-access-token)
PID=uzzapp

# cria o app iOS (retorna uma operation)
curl -s -X POST "https://firebase.googleapis.com/v1beta1/projects/$PID/iosApps" \
  -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PID" \
  -H "Content-Type: application/json" \
  -d '{"bundleId":"com.uzzai.uzzapp","displayName":"UzzApp iOS"}'

# pega o appId
APPID=$(curl -s "https://firebase.googleapis.com/v1beta1/projects/$PID/iosApps" \
  -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PID" \
  | grep -oE '"appId": *"[^"]+"' | head -1 | sed 's/.*"appId": *"//;s/"//')

# baixa o GoogleService-Info.plist
curl -s "https://firebase.googleapis.com/v1beta1/projects/$PID/iosApps/$APPID/config" \
  -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PID" \
  | grep -oE '"configFileContents": *"[^"]+"' | sed 's/.*: *"//;s/"//' | base64 -d \
  > ios/App/App/GoogleService-Info.plist
```

> Alternativa (mais simples, sem `gcloud`): Firebase Console → projeto
> `uzzapp` → Adicionar app → iOS+ → Bundle ID `com.uzzai.uzzapp` → baixar o
> plist manualmente. Ver playbook `ios-ci-sem-mac` seção S1-5.

> ⚠️ **Gotcha — quota project:** sempre mande o header
> `x-goog-user-project: uzzapp`, senão dá `PERMISSION_DENIED ... requires a quota project`.

---

## 2. APNs Auth Key (obrigatório para push funcionar no iOS)

1. Apple Developer → Certificates, IDs & Profiles → **Keys → (+)**
2. Key Name: `UzzApp APNs`, habilitar **Apple Push Notifications service (APNs)**
3. Baixar a key `.p8` (só aparece uma vez)
4. Firebase Console → projeto `uzzapp` → Configurações → Cloud Messaging →
   **Apple app configuration** → upload da key + Key ID + Team ID (`2YRXNXGL8K`)

> Fazer upload nos slots **dev e produção** do Firebase — a mesma `.p8` serve
> para os dois, isso é normal e correto.

---

## 3. Service-account key para o backend enviar push (já existe)

O UzzApp já usa `firebase-admin` no backend
(`src/lib/push-dispatch.ts`) — a credencial já deve estar configurada no
ambiente de produção (Vercel). Se precisar recriar:

```bash
PID=uzzapp
SA=$(gcloud iam service-accounts list --project $PID --format="value(email)" | grep adminsdk)
gcloud iam service-accounts keys create key.json --iam-account="$SA" --project $PID
```

> ⚠️ **Gotcha — org policy bloqueia keys:** se der `Key creation is not
> allowed`, ver override reversível abaixo (seção de gotchas).

Nunca deixe `key.json` em disco fora do necessário — mova para o secret store
do host (Vercel env var) e apague o arquivo local.

---

## 4. Cliente do app — trocar plugin de push

O UzzApp usa `@capacitor-firebase/messaging` (não `@capacitor/push-notifications`)
desde a correção da rejeição de 2026-03-24 — ver
`src/lib/pushNotifications.ts`. Esse plugin entrega o **mesmo formato de
token FCM** em Android e iOS, o que o backend (`src/lib/push-dispatch.ts`,
FCM HTTP v1 via `firebase-admin`) já espera.

---

## 5. Testar

1. **Sem device:** `POST /api/mobile/push/send` (ou equivalente) sem auth deve
   dar 401.
2. **Com device:** instalar o build TestFlight/APK, logar (registra o token),
   disparar push real — ou usar Firebase Console → Messaging → Enviar teste.

---

## Resumo dos gotchas

| # | Sintoma | Causa | Solução |
|---|---------|-------|---------|
| 1 | `addFirebase`/registro de app → 403 mesmo Owner | falta escopo `firebase` e/ou ToS não aceito | ADC com `--scopes=...firebase` + aceitar ToS no console (já feito para `uzzapp`) |
| 2 | `PERMISSION_DENIED ... quota project` | falta header | `x-goog-user-project: uzzapp` |
| 3 | `Key creation is not allowed` | org policy `iam.disableServiceAccountKeyCreation` | habilitar Org Policy API + `set-policy enforce:false` (reversível) → gerar key → restaurar |
| 4 | `devices: N, sent: 0` no envio | token não é FCM (plugin errado) | confirmar que o app usa `@capacitor-firebase/messaging`, não `@capacitor/push-notifications` |
| 5 | Crash ao abrir o app pós-Firebase | `GoogleService-Info.plist` não está no bundle (`project.pbxproj` → Copy Bundle Resources) | referenciar o plist no `project.pbxproj`, não só decodificar no disco do CI |
| 6 | `pod install` falha no CI após adicionar Firebase | paths do Podfile não resolvem no ambiente do CI | conferir `ios/App/Podfile` — usar paths hoisted (`../../node_modules/@capacitor-firebase/...`) |

---

## Ordem condensada (TL;DR)

```
1. Firebase Console (1x, já feito): projeto uzzapp ativo
2. API: registrar iosApps + baixar GoogleService-Info.plist -> ios/App/App/
3. Apple Developer: criar APNs Auth Key -> upload no Firebase (dev + prod)
4. Cliente: @capacitor-firebase/messaging (já migrado neste repo)
5. Backend: firebase-admin + FCM HTTP v1 (já existe em push-dispatch.ts)
6. Testar: 401 sem auth; device físico para entrega real
```
