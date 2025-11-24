# 🔧 Fix: Logcat Não Está Atualizando

## 🎯 Problemas Comuns

### 1. Logcat Está Pausado

**Sintoma:** Logs não aparecem, mas app está rodando

**Solução:**
1. Na aba Logcat, procure pelo botão **⏸️ Pause** (ou **▶️ Resume**)
2. Se estiver pausado, clique para retomar
3. Ou pressione **Ctrl + F8** (atalho para pause/resume)

### 2. Filtro Muito Restritivo

**Sintoma:** Nenhum log aparece

**Solução:**
1. Verifique o campo de filtro (canto superior direito do Logcat)
2. Se estiver filtrado por `com.chatbot.app`, tente:
   - Remover o filtro temporariamente
   - Ou usar filtro mais amplo: `chatbot`
   - Ou verificar se o package name está correto

### 3. Device Errado Selecionado

**Sintoma:** Logs de outro device aparecem

**Solução:**
1. No topo do Logcat, verifique o dropdown de device
2. Selecione o device correto (ex: `emulator-5554` ou seu device físico)
3. Se não aparecer device: iniciar emulador ou conectar device

### 4. Logs Antigos Não Foram Limpos

**Sintoma:** Muitos logs antigos, difícil ver os novos

**Solução:**
1. No Logcat, clique no botão **🗑️ Clear** (lixeira)
2. Ou via terminal: `adb logcat -c`
3. Depois reproduza o problema para ver logs novos

### 5. Nível de Log Muito Restritivo

**Sintoma:** Apenas erros aparecem, mas você quer ver tudo

**Solução:**
1. No Logcat, verifique os filtros de nível (Verbose, Debug, Info, Warn, Error)
2. Clique em **"Show only selected application"** para desmarcar
3. Ou selecione nível mais baixo (Verbose mostra tudo)

### 6. App Não Está Gerando Logs

**Sintoma:** App roda, mas nenhum log aparece

**Solução:**
1. Verificar se app realmente está rodando
2. Fazer alguma ação no app (clicar em botão, navegar)
3. Se ainda não aparecer, pode ser que app não esteja gerando logs

## ✅ Solução Rápida (Passo a Passo)

### Passo 1: Limpar Logs
1. No Logcat: Clique no botão **🗑️ Clear** (lixeira)
2. Ou: `adb logcat -c` no terminal

### Passo 2: Verificar Device
1. Topo do Logcat: Verificar se device correto está selecionado
2. Se não: selecionar device correto no dropdown

### Passo 3: Remover Filtros
1. Campo de filtro: Limpar ou usar filtro mais amplo
2. Tentar sem filtro primeiro para ver se logs aparecem

### Passo 4: Verificar Pause
1. Verificar se botão está em **▶️ Resume** (não ⏸️ Pause)
2. Se estiver pausado: clicar para retomar

### Passo 5: Reproduzir Problema
1. Com Logcat limpo e rodando
2. Fazer a ação que causa problema (ex: clicar em "Base de Conhecimento")
3. Ver logs aparecerem em tempo real

## 🎯 Configuração Recomendada

### Filtros Úteis

**Ver tudo do app:**
```
package:com.chatbot.app
```

**Ver apenas erros:**
```
package:com.chatbot.app level:error
```

**Ver console JavaScript:**
```
tag:Capacitor/Console
```

**Ver autenticação:**
```
auth|Auth|SIGNED_OUT|TOKEN_REFRESHED
```

### Níveis de Log

- **Verbose (V):** Mostra tudo (muito verboso)
- **Debug (D):** Logs de debug
- **Info (I):** Informações gerais
- **Warn (W):** Avisos
- **Error (E):** Apenas erros

**Recomendação:** Use **Debug** ou **Info** para desenvolvimento.

## 🛠️ Alternativa: Terminal ADB

Se Logcat do Android Studio não funcionar, use terminal:

```powershell
# Limpar logs
adb logcat -c

# Ver tudo do app
adb logcat | Select-String "com.chatbot.app"

# Ver apenas erros
adb logcat *:E | Select-String "com.chatbot.app"

# Ver console JavaScript
adb logcat | Select-String "Capacitor/Console"

# Ver tudo (sem filtro)
adb logcat
```

## 💡 Dicas

1. **Sempre limpe logs antes** de debugar um problema específico
2. **Use filtros** para focar no que importa
3. **Verifique device** - logs podem estar vindo de outro device
4. **Verifique pause** - Logcat pode estar pausado
5. **Use terminal** se Android Studio não funcionar

## 🐛 Se Nada Funcionar

1. Fechar e reabrir aba Logcat
2. Fechar e reabrir Android Studio
3. Verificar se ADB está funcionando: `adb devices`
4. Reiniciar emulador/device
5. Usar terminal ADB diretamente

---

**Geralmente é só clicar em Resume ou limpar filtros! 🚀**

