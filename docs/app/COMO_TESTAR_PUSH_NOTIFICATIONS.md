# Como Testar Push Notifications - Guia Rápido

Tudo está configurado! Agora só precisa colar o token e executar.

---

## ✅ O Que Já Está Pronto

1. ✅ `firebase-service-account.json` na raiz do projeto
2. ✅ `firebase-admin` instalado
3. ✅ Script `scripts/test-push-v1.js` criado

---

## 🚀 Passo a Passo (2 minutos)

### Passo 1: Copiar Token do Supabase

1. **Acesse Supabase:**
   - https://app.supabase.com
   - Table Editor → `push_tokens`

2. **Copiar token:**
   - Copie o valor da coluna **`token`**
   - Exemplo: `ca8tSH2CS7ufYnF4uXY97v:APA91bGYIPa...`

### Passo 2: Editar Script

1. **Abrir:** `scripts/test-push-v1.js`

2. **Linha 28, substituir:**
   ```javascript
   const TOKEN = 'COLE_SEU_TOKEN_DO_SUPABASE_AQUI';
   ```
   
   Por:
   ```javascript
   const TOKEN = 'ca8tSH2CS7ufYnF4uXY97v:APA91bGYIPa...'; // Seu token aqui
   ```

3. **Salvar arquivo**

### Passo 3: Executar Script

```bash
node scripts/test-push-v1.js
```

---

## ✅ O Que Deve Acontecer

**Se funcionou:**
```
✅ Firebase Admin inicializado
========================================
Enviando notificação de teste...
========================================
Token: ca8tSH2CS7ufYnF4uXY97v...
✅ SUCESSO! Notificação enviada!
```

**No device/emulador:**
- Notificação aparece no topo (se app aberto)
- Ou na barra de notificações (se app fechado)

---

## 🐛 Se Der Erro

### Erro: "Token inválido"
- Verificar se token está correto
- Verificar se app está rodando
- Tentar registrar token novamente (fazer login no app)

### Erro: "Token não registrado"
- App pode ter sido desinstalado
- Fazer login novamente no app para registrar novo token

---

## 📝 Resumo

1. Copiar token do Supabase (`push_tokens.token`)
2. Colar no script (`scripts/test-push-v1.js` linha 28)
3. Executar: `node scripts/test-push-v1.js`
4. Verificar notificação no device

**Pronto para testar!** 🚀

