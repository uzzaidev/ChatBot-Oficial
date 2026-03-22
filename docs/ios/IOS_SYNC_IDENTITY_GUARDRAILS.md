# iOS Sync & Identity Guardrails

> **Objetivo:** complementar o `IOS_XCODE_SETUP_LOG.md` com um procedimento operacional seguro para manutenção futura do iOS
> **Foco:** `cap sync`, branding, source of truth e prevenção de regressões

---

## 1. Quando usar este documento

Use este arquivo sempre que alguma destas ações estiver prestes a acontecer:

- executar `npx cap sync ios`
- adicionar ou remover plugin Capacitor
- alterar `appId`, `appName`, `ios.scheme` ou URL remota
- ajustar Podfile, deployment target ou signing
- preparar um update iOS após mudanças no projeto web

Este documento não substitui o log técnico. O histórico completo da recuperação está em `IOS_XCODE_SETUP_LOG.md`.

---

## 2. Estado atual que precisa ser preservado

Hoje existem **dois estados de configuração diferentes** no projeto:

| Área | Valores atuais |
|------|----------------|
| Raiz (`capacitor.config.ts`) | `com.uzzai.uzzapp` / `UzzApp` / `UzzApp` |
| iOS em `ios/App/App` | `com.chatbot.app` / `ChatBot` / `ChatBot` |

Consequência prática:

- o app iOS atual compila com identidade `ChatBot`
- a raiz ainda descreve a identidade `UzzApp`
- um `cap sync` futuro tende a reintroduzir os valores da raiz no iOS

Enquanto essa divergência existir, **todo sync é uma operação de risco**.

---

## 3. Fonte da verdade por tipo de mudança

| Tipo de dado | Fonte primária hoje | Observação |
|--------------|---------------------|------------|
| Configuração gerada do Capacitor | `capacitor.config.ts` | `cap sync` usa a raiz como entrada |
| Identidade efetiva do app no Xcode | `ios/App/App.xcodeproj/project.pbxproj` | Bundle ID, version, build, deployment target |
| Branding iOS exibido ao sistema | `ios/App/App/Info.plist` | Nome exibido, URL scheme, permissões |
| Runtime config iOS gerada | `ios/App/App/capacitor.config.json` | Pode ser sobrescrita por `cap sync` |
| Dependências nativas iOS | `ios/App/Podfile` + `Podfile.lock` | `cap sync` e `pod install` podem alterar |

Regra operacional:

1. Se a mudança envolve Capacitor, começar pela raiz.
2. Se a mudança envolve signing/build do Xcode, validar também no `.pbxproj`.
3. Se a mudança envolve nome, identificador ou scheme, revisar raiz e iOS juntos no mesmo fluxo.

---

## 4. Matriz de decisão rápida

### Caso A. Mudança só no front-end remoto

Exemplos:

- texto
- layout
- regras do app web
- páginas hospedadas em `https://uzzapp.uzzai.com.br`

Procedimento:

1. publicar a versão web
2. não executar `cap sync`
3. não mexer no projeto iOS

### Caso B. Mudança em plugin ou config nativa

Exemplos:

- novo plugin Capacitor
- mudança em `plugins` no `capacitor.config.ts`
- mudança de `server.url`

Procedimento:

1. alinhar primeiro o `capacitor.config.ts`
2. executar `npx cap sync ios`
3. revisar imediatamente os arquivos críticos do iOS
4. executar `pod install` se necessário
5. abrir `App.xcworkspace` e validar build

### Caso C. Mudança de branding

Exemplos:

- trocar `UzzApp` por `ChatBot`
- trocar `com.uzzai.uzzapp` por `com.chatbot.app`
- trocar URL scheme

Procedimento:

1. definir a identidade final antes de tocar em qualquer arquivo
2. atualizar primeiro a raiz
3. atualizar depois os arquivos iOS
4. executar sync
5. validar se nada voltou ao valor antigo

Nunca faça branding parcial.

---

## 5. Checklist obrigatório antes de `cap sync`

Antes de qualquer sync, conferir:

- `capacitor.config.ts` tem os valores que você realmente quer propagar
- a equipe sabe se a identidade oficial é `UzzApp` ou `ChatBot`
- o `server.url` está correto para produção
- existe backup ou diff limpo dos arquivos iOS sensíveis
- você sabe quais arquivos podem ser sobrescritos

Arquivos mais sensíveis:

- `capacitor.config.ts`
- `ios/App/App/capacitor.config.json`
- `ios/App/Podfile`
- `ios/App/App.xcodeproj/project.pbxproj`
- `ios/App/App/Info.plist`

Se houver dúvida sobre branding, **pare antes do sync**.

---

## 6. Validação obrigatória depois de `cap sync`

Depois do sync, revisar pelo menos estes pontos:

### Identidade

- `appId`
- `appName`
- `ios.scheme`
- `PRODUCT_BUNDLE_IDENTIFIER`
- `CFBundleDisplayName`
- `CFBundleURLName`
- `CFBundleURLSchemes`

### Build

- `IPHONEOS_DEPLOYMENT_TARGET = 17.4`
- `SWIFT_VERSION = 5.0`
- workspace continua referenciando `App.xcodeproj` e `Pods/Pods.xcodeproj`
- scheme `App` continua disponível

### Dependências

- plugins esperados continuam presentes no `Podfile`
- `Podfile.lock` foi atualizado de forma coerente
- nenhum path de pod foi quebrado pela estrutura `pnpm`

### Runtime

- `ios/App/App/capacitor.config.json` continua apontando para a URL correta
- `public/index.html` permanece como fallback
- `Info.plist` ainda contém `NSFaceIDUsageDescription` e ATS para `uzzai.com.br`

Se qualquer um desses itens regredir, o sync não terminou de forma segura.

---

## 7. Sequência segura para mudanças de identidade

Se a decisão final for manter `ChatBot` / `com.chatbot.app`, a ordem recomendada é:

1. atualizar `capacitor.config.ts`
2. executar `npx cap sync ios`
3. revisar `ios/App/App/capacitor.config.json`
4. revisar `ios/App/Podfile`
5. revisar `ios/App/App.xcodeproj/project.pbxproj`
6. revisar `ios/App/App/Info.plist`
7. abrir `App.xcworkspace`
8. validar signing, bundle ID e build no Xcode

Se a decisão final for voltar para `UzzApp` / `com.uzzai.uzzapp`, aplicar a mesma ordem, mas em direção oposta.

O ponto importante é a consistência, não qual nome vence.

---

## 8. Recuperação rápida se o sync quebrar o iOS

Sinais comuns:

- bundle ID voltou ao valor antigo
- display name mudou sem intenção
- deep links quebraram
- Podfile perdeu ajustes locais
- build falha depois de um sync que antes funcionava

Procedimento de recuperação:

1. comparar `capacitor.config.ts` com `ios/App/App/capacitor.config.json`
2. comparar branding do `Info.plist` com o `project.pbxproj`
3. restaurar manualmente os valores esperados
4. revisar `Podfile` e `IPHONEOS_DEPLOYMENT_TARGET`
5. executar `pod install`
6. rebuildar no Xcode

Se a quebra tiver vindo de branding, o problema quase sempre começou na raiz.

---

## 9. Recomendação estrutural

A melhoria mais importante pendente no repositório é esta:

**alinhar o `capacitor.config.ts` da raiz com a identidade definitiva do app antes do próximo `cap sync`.**

Sem isso:

- o iOS continua funcional, mas frágil
- qualquer manutenção nativa fica mais arriscada
- o time perde previsibilidade sobre o que o sync irá gerar

---

## 10. Fluxo mínimo recomendado para manutenção futura

1. decidir se a mudança é web-only ou nativa
2. se for nativa, revisar primeiro `capacitor.config.ts`
3. executar sync apenas quando a raiz estiver correta
4. validar os arquivos críticos do iOS logo após o sync
5. abrir o workspace e confirmar build
6. registrar no `IOS_XCODE_SETUP_LOG.md` qualquer ajuste estrutural novo

---

## 11. Leitura sugerida

Ordem recomendada para quem vai operar o iOS deste projeto:

1. `README.md`
2. `IOS_XCODE_SETUP_LOG.md`
3. `IOS_SYNC_IDENTITY_GUARDRAILS.md`
4. `IOS_CHECKLIST.md`
5. `IOS_IMPLEMENTATION_GUIDE.md`
