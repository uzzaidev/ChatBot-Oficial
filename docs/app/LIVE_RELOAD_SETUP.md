# 🔄 Live Reload - Hot Reload no App Mobile

## 🎯 O que é?

Live Reload permite que mudanças no código sejam refletidas **instantaneamente** no app mobile, sem precisar fazer rebuild completo. É como o hot reload do Next.js, mas para o app nativo.

## ⚡ Como Funciona

1. Dev server Next.js roda na sua máquina (`npm run dev`)
2. App mobile conecta ao dev server via WiFi
3. Quando você salva um arquivo, o app atualiza automaticamente (1-2 segundos)

## 📋 Setup Completo

### Passo 1: Descobrir seu IP Local

```powershell
ipconfig | findstr IPv4
```

**Exemplo de output:**
```
Endereço IPv4. . . . . . . . . . . . : 192.168.0.20
```

Anote o IP (geralmente o segundo, que é o WiFi).

### Passo 2: Configurar capacitor.config.ts

O arquivo já está configurado com:
```typescript
server: {
  url: 'http://192.168.0.20:3000',
  cleartext: true
}
```

**⚠️ IMPORTANTE:** Se seu IP for diferente, edite `capacitor.config.ts` e altere o IP.

### Passo 3: Iniciar Dev Server

Em um terminal, rode:
```bash
npm run dev
```

O servidor deve iniciar em `http://localhost:3000` (e também acessível em `http://192.168.0.20:3000`).

### Passo 4: Sync e Rodar App

Em outro terminal:
```bash
npx cap sync android
npm run cap:open:android
```

No Android Studio:
- Pressione **Shift + F10** (ou clique no botão ▶️ Run)
- Aguarde o app instalar e abrir

### Passo 5: Testar Live Reload

1. Com o app rodando, faça uma mudança em qualquer componente React
2. Salve o arquivo (Ctrl + S)
3. O app deve atualizar automaticamente em 1-2 segundos! ✨

## ✅ Verificação

### App está conectado ao dev server?
- Abra o app no device/emulador
- Verifique se carrega normalmente
- Se não carregar, verifique:
  - Dev server está rodando? (`npm run dev`)
  - IP está correto no `capacitor.config.ts`?
  - Device/emulador está na mesma rede WiFi?

### Live reload está funcionando?
- Faça mudança em componente
- Salve arquivo
- App atualiza automaticamente? ✅

## 🐛 Troubleshooting

### Problema: App não conecta ao dev server

**Soluções:**
1. Verificar se `npm run dev` está rodando
2. Verificar IP no `capacitor.config.ts` (pode mudar se reconectar WiFi)
3. Verificar firewall (Windows pode bloquear porta 3000)
4. Verificar se device/emulador está na mesma rede

**Testar conexão:**
- No device/emulador, abra navegador
- Acesse: `http://192.168.0.20:3000`
- Deve carregar a página do app

### Problema: Mudanças não aparecem

**Soluções:**
1. Verificar se dev server está rodando
2. Verificar console do Next.js (pode ter erro de compilação)
3. Fazer hard refresh no app (fechar e abrir novamente)
4. Verificar se arquivo foi salvo

### Problema: IP mudou

**Solução:**
1. Descobrir novo IP: `ipconfig | findstr IPv4`
2. Atualizar `capacitor.config.ts` com novo IP
3. Fazer sync: `npx cap sync android`
4. Rodar app novamente

## ⚠️ IMPORTANTE: Remover antes de Produção

**ANTES de fazer build para produção, REMOVA a seção `server`:**

```typescript
// capacitor.config.ts (PRODUÇÃO)
const config: CapacitorConfig = {
  appId: 'com.chatbot.app',
  appName: 'ChatBot Oficial',
  webDir: 'out',
  // NÃO incluir server: {...} aqui!
};
```

Depois:
```bash
npm run build:mobile:prd
npx cap sync
```

## 🎯 Workflow Recomendado

### Desenvolvimento (com Live Reload):
```bash
# Terminal 1: Dev server
npm run dev

# Terminal 2: Sync e abrir Android Studio
npx cap sync android
npm run cap:open:android
# Shift + F10 no Android Studio
```

### Produção (sem Live Reload):
```bash
# 1. Remover server do capacitor.config.ts
# 2. Build
npm run build:mobile:prd
npx cap sync
# 3. Build AAB
cd android
./gradlew bundleRelease
```

## 💡 Dicas

1. **Mantenha dev server rodando** durante desenvolvimento mobile
2. **Mantenha Android Studio aberto** para rodar app rapidamente
3. **Verifique IP** se mudar de rede WiFi
4. **Use live reload** para desenvolvimento, **não** para testes finais
5. **Teste build estático** antes de publicar (sem live reload)

## 📝 Notas

- Shift + F10 no Android Studio = Rodar app (não é reload automático)
- Live reload = Atualização automática quando salva arquivo
- Requer dev server rodando (`npm run dev`)
- Funciona apenas em desenvolvimento (não em produção)

---

**Agora você tem hot reload no app mobile! 🚀**

