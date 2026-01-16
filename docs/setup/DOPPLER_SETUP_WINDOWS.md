# 🚀 Guia Completo: Instalar e Configurar Doppler no Windows

Este guia mostra como instalar o Doppler CLI no Windows e configurá-lo no projeto ChatBot-Oficial.

---

## 📋 Pré-requisitos

- Windows 10/11
- PowerShell (já vem com Windows)
- Acesso de Administrador (para instalação)
- Conta Doppler (gratuita em [doppler.com](https://www.doppler.com))

---

## 🔧 Passo 1: Instalar Doppler CLI

### Opção A: Instalação Automática (Recomendado)

1. **Abra PowerShell como Administrador:**
   - Pressione `Win + X`
   - Selecione "Windows PowerShell (Admin)" ou "Terminal (Admin)"
   - Confirme a permissão de administrador

2. **Execute o script de instalação:**
   ```powershell
   iwr https://cli.doppler.com/install.ps1 | iex
   ```

3. **Aguarde a instalação:**
   - O script baixa e instala o Doppler CLI automaticamente
   - Geralmente instala em: `C:\Program Files\Doppler\bin\doppler.exe`

### Opção B: Instalação Manual (Se a automática falhar)

1. **Baixe o executável:**
   - Acesse: https://github.com/DopplerHQ/cli/releases
   - Baixe `doppler_windows_amd64.zip` (ou a versão para seu sistema)

2. **Extraia o arquivo:**
   - Extraia `doppler.exe` para uma pasta (ex: `C:\Tools\Doppler\`)

3. **Adicione ao PATH manualmente** (veja Passo 2)

---

## 🔍 Passo 2: Adicionar Doppler ao PATH

O script de instalação automática **deve** adicionar ao PATH automaticamente, mas vamos verificar:

### Verificar se já está no PATH

1. **Feche e reabra o PowerShell** (importante para recarregar variáveis)

2. **Teste o comando:**
   ```powershell
   doppler --version
   ```

3. **Se funcionar:** ✅ Doppler está configurado! Pule para o Passo 3.

4. **Se der erro:** Continue abaixo para adicionar manualmente.

### Adicionar Manualmente ao PATH

1. **Encontre o caminho do Doppler:**
   ```powershell
   # Tente estes caminhos comuns:
   Test-Path "C:\Program Files\Doppler\bin\doppler.exe"
   Test-Path "$env:LOCALAPPDATA\Doppler\bin\doppler.exe"
   Test-Path "$env:USERPROFILE\AppData\Local\Doppler\bin\doppler.exe"
   ```

2. **Adicione ao PATH do Sistema:**
   - Pressione `Win + S`, digite "variáveis de ambiente"
   - Selecione "Editar as variáveis de ambiente do sistema"
   - Clique em "Variáveis de Ambiente..."
   - Na seção "Variáveis do sistema", encontre `Path`
   - Clique em "Editar..."
   - Clique em "Novo"
   - Adicione o caminho do bin do Doppler:
     - `C:\Program Files\Doppler\bin` (se instalado lá)
     - OU o caminho onde você extraiu o `doppler.exe`
   - Clique em "OK" em todas as janelas

3. **Feche e reabra o PowerShell** (importante!)

4. **Teste novamente:**
   ```powershell
   doppler --version
   # Deve mostrar: doppler version x.x.x
   ```

---

## 🔐 Passo 3: Autenticar no Doppler

1. **Faça login:**
   ```powershell
   doppler login
   ```

2. **Siga as instruções:**
   - Abrirá o navegador para autenticação
   - Faça login com sua conta Doppler
   - Autorize o CLI

3. **Verifique:**
   ```powershell
   doppler me
   # Deve mostrar suas informações de usuário
   ```

---

## 📁 Passo 4: Configurar o Projeto

1. **Navegue até o projeto:**
   ```powershell
   cd "C:\Projetos Uzz.Ai\10  - ChatBot-Oficial-main\ChatBot-Oficial"
   ```

2. **Configure o Doppler para este projeto:**
   ```powershell
   doppler setup
   ```

3. **Selecione as opções:**
   - **Project:** `chatbot-oficial` (ou o nome do seu projeto no Doppler)
   - **Config:** Escolha `dev` para desenvolvimento
     - Opções disponíveis: `dev`, `stg`, `prd`

4. **Verifique as variáveis:**
   ```powershell
   doppler secrets
   # Deve mostrar todas as variáveis de ambiente configuradas
   ```

---

## ✅ Passo 5: Testar a Configuração

1. **Teste o comando doppler run:**
   ```powershell
   doppler run --config dev -- echo "Doppler funcionando!"
   ```

2. **Teste com uma variável:**
   ```powershell
   doppler run --config dev -- echo $env:NEXT_PUBLIC_SUPABASE_URL
   # Deve mostrar a URL do Supabase (se configurada)
   ```

3. **Teste o build mobile:**
   ```powershell
   npm run build:mobile:stg
   # Deve executar o build com variáveis do Doppler
   ```

---

## 🛠️ Troubleshooting

### Problema: "doppler não é reconhecido"

**Solução:**
1. Verifique se o Doppler está instalado:
   ```powershell
   Test-Path "C:\Program Files\Doppler\bin\doppler.exe"
   ```

2. Se existir, adicione ao PATH manualmente (veja Passo 2)

3. **Feche e reabra o PowerShell** após adicionar ao PATH

### Problema: "doppler: command not found" após adicionar ao PATH

**Solução:**
1. Verifique o caminho exato:
   ```powershell
   Get-Command doppler -ErrorAction SilentlyContinue
   ```

2. Se não encontrar, adicione o caminho completo:
   ```powershell
   $env:Path += ";C:\Program Files\Doppler\bin"
   ```

3. Para tornar permanente, adicione ao PATH do sistema (Passo 2)

### Problema: "doppler login" não abre o navegador

**Solução:**
1. Use o método manual:
   ```powershell
   doppler login --no-open
   ```

2. Copie o link exibido e cole no navegador

### Problema: "Project not found" no doppler setup

**Solução:**
1. Verifique se você tem acesso ao projeto no Doppler:
   - Acesse: https://dashboard.doppler.com
   - Verifique se o projeto `chatbot-oficial` existe

2. Se não existir, crie o projeto no dashboard

3. Ou use um projeto existente que você tenha acesso

---

## 📝 Scripts Disponíveis no Projeto

Após configurar o Doppler, você pode usar:

```json
{
  "build:mobile": "node scripts/build-mobile.js",           // Usa Doppler prd
  "build:mobile:stg": "doppler run --config stg -- ...",   // Staging
  "build:mobile:prd": "doppler run --config prd -- ..."    // Produção
}
```

**Nota:** O script `build:mobile` já usa Doppler internamente (veja `scripts/build-mobile.js`).

---

## 🔄 Próximos Passos

1. ✅ Doppler instalado e no PATH
2. ✅ Autenticado no Doppler
3. ✅ Projeto configurado
4. ✅ Variáveis verificadas
5. 🚀 Pronto para usar `npm run build:mobile`!

---

## 📚 Referências

- [Documentação Doppler CLI](https://docs.doppler.com/docs/cli)
- [Doppler Dashboard](https://dashboard.doppler.com)
- [Guia ENV_VARS.md](../app/ENV_VARS.md) - Configuração de variáveis

---

**Última atualização:** 2025-01-15

