# 🚀 Como Instalar Doppler CLI no Windows

## ⚡ Método Rápido (Recomendado)

### 1. Execute o Script de Instalação

1. **Abra PowerShell como Administrador:**
   - Pressione `Win + X`
   - Selecione "Windows PowerShell (Admin)" ou "Terminal (Admin)"
   - Confirme a permissão de administrador

2. **Navegue até o projeto:**
   ```powershell
   cd "C:\Projetos Uzz.Ai\10  - ChatBot-Oficial-main\ChatBot-Oficial"
   ```

3. **Execute o script:**
   ```powershell
   .\install-doppler.ps1
   ```

### 2. Ou Instale Diretamente

No PowerShell como Admin, execute:

```powershell
iwr https://cli.doppler.com/install.ps1 | iex
```

### 3. Feche e Reabra o PowerShell

**IMPORTANTE:** Feche completamente o PowerShell e abra novamente para recarregar o PATH.

### 4. Verifique a Instalação

```powershell
doppler --version
# Deve mostrar: doppler version x.x.x
```

---

## 🔐 Configurar no Projeto

Após instalar, configure:

```powershell
# 1. Autenticar
doppler login

# 2. Configurar projeto
cd "C:\Projetos Uzz.Ai\10  - ChatBot-Oficial-main\ChatBot-Oficial"
doppler setup
# Selecione: chatbot-oficial / dev

# 3. Verificar variáveis
doppler secrets
```

---

## 🛠️ Se Não Funcionar

### Adicionar ao PATH Manualmente

1. Encontre onde o Doppler foi instalado:
   ```powershell
   Test-Path "C:\Program Files\Doppler\bin\doppler.exe"
   Test-Path "$env:LOCALAPPDATA\Doppler\bin\doppler.exe"
   ```

2. Adicione ao PATH:
   - `Win + S` → "variáveis de ambiente"
   - "Editar as variáveis de ambiente do sistema"
   - Em "Variáveis do sistema", encontre `Path` → "Editar"
   - Adicione: `C:\Program Files\Doppler\bin` (ou o caminho encontrado)
   - Clique "OK" em todas as janelas

3. **Feche e reabra o PowerShell**

---

## 📚 Mais Informações

- **Guia Completo:** [docs/setup/DOPPLER_SETUP_WINDOWS.md](docs/setup/DOPPLER_SETUP_WINDOWS.md)
- **Quick Start:** [DOPPLER_QUICK_START.md](DOPPLER_QUICK_START.md)


