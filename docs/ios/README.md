# iOS Implementation Documentation

**Projeto:** ChatBot-Oficial (UzzApp)
**Stack:** Next.js 16 + Capacitor 8.0.1 + iOS 17.4+
**Data:** 15/03/2026
**Status:** 📱 Pronto para implementação

---

## 📚 Documentos Disponíveis

### 1. [IOS_IMPLEMENTATION_GUIDE.md](./IOS_IMPLEMENTATION_GUIDE.md)
**Tipo:** Guia Técnico Completo
**Tamanho:** ~15.000 palavras
**Tempo de leitura:** 45-60 minutos

**Para quem:**
- Desenvolvedores implementando iOS pela primeira vez
- Tech leads planejando a migração
- Qualquer pessoa que queira entender o processo completo

**Conteúdo:**
- 11 fases detalhadas (Setup Mac → Submissão App Store)
- Comandos exatos linha por linha
- Troubleshooting de 15+ problemas comuns
- Código completo de arquivos de configuração
- Timeline sugerido semana a semana
- Explicação de cada conceito

**Use quando:**
- For implementar iOS do zero
- Encontrar erros e precisar debug detalhado
- Quiser entender o "porquê" de cada passo

---

### 2. [IOS_CHECKLIST.md](./IOS_CHECKLIST.md)
**Tipo:** Checklist Executável
**Tamanho:** ~2.000 palavras
**Tempo de leitura:** 10-15 minutos

**Para quem:**
- Desenvolvedores que já leram o guia completo
- Revisão antes de cada etapa
- Validação de que nada foi esquecido

**Conteúdo:**
- Checkboxes para cada passo crítico
- Resumo das 10 fases principais
- Checklist final de go-live
- Red flags (o que NUNCA fazer)
- Timeline condensado

**Use quando:**
- Estiver executando a implementação
- Quiser validar que completou tudo
- Precisar de referência rápida

---

## 🎯 Quick Start (5 minutos)

**Se você nunca implementou iOS:**
1. Ler: `IOS_CHECKLIST.md` - Fase "Pré-Requisitos" (5 min)
2. Verificar: Tem Mac com macOS 15.6+? Tem Apple Developer account?
3. Ler: `IOS_IMPLEMENTATION_GUIDE.md` - Seção "Sumário Executivo" (5 min)
4. Decidir: quando começar (recomendado: esta semana)

**Se você já tem Mac e Xcode:**
1. Ler: `IOS_CHECKLIST.md` completo (15 min)
2. Começar: Fase 2 (Atualizar Projeto iOS)
3. Consultar: `IOS_IMPLEMENTATION_GUIDE.md` quando tiver dúvidas

---

## 🚦 Status da Implementação

### ✅ O Que Já Está Pronto

- Estrutura iOS básica criada (`ios/App/`)
- Xcode project existe (`App.xcodeproj`)
- Workspace CocoaPods existe (`App.xcworkspace`)
- Capacitor configurado (v8.0.1)
- 5 plugins instalados no package.json:
  - @capacitor/app
  - @capacitor/network
  - @capacitor/push-notifications
  - @capacitor/status-bar
  - @aparajita/capacitor-biometric-auth

### ⚠️ O Que Precisa Ser Feito

#### Bloqueante (sem isso, não funciona)

1. **Atualizar Podfile**
   - Adicionar 4 plugins que faltam
   - Mudar deployment target 14.0 → 17.4

2. **Atualizar Info.plist**
   - Adicionar `NSFaceIDUsageDescription`
   - Configurar deep links
   - Configurar App Transport Security

3. **Configurar Xcode**
   - Bundle ID: com.uzzai.uzzapp
   - Signing (Team, provisioning)
   - Capabilities (Push Notifications)
   - Build Settings (deployment target 17.4)

4. **Gerar Assets**
   - Ícones (1024x1024 + outros tamanhos)
   - Splash screens

5. **Sincronizar Capacitor**
   ```bash
   npx cap sync ios
   cd ios/App && pod install
   ```

#### Importante (para App Store)

6. **Criar app record no App Store Connect**
7. **Preparar screenshots** (5-8 imagens)
8. **Criar Privacy Policy** (se não existir)
9. **Configurar demo account** para review

#### Recomendado (qualidade)

10. **Testar em iPhone real** (não só simulador)
11. **TestFlight com beta testers** (mínimo 3 pessoas)
12. **Iterar baseado em feedback**

---

## 📊 Análise do Projeto Atual

### Arquitetura Identificada

```
Next.js App (Web)
     ↓
Capacitor Bridge
     ↓ (carrega de)
https://uzzapp.uzzai.com.br
```

**Modelo:** Server-based
- App iOS **não** tem build local do Next.js
- App iOS carrega web app de produção
- **Vantagem:** Updates sem rebuild
- **Desvantagem:** Apple pode questionar (mitigado com features nativas)

### Plugins Ativos

| Plugin | Android | iOS Status | Configuração Necessária |
|--------|---------|------------|-------------------------|
| @capacitor/app | ✅ | ⚠️ | Atualizar Podfile |
| @capacitor/network | ✅ | ⚠️ | Atualizar Podfile |
| @capacitor/push-notifications | ✅ | ⚠️ | Podfile + Capability + entitlement |
| @capacitor/status-bar | ✅ | ⚠️ | Atualizar Podfile |
| @aparajita/capacitor-biometric-auth | ✅ | ⚠️ | Podfile + Info.plist permission |

### Versão Atual

- **Android:** versionCode 8, versionName "2.0.0-internal.8"
- **iOS:** Deve usar mesma versão
  - CFBundleShortVersionString: 2.0.0
  - CFBundleVersion: 8

---

## ⏱️ Estimativa de Tempo

### Cenário 1: Desenvolvedor experiente com iOS
**Tempo:** 6-8 horas hands-on + 1-3 dias review Apple
- Setup Mac: já tem → 0h
- Atualizar projeto: 1h
- Configurar Xcode: 1h
- Assets: 30min
- Testes: 1h
- App Store Connect: 1h
- Build & Upload: 30min
- TestFlight: 1h
- Submissão: 30min
- **Total:** ~6-8h

### Cenário 2: Primeira vez implementando iOS
**Tempo:** 10-16 horas hands-on + 1-3 dias review Apple
- Setup Mac: 1h (install Xcode, CocoaPods)
- Atualizar projeto: 2h (learning curve)
- Configurar Xcode: 2h (signing issues)
- Assets: 1-2h (criar do zero)
- Testes: 2-3h (debug issues)
- App Store Connect: 1h
- Build & Upload: 1h (erros comuns)
- TestFlight: 1-2h
- Submissão: 30min
- **Total:** ~10-16h

### Cenário 3: Rejeição da Apple
**Tempo adicional:** +2-4 horas
- Ler rejection reasons: 15min
- Corrigir problema: 1-2h
- Re-build e upload: 30min
- Re-submit: 15min
- Aguardar nova review: +1-2 dias

---

## 🎯 Recomendações

### Timeline Ideal (4 semanas)

**Semana 1 (15-21 março):**
- Dia 1-2: Setup Mac + estudar documentação
- Dia 3-4: Atualizar projeto iOS
- Dia 5: Primeiro build no Xcode
- Dia 6-7: Testes + correções

**Semana 2 (22-28 março):**
- Dia 1: App Store Connect setup
- Dia 2-3: TestFlight
- Dia 4-5: Iteração baseada em feedback
- Dia 6: Submissão
- Dia 7: Buffer

**Semana 3-4 (29 março - 11 abril):**
- Aguardar review
- Responder rejeições (se houver)
- Re-submeter
- **Meta:** Aprovado até 11 abril

**Prazo Apple:** 28 abril 2026
- Apps devem usar Xcode 26+ e iOS 17.4+
- Você estará preparado se configurar para 17.4 agora

### Recursos Necessários

**Hardware:**
- Mac (mini, Air, Pro, qualquer) com macOS 15.6+
- 50GB+ espaço livre
- iPhone para testes finais (opcional mas recomendado)

**Contas:**
- Apple Developer Program ($99/ano)
- App Store Connect access

**Conhecimento:**
- Básico de Terminal/Bash
- Noções de Xcode (ou disposição para aprender)
- Paciência (primeira vez sempre tem surpresas)

---

## 🚨 Pontos Críticos de Atenção

### 1. Deadline Apple (28/04/2026)

A partir de 28 de abril de 2026:
- ✅ Xcode 26 obrigatório
- ✅ iOS 18 SDK obrigatório
- ✅ Deployment target mínimo: iOS 17.4

**Recomendação:** Configure já para iOS 17.4 agora.

### 2. App Não Pode Ser "Só um Site"

**Guideline Apple 4.2:** Minimum Functionality

Se seu app apenas abre um WebView do site, será rejeitado.

**Mitigação (já implementado):**
- ✅ Push notifications (nativo)
- ✅ Biometria (Face ID/Touch ID)
- ✅ Network status monitoring
- ✅ Deep links
- ✅ Status bar customização

**Apple aceita porque:**
- App oferece features iOS-específicas
- Integração nativa com sistema
- Não é substituível por Safari

### 3. Sign in with Apple

**Guideline 4.8:** Se seu app usa login social (Google, Facebook), deve oferecer Sign in with Apple também.

**Status atual:** Verificar se web app usa login social
- Se SIM → implementar Sign in with Apple
- Se NÃO (só email/senha) → OK

### 4. Privacy Policy Obrigatória

Apple rejeita sem:
- URL funcional
- Texto claro sobre coleta de dados
- Matching com App Privacy no App Store Connect

**Ação:** Usar página já disponível em `https://uzzapp.uzzai.com.br/privacy` e validar acesso público

### 5. Demo Account Funcional

Para review, Apple precisa:
- Email/senha de teste
- Conta com dados de exemplo
- Acesso a todas as features

**Ação:** Conta `demo@uzzai.com.br` já criada; validar login e fluxo principal antes do review

---

## 📖 Fluxo de Uso da Documentação

### Primeira Implementação

```
1. Ler IOS_CHECKLIST.md - Pré-Requisitos (5 min)
   ↓
2. Verificar se tem tudo necessário
   ↓
3. Ler IOS_IMPLEMENTATION_GUIDE.md - Sumário Executivo (10 min)
   ↓
4. Entender escopo e timeline
   ↓
5. Seguir IOS_CHECKLIST.md - Fase 1 (Setup Mac)
   ↓
6. Para cada checkbox:
   - Executar ação
   - Se tiver dúvida → consultar IOS_IMPLEMENTATION_GUIDE.md
   - Se tiver erro → consultar seção Troubleshooting
   ↓
7. Marcar checkbox quando completo
   ↓
8. Repetir até Fase 10
   ↓
9. App na App Store! 🎉
```

### Updates Futuros

```
1. Fazer mudanças no código
   ↓
2. Consultar IOS_CHECKLIST.md - "Updates Futuros"
   ↓
3. Incrementar version/build
   ↓
4. npx cap sync ios
   ↓
5. Archive → Upload
   ↓
6. Submit for Review (se necessário)
```

---

## 🛠️ Ferramentas Necessárias

### Instaladas no Mac

- [x] Xcode 26 (Mac App Store)
- [x] Command Line Tools (`xcode-select --install`)
- [x] CocoaPods (`sudo gem install cocoapods`)

### Accounts

- [x] Apple Developer Program
- [x] App Store Connect access

### Opcionais (mas úteis)

- [ ] Figma/Sketch (para screenshots)
- [ ] iPhone real (para testes finais)
- [ ] TestFlight app (para testar como usuário)

---

## 📞 Suporte

### Se Encontrar Problemas

1. **Verificar Troubleshooting no guia:**
   - `IOS_IMPLEMENTATION_GUIDE.md` - Seção "Troubleshooting"
   - 15+ problemas comuns com soluções

2. **Pesquisar online:**
   - Google: erro exato
   - Stack Overflow: tag [ios] [capacitor]

3. **Comunidades:**
   - Capacitor Discord: https://discord.gg/UPYYRhtyzp (canal #ios)
   - Apple Developer Forums: https://developer.apple.com/forums/

4. **Documentação oficial:**
   - Capacitor iOS: https://capacitorjs.com/docs/ios
   - Apple Guidelines: https://developer.apple.com/app-store/review/guidelines/

---

## 📝 Próximos Passos

### Imediatos (esta semana)

1. [ ] Ler `IOS_CHECKLIST.md` completo (15 min)
2. [ ] Verificar pré-requisitos (Mac, conta Apple)
3. [ ] Ler `IOS_IMPLEMENTATION_GUIDE.md` - Fases 1-3 (30 min)
4. [ ] Decidir: quando começar implementação

### Curto prazo (próximas 2 semanas)

5. [ ] Setup do Mac (Xcode 26, CocoaPods)
6. [ ] Atualizar projeto iOS local
7. [ ] Configurar Xcode
8. [ ] Primeiro build no simulador

### Médio prazo (próximas 4 semanas)

9. [ ] TestFlight com beta testers
10. [ ] Submissão para App Store
11. [ ] **Meta:** App aprovado até 11 abril 2026

---

## ✅ Checklist Rápida de Leitura

Antes de começar, você deve saber responder:

- [ ] Qual a diferença entre `.xcodeproj` e `.xcworkspace`?
  - **R:** Sempre abrir `.xcworkspace` (inclui CocoaPods)

- [ ] Qual o deployment target mínimo em abril 2026?
  - **R:** iOS 17.4

- [ ] Preciso rebuildar iOS para updates no web app?
  - **R:** Não! (modelo server.url)

- [ ] Quantos webhooks preciso configurar?
  - **R:** Nenhum (isso é backend, não iOS)

- [ ] Qual arquivo tem permissões de Face ID?
  - **R:** `Info.plist` → `NSFaceIDUsageDescription`

Se respondeu tudo: ✅ Pronto para começar!
Se ficou com dúvidas: ⚠️ Ler guia completo primeiro.

---

## 🎓 Glossário

| Termo | Significado |
|-------|-------------|
| **Xcode** | IDE da Apple para desenvolvimento iOS |
| **CocoaPods** | Gerenciador de dependências iOS (como npm) |
| **Podfile** | Arquivo de configuração do CocoaPods |
| **Bundle ID** | Identificador único do app (com.uzzai.uzzapp) |
| **Provisioning Profile** | Certificado de distribuição iOS |
| **Signing** | Assinatura digital do app (prova que é seu) |
| **Capabilities** | Permissões do app (push, deep links, etc) |
| **Archive** | Build de produção para App Store |
| **TestFlight** | Sistema de beta testing da Apple |
| **App Store Connect** | Dashboard para gerenciar apps na loja |
| **Deployment Target** | Versão mínima do iOS suportada |
| **Workspace** | Projeto Xcode + CocoaPods integrados |

---

*Documentação criada: 15/03/2026*
*Versão: 1.0*
*Próxima atualização: Após primeiro go-live*
