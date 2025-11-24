# 🔧 Fix: Botão Run Não Funciona no Android Studio

## 🎯 Problema
Botão Run (▶️) não clica ou está desabilitado no Android Studio.

## ✅ Soluções (Tente nesta ordem)

### 1. Verificar se App Já Está Rodando
- **Sintoma:** Botão Run está desabilitado/cinza
- **Solução:** 
  - Clique no botão **Stop** (⏹️) primeiro
  - Depois clique em **Run** (▶️)

### 2. Reiniciar App no Emulador
- **Sintoma:** App está rodando mas travado
- **Solução:**
  - No emulador: Fechar o app (swipe up ou botão voltar)
  - No Android Studio: Clique em **Stop** (⏹️)
  - Depois clique em **Run** (▶️) novamente

### 3. Verificar Device Selecionado
- **Sintoma:** Nenhum device aparece na barra superior
- **Solução:**
  - Verifique se emulador está rodando
  - Ou conecte device físico via USB
  - Selecione o device na barra superior do Android Studio

### 4. Limpar e Rebuild
- **Sintoma:** Build antigo pode estar causando problemas
- **Solução:**
```bash
# No terminal do projeto
cd android
./gradlew clean
cd ..
npm run build:mobile
npx cap sync android
```
- Depois tente Run novamente no Android Studio

### 5. Reiniciar Android Studio
- **Sintoma:** Android Studio pode estar travado
- **Solução:**
  - File → Invalidate Caches → Invalidate and Restart
  - Ou fechar e abrir Android Studio novamente

### 6. Verificar Logs de Erro
- **Sintoma:** Pode haver erro impedindo o build
- **Solução:**
  - Aba "Build" (inferior do Android Studio)
  - Verificar se há erros de compilação
  - Corrigir erros antes de rodar

### 7. Matar Processo do App
- **Sintoma:** App pode estar rodando em background
- **Solução:**
```bash
# Via ADB
adb shell am force-stop com.chatbot.app

# Depois tente Run novamente
```

### 8. Reiniciar Emulador
- **Sintoma:** Emulador pode estar travado
- **Solução:**
  - Fechar emulador completamente
  - Abrir novamente
  - Aguardar inicialização completa
  - Tentar Run novamente

## 🎯 Solução Rápida (Mais Comum)

**Passo a passo:**
1. No Android Studio: Clique em **Stop** (⏹️)
2. No emulador: Feche o app (se estiver aberto)
3. No Android Studio: Clique em **Run** (▶️) ou **Shift + F10**

## 💡 Dicas

- **Atalho:** `Shift + F10` = Run (mais rápido que clicar)
- **Verificar device:** Barra superior deve mostrar device selecionado
- **Build primeiro:** Se mudou código, faça build antes de run
- **Aguardar:** Primeira vez pode demorar 30-60 segundos

## 🐛 Se Nada Funcionar

1. Fechar Android Studio completamente
2. Fechar emulador completamente
3. Abrir emulador novamente
4. Aguardar inicialização completa
5. Abrir Android Studio
6. Abrir projeto
7. Tentar Run novamente

---

**Geralmente é só clicar Stop e depois Run! 🚀**

