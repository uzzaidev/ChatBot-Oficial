# 📚 Guia Completo: Git - Criar Branch, Commit e Push

Guia passo a passo para usar Git/GitHub no projeto ChatBot-Oficial.

---

## 🎯 Índice

- [GitHub Desktop (Recomendado para Iniciantes)](#github-desktop)
- [VS Code / Cursor (Extensão Git)](#vs-code--cursor)
- [Terminal / PowerShell](#terminal--powershell)
- [Boas Práticas](#boas-práticas)

---

## 🖥️ GitHub Desktop

### Passo 1: Instalar GitHub Desktop

1. Baixe: https://desktop.github.com/
2. Instale e faça login com sua conta GitHub
3. Clone ou adicione o repositório:
   - **File** → **Add Local Repository**
   - Selecione a pasta: `C:\Projetos Uzz.Ai\10  - ChatBot-Oficial-main\ChatBot-Oficial`

### Passo 2: Criar Nova Branch

1. **Clique em "Current branch"** (canto superior esquerdo)
2. Clique em **"New branch"**
3. Digite o nome da branch:
   - Exemplo: `feature/doppler-setup`
   - Exemplo: `fix/doppler-path-config`
   - Exemplo: `docs/doppler-guide`
4. Clique em **"Create branch"**

### Passo 3: Fazer Alterações

1. Edite os arquivos normalmente no seu editor
2. O GitHub Desktop detecta automaticamente as mudanças
3. As alterações aparecem na aba **"Changes"**

### Passo 4: Fazer Commit

1. **Selecione os arquivos** que deseja commitar (ou deixe todos selecionados)
2. **Escreva a mensagem de commit:**
   ```
   feat: adiciona guia de instalação do Doppler
   
   - Cria script de instalação automatizado
   - Adiciona documentação completa
   - Atualiza ENV_VARS.md com instruções específicas
   ```
3. Clique em **"Commit to [nome-da-branch]"**

### Passo 5: Fazer Push

1. Clique em **"Publish branch"** (se for a primeira vez)
   - OU clique em **"Push origin"** (se a branch já existe no remoto)
2. Aguarde o upload concluir
3. ✅ Pronto! Sua branch está no GitHub

### Passo 6: Criar Pull Request (Opcional)

1. No GitHub Desktop, clique em **"Create Pull Request"**
2. Ou acesse: https://github.com/[seu-usuario]/ChatBot-Oficial
3. Clique em **"Compare & pull request"**
4. Preencha o título e descrição
5. Clique em **"Create pull request"**

---

## 💻 VS Code / Cursor (Extensão Git)

### Passo 1: Verificar Extensão Git

1. A extensão Git já vem instalada por padrão
2. Se não estiver, instale: **GitLens** ou **Git Graph**

### Passo 2: Criar Nova Branch

**Método 1: Pela Barra de Status**
1. Clique no nome da branch no canto inferior esquerdo (ex: `main`)
2. Selecione **"Create new branch..."**
3. Digite o nome: `feature/doppler-setup`
4. Pressione Enter

**Método 2: Pelo Terminal Integrado**
1. Abra o terminal: `` Ctrl + ` ``
2. Execute:
   ```bash
   git checkout -b feature/doppler-setup
   ```

**Método 3: Pela Paleta de Comandos**
1. Pressione `Ctrl + Shift + P`
2. Digite: `Git: Create Branch`
3. Digite o nome da branch
4. Pressione Enter

### Passo 3: Fazer Alterações

1. Edite os arquivos normalmente
2. As mudanças aparecem no **Source Control** (ícone de ramificação no menu lateral)

### Passo 4: Fazer Commit

**Método 1: Interface Visual**
1. Clique no ícone **Source Control** (ou `Ctrl + Shift + G`)
2. Você verá os arquivos modificados
3. Clique no **"+"** ao lado de cada arquivo para **Stage** (ou clique em **"+"** ao lado de "Changes" para adicionar todos)
4. Digite a mensagem de commit na caixa superior:
   ```
   feat: adiciona guia de instalação do Doppler
   ```
5. Clique em **"✓ Commit"** (ou pressione `Ctrl + Enter`)

**Método 2: Terminal**
```bash
git add .
git commit -m "feat: adiciona guia de instalação do Doppler"
```

### Passo 5: Fazer Push

**Método 1: Interface Visual**
1. No **Source Control**, clique nos **"..."** (três pontos)
2. Selecione **"Push"**
3. Se for a primeira vez, selecione **"Publish Branch"**

**Método 2: Terminal**
```bash
# Primeira vez (criar branch no remoto)
git push -u origin feature/doppler-setup

# Próximas vezes
git push
```

**Método 3: Barra de Status**
1. Clique no ícone de **sincronização** (setas circulares) no canto inferior
2. Ou use o atalho: `Ctrl + Shift + H`

### Passo 6: Criar Pull Request

1. Após o push, aparecerá uma notificação no canto inferior direito
2. Clique em **"Create Pull Request"**
3. Ou acesse: https://github.com/[seu-usuario]/ChatBot-Oficial
4. Clique em **"Compare & pull request"**

---

## ⌨️ Terminal / PowerShell

### Passo 1: Verificar Status

```powershell
cd "C:\Projetos Uzz.Ai\10  - ChatBot-Oficial-main\ChatBot-Oficial"
git status
```

### Passo 2: Criar Nova Branch

```powershell
# Criar e mudar para a nova branch
git checkout -b feature/doppler-setup

# OU criar sem mudar
git branch feature/doppler-setup
git checkout feature/doppler-setup
```

### Passo 3: Verificar Branch Atual

```powershell
git branch
# A branch atual terá um asterisco: * feature/doppler-setup
```

### Passo 4: Fazer Alterações

Edite os arquivos normalmente no seu editor.

### Passo 5: Adicionar Arquivos ao Stage

```powershell
# Adicionar arquivo específico
git add docs/setup/DOPPLER_SETUP_WINDOWS.md

# Adicionar todos os arquivos modificados
git add .

# Adicionar apenas arquivos rastreados (ignora novos)
git add -u
```

### Passo 6: Fazer Commit

```powershell
# Commit simples
git commit -m "feat: adiciona guia de instalação do Doppler"

# Commit com descrição
git commit -m "feat: adiciona guia de instalação do Doppler" -m "- Cria script de instalação automatizado
- Adiciona documentação completa
- Atualiza ENV_VARS.md com instruções específicas"
```

### Passo 7: Fazer Push

```powershell
# Primeira vez (criar branch no remoto)
git push -u origin feature/doppler-setup

# Próximas vezes (após configurar upstream)
git push
```

### Passo 8: Verificar Push

```powershell
# Ver branches remotas
git branch -r

# Ver todas as branches (local e remoto)
git branch -a
```

---

## 📋 Boas Práticas

### Nomenclatura de Branches

Use prefixos descritivos:

- **`feature/`** - Nova funcionalidade
  - Exemplo: `feature/doppler-setup`
  - Exemplo: `feature/user-authentication`

- **`fix/`** - Correção de bugs
  - Exemplo: `fix/doppler-path-error`
  - Exemplo: `fix/login-bug`

- **`docs/`** - Documentação
  - Exemplo: `docs/doppler-guide`
  - Exemplo: `docs/api-reference`

- **`refactor/`** - Refatoração de código
  - Exemplo: `refactor/api-structure`

- **`test/`** - Testes
  - Exemplo: `test/doppler-integration`

### Mensagens de Commit

Use o padrão **Conventional Commits**:

```
<tipo>(<escopo>): <descrição>

[corpo opcional]

[rodapé opcional]
```

**Tipos:**
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação (não afeta código)
- `refactor:` - Refatoração
- `test:` - Testes
- `chore:` - Tarefas de manutenção

**Exemplos:**
```bash
feat(doppler): adiciona script de instalação automatizado
fix(env): corrige path do Doppler no Windows
docs(setup): atualiza guia de instalação do Doppler
refactor(api): reorganiza estrutura de endpoints
```

### Workflow Recomendado

1. **Sempre comece pela branch main:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Crie uma nova branch:**
   ```bash
   git checkout -b feature/nova-funcionalidade
   ```

3. **Faça suas alterações e commits:**
   ```bash
   git add .
   git commit -m "feat: descrição da mudança"
   ```

4. **Faça push regularmente:**
   ```bash
   git push -u origin feature/nova-funcionalidade
   ```

5. **Crie Pull Request no GitHub**

6. **Após merge, delete a branch local:**
   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/nova-funcionalidade
   ```

---

## 🛠️ Comandos Úteis

### Ver Histórico

```bash
# Ver commits recentes
git log --oneline

# Ver mudanças em um arquivo
git diff arquivo.txt

# Ver status atual
git status
```

### Desfazer Mudanças

```bash
# Desfazer mudanças não commitadas
git checkout -- arquivo.txt

# Desfazer stage (unstage)
git reset HEAD arquivo.txt

# Desfazer último commit (mantém mudanças)
git reset --soft HEAD~1
```

### Sincronizar com Remoto

```bash
# Atualizar branch local com remoto
git pull origin main

# Ver diferenças antes de fazer pull
git fetch origin
git diff main origin/main
```

---

## ❓ Troubleshooting

### Erro: "branch already exists"

```bash
# Ver todas as branches
git branch -a

# Mudar para a branch existente
git checkout feature/nome-da-branch
```

### Erro: "Your branch is ahead of 'origin/main'"

```bash
# Fazer push das mudanças
git push origin main
```

### Erro: "Please commit your changes or stash them"

```bash
# Salvar mudanças temporariamente
git stash

# Fazer o que precisa (mudar branch, etc)
git checkout main

# Recuperar mudanças
git stash pop
```

### Erro: "Permission denied"

1. Verifique se você tem permissão no repositório
2. Verifique suas credenciais:
   ```bash
   git config --global user.name "Seu Nome"
   git config --global user.email "seu@email.com"
   ```

---

## 📚 Recursos Adicionais

- [Documentação Git](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)

---

**Última atualização:** 2025-01-15

