# Phase 3.1: Melhorar Assets (Ícones/Splash) - Quick Start

Guia prático e modular para atualizar ícones e splash screens do app mobile.

## 🎯 Objetivo

Atualizar os assets visuais (ícones e splash screens) do app para melhorar a identidade visual e experiência do usuário.

## ⏱️ Tempo Estimado

**15-30 minutos** (se já tiver os arquivos source prontos)

---

## 📋 Checklist Rápido

- [ ] Preparar arquivos source (`icon.png` e `splash.png`)
- [ ] Gerar assets automaticamente com `@capacitor/assets`
- [ ] Verificar assets gerados
- [ ] Sync com Capacitor
- [ ] Testar no emulador/device
- [ ] Atualizar `plan.md`

---

## Passo 1: Preparar Arquivos Source

### O Que Você Precisa

1. **`icon.png`** - 1024x1024 px
   - Logo/ícone do app
   - Fundo sólido ou transparente
   - Conteúdo centralizado (820x820 px com 10% padding)

2. **`splash.png`** - 2732x2732 px
   - Fundo sólido (cor da marca)
   - Logo centralizado (~50% do tamanho)
   - Simples e limpo

### Onde Colocar

```
ChatBot-Oficial/
├── icon.png          ← Criar aqui (raiz do projeto)
└── splash.png        ← Criar aqui (raiz do projeto)
```

### Dicas de Design

**Icon:**
- Use cores vibrantes e contrastantes
- Evite texto pequeno (fica ilegível)
- Teste em fundo claro e escuro
- Considere usar a cor primária do app como fundo

**Splash:**
- Use a mesma cor do tema do app
- Logo centralizado e grande
- Evite elementos complexos (carrega rápido)

### Ferramentas para Criar

- **Figma** (gratuito) - Design profissional
- **Canva** (gratuito) - Templates prontos
- **Photoshop/GIMP** - Edição avançada
- **Online generators** - [appicon.co](https://appicon.co/)

---

## Passo 2: Gerar Assets Automaticamente

### Comando Único

```bash
# Gerar todos os assets (Android + iOS)
npx @capacitor/assets generate

# Ou com cores customizadas
npx @capacitor/assets generate \
  --iconBackgroundColor '#1E40AF' \
  --splashBackgroundColor '#1E40AF'
```

**O que acontece:**
- Lê `icon.png` e `splash.png` da raiz
- Gera todos os tamanhos necessários para Android/iOS
- Salva em `android/app/src/main/res/` e `ios/App/App/Assets.xcassets/`

**Tempo:** 10-30 segundos

---

## Passo 3: Verificar Assets Gerados

### Android - Ícones

```bash
# Verificar ícones gerados
dir android\app\src\main\res\mipmap-*\ic_launcher.png

# Deve mostrar:
# mipmap-hdpi/ic_launcher.png
# mipmap-mdpi/ic_launcher.png
# mipmap-xhdpi/ic_launcher.png
# mipmap-xxhdpi/ic_launcher.png
# mipmap-xxxhdpi/ic_launcher.png
```

### Android - Splash Screens

```bash
# Verificar splash screens gerados
dir android\app\src\main\res\drawable-*\splash.png

# Deve mostrar múltiplos arquivos (portrait e landscape)
```

### iOS (se aplicável)

```bash
# Verificar assets iOS (macOS)
ls ios/App/App/Assets.xcassets/AppIcon.appiconset/
```

---

## Passo 4: Sync com Capacitor

```bash
# Sincronizar assets com plataformas nativas
npx cap sync
```

**O que faz:**
- Copia assets para projetos nativos
- Atualiza configurações se necessário

---

## Passo 5: Rebuild e Testar

```bash
# Build completo
npm run build:mobile
npm run cap:sync
npm run cap:open:android
```

**No Android Studio:**
1. Desinstalar app antigo (se existir):
   ```bash
   adb uninstall com.chatbot.app
   ```
2. Run app (`Shift + F10`)
3. Verificar:
   - [ ] Ícone atualizado no launcher
   - [ ] Ícone está nítido (não pixelado)
   - [ ] Splash screen aparece ao abrir app
   - [ ] Splash tem cor de fundo correta

---

## Passo 6: Troubleshooting Rápido

### ❌ Ícone Não Atualiza

**Solução:**
```bash
# 1. Desinstalar app completamente
adb uninstall com.chatbot.app

# 2. Limpar cache do launcher (no device)
# Settings → Apps → Launcher → Storage → Clear Cache

# 3. Reinstalar
# No Android Studio: Run novamente

# 4. Se ainda não atualizar, reiniciar device
adb reboot
```

### ❌ Ícone Pixelado

**Causa:** Source file (`icon.png`) com resolução baixa.

**Solução:**
- Recriar `icon.png` em 1024x1024 px (alta qualidade)
- Regenerar: `npx @capacitor/assets generate`

### ❌ Splash Screen Não Aparece

**Causa:** Configuração faltando em `AndroidManifest.xml`.

**Solução:**
Verificar se existe em `android/app/src/main/AndroidManifest.xml`:
```xml
<activity android:name=".MainActivity">
    <meta-data
        android:name="android.app.splash_screen_drawable"
        android:resource="@drawable/splash" />
</activity>
```

Se não existir, adicionar e fazer `npx cap sync`.

---

## Exemplo Completo (Workflow)

```bash
# 1. Criar/obter arquivos source
# (usar Figma, Canva, ou design tool)
# Salvar como:
# - icon.png (1024x1024)
# - splash.png (2732x2732)

# 2. Gerar assets
npx @capacitor/assets generate --iconBackgroundColor '#1E40AF' --splashBackgroundColor '#1E40AF'

# 3. Verificar
dir android\app\src\main\res\mipmap-*\ic_launcher.png

# 4. Sync
npx cap sync

# 5. Rebuild
npm run build:mobile
npm run cap:sync
npm run cap:open:android

# 6. No Android Studio
# - Desinstalar app antigo: adb uninstall com.chatbot.app
# - Run (Shift + F10)
# - Verificar ícone e splash no device
```

---

## Próximos Passos

Após completar esta tarefa:

1. ✅ Marcar como completo no `plan.md`
2. 🚀 Continuar para **Phase 3.2: Deep Linking**
3. 🔔 Ou continuar para **Phase 3.3: Push Notifications**

---

## Recursos Adicionais

- **Documentação completa:** [ICONS_SPLASH.md](./ICONS_SPLASH.md)
- **Ferramentas online:**
  - [App Icon Generator](https://appicon.co/)
  - [Ape Tools](https://apetools.webprofusion.com/)
- **Design guidelines:**
  - [Android Icon Design](https://developer.android.com/guide/practices/ui_guidelines/icon_design_launcher)
  - [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)

---

**Status:** Pronto para implementar

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`

