# 🐛 Como Debugar App Android no Android Studio

## 🎯 Métodos de Debug

### Método 1: Logcat (Mais Importante)

**Onde encontrar:**
- Aba inferior do Android Studio: **"Logcat"**
- Ou: View → Tool Windows → Logcat

**Como usar:**
1. Abra a aba Logcat
2. Filtre por: `com.chatbot.app` (no campo de busca)
3. Clique na página que dá problema
4. Veja os logs aparecerem em tempo real

**O que procurar:**
- Erros em vermelho (E)
- Avisos em laranja (W)
- Mensagens de console (I, D)

### Método 2: Breakpoints (Debug Step-by-Step)

**Como usar:**
1. Abra o arquivo TypeScript/JavaScript no Android Studio
2. Clique na margem esquerda para adicionar breakpoint (bolinha vermelha)
3. Clique em **Debug** (🐛) em vez de Run
4. Quando chegar no breakpoint, o app pausa
5. Use:
   - **F8** = Step Over (próxima linha)
   - **F7** = Step Into (entrar na função)
   - **F9** = Resume (continuar)
   - **Shift + F8** = Step Out (sair da função)

**Ver variáveis:**
- Painel esquerdo mostra todas as variáveis
- Passe mouse sobre variáveis no código para ver valores

### Método 3: Console do Chrome DevTools

**Como usar:**
1. Com app rodando, abra Chrome
2. Acesse: `chrome://inspect`
3. Clique em "inspect" no seu app
4. Veja console, network, elementos, etc.

**Limitação:** Só funciona se app estiver usando WebView (Capacitor usa)

### Método 4: ADB Logcat (Terminal)

**Como usar:**
```powershell
# Ver apenas logs do app
adb logcat | Select-String "com.chatbot.app"

# Ver apenas erros
adb logcat *:E | Select-String "com.chatbot.app"

# Ver logs de JavaScript/Console
adb logcat | Select-String "Capacitor/Console"

# Limpar logs e monitorar
adb logcat -c
adb logcat | Select-String "com.chatbot.app|Error|Exception"
```

## 🔍 O Que Procurar nos Logs

### Erros Comuns

**1. Erro 404 (Página não encontrada):**
```
Unable to open asset URL: https://localhost/dashboard/knowledge.txt
```
**Solução:** Página não existe ou não foi gerada no build

**2. Erro de JavaScript:**
```
Capacitor/Console E Error: ...
```
**Solução:** Verificar código JavaScript/TypeScript

**3. Erro de Autenticação:**
```
auth|Auth|SIGNED_OUT|TOKEN_REFRESHED
```
**Solução:** Verificar sessão do Supabase

**4. Erro de API:**
```
401|403|500|NetworkError
```
**Solução:** Verificar chamadas de API

**5. Erro de Banco de Dados:**
```
column ... does not exist|SQL error
```
**Solução:** Verificar queries SQL

## 🎯 Debug Específico: Base de Conhecimento

### Passo 1: Verificar se Página Existe

```bash
# Verificar se arquivo existe
Test-Path src/app/dashboard/knowledge/page.tsx
```

### Passo 2: Ver Logs em Tempo Real

1. Abra Logcat no Android Studio
2. Filtre por: `com.chatbot.app`
3. Clique em "Base de Conhecimento" no app
4. Veja os logs aparecerem

### Passo 3: Verificar Erros Específicos

**Procurar por:**
- `knowledge` - Erros relacionados à página
- `Error:` - Erros gerais
- `404` - Página não encontrada
- `auth` - Problemas de autenticação
- `middleware` - Problemas no middleware

## 🛠️ Ferramentas Úteis

### Script de Debug Rápido

```powershell
# Ver apenas erros do app
adb logcat *:E | Select-String "com.chatbot.app"

# Ver logs de console JavaScript
adb logcat | Select-String "Capacitor/Console"

# Ver tudo relacionado a uma página específica
adb logcat | Select-String "knowledge|dashboard"
```

### Chrome DevTools (Se Disponível)

1. App rodando
2. Chrome → `chrome://inspect`
3. Inspect → Console tab
4. Veja erros JavaScript em tempo real

## 📋 Checklist de Debug

Quando uma página não funciona:

- [ ] Verificar se página existe em `src/app/dashboard/[página]/page.tsx`
- [ ] Verificar Logcat para erros
- [ ] Verificar console JavaScript (Chrome DevTools)
- [ ] Verificar se build foi feito (`npm run build:mobile`)
- [ ] Verificar se sync foi feito (`npx cap sync android`)
- [ ] Verificar se há erros de autenticação
- [ ] Verificar se há erros de API/banco de dados

## 💡 Dicas

1. **Sempre verifique Logcat primeiro** - É onde aparecem 90% dos erros
2. **Use filtros** - Filtre por `com.chatbot.app` para ver apenas seu app
3. **Limpe logs antes** - `adb logcat -c` para começar limpo
4. **Reproduza o erro** - Clique na página problemática enquanto monitora logs
5. **Copie erros** - Copie mensagens de erro completas para investigar

---

**Logcat é sua melhor ferramenta de debug! 🚀**

