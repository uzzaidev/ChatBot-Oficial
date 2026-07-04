# Playbook — GitHub Actions Secrets via CLI (automático)

> **Objetivo:** configurar os 6 secrets do CI iOS no GitHub Actions com **um
> único script**, sem clicar na UI do GitHub. Usa o `gh` CLI já autenticado.
>
> Portado do playbook do Convoca. Repo alvo: `uzzaidev/ChatBot-Oficial`.
> Script pronto neste repo: `scripts/setup-ios-ci-secrets.mjs`.

---

## 0. Pré-requisitos

| Ferramenta | Checar |
|---|---|
| **gh CLI** 2.x autenticado | `gh --version`, `gh auth status` |
| **Node.js** 18+ | `node --version` |
| `AuthKey_KEYID.p8` da App Store Connect (role Admin) | baixado em S1-4 do playbook `ios-ci-sem-mac` |
| `GoogleService-Info.plist` iOS | baixado em S1-5 do playbook `ios-ci-sem-mac` |
| `MATCH_PASSWORD` escolhida | senha sua |
| PAT GitHub com acesso ao repo `uzzapp-certs` | `ghp_...` |

Se `gh` não estiver instalado:
```powershell
winget install GitHub.cli
gh auth login
```

---

## 1. Estrutura dos 6 secrets

| Secret | Fonte | Como automatizar |
|---|---|---|
| `APP_STORE_CONNECT_API_KEY_ID` | Key ID do `.p8` | `gh secret set` direto |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Issuer ID (UUID) | `gh secret set` direto |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | conteúdo do `.p8` | lê arquivo → `gh secret set` |
| `MATCH_PASSWORD` | senha escolhida | `gh secret set` via stdin |
| `MATCH_GIT_BASIC_AUTHORIZATION` | base64 de `user:ghp_TOKEN` | script gera o base64 |
| `GOOGLE_SERVICE_INFO_PLIST_BASE64` | `GoogleService-Info.plist` | lê arquivo → base64 → `gh secret set` |

---

## 2. Execução

```powershell
# Na raiz do repo — pede os valores interativamente
node scripts/setup-ios-ci-secrets.mjs
```

Saída esperada:
```
✅ APP_STORE_CONNECT_API_KEY_ID        → set
✅ APP_STORE_CONNECT_API_ISSUER_ID     → set
✅ APP_STORE_CONNECT_API_KEY_CONTENT   → set
✅ MATCH_PASSWORD                      → set
✅ MATCH_GIT_BASIC_AUTHORIZATION       → set
✅ GOOGLE_SERVICE_INFO_PLIST_BASE64    → set

Verificando no GitHub...
NAME                                    UPDATED
...
✅ Todos os 6 secrets configurados.
```

---

## 3. Re-executar / atualizar um secret específico

```powershell
$content = Get-Content "C:\...\AuthKey_XXXX.p8" -Raw
gh secret set APP_STORE_CONNECT_API_KEY_CONTENT --body "$content" --repo uzzaidev/ChatBot-Oficial

gh secret set MATCH_PASSWORD --repo uzzaidev/ChatBot-Oficial

gh secret list --repo uzzaidev/ChatBot-Oficial
```

---

## Gotchas

| Sintoma | Causa | Solução |
|---|---|---|
| `gh: command not found` | gh não instalado | `winget install GitHub.cli` |
| `HTTP 404 Not Found` | repo inválido ou sem acesso | `gh auth status` + confirmar nome do repo |
| `HTTP 422` no `gh secret set` | token sem permissão `secrets` | `gh auth refresh -s write:repo,repo` |
| Secret não aparece no workflow | repo fork ou ambiente diferente | setar em `--env` se usar environments |
| `.p8` com quebras de linha erradas (Windows CRLF) | editor adicionou `\r\n` | ler com `readFileSync(..., 'utf8')`, sem editar manualmente |
