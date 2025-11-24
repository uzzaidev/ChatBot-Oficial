# 🔧 Fix: App Redireciona para Site da UzzAI

## 🎯 Problema

Quando você roda o app no emulador, ele abre o site da UzzAI (`uzzai.com.br`) ao invés do app mobile.

## 🔍 Causa

O problema é a configuração de **Live Reload** no `capacitor.config.ts`. Quando o app tenta conectar ao dev server (`http://192.168.0.20:3000`) e ele não está rodando, ou quando há algum redirecionamento, o app pode abrir o site ao invés do app.

## ✅ Solução

### Opção 1: Remover Live Reload (Recomendado para Testes)

**Para usar o build estático (app completo):**

1. Remover ou comentar a seção `server` do `capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chatbot.app',
  appName: 'ChatBot Oficial',
  webDir: 'out'
  // ⚠️ LIVE RELOAD - REMOVIDO
  // server: {
  //   url: 'http://192.168.0.20:3000',
  //   cleartext: true
  // }
};

export default config;
```

2. Rebuildar o app:
```powershell
npm run build:mobile
npx cap sync android
```

3. Rodar no Android Studio novamente

### Opção 2: Usar Live Reload Corretamente

**Se você quer usar live reload (desenvolvimento rápido):**

1. **Iniciar o dev server primeiro:**
```powershell
npm run dev
```

2. **Verificar o IP local:**
```powershell
ipconfig | findstr IPv4
```

3. **Atualizar `capacitor.config.ts` com o IP correto:**
```typescript
server: {
  url: 'http://SEU_IP_AQUI:3000',  // Ex: http://192.168.0.20:3000
  cleartext: true
}
```

4. **Sincronizar:**
```powershell
npx cap sync android
```

5. **Rodar no Android Studio**

**⚠️ IMPORTANTE:** O dev server (`npm run dev`) **DEVE estar rodando** para o live reload funcionar. Se não estiver, o app tentará conectar e pode redirecionar.

## 🎯 Quando Usar Cada Opção

### Use Build Estático (Opção 1) quando:
- ✅ Testando funcionalidades completas
- ✅ Testando em device físico
- ✅ Preparando para produção
- ✅ Não precisa de hot reload

### Use Live Reload (Opção 2) quando:
- ✅ Desenvolvendo ativamente
- ✅ Fazendo mudanças frequentes no código
- ✅ Quer ver mudanças instantaneamente
- ✅ Tem o dev server rodando

## 🐛 Se Ainda Redirecionar

1. **Verificar se build está completo:**
```powershell
npm run build:mobile
```

2. **Verificar se sync foi feito:**
```powershell
npx cap sync android
```

3. **Limpar cache do Android Studio:**
   - Build → Clean Project
   - Build → Rebuild Project

4. **Desinstalar app do emulador:**
   - Settings → Apps → ChatBot Oficial → Uninstall
   - Rodar novamente

5. **Verificar se não há redirecionamentos no código:**
   - Verificar `src/app/layout.tsx`
   - Verificar middleware
   - Verificar componentes de autenticação

## 📝 Notas

- **Live Reload é apenas para desenvolvimento** - não use em produção
- **Build estático é mais estável** para testes
- **Sempre faça rebuild** após mudar `capacitor.config.ts`
- **Sempre faça sync** após rebuild

---

**Solução rápida: Remova a seção `server` do `capacitor.config.ts` e faça rebuild! 🚀**

