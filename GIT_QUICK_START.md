# ⚡ Git - Quick Start

Guia rápido para criar branch, commit e push.

---

## 🖥️ GitHub Desktop (Mais Fácil)

1. **Criar Branch:**
   - Clique em "Current branch" → "New branch"
   - Nome: `feature/nome-da-funcionalidade`

2. **Fazer Commit:**
   - Edite arquivos
   - Escreva mensagem: `feat: descrição`
   - Clique em "Commit"

3. **Fazer Push:**
   - Clique em "Publish branch" (primeira vez)
   - Ou "Push origin" (próximas vezes)

---

## 💻 VS Code / Cursor

1. **Criar Branch:**
   - Clique no nome da branch (canto inferior esquerdo)
   - "Create new branch..." → Digite nome

2. **Fazer Commit:**
   - `Ctrl + Shift + G` (Source Control)
   - Clique em "+" para adicionar arquivos
   - Digite mensagem → "✓ Commit"

3. **Fazer Push:**
   - Clique em "..." → "Push"
   - Ou use: `Ctrl + Shift + H`

---

## ⌨️ Terminal

```bash
# 1. Criar branch
git checkout -b feature/nome-da-funcionalidade

# 2. Adicionar arquivos
git add .

# 3. Fazer commit
git commit -m "feat: descrição da mudança"

# 4. Fazer push (primeira vez)
git push -u origin feature/nome-da-funcionalidade

# Próximas vezes
git push
```

---

## 📝 Convenções

**Nomes de Branch:**
- `feature/` - Nova funcionalidade
- `fix/` - Correção de bug
- `docs/` - Documentação

**Mensagens de Commit:**
- `feat:` - Nova funcionalidade
- `fix:` - Correção
- `docs:` - Documentação

---

**Guia Completo:** [docs/setup/GUIA_GIT_BRANCH_COMMIT_PUSH.md](docs/setup/GUIA_GIT_BRANCH_COMMIT_PUSH.md)

