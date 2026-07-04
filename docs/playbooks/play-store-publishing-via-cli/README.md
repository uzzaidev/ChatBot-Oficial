# Playbook — Publicar/atualizar na Google Play **via CLI**

> **Objetivo:** automatizar o que se repete na Google Play (upload de AAB,
> ficha da loja, screenshots, notas de versão) por linha de comando.
>
> Portado do playbook do Convoca (2026-06). Para o UzzApp: `applicationId
> com.uzzai.uzzapp`, já **publicado e aprovado** anteriormente na Play Store
> (uma versão antiga passou) — o fluxo abaixo é para **atualizar**, não criar
> o app do zero.
>
> **Verdade-base:** a "papelada" (Data Safety, Content Rating, público-alvo)
> já foi feita uma vez quando o app foi aprovado. O que se repete a cada
> versão é 100% CLI.

---

## 0. O que é / não é automatizável

| Tarefa | API/CLI? | Observação |
|--------|----------|------------|
| Upload de **AAB** + criar release em track | ✅ | internal/alpha/beta/production |
| **Notas da versão** / rollout % / promover track | ✅ | |
| **Ficha da loja** (título, descrição) | ✅ | por locale |
| **Assets** (ícone, feature graphic, screenshots) | ✅ | |
| **Data Safety / Content Rating / público-alvo** | ❌ | só console, já preenchido para o UzzApp |

➡️ Conclusão: para o UzzApp, a compliance já foi feita — automatize apenas
uploads e ficha a partir de agora.

---

## 1. Ferramenta recomendada: fastlane `supply`

```bash
gem install fastlane
```

Alternativa sem fastlane: chamar a **Android Publisher API** direto (REST
`edits.*`).

---

## 2. Setup de acesso (uma vez, se ainda não existir)

```bash
PID=uzzapp
gcloud services enable androidpublisher.googleapis.com --project $PID

gcloud iam service-accounts create play-publisher \
  --display-name="Play Publisher" --project $PID
SA="play-publisher@${PID}.iam.gserviceaccount.com"

gcloud iam service-accounts keys create play-key.json --iam-account="$SA" --project $PID
```

> ⚠️ **Gotcha — org policy bloqueia keys:** ver override reversível no
> playbook `firebase-push-via-cli/README.md` (seção de gotchas).

### 2.1. Linkar a service account no Play Console (manual, ~2 min)
1. Play Console → **Configurações → Acesso à API**
2. Vincular o projeto GCP `uzzapp`
3. Em **Service accounts**, encontrar `play-publisher@...` → **Conceder acesso**
4. Permissões mínimas: **Liberar apps em testes/produção** + **Editar ficha da loja**

### 2.2. Guardar a key

```bash
cat play-key.json | doppler secrets set PLAY_SERVICE_ACCOUNT_JSON -p uzzapp -c prd --silent
rm -f play-key.json
```

---

## 3. Uso com fastlane `supply`

```bash
fastlane supply init \
  --json_key play-key.json \
  --package_name com.uzzai.uzzapp
```

Cria `fastlane/metadata/android/pt-BR/{title,short_description,full_description}.txt`
e `images/{icon.png,featureGraphic.png,phoneScreenshots/}`.

### Publicar update

```bash
fastlane supply \
  --aab android/app/build/outputs/bundle/release/app-release.aab \
  --json_key play-key.json \
  --package_name com.uzzai.uzzapp \
  --track internal \
  --release_status draft
```

Flags úteis:
- `--skip_upload_metadata` / `--skip_upload_images` — subir só o que mudou
- `--track production --rollout 0.1` — produção com 10% de rollout

> **Atualização típica:** incrementar `versionCode`/`versionName` em
> `android/app/build.gradle`, rebuildar o AAB com o **mesmo keystore**
> (`android/app/release.keystore`), rodar o `fastlane supply` acima.

---

## 4. Alternativa: Android Publisher API crua (sem fastlane)

```
1. POST  androidpublisher/v3/applications/com.uzzai.uzzapp/edits           -> editId
2. POST  .../edits/<editId>/bundles  (upload do AAB)                       -> versionCode
3. PUT   .../edits/<editId>/tracks/internal  {releases:[{versionCodes,status}]}
4. PUT   .../edits/<editId>/listings/pt-BR   {title, fullDescription, ...}
5. POST  .../edits/<editId>/<imageType>      (screenshots/featureGraphic/icon)
6. POST  .../edits/<editId>:commit
```

---

## 5. Gotchas

| Sintoma | Causa | Solução |
|---------|-------|---------|
| `Key creation is not allowed` | org policy SA keys | override reversível |
| API 401/403 ao publicar | SA não linkada no Play Console | vincular + conceder acesso; aguardar propagação |
| `versionCode` rejeitado | code não incrementado | subir `versionCode` a cada upload |
| Assinatura recusada | Play App Signing usa key da Google | subir com a **upload key**; a Google re-assina |

---

## 6. TL;DR

```
RECORRENTE (CLI, sempre):
  bump versionCode em android/app/build.gradle ->
  rebuild AAB assinado (mesmo keystore: android/app/release.keystore) ->
  fastlane supply --aab ... --track internal
```
