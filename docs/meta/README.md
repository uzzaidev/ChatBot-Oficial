# Meta Platform Documentation

Documentação completa para configuração do Meta App (WhatsApp + Ads + Instagram + Threads).

---

## 📚 Arquivos

### 1. [`META_APP_SETUP.md`](./META_APP_SETUP.md)
**Guia Principal de Configuração**

Tudo que você precisa para configurar o Meta App do zero:

- ✅ Business Verification
- ✅ Tech Provider Enrollment
- ✅ Criar Meta App
- ✅ Configurar Webhook
- ✅ Embedded Signup (OAuth)
- ✅ Lista completa de 26 permissões (WhatsApp, Ads, Instagram, Threads)
- ✅ Environment variables
- ✅ Checklist de configuração

**Use quando:** Configurando o Meta App pela primeira vez ou adicionando novos produtos.

---

### 2. [`META_APP_REVIEW.md`](./META_APP_REVIEW.md)
**Respostas para App Review**

Respostas prontas para o questionário do Meta App Review:

- ✅ Questionários de todas as 26 permissões
- ✅ Questões de privacidade e dados
- ✅ Instruções para o analista Meta
- ✅ Materiais de suporte (screenshots, vídeos)
- ✅ Casos de uso detalhados

**Use quando:** Submetendo o app para revisão da Meta (permissões Advanced).

---

### 3. [`OAUTH_SETUP.md`](./OAUTH_SETUP.md)
**Documentação de Implementação OAuth**

Status da implementação do Embedded Signup:

- ✅ Código OAuth implementado (5 arquivos)
- ✅ Variáveis de ambiente configuradas
- ✅ Embedded Signup configuration ID
- ✅ Fluxo OAuth completo documentado
- ✅ Troubleshooting
- ✅ Próximos passos

**Use quando:** Verificando o que foi implementado ou debugando OAuth flow.

---

## 🚀 Quick Start

### Se você está começando do zero:

1. **Leia:** [`META_APP_SETUP.md`](./META_APP_SETUP.md)
2. **Configure:** Siga o checklist parte por parte
3. **Teste:** Use `/test-oauth` para validar
4. **Submeta Review:** Use [`META_APP_REVIEW.md`](./META_APP_REVIEW.md) quando pronto

### Se você já tem o app configurado:

- **Ver status OAuth:** [`OAUTH_SETUP.md`](./OAUTH_SETUP.md)
- **Adicionar produtos:** Parte 1 de [`META_APP_SETUP.md`](./META_APP_SETUP.md)
- **Solicitar permissões:** Parte 4 de [`META_APP_SETUP.md`](./META_APP_SETUP.md)

---

## 🔑 Informações do App

**App ID:** `1440028941249650`
**Nome:** UzzApp SaaS Oficial
**Business:** Uzz.Ai (ID: 874019088876197)
**Domínio:** `uzzapp.uzzai.com.br`

**Produtos Configurados:**
- ✅ WhatsApp Business Platform
- ✅ Marketing API (Meta Ads)
- ✅ Instagram Graph API
- ✅ Threads API
- ✅ Facebook Login for Business

**Embedded Signup Config ID:** `1247304987342255`

---

## 📊 Status das Permissões

| Produto | Permissões | Status | Requer Review? |
|---------|-----------|--------|----------------|
| WhatsApp | 3 Standard | ✅ Ativo | ❌ Não |
| Meta Ads | 6 (1 Advanced + 5 Standard) | ⏳ Pendente | ✅ Sim |
| Instagram | 3 Standard | ✅ Ativo | ❌ Não |
| Threads | 10 Standard | ✅ Ativo | ❌ Não |
| Shared | 4 Standard | ✅ Ativo | ❌ Não |

**Total:** 26 permissões
**Advanced (requer review):** 1 (`ads_management`)
**Standard (disponíveis agora):** 25

---

## 🔗 Links Úteis

- **Meta Developer Console:** https://developers.facebook.com/apps/1440028941249650
- **Business Manager:** https://business.facebook.com
- **Webhook Logs:** https://uzzapp.uzzai.com.br/api/debug/env-check
- **Teste OAuth:** https://uzzapp.uzzai.com.br/test-oauth

---

**Última Atualização:** 13 de fevereiro de 2026
**Versão:** 1.0
**Mantido por:** ChatBot-Oficial Platform Team
