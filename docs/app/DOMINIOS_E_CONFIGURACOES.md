# Domínios e Configurações - UzzApp

Documentação dos domínios e configurações corretas do projeto.

---

## 📋 Informações da Empresa

- **Nome do Produto:** UzzApp
- **Nome da Empresa:** Uzz.Ai
- **Site da Empresa:** uzzai.com.br
- **Endereço do Produto:** uzzapp.uzzai.com.br

---

## 🔗 Domínios Configurados

### Deep Linking (App Links)

**Domínio principal:**

- `https://uzzapp.uzzai.com.br`

**Exemplos de URLs:**

- `https://uzzapp.uzzai.com.br/chat/123` → Abre chat específico
- `https://uzzapp.uzzai.com.br/dashboard` → Abre dashboard
- `https://uzzapp.uzzai.com.br/invite/abc` → Abre convite

### Custom URL Scheme

**Scheme:**

- `chatbot://` (mantido para compatibilidade)

**Exemplos:**

- `chatbot://chat/123` → Abre chat específico
- `chatbot://dashboard` → Abre dashboard

**Nota:** O Custom URL Scheme pode ser alterado para `uzzapp://` no futuro se necessário.

---

## 📱 Configurações Mobile

### Android Package Name

**Atual:**

- `com.chatbot.app`

**Nota:** Este é o package name do app Android. Pode ser alterado no futuro para `com.uzzai.uzzapp` se necessário, mas requer rebuild completo.

### Firebase Project

**Nome sugerido:**

- `UzzApp` ou `Uzz.Ai`

**App nickname:**

- `UzzApp Android`

---

## 🔧 Arquivos que Usam Domínios

### Arquivos Críticos (Já Atualizados)

1. **`android/app/src/main/AndroidManifest.xml`**

   - App Links: `uzzapp.uzzai.com.br`

2. **`src/lib/deepLinking.ts`**
   - Comentários e processamento de URLs

### Arquivos de Documentação (Podem Ser Atualizados)

- `docs/app/DEEP_LINKING.md`
- `docs/app/PHASE3_DEEP_LINKING_QUICKSTART.md`
- `docs/app/O_QUE_E_DEEP_LINKING_SIMPLES.md`
- E outros arquivos de documentação

**Nota:** Os arquivos de documentação ainda podem conter referências ao domínio antigo (`uzzap.uzzai.com`). Isso não afeta o funcionamento, mas pode ser atualizado para consistência.

---

## ⚠️ Importante

### App Links (Android)

Para App Links funcionarem completamente, você precisa:

1. **Configurar `assetlinks.json` no servidor:**

   - URL: `https://uzzapp.uzzai.com.br/.well-known/assetlinks.json`
   - Deve conter o SHA256 fingerprint do app

2. **Verificar domínio no Firebase:**
   - Se usar Firebase Hosting, adicionar domínio `uzzapp.uzzai.com.br`

### Custom URL Scheme

O scheme `chatbot://` funciona sem configuração adicional no servidor. Pode ser usado imediatamente.

---

## 📝 Próximos Passos

1. ✅ Domínios atualizados nos arquivos críticos
2. ⏳ Configurar `assetlinks.json` no servidor (quando App Links estiver pronto)
3. ⏳ Atualizar documentação (opcional, para consistência)

---

**Última atualização:** Configuração inicial de domínios UzzApp
