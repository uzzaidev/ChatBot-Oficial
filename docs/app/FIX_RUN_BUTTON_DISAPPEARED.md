# 🔧 Fix: Botão Run Desapareceu no Android Studio

## 🎯 Problema
A opção de "Run" (▶️) não aparece mais na barra de ferramentas do Android Studio.

## ✅ Soluções (Tente nesta ordem)

### 1. Verificar Device Selecionado

**Sintoma:** Nenhum device aparece na barra superior

**Solução:**
1. Na barra superior, clique no dropdown ao lado do botão Run
2. Se não aparecer nenhum device:
   - Inicie um emulador (Tools → Device Manager → Play ▶️)
   - Ou conecte device físico via USB
3. Selecione o device na lista
4. O botão Run deve aparecer

### 2. Verificar Configuração de Run

**Sintoma:** Configuração de run foi perdida

**Solução:**
1. Run → Edit Configurations...
2. Verificar se existe configuração "app"
3. Se não existir:
   - Clique em "+" (Add New Configuration)
   - Selecione "Android App"
   - Nome: "app"
   - Module: selecione "app"
   - Launch: "Default Activity"
   - Clique OK
4. O botão Run deve aparecer

### 3. Sincronizar Projeto

**Sintoma:** Projeto pode estar dessincronizado

**Solução:**
1. File → Sync Project with Gradle Files
2. Aguarde sincronização completa
3. Tente Run novamente

### 4. Reimportar Projeto

**Sintoma:** Projeto pode estar corrompido

**Solução:**
1. File → Close Project
2. File → Open
3. Navegue até: `android/` (pasta android do projeto)
4. Selecione e abra
5. Aguarde sincronização
6. Tente Run novamente

### 5. Verificar se App Module Existe

**Sintoma:** Module "app" não encontrado

**Solução:**
1. File → Project Structure
2. Verificar se existe module "app" na lista
3. Se não existir:
   - File → New → Import Module
   - Selecione pasta `android/app`
   - Clique OK
4. Tente Run novamente

### 6. Limpar e Rebuild

**Sintoma:** Build pode estar corrompido

**Solução:**
```bash
# No terminal do projeto
cd android
./gradlew clean
cd ..
npm run build:mobile
npx cap sync android
```

Depois:
1. No Android Studio: Build → Rebuild Project
2. Aguarde conclusão
3. Tente Run novamente

### 7. Verificar Atalho de Teclado

**Sintoma:** Botão não aparece, mas atalho funciona

**Solução:**
- Pressione **Shift + F10** (atalho para Run)
- Ou **Ctrl + F5** (Debug)

### 8. Restaurar Layout do Android Studio

**Sintoma:** Barra de ferramentas pode estar oculta

**Solução:**
1. View → Tool Windows → Toolbar (verificar se está marcado)
2. View → Appearance → Toolbar (verificar se está marcado)
3. Window → Restore Default Layout

## 🎯 Solução Rápida (Mais Comum)

**Passo a passo:**
1. Verificar se device está selecionado (barra superior)
2. Se não estiver: iniciar emulador ou conectar device
3. Selecionar device no dropdown
4. Botão Run deve aparecer

## 💡 Dicas

- **Atalho:** `Shift + F10` sempre funciona, mesmo se botão não aparecer
- **Device:** Sem device selecionado, botão Run não aparece
- **Sync:** Sempre faça sync após mudanças no projeto

## 🐛 Se Nada Funcionar

1. Fechar Android Studio completamente
2. Deletar pasta `.idea` em `android/` (se existir)
3. Abrir Android Studio
4. File → Open → Selecionar pasta `android/`
5. Aguardar sincronização completa
6. Verificar device selecionado
7. Tentar Run novamente

---

**Geralmente é só selecionar um device! 🚀**

