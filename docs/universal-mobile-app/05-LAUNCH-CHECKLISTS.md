# 05 — Checklists de Lançamento & Requisitos de Assets

> A lista final para conferir **antes de submeter** a cada loja. Marque tudo.

---

## A. Pré-requisitos de conta

| | Google Play | Apple App Store |
|---|---|---|
| Conta | Play Console (**US$ 25**, taxa única) | Apple Developer (**US$ 99/ano**) |
| D-U-N-S | Só p/ Organização (opcional usar Individual) | **Obrigatório** p/ Organização |
| SO de build | Qualquer | **macOS obrigatório** |
| Backend de push | Firebase (FCM) | APNs (+ Firebase se FCM) |

---

## B. Checklist técnico (antes do build de release)

### Comum
- [ ] `appId`/bundle id definitivo e **idêntico** em `capacitor.config.ts`, Android e iOS
- [ ] Estratégia A ou B decidida e `capacitor.config.ts` coerente
- [ ] `npm run build:mobile` sem erros
- [ ] `npm run cap:sync` copiou o build para `android/` e `ios/`
- [ ] Ícones e splash gerados (`npx capacitor-assets generate`)
- [ ] Features nativas funcionando (push, biometria, deep link) — testadas em **device físico**
- [ ] Política de Privacidade e Termos publicados e acessíveis por URL pública

### Android
- [ ] `versionCode` incrementado (> último publicado)
- [ ] `versionName` atualizado
- [ ] `targetSdk` no nível exigido pela Play (recente)
- [ ] Keystore gerado **e com backup em ≥ 2 locais seguros**
- [ ] `release.properties` criado e **no .gitignore**
- [ ] `google-services.json` presente (se usa push) e **no .gitignore**
- [ ] `./gradlew bundleRelease` gera `app-release.aab` assinado
- [ ] AAB testado via **Teste Interno** antes da Produção

### iOS
- [ ] `CURRENT_PROJECT_VERSION` (build) incrementado
- [ ] `MARKETING_VERSION` atualizado p/ release público
- [ ] Todas as `NS*UsageDescription` presentes p/ cada permissão usada
- [ ] `DEVELOPMENT_TEAM` setado e signing automático funcionando
- [ ] Capability **Push Notifications** + `UIBackgroundModes` (se usa push)
- [ ] **Archive** gerado e enviado ao App Store Connect via Xcode Organizer
- [ ] App entrega valor nativo real (anti-Guideline 4.2)

---

## C. Assets da loja (dimensões exatas)

### Google Play
| Asset | Especificação | Obrigatório |
|-------|---------------|-------------|
| Ícone | 512×512 PNG, 32-bit c/ alpha | ✅ |
| Feature graphic | 1024×500 PNG/JPG | ✅ |
| Screenshots phone | 2–8 imgs, ~9:16 (ex. 1080×1920), PNG/JPG, ≤ 8 MB cada | ✅ (mín. 2) |
| Screenshots tablet 7"/10" | proporção do tablet | Opcional |
| Descrição curta | ≤ 80 caracteres | ✅ |
| Descrição completa | ≤ 4000 caracteres | ✅ |

### Apple App Store
| Asset | Especificação | Obrigatório |
|-------|---------------|-------------|
| Ícone | 1024×1024 PNG, **sem alpha**, sem cantos arredondados | ✅ |
| Screenshots iPhone 6.7"/6.9" | ex. 1290×2796, PNG/JPG | ✅ (mín. 1 conjunto) |
| Screenshots iPad (se suporta iPad) | ex. 2048×2732 | Condicional |
| Nome | ≤ 30 caracteres | ✅ |
| Subtítulo | ≤ 30 caracteres | Opcional |
| Palavras-chave | ≤ 100 caracteres (separadas por vírgula) | ✅ |
| Descrição | ≤ 4000 caracteres | ✅ |
| Preview vídeo | até 3, ≤ 30s | Opcional |

> Capture screenshots no emulador/simulador ou device. Android: `adb shell screencap -p /sdcard/s.png`. iOS Simulator: `Cmd+S`.

---

## D. Conformidade / formulários obrigatórios

### Google Play
- [ ] **Data Safety** (Segurança dos dados) — declarar coleta/uso de dados
- [ ] **Content rating** (questionário de classificação)
- [ ] **Target audience** (público-alvo / faixa etária)
- [ ] **Ads** declaration (contém anúncios? sim/não)
- [ ] **Government apps / Financial / Health** — declarações se aplicável
- [ ] Política de Privacidade (URL)

### Apple
- [ ] **App Privacy** (Privacy Nutrition Labels) — dados coletados e ligação à identidade
- [ ] **Age Rating** (questionário)
- [ ] **Export Compliance** (usa criptografia? — HTTPS padrão geralmente isento, mas declare)
- [ ] **Sign in with Apple** — exigido SE oferece login social de terceiros (Google/Facebook)
- [ ] Credenciais de **conta demo** em "App Review Information" se há login obrigatório
- [ ] Política de Privacidade (URL)

---

## E. Tempos de revisão esperados

| Loja | 1ª publicação | Updates |
|------|---------------|---------|
| Google Play | 1–3 dias úteis (mais p/ contas novas) | Horas a 1–2 dias |
| Apple | 24–48h (revisão humana) | 24–48h |

---

## F. Pós-lançamento

- [ ] Monitorar crash reports (Play Console / Xcode Organizer / Firebase Crashlytics)
- [ ] Responder reviews
- [ ] Acompanhar métricas (instalações, retenção)
- [ ] Planejar cadência de updates (lembrar: Estratégia B atualiza **conteúdo** sem re-submissão; só mudanças **nativas** ou de config exigem novo build)

---

## G. Erros que mais reprovam (resumo)

| Erro | Loja | Prevenção |
|------|------|-----------|
| Permissão sem `NS*UsageDescription` | Apple | Preencher Info.plist |
| "Apenas um site empacotado" (4.2) | Apple | Adicionar push/biometria/câmera nativos |
| Login obrigatório sem conta demo | Ambas | Fornecer credenciais de teste |
| `versionCode`/build não incrementado | Ambas | Incrementar a cada upload |
| Keystore errado/perdido | Google | Sempre o mesmo keystore + backup |
| Data Safety / App Privacy em branco | Ambas | Preencher os formulários |
| Política de Privacidade ausente | Ambas | Publicar URL pública antes |

---

**Fim da série.** Volte ao **[README.md](./README.md)** para a visão geral, ou consulte o documento específico da sua tarefa atual.
