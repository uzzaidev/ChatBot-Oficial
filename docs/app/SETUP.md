# Mobile App Setup - Windows-First

Guia completo para configurar o ambiente de desenvolvimento mobile pela primeira vez (Windows).

## 📋 Table of Contents

- [Pré-requisitos](#pré-requisitos)
- [Instalação - Checklist](#instalação---checklist)
- [Configurar Android Studio](#configurar-android-studio)
- [Build Estático Next.js](#build-estático-nextjs)
- [Sync com Plataformas Nativas](#sync-com-plataformas-nativas)
- [Abrir Android Studio e Testar](#abrir-android-studio-e-testar)
- [Configurar Environment Variables](#configurar-environment-variables)
- [Verificação Final](#verificação-final)
- [Troubleshooting](#troubleshooting)
- [Próximos Passos](#próximos-passos)

---

## Pré-requisitos

### Software Necessário

- [ ] **Node.js**: 18.x ou superior ([Download](https://nodejs.org/))
- [ ] **Git**: Para clonar repositório ([Download](https://git-scm.com/))
- [ ] **Android Studio**: Versão mais recente ([Download](https://developer.android.com/studio))
- [ ] **Java JDK**: 17 ou superior (incluído no Android Studio)
- [ ] **Editor**: VS Code recomendado ([Download](https://code.visualstudio.com/))

### Verificar Instalações

Abra PowerShell/cmd e execute:

```bash
node --version
# Esperado: v18.x.x ou superior

npm --version
# Esperado: 9.x.x ou superior

git --version
# Esperado: git version 2.x.x
```

---

## Instalação - Checklist

### 1. Clonar o Repositório

```bash
# Navegue até a pasta desejada
cd C:\Users\pedro\OneDrive\Área de Trabalho

# Clone o repositório (se ainda não clonou)
git clone <REPO_URL> ChatBot-Oficial
cd ChatBot-Oficial\ChatBot-Oficial
```

**Verificação:**
- [ ] Pasta existe: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`
- [ ] Arquivo `package.json` existe

---

### 2. Instalar Dependências Node.js

```bash
npm install
```

**Tempo estimado**: 3-5 minutos

**Verificação:**
- [ ] Pasta `node_modules` criada
- [ ] Nenhum erro de instalação
- [ ] Arquivo `package-lock.json` criado/atualizado

**Troubleshooting:**
- **Erro de permissão**: Execute cmd/PowerShell como Administrador
- **Network timeout**: Verifique firewall/proxy
- **Versão Node.js antiga**: Atualize para 18.x+

---

### 3. Instalar Android Studio

1. Baixe o instalador: [https://developer.android.com/studio](https://developer.android.com/studio)
2. Execute o instalador (`android-studio-*.exe`)
3. Durante a instalação, certifique-se de marcar:
   - [x] Android SDK
   - [x] Android SDK Platform
   - [x] Android Virtual Device (AVD)
   - [x] Performance (Intel HAXM ou Android Emulator Hypervisor)

**Tempo estimado**: 10-15 minutos

**Verificação:**
- [ ] Android Studio instalado em `C:\Program Files\Android\Android Studio`
- [ ] SDK instalado em `C:\Users\<YourUser>\AppData\Local\Android\Sdk`

---

### 4. Configurar Android SDK

Abra Android Studio → **Tools** → **SDK Manager**

#### SDK Platforms (aba "SDK Platforms"):
- [x] **Android 14.0 (API 34)** - Target do projeto
- [x] **Android 13.0 (API 33)**
- [x] **Android 5.1 (API 22)** - minSdk do projeto

#### SDK Tools (aba "SDK Tools"):
- [x] Android SDK Build-Tools 34.x.x
- [x] Android SDK Command-line Tools
- [x] Android SDK Platform-Tools
- [x] Android Emulator
- [x] Google Play Services

Clique **Apply** → **OK** (download ~2GB)

**Verificação:**
```bash
# Configurar ANDROID_HOME (veja próxima seção)
adb --version
# Esperado: Android Debug Bridge version 1.0.x
```

---

### 5. Configurar Variáveis de Ambiente (Windows)

#### Opção 1: Via Interface Gráfica

1. Pressione `Win + R` → Digite `sysdm.cpl` → Enter
2. Aba **Advanced** → **Environment Variables**
3. Em **User variables**, clique **New**:

   - **Variable name**: `ANDROID_HOME`
   - **Variable value**: `C:\Users\<YourUser>\AppData\Local\Android\Sdk`

4. Edite a variável **Path** (User variables) e adicione:
   - `%ANDROID_HOME%\platform-tools`
   - `%ANDROID_HOME%\emulator`
   - `%ANDROID_HOME%\tools`
   - `%ANDROID_HOME%\tools\bin`

5. Clique **OK** em todas as janelas

#### Opção 2: Via PowerShell (Temporário)

```powershell
$env:ANDROID_HOME = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\emulator"
```

**Nota**: Configuração temporária (válida apenas na sessão atual). Use Opção 1 para persistência.

#### Verificação:

**IMPORTANTE**: Feche e reabra PowerShell/cmd após configurar variáveis!

```bash
echo %ANDROID_HOME%
# Esperado: C:\Users\<YourUser>\AppData\Local\Android\Sdk

adb --version
# Esperado: Android Debug Bridge version 1.0.x

emulator -version
# Esperado: Android emulator version x.x.x
```

**Checklist:**
- [ ] `ANDROID_HOME` definido corretamente
- [ ] `adb` funciona no terminal
- [ ] `emulator` funciona no terminal

---

### 6. Criar Arquivo de Environment Variables

Crie `.env.local` na raiz do projeto:

```bash
# Criar arquivo (PowerShell)
New-Item -Path .env.local -ItemType File

# Ou use seu editor (VS Code)
code .env.local
```

**Conteúdo mínimo** (copie de `.env.example`):

```env
# Supabase (OBRIGATÓRIO)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI (OBRIGATÓRIO para AI)
OPENAI_API_KEY=sk-...

# Groq (OBRIGATÓRIO para AI)
GROQ_API_KEY=gsk_...

# WhatsApp Meta (OPCIONAL para webhooks locais)
META_ACCESS_TOKEN=EAAG...
META_PHONE_NUMBER_ID=899639703222013
META_VERIFY_TOKEN=your-verify-token

# Gmail (OPCIONAL para human handoff)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Redis (OPCIONAL - funciona sem)
REDIS_URL=redis://localhost:6379
```

**CRÍTICO**: Sem `NEXT_PUBLIC_SUPABASE_*`, o app não funciona!

**Verificação:**
- [ ] Arquivo `.env.local` criado
- [ ] Variáveis `NEXT_PUBLIC_SUPABASE_*` preenchidas
- [ ] Ver [ENV_VARS.md](./ENV_VARS.md) para detalhes mobile

---

### 7. Testar Build Web (Opcional)

Antes de buildar para mobile, teste se o projeto funciona na web:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000)

**Verificação:**
- [ ] Servidor iniciou sem erros
- [ ] Dashboard abre (ou página de login)
- [ ] Sem erros de environment variables no console

Pressione `Ctrl + C` para parar o servidor.

---

### 8. Instalar Capacitor CLI (Já Incluído)

O projeto já tem Capacitor instalado. Verifique:

```bash
npx cap --version
# Esperado: @capacitor/cli 7.4.4
```

**Checklist:**
- [ ] Capacitor CLI funciona
- [ ] Arquivo `capacitor.config.ts` existe na raiz

---

## Configurar Android Studio

### Primeira Execução do Android Studio

1. Abra Android Studio
2. Se for primeira vez, siga o wizard de setup:
   - **Standard installation** (recomendado)
   - Aceite licenças do Android SDK
   - Aguarde downloads

3. Na tela inicial, vá em:
   - **Tools** → **Device Manager** (ou **AVD Manager** em versões antigas)

---

### Criar Android Virtual Device (AVD)

#### Via Interface Gráfica (Android Studio):

1. Abra **Device Manager**
2. Clique **Create Device**
3. Selecione um modelo:
   - **Phone** → **Pixel 5** (recomendado)
   - Clique **Next**
4. Selecione uma system image:
   - **Release Name**: **Tiramisu** (API 33) ou **UpsideDownCake** (API 34)
   - **ABI**: x86_64 (mais rápido no Windows)
   - Clique **Download** se necessário
   - Clique **Next**
5. Configurações do AVD:
   - **AVD Name**: `Pixel_5_API_33`
   - **Graphics**: Hardware - GLES 2.0
   - Clique **Finish**

**Verificação:**
- [ ] AVD criado e listado no Device Manager
- [ ] Clique no ▶️ (Play) para iniciar emulador (teste)
- [ ] Emulador abre e mostra Android (pode demorar 1-2min na primeira vez)

#### Via Linha de Comando (Alternativa):

```bash
# Listar system images disponíveis
sdkmanager --list | findstr "system-images"

# Instalar system image (se não instalou via GUI)
sdkmanager "system-images;android-33;google_apis;x86_64"

# Criar AVD
avdmanager create avd -n Pixel_5_API_33 -k "system-images;android-33;google_apis;x86_64" -d "pixel_5"

# Listar AVDs criados
avdmanager list avd
```

**Troubleshooting:**
- **Emulador não inicia**: Verifique BIOS (Virtualization habilitada)
- **Emulador lento**: Use API 33 x86_64 (não ARM), habilite Hardware Graphics
- **Erro "HAXM not installed"**: Reinstale Android Studio com Intel HAXM marcado

---

## Build Estático Next.js

### Executar Build Mobile

```bash
npm run build:mobile
```

**O que acontece:**
1. Next.js gera build estático em `out/`
2. Todas as páginas são pré-renderizadas
3. Sem servidor Node.js (100% client-side)

**Tempo estimado**: 30-90 segundos

**Verificação:**
```bash
# Verificar pasta out criada
dir out

# Ver arquivos gerados
dir out /s /b | findstr index.html
# Esperado: Lista de arquivos HTML estáticos
```

**Checklist:**
- [ ] Pasta `out/` criada
- [ ] Arquivos `.html`, `.js`, `.css` estão em `out/`
- [ ] Nenhum erro de build no terminal
- [ ] Tamanho da pasta `out/` ~20-50MB

**Troubleshooting:**
- **Erro "Page uses getServerSideProps"**: Página não convertida para `'use client'` (todas já devem estar)
- **Build trava**: Verifique memória disponível (Task Manager), feche apps pesados
- **Erro de env vars**: Certifique-se que `NEXT_PUBLIC_*` está em `.env.local`

---

## Sync com Plataformas Nativas

### Sincronizar Build com Android/iOS

```bash
npm run cap:sync
```

**O que acontece:**
1. Copia `out/` para `android/app/src/main/assets/public/`
2. Atualiza plugins Capacitor nativos
3. Atualiza `AndroidManifest.xml` com permissões

**Tempo estimado**: 5-10 segundos

**Verificação:**
```bash
# Verificar arquivos copiados para Android
dir android\app\src\main\assets\public

# Ver tamanho da pasta
dir android\app\src\main\assets\public /s
# Esperado: Mesmos arquivos de out/
```

**Checklist:**
- [ ] Pasta `android/app/src/main/assets/public/` existe
- [ ] Contém arquivos HTML/JS/CSS do build
- [ ] Nenhum erro de sync no terminal

**Troubleshooting:**
- **Erro "android folder not found"**: Execute `npx cap add android` (não deveria ser necessário)
- **Sync trava**: Delete `android/app/src/main/assets/public` e execute novamente
- **Permissões negadas**: Execute cmd/PowerShell como Administrador

---

## Abrir Android Studio e Testar

### Abrir Projeto Android no Android Studio

```bash
npm run cap:open:android
```

**Alternativa manual:**
1. Abra Android Studio
2. **File** → **Open**
3. Navegue até `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial\android`
4. Clique **OK**

**Primeira vez:**
- Android Studio irá sincronizar Gradle (1-3 minutos)
- Aguarde "Gradle sync finished" na barra inferior

**Verificação:**
- [ ] Android Studio abre o projeto
- [ ] Gradle sync concluído sem erros
- [ ] Estrutura de pastas visível no painel esquerdo

---

### Rodar o App no Emulador

1. Certifique-se que um AVD está criado (Device Manager)
2. Selecione o AVD no dropdown superior (ex: `Pixel_5_API_33`)
3. Clique no botão ▶️ **Run 'app'** (ou pressione `Shift + F10`)

**O que acontece:**
1. Gradle builda o APK (1-2min na primeira vez)
2. Emulador inicia (se não estava rodando)
3. App instala automaticamente
4. App abre no emulador

**Tempo estimado**: 2-4 minutos (primeira vez)

**Verificação:**
- [ ] Emulador iniciou
- [ ] App instalado (ícone visível no launcher)
- [ ] App abre sem crashes
- [ ] Tela inicial do chatbot visível

**Troubleshooting:**
- **Gradle build falha**: Ver [TROUBLESHOOTING.md](./TROUBLESHOOTING.md#gradle-build-falha)
- **App instala mas crasha ao abrir**: Verifique Logcat no Android Studio (aba inferior)
- **Emulador não detectado**: Reinicie Android Studio

---

### Verificar App Funcionando

No emulador:
1. App deve abrir mostrando a interface do chatbot
2. Navegue pelas telas (dashboard, settings, etc.)
3. Teste login/autenticação (se aplicável)

**Checklist Funcional:**
- [ ] App abre sem crash
- [ ] Interface renderiza corretamente
- [ ] Navegação entre telas funciona
- [ ] Sem mensagens de erro de environment variables

**Nota**: Se environment variables não estiverem configuradas, você verá erros de conexão. Prossiga para próxima seção.

---

## Configurar Environment Variables

### CRÍTICO: Mobile Requer Configuração Especial

O mobile **NÃO** lê `.env.local` em runtime (build estático não tem servidor).

**Soluções:**

#### Opção 1: Build-Time Injection (RECOMENDADO)

Ver documentação completa em [ENV_VARS.md](./ENV_VARS.md)

**Quick version:**

1. Criar `.env.mobile`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Instalar `dotenv-cli`:
```bash
npm install --save-dev dotenv-cli
```

3. Modificar `package.json`:
```json
"build:mobile": "cross-env CAPACITOR_BUILD=true dotenv -e .env.mobile next build"
```

4. Rebuild:
```bash
npm run build:mobile
npm run cap:sync
```

**Verificação:**
- [ ] `.env.mobile` criado com variáveis corretas
- [ ] `dotenv-cli` instalado
- [ ] `package.json` modificado
- [ ] Build mobile executado com sucesso
- [ ] App funciona sem erros de conexão

**Ver [ENV_VARS.md](./ENV_VARS.md) para detalhes completos.**

---

## Verificação Final

### Checklist Completo

**Ambiente:**
- [ ] Node.js 18.x+ instalado
- [ ] Android Studio instalado e configurado
- [ ] ANDROID_HOME variável definida
- [ ] `adb` funciona no terminal
- [ ] AVD criado no Device Manager

**Projeto:**
- [ ] Repositório clonado
- [ ] `npm install` executado
- [ ] `.env.local` criado com variáveis necessárias
- [ ] Build web funciona (`npm run dev`)

**Mobile:**
- [ ] `npm run build:mobile` funciona
- [ ] `npm run cap:sync` copia arquivos para `android/`
- [ ] Android Studio abre o projeto sem erros
- [ ] Gradle sync completo
- [ ] App roda no emulador

**Funcional:**
- [ ] App abre sem crash
- [ ] Interface renderiza
- [ ] Navegação funciona
- [ ] Environment variables configuradas (sem erros de conexão)

**Se todos os itens estão marcados: ✅ Setup completo!**

---

## Troubleshooting

| Problema | Causa Provável | Solução |
|----------|---------------|---------|
| `adb` não reconhecido | `ANDROID_HOME` não configurado | Configure variáveis de ambiente, reinicie terminal |
| Build Next.js falha | Página usa Server Components | Todas páginas devem ter `'use client'` |
| Gradle sync trava | Internet lenta/firewall | Aguarde ou configure proxy no Android Studio |
| Emulador não inicia | Virtualization desabilitada | Habilite VT-x/AMD-V no BIOS |
| App crasha ao abrir | Env vars não configuradas | Configure [ENV_VARS.md](./ENV_VARS.md) |
| Build mobile lento | Disco cheio/RAM baixa | Libere espaço, feche apps pesados |
| Erro "ENOSPC" | Limite de file watchers | Aumente limite (Windows geralmente OK) |

**Problemas detalhados**: Ver [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Próximos Passos

Após concluir o setup:

1. **Desenvolver features**: [DEVELOPMENT.md](./DEVELOPMENT.md)
2. **Configurar env vars para produção**: [ENV_VARS.md](./ENV_VARS.md)
3. **Testar em device físico**: [TESTING.md](./TESTING.md)
4. **Customizar ícones**: [ICONS_SPLASH.md](./ICONS_SPLASH.md)

---

**Path do Projeto**: `C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial`

**Tempo Total de Setup**: 45-90 minutos (primeira vez)
