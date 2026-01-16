# 🔧 Como Compilar Localmente para Debug

## 🎯 Por que compilar localmente?

Compilar localmente antes de fazer push permite:
- ✅ Detectar erros de TypeScript antes do deploy
- ✅ Verificar erros de linting
- ✅ Economizar tempo (não esperar deploy falhar)
- ✅ Debug mais rápido

## 📋 Comandos Disponíveis

### 1. Verificar tipos TypeScript (rápido)
```bash
npx tsc --noEmit
```
- Verifica apenas tipos, não compila
- Mais rápido que build completo
- Bom para verificar erros antes de commit

### 2. Build completo (igual Vercel)
```bash
pnpm run build
```
ou
```bash
npm run build
```
- Compila tudo (TypeScript + Next.js)
- Verifica linting
- Igual ao que roda na Vercel
- Mais lento, mas mais completo

### 3. Verificar linting apenas
```bash
pnpm run lint
```
ou
```bash
npm run lint
```
- Verifica apenas regras do ESLint
- Não verifica tipos TypeScript

## 🚀 Workflow Recomendado

### Antes de cada commit:
```bash
# 1. Verificar tipos (rápido)
npx tsc --noEmit

# 2. Se passar, fazer build completo
pnpm run build

# 3. Se tudo OK, fazer commit
git add .
git commit -m "sua mensagem"
git push
```

### Script rápido (opcional):
Crie um arquivo `check-build.sh`:
```bash
#!/bin/bash
echo "🔍 Verificando tipos TypeScript..."
npx tsc --noEmit
if [ $? -eq 0 ]; then
  echo "✅ Tipos OK! Fazendo build completo..."
  pnpm run build
  if [ $? -eq 0 ]; then
    echo "✅ Build completo OK!"
  else
    echo "❌ Build falhou!"
    exit 1
  fi
else
  echo "❌ Erros de tipo encontrados!"
  exit 1
fi
```

## 🐛 Debug de Erros Comuns

### Erro: "Property 'X' does not exist on type 'unknown'"
**Causa:** TypeScript não consegue inferir o tipo
**Solução:** Adicionar type assertion
```typescript
// ❌ Errado
const value = obj.property

// ✅ Correto
const value = (obj as { property: string }).property
```

### Erro: "Cannot find name 'X'"
**Causa:** Variável/função não existe ou não foi importada
**Solução:** Verificar imports e declarações

### Erro: "Argument of type 'X' is not assignable to parameter of type 'Y'"
**Causa:** Tipo incompatível
**Solução:** Converter tipo ou ajustar função
```typescript
// ❌ Errado
handleClick(e.dataKey) // dataKey pode ser string | number

// ✅ Correto
handleClick(String(e.dataKey))
// ou
if (typeof e.dataKey === 'string') {
  handleClick(e.dataKey)
}
```

## 💡 Dicas

1. **Sempre rode `pnpm run build` antes de push** para produção
2. **Use `npx tsc --noEmit`** para verificação rápida durante desenvolvimento
3. **Configure seu editor** (VS Code) para mostrar erros TypeScript em tempo real
4. **Use Git hooks** (pre-commit) para rodar verificações automaticamente

## ⚙️ Configurar VS Code para Erros em Tempo Real

### 1. Instalar Extensões Recomendadas

No VS Code, instale:
- **TypeScript and JavaScript Language Features** (já vem instalado)
- **ESLint** (extensão oficial)
- **Error Lens** (opcional - mostra erros inline)

### 2. Configurações do VS Code

Crie/edite `.vscode/settings.json`:
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### 3. Verificar Erros

- **Erros aparecem sublinhados em vermelho** enquanto você digita
- **Hover sobre o erro** para ver detalhes
- **Pressione F8** para navegar entre erros
- **Ctrl+Shift+M** (Cmd+Shift+M no Mac) abre o painel de problemas

### 4. Auto-fix

- **Ctrl+Shift+P** → "TypeScript: Organize Imports"
- **Ctrl+Shift+P** → "ESLint: Fix all auto-fixable Problems"

## 🔗 Links Úteis

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Next.js Build Docs](https://nextjs.org/docs/api-reference/cli#build)
- [ESLint Rules](https://eslint.org/docs/rules/)

