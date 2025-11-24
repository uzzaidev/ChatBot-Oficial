# Abrir Android Studio Manualmente

Se o comando `npm run cap:open:android` não funcionar, você pode abrir o projeto manualmente.

## Opção 1: Abrir via Android Studio

1. **Abra Android Studio** (procure no menu Iniciar ou atalho na área de trabalho)

2. **File** → **Open** (ou `Ctrl + O`)

3. Navegue até a pasta do projeto Android:
   ```
   C:\Users\pedro\OneDrive\Área de Trabalho\ChatBot-Oficial\ChatBot-Oficial\android
   ```

4. Clique **OK**

5. Aguarde o Gradle sync (1-3 minutos na primeira vez)

## Opção 2: Configurar Variável de Ambiente

Se o Android Studio está instalado mas o Capacitor não encontra:

1. **Encontre o caminho do Android Studio:**
   - Geralmente: `C:\Program Files\Android\Android Studio\bin\studio64.exe`
   - Ou: `C:\Users\<SeuUsuario>\AppData\Local\Programs\Android Studio\bin\studio64.exe`

2. **Configurar variável de ambiente:**
   ```powershell
   # Temporário (apenas nesta sessão)
   $env:CAPACITOR_ANDROID_STUDIO_PATH = "C:\Program Files\Android\Android Studio\bin\studio64.exe"
   
   # Permanente (adicionar ao sistema)
   [System.Environment]::SetEnvironmentVariable('CAPACITOR_ANDROID_STUDIO_PATH', 'C:\Program Files\Android\Android Studio\bin\studio64.exe', 'User')
   ```

3. **Testar:**
   ```bash
   npm run cap:open:android
   ```

## Opção 3: Instalar Android Studio

Se não está instalado:

1. **Download:** [https://developer.android.com/studio](https://developer.android.com/studio)

2. **Instalar:**
   - Execute o instalador
   - Marque: Android SDK, Android SDK Platform, AVD, Performance

3. **Após instalação:**
   - Abra Android Studio uma vez para configurar
   - Depois use `npm run cap:open:android`

---

**Próximos Passos Após Abrir:**

1. **Criar/Iniciar Emulador:**
   - Tools → Device Manager
   - Create Device (se não tiver)
   - ▶️ Play para iniciar

2. **Rodar App:**
   - Selecione emulador no dropdown
   - ▶️ Run 'app' (ou `Shift + F10`)

