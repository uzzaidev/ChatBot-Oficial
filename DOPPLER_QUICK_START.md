# 🚀 Doppler - Quick Start

Guia rápido para configurar Doppler no projeto ChatBot-Oficial.

---

## ⚡ Instalação Rápida (Windows)

### 1. Instalar Doppler CLI

Abra **PowerShell como Administrador** e execute:

```powershell
iwr https://cli.doppler.com/install.ps1 | iex
```

### 2. Adicionar ao PATH

O script geralmente adiciona automaticamente, mas se não funcionar:

1. Pressione `Win + S` → digite "variáveis de ambiente"
2. Clique em "Editar as variáveis de ambiente do sistema"
3. Em "Variáveis do sistema", encontre `Path` → "Editar"
4. Adicione: `C:\Program Files\Doppler\bin`
5. **Feche e reabra o PowerShell**

### 3. Verificar Instalação

```powershell
doppler --version
# Deve mostrar: doppler version x.x.x
```

---

## 🔐 Configuração do Projeto

### 1. Autenticar

```powershell
doppler login
```

### 2. Configurar Projeto

```powershell
cd "C:\Projetos Uzz.Ai\10  - ChatBot-Oficial-main\ChatBot-Oficial"
doppler setup
```

**Selecione:**
- Project: `chatbot-oficial`
- Config: `dev` (para desenvolvimento)

### 3. Verificar Variáveis

```powershell
doppler secrets
```

---

## ✅ Testar

```powershell
# Teste simples
doppler run --config dev -- echo "Funcionando!"

# Teste build mobile
npm run build:mobile:stg
```

---

## 📚 Documentação Completa

- **Guia Completo Windows:** [docs/setup/DOPPLER_SETUP_WINDOWS.md](docs/setup/DOPPLER_SETUP_WINDOWS.md)
- **Variáveis de Ambiente:** [docs/app/ENV_VARS.md](docs/app/ENV_VARS.md)

---

## 🛠️ Troubleshooting

**Problema:** `doppler não é reconhecido`

**Solução:**
1. Verifique se está instalado: `Test-Path "C:\Program Files\Doppler\bin\doppler.exe"`
2. Adicione ao PATH manualmente (passo 2 acima)
3. **Feche e reabra o PowerShell**

---

**Última atualização:** 2025-01-15


