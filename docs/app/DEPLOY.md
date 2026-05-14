# Deploy - Google Play & App Store

Guia completo para publicar o app nas lojas Google Play Store e Apple App Store.

## 📋 Table of Contents

- [Pré-requisitos](#pré-requisitos)
- [Google Play Store (Android)](#google-play-store-android)
- [Apple App Store (iOS - macOS)](#apple-app-store-ios---macos)
- [Checklist Pré-Deploy](#checklist-pré-deploy)
- [Post-Deploy](#post-deploy)
- [Troubleshooting](#troubleshooting)

---

## Pré-requisitos

### Ambas Plataformas

- [ ] App totalmente funcional (testado em devices)
- [ ] Icons e splash screens configurados ([ICONS_SPLASH.md](./ICONS_SPLASH.md))
- [ ] Environment variables produção configuradas ([ENV_VARS.md](./ENV_VARS.md))
- [ ] Política de privacidade publicada (URL pública)
- [ ] Termos de serviço publicados (URL pública)
- [ ] Screenshots do app (5-8 imagens)
- [ ] Descrição do app (curta e longa)

---

### Google Play

- [ ] **Google Play Console Account** ($25 registro único)
  - [https://play.google.com/console/signup](https://play.google.com/console/signup)
- [ ] Keystore para signing (release)

---

### Apple App Store

- [ ] **Apple Developer Account** ($99/ano)
  - [https://developer.apple.com/programs/](https://developer.apple.com/programs/)
- [ ] macOS (para Xcode e submission)
- [ ] Certificados e provisioning profiles

---

## Google Play Store (Android)

### 1. Criar Keystore (Signing Key)

**IMPORTANTE:** Keystore é permanente! Backup seguro obrigatório!

```bash
# Gerar keystore
keytool -genkey -v -keystore android\app\release.keystore -alias chatbot -keyalg RSA -keysize 2048 -validity 10000

# Preencher:
# Password: (ANOTE SENHA!)
# Re-enter password: (mesma senha)
# What is your first and last name?: ChatBot Oficial
# What is the name of your organizational unit?: Development
# What is the name of your organization?: ChatBot
# What is the name of your City or Locality?: Sua Cidade
# What is the name of your State or Province?: Seu Estado
# What is the two-letter country code?: BR
# Is CN=... correct?: yes
```

**Resultado:**

- Arquivo criado: `android/app/release.keystore`
- Alias: `chatbot`

**BACKUP:**

```bash
# Copiar para local seguro (NÃO commitar no git!)
Copy-Item android\app\release.keystore C:\Backup\chatbot-release.keystore
```

**Adicionar ao .gitignore:**

```gitignore
# android/.gitignore
*.keystore
release.properties
```

---

### 2. Configurar Signing Config

#### android/app/build.gradle

```gradle
android {
    // ...

    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword 'SUA_SENHA_KEYSTORE'  // OU usar env var
            keyAlias 'chatbot'
            keyPassword 'SUA_SENHA_KEYSTORE'
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

**Segurança (Opção Melhor - Env Vars):**

```gradle
// android/app/build.gradle
def keystorePropertiesFile = rootProject.file("release.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'] ?: 'release.keystore')
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}
```

```properties
# android/release.properties (NÃO commitar!)
storeFile=release.keystore
storePassword=SUA_SENHA
keyAlias=chatbot
keyPassword=SUA_SENHA
```

---

### 3. Build Release APK/AAB

#### AAB (Android App Bundle - RECOMENDADO)

Google Play aceita apenas AAB desde agosto 2021.

```bash
cd android
.\gradlew bundleRelease

# Output:
# android\app\build\outputs\bundle\release\app-release.aab
```

**Verificação:**

```bash
dir android\app\build\outputs\bundle\release\app-release.aab
# Tamanho: ~10-30 MB
```

---

#### APK (Alternativa - para distribuição direta)

```bash
cd android
.\gradlew assembleRelease

# Output:
# android\app\build\outputs\apk\release\app-release.apk
```

---

### 4. Criar App no Google Play Console

1. Acesse: [https://play.google.com/console](https://play.google.com/console)
2. **Todos os apps** → **Criar app**
3. Configurações:
   - **Nome do app**: ChatBot Oficial
   - **Idioma padrão**: Português (Brasil)
   - **App ou jogo**: App
   - **Gratuito ou pago**: Gratuito
   - **Declarações**:
     - [x] Declaro que este aplicativo está em conformidade com as leis dos EUA sobre controles de exportação
     - [x] Declaro que este aplicativo atende às Diretrizes do programa para desenvolvedores do Google Play
4. **Criar app**

---

### 5. Configurar Ficha da Loja

#### Detalhes do App

- **Nome do app**: ChatBot Oficial (máx 50 caracteres)
- **Breve descrição**: Chatbot inteligente para WhatsApp com IA (máx 80 caracteres)
- **Descrição completa**:

```
ChatBot Oficial é um assistente virtual inteligente para WhatsApp, potencializado por IA avançada.

Principais recursos:
• Respostas automáticas inteligentes usando Groq Llama 3.3 70B
• Suporte a áudio, imagens e documentos
• Transferência para atendimento humano quando necessário
• Base de conhecimento personalizável (RAG)
• Histórico completo de conversas
• Multi-tenant (suporta múltiplos clientes)

Ideal para empresas que desejam automatizar atendimento no WhatsApp mantendo qualidade e personalização.

Tecnologias: Next.js, Supabase, OpenAI, Groq, Meta WhatsApp Business API
```

- **Ícone do app**: 512x512 PNG (upload)
- **Imagem de destaque**: 1024x500 PNG

---

#### Screenshots

**Requisitos:**

- Mínimo: 2 screenshots
- Recomendado: 5-8 screenshots
- Formato: PNG ou JPG
- Tamanhos aceitos:
  - Phone: 320-3840px (largura/altura 16:9 ou 9:16)
  - Tablet: 1200-7680px

**Dicas:**

- Mostre features principais
- Use device frames (mockups)
- Adicione captions explicativos
- Primeira screenshot é a mais importante (aparece na busca)

**Ferramentas:**

- [Mockuphone](https://mockuphone.com/) - Device mockups
- [Screely](https://www.screely.com/) - Browser mockups

---

#### Categoria e Tags

- **Categoria**: Produtividade ou Negócios
- **Tags**: chatbot, whatsapp, ia, atendimento, automação

---

#### Informações de Contato

- **Email**: seu-email@exemplo.com
- **Website**: https://uzzap.uzzai.com
- **Telefone**: (opcional)

---

### 6. Política de Privacidade

**OBRIGATÓRIO** para Google Play.

**Opções:**

1. **Criar página no site:**

```
https://uzzap.uzzai.com/privacy-policy
```

2. **Usar gerador:**

- [TermsFeed Privacy Policy Generator](https://www.termsfeed.com/privacy-policy-generator/)
- [App Privacy Policy Generator](https://app-privacy-policy-generator.nisrulz.com/)

**Conteúdo mínimo:**

- Quais dados coletamos (email, mensagens, metadados)
- Como usamos (prover serviço, melhorias)
- Como armazenamos (Supabase, criptografia)
- Compartilhamento com terceiros (Meta WhatsApp API, OpenAI, Groq)
- Direitos do usuário (LGPD/GDPR)
- Contato para questões de privacidade

**URL no Play Console:**

- Configurações do app → Política de Privacidade → Adicionar URL

---

### 7. Questionário de Segurança de Dados

Play Console → **Segurança de dados**

**Exemplo de respostas:**

- **Coleta dados?** Sim
- **Tipos de dados:**
  - [x] Informações pessoais (nome, email, telefone)
  - [x] Mensagens (chat)
  - [x] Arquivos e documentos (uploads)
- **Dados compartilhados com terceiros?** Sim
  - WhatsApp Business API (Meta)
  - OpenAI (processamento de IA)
  - Groq (processamento de IA)
- **Dados criptografados em trânsito?** Sim (HTTPS)
- **Usuários podem solicitar exclusão?** Sim (via settings ou contato)

---

### 8. Classificação de Conteúdo

Play Console → **Classificação de conteúdo** → **Iniciar questionário**

**Categoria:** Utilitários ou Produtividade

**Respostas típicas:**

- Contém violência? Não
- Conteúdo sexual? Não
- Linguagem imprópria? Não
- Drogas/álcool? Não
- Interação com usuários? Sim (chat)
- Compras no app? Não (ou Sim se houver)

Concluir → Aplicar classificação

---

### 9. Upload do AAB

Play Console → **Versão de produção** → **Criar nova versão**

1. **Upload do AAB:**

   - Arraste `app-release.aab` ou clique para selecionar
   - Aguarde processamento (1-5min)

2. **Detalhes da versão:**

   - **Nome da versão**: v1.0.0
   - **Notas da versão (pt-BR)**:

   ```
   Primeira versão do ChatBot Oficial
   • Integração com WhatsApp Business API
   • Respostas automáticas com IA
   • Suporte a áudio, imagens e documentos
   • Transferência para atendimento humano
   • Base de conhecimento personalizável
   ```

3. **Salvar** → **Revisar versão** → **Iniciar lançamento para produção**

---

### 10. Revisão e Publicação

- **Status:** Em análise
- **Tempo:** 1-7 dias (geralmente 1-2 dias)
- **Notificações:** Via email

**Possíveis resultados:**

- ✅ **Aprovado**: App publicado na loja
- ⚠️ **Precisa de alterações**: Corrigir e reenviar
- ❌ **Rejeitado**: Violação de políticas (raro se seguiu guia)

**Acompanhar:**
Play Console → Dashboard → Ver status

---

## Apple App Store (iOS - macOS)

### 1. Apple Developer Account

1. Acesse: [https://developer.apple.com/programs/](https://developer.apple.com/programs/)
2. **Enroll** → $99/ano
3. Preencha formulário (requer ID Apple)
4. Aguarde aprovação (1-2 dias)

---

### 2. Criar App ID e Provisioning Profile

#### App Store Connect

1. Acesse: [https://appstoreconnect.apple.com/](https://appstoreconnect.apple.com/)
2. **Meus Apps** → **+ (Adicionar)** → **Novo App**
3. Configurações:
   - **Plataforma**: iOS
   - **Nome**: ChatBot Oficial
   - **Idioma principal**: Português (Brasil)
   - **Bundle ID**: Selecione ou crie `com.chatbot.app`
   - **SKU**: chatbot-oficial-ios (identificador único)
   - **Acesso Total**: (deixe marcado)
4. **Criar**

---

#### Apple Developer Portal

1. [https://developer.apple.com/account/](https://developer.apple.com/account/)
2. **Certificates, Identifiers & Profiles**
3. **Identifiers** → Verificar `com.chatbot.app` existe

---

### 3. Criar Certificados (Signing)

#### Development Certificate (Testing)

1. **Certificates** → **+** → **iOS App Development**
2. **Create Certificate Signing Request (CSR)**:
   - Mac → Keychain Access → Certificate Assistant → Request Certificate from CA
   - Email: seu email
   - Common Name: ChatBot Dev
   - Salvar em disco
3. Upload CSR → Download certificado
4. Duplo-clique para instalar no Keychain

#### Distribution Certificate (Production)

1. **Certificates** → **+** → **Apple Distribution**
2. Criar CSR (mesmo processo)
3. Upload → Download → Instalar

---

### 4. Criar Provisioning Profile

#### App Store Profile

1. **Profiles** → **+** → **App Store**
2. Selecione App ID: `com.chatbot.app`
3. Selecione Distribution Certificate criado
4. **Profile Name**: ChatBot App Store
5. **Generate** → Download → Duplo-clique (instalar)

---

### 5. Configurar Xcode (Signing)

```bash
npx cap open ios
```

Xcode:

1. Selecione target **App**
2. **Signing & Capabilities**:
   - **Automatically manage signing**: Desmarque
   - **Provisioning Profile (Release)**: Selecione "ChatBot App Store"
   - **Team**: Selecione sua conta
3. Verificar **Bundle Identifier**: `com.chatbot.app`

---

### 6. Build Release Archive

Xcode:

1. Selecione target: **Any iOS Device (arm64)**
2. **Product** → **Scheme** → **Edit Scheme**
   - **Run** → Build Configuration: **Release**
3. **Product** → **Clean Build Folder** (`Cmd + Shift + K`)
4. **Product** → **Archive** (`Cmd + B` pode dar erro, use Archive)

**Tempo:** 5-15 minutos

**Verificação:**

- Window → Organizer → Archives
- Archive aparece com data/hora

---

### 7. Distribuir para App Store

Organizer → Selecione Archive → **Distribute App**

1. **Método**: App Store Connect
2. **Upload**: Marque "Upload"
3. **Opções de distribuição**:
   - App Thinning: Deixar padrão
   - Rebuild from Bitcode: Sim
   - Strip Swift symbols: Sim
   - Upload symbols: Sim (crash reporting)
4. **Signing**: Automatically manage signing (ou selecione manual)
5. **Revisar**: Verificar Bundle ID, Version, Build
6. **Upload**

**Tempo de upload:** 5-20 minutos (depende da internet)

**Verificação:**

- App Store Connect → Meus Apps → ChatBot Oficial
- **Atividade** → Build deve aparecer (pode demorar 10-30min para processar)

---

### 8. Configurar Metadados (App Store Connect)

#### Informações do App

1. **Nome**: ChatBot Oficial (máx 30 caracteres)
2. **Subtítulo**: Chatbot inteligente para WhatsApp (máx 30 caracteres)
3. **Categoria**:
   - **Primária**: Produtividade
   - **Secundária**: Negócios

#### Descrição

```
ChatBot Oficial é seu assistente virtual inteligente para WhatsApp.

RECURSOS:
• Respostas automáticas com IA avançada (Groq Llama 3.3 70B)
• Suporte a áudio, imagens e documentos
• Transferência para humano quando necessário
• Base de conhecimento personalizável
• Histórico completo de conversas
• Interface intuitiva e responsiva

IDEAL PARA:
Empresas que desejam automatizar atendimento mantendo qualidade.

SEGURANÇA:
Dados criptografados, conformidade com LGPD.
```

#### Palavras-chave

```
chatbot,whatsapp,ia,atendimento,automação,assistente,virtual,negócios
```

(máx 100 caracteres)

#### URLs de Suporte

- **URL de suporte**: https://uzzap.uzzai.com/support
- **URL de marketing**: https://uzzap.uzzai.com

#### Política de Privacidade

```
https://uzzap.uzzai.com/privacy-policy
```

---

### 9. Screenshots (iOS)

**Requisitos:**

- iPhone 6.7" (iPhone 14 Pro Max): 1290x2796 px
- iPhone 6.5" (iPhone 11 Pro Max): 1242x2688 px
- iPhone 5.5" (iPhone 8 Plus): 1242x2208 px
- iPad Pro 12.9" (3rd gen): 2048x2732 px

**Mínimo:** 3 screenshots para cada tamanho de tela

**Ferramentas:**

- Xcode Simulator → Captura (`Cmd + S`)
- [Fastlane Snapshot](https://fastlane.tools/snapshot) - Automatizar

**Upload:**

- App Store Connect → Mídia → Arraste screenshots

---

### 10. App Preview (Vídeo - Opcional)

- **Duração**: 15-30 segundos
- **Formato**: .mov, .m4v, .mp4
- **Resolução**: Match com screenshot sizes

---

### 11. Informações de Classificação

**Questionário de conteúdo:**

- Violência: Nenhuma
- Conteúdo sexual: Nenhum
- Linguagem imprópria: Nenhuma
- Interação com usuários: Sim (chat)

**Classificação resultante:** 4+ (todos os públicos)

---

### 12. Informações de Versão

- **Versão**: 1.0.0
- **Build**: 1
- **Novidades desta versão (pt-BR)**:

```
Primeira versão do ChatBot Oficial para iOS!

• Integração WhatsApp Business API
• Respostas automáticas inteligentes
• Suporte multimídia (áudio, imagens, documentos)
• Transferência para atendimento humano
• Base de conhecimento personalizável
```

---

### 13. Enviar para Revisão

1. Selecione Build (processado no passo 7)
2. Preencha todos os campos obrigatórios
3. **Enviar para revisão**

**Status:**

- Aguardando revisão
- Em revisão (1-3 dias)
- Pronto para venda (aprovado) ✅
- Rejeitado (corrigir e reenviar) ⚠️

**Acompanhar:**

- App Store Connect → Meus Apps → ChatBot Oficial → Status

---

## Checklist Pré-Deploy

### Código

- [ ] Todas features funcionando
- [ ] Nenhum console.log/debug code
- [ ] Error handling robusto
- [ ] Loading states implementados
- [ ] Offline handling (graceful degradation)

### Assets

- [ ] Icons configurados (todas densidades)
- [ ] Splash screens configurados
- [ ] Screenshots tirados (5-8 imagens)
- [ ] Screenshots em múltiplos tamanhos (iOS)

### Configuração

- [ ] Environment variables produção configuradas
- [ ] `NEXT_PUBLIC_*` corretos para produção
- [ ] API endpoints apontando para produção
- [ ] Analytics configurado (opcional)
- [ ] Error tracking configurado (Sentry, opcional)

### Legal

- [ ] Política de privacidade publicada (URL)
- [ ] Termos de serviço publicados (URL)
- [ ] LGPD/GDPR compliance verificado
- [ ] Licenças de terceiros documentadas

### Testing

- [ ] Testado em múltiplos devices físicos
- [ ] Testado em diferentes versões Android/iOS
- [ ] Testado em diferentes tamanhos de tela
- [ ] Testado offline/online
- [ ] Testado com conexão lenta

---

## Post-Deploy

### Monitoramento

1. **Crash Reporting:**

   - Google Play Console → Qualidade → Relatórios de falhas
   - App Store Connect → App Analytics → Crashes

2. **Reviews:**

   - Responder reviews negativos
   - Agradecer reviews positivos
   - Identificar bugs reportados

3. **Analytics:**
   - Monitorar instalações diárias
   - Taxa de retenção (D1, D7, D30)
   - Sessões por usuário

---

### Atualizações

**Quando atualizar:**

- Bugs críticos (hotfix: v1.0.1)
- Novas features (minor: v1.1.0)
- Breaking changes (major: v2.0.0)

**Processo:**

1. Implementar mudanças
2. Testar extensivamente
3. Atualizar version/build number
4. Build release AAB/Archive
5. Upload para Play/App Store
6. Notas de versão claras

**Frequência recomendada:** A cada 2-4 semanas

---

## Troubleshooting

### Google Play

| Problema                           | Solução                                       |
| ---------------------------------- | --------------------------------------------- |
| "Upload failed: APK not signed"    | Verificar signing config em build.gradle      |
| "Version code must be unique"      | Incrementar versionCode em build.gradle       |
| "Icon doesn't meet requirements"   | Gerar com @capacitor/assets, 512x512 PNG      |
| "Privacy policy URL not valid"     | Verificar URL acessível via HTTPS             |
| "App rejected: deceptive behavior" | Revisar screenshots/descrição (não enganosos) |

---

### Apple App Store

| Problema                 | Solução                                              |
| ------------------------ | ---------------------------------------------------- |
| "Invalid Bundle ID"      | Verificar match entre Xcode e App Store Connect      |
| "Missing compliance"     | Export Compliance: Encryption → App usa HTTPS padrão |
| "Screenshots wrong size" | Usar tamanhos exatos (1290x2796, 1242x2688, etc.)    |
| "Build processing stuck" | Aguardar 30min, se persistir: contatar suporte       |
| "Guideline 4.3 - Spam"   | App muito similar a outro (redesign UI/features)     |

---

## Recursos Externos

- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [Fastlane](https://fastlane.tools/) - Automação de deploy
- [Capacitor Deploy Docs](https://capacitorjs.com/docs/guides/deploying-updates)

---

**Status:** Pronto para deploy quando app estiver finalizado

**Tempo estimado:**

- Google Play: 1-3 dias após submission
- Apple App Store: 2-5 dias após submission

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`
