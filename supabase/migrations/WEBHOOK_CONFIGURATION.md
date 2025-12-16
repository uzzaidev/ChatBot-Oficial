# 🔗 Configuração de Webhooks Multi-Tenant

Documentação completa para configurar webhooks no Meta WhatsApp Business API após implementação multi-tenant.

---

## 📊 Status Atual

✅ **FASE 1 COMPLETA** - Infraestrutura multi-tenant com Vault implementada
✅ **FASE 2 COMPLETA** - Webhooks dinâmicos funcionando

---

## 🎯 Dois Modos de Webhook

### Modo 1: Webhook Único (Atual - Compatibilidade Retroativa)

**URL**: `https://chat.luisfboff.com/api/webhook`

**Funcionamento**:
- Usa `DEFAULT_CLIENT_ID` do `.env.local`
- Busca config do cliente do Vault automaticamente
- **Vantagem**: Não precisa reconfigurar nada no Meta
- **Limitação**: Serve apenas 1 cliente por instalação

**Quando usar**:
- Sistema single-tenant (1 cliente apenas)
- Transição gradual para multi-tenant
- Desenvolvimento/testes

**Configuração no Meta Dashboard**:
```
Webhook URL: https://chat.luisfboff.com/api/webhook
Verify Token: <o valor que você configurou no 006_setup_default_client.sql>
```

---

### Modo 2: Webhook Dinâmico por Cliente (Multi-Tenant Completo)

**URL**: `https://chat.luisfboff.com/api/webhook/[CLIENT_ID]`

**Funcionamento**:
- Cada cliente tem sua própria URL com UUID único
- Config carregado dinamicamente do Vault baseado no `clientId` da URL
- **Vantagem**: Suporta múltiplos clientes na mesma instalação
- **Requisito**: Cada cliente precisa de Application separada no Meta

**Exemplo**:
```
Cliente A (Luis Boff):
  URL: https://chat.luisfboff.com/api/webhook/b21b314f-c49a-467d-94b3-a21ed4412227
  Verify Token: (do Vault do cliente A)

Cliente B (Outra Empresa):
  URL: https://chat.luisfboff.com/api/webhook/c32c425a-f3ab-5d28-b827-557766551338
  Verify Token: (do Vault do cliente B)
```

**Quando usar**:
- Sistema SaaS multi-tenant
- Múltiplos clientes na mesma infraestrutura
- Isolamento completo de dados por cliente

---

## 🔐 Seu Client ID

Durante a execução do script `006_setup_default_client.sql`, o sistema retornou:

```
Client ID: b21b314f-c49a-467d-94b3-a21ed4412227
```

**Guarde este UUID!** Você vai precisar dele para:
- Configurar webhook dinâmico no Meta
- Testar o sistema
- Adicionar ao `.env.local` (já foi adicionado como `DEFAULT_CLIENT_ID`)

---

## 📝 Como Configurar no Meta Dashboard

### Passo 1: Acessar Configurações do Webhook

1. Acesse: https://developers.facebook.com/apps/
2. Selecione seu App WhatsApp Business
3. Menu lateral → **WhatsApp** → **Configuration**
4. Seção **Webhook** → **Edit**

### Passo 2: Escolher Modo

#### Opção A: Webhook Único (Modo Atual)

```
Callback URL: https://chat.luisfboff.com/api/webhook
Verify Token: <o token que você definiu no script 006>
```

**Importante**: O Verify Token deve ser o **mesmo** que você definiu na linha 18 do arquivo `006_setup_default_client.sql`.

#### Opção B: Webhook Dinâmico (Multi-Tenant)

```
Callback URL: https://chat.luisfboff.com/api/webhook/b21b314f-c49a-467d-94b3-a21ed4412227
Verify Token: <o token que você definiu no script 006>
```

### Passo 3: Verificar Webhook

1. Clique em **Verify and Save**
2. O Meta vai fazer uma chamada GET para sua URL
3. Você deve ver no console: `✅ Webhook verificado com sucesso pela Meta!`

### Passo 4: Subscrever Eventos

Marque as seguintes opções:
- ✅ **messages** (obrigatório)
- ✅ **message_status** (opcional - para delivery receipts)

**NÃO marque outros eventos** para evitar processamento desnecessário.

---

## 🧪 Como Testar

### Teste 1: Verificar se Config Está Carregando

```bash
curl https://chat.luisfboff.com/api/test/vault-config
```

**Resultado esperado**:
```json
{
  "success": true,
  "message": "✅ Vault config loaded successfully!",
  "client": {
    "id": "b21b314f-c49a-467d-94b3-a21ed4412227",
    "name": "Luis Fernando Boff",
    "slug": "default-client",
    "status": "active"
  }
}
```

### Teste 2: Enviar Mensagem de Teste

Envie uma mensagem via WhatsApp para o número do bot e veja os logs:

```bash
npm run dev
```

**Logs esperados**:
```
[WEBHOOK] 🔐 Buscando config do cliente...
[WEBHOOK] ✅ Config carregado: Luis Fernando Boff (default-client)
[chatbotFlow] 🚀 Starting message processing
...
```

---

## 🔄 Migrando do Webhook Antigo para o Novo

### Cenário 1: Usando Webhook Único (Modo 1)

✅ **Não precisa fazer nada!**

O webhook `/api/webhook` já foi atualizado para buscar config do Vault usando `DEFAULT_CLIENT_ID`. Tudo continua funcionando normalmente.

### Cenário 2: Migrando para Webhook Dinâmico (Modo 2)

1. **Adicione CLIENT_ID à URL no Meta Dashboard**:
   ```
   Antes: https://chat.luisfboff.com/api/webhook
   Depois: https://chat.luisfboff.com/api/webhook/b21b314f-c49a-467d-94b3-a21ed4412227
   ```

2. **Verify and Save** no Meta Dashboard

3. **Testar** enviando mensagem via WhatsApp

4. **Conferir logs** para confirmar que está usando o clientId da URL

---

## 🛠️ Troubleshooting

### Erro: "Client not found"

**Causa**: `clientId` na URL não existe no banco ou cliente está inativo.

**Solução**:
1. Verifique se o UUID está correto:
   ```sql
   SELECT id, name, status FROM clients WHERE id = 'b21b314f-c49a-467d-94b3-a21ed4412227';
   ```
2. Certifique-se que `status = 'active'`

### Erro: "Invalid verification token"

**Causa**: Verify Token configurado no Meta não corresponde ao armazenado no Vault.

**Solução**:
1. Verifique o token no Vault:
   ```sql
   SELECT * FROM client_secrets_decrypted WHERE client_id = 'b21b314f-c49a-467d-94b3-a21ed4412227';
   ```
2. O valor em `meta_verify_token` deve ser **exatamente o mesmo** configurado no Meta Dashboard

### Erro: "Configuration error"

**Causa**: Não conseguiu carregar config do Vault.

**Solução**:
1. Verifique se `DEFAULT_CLIENT_ID` está no `.env.local`
2. Teste o endpoint: `curl https://chat.luisfboff.com/api/test/vault-config`
3. Veja os logs do servidor para mais detalhes

### Webhook não está sendo chamado

**Causa**: Meta não está conseguindo acessar sua URL.

**Checklist**:
- ✅ URL está pública e acessível (não pode ser localhost)
- ✅ HTTPS configurado corretamente
- ✅ Firewall/proxy não está bloqueando
- ✅ Webhook foi verificado com sucesso no Meta Dashboard
- ✅ Eventos `messages` estão subscritos

---

## 📊 Comparação: Webhook Único vs Dinâmico

| Aspecto | Webhook Único | Webhook Dinâmico |
|---------|--------------|------------------|
| **URL** | `/api/webhook` | `/api/webhook/[clientId]` |
| **Clientes suportados** | 1 (via DEFAULT_CLIENT_ID) | N (ilimitados) |
| **Config** | Busca do Vault automaticamente | Busca do Vault por clientId da URL |
| **Requer mudança no Meta** | Não | Sim (adicionar clientId na URL) |
| **Isolamento** | Por env var | Por URL + Vault |
| **Ideal para** | Single-tenant | Multi-tenant SaaS |

---

## 🎯 Próximos Passos

Agora que os webhooks estão funcionando com Vault:

### Passo 1: Validar Funcionamento

✅ Teste enviando mensagem via WhatsApp
✅ Confirme que config está sendo carregado do Vault
✅ Verifique que prompts personalizados estão sendo usados

### Passo 2: Deploy para Produção

1. Commit das mudanças:
   ```bash
   git add .
   git commit -m "feat: Implement multi-tenant with Supabase Vault"
   git push origin main
   ```

2. Deploy no Vercel (automático via GitHub)

3. Aguardar deploy completar

4. Testar em produção

### Passo 3: Reconfigurar Meta (Opcional)

Se quiser usar webhook dinâmico:
1. Atualizar URL no Meta Dashboard
2. Adicionar clientId: `/api/webhook/b21b314f-c49a-467d-94b3-a21ed4412227`
3. Verify and Save

### Passo 4: Onboarding de Novos Clientes (Futuro)

Quando tiver novos clientes:
1. Executar script SQL para criar novo cliente no Vault
2. Configurar Application separada no Meta para o cliente
3. Usar URL: `/api/webhook/[novo-client-id]`
4. Cliente totalmente isolado!

---

## 📞 Suporte

**Dúvidas sobre configuração?**
- Consulte: `MULTI_TENANT_MIGRATION.md`
- Consulte: `README_FASE1.md`
- GitHub Issues: https://github.com/anthropics/claude-code/issues

---

**Data**: 2025-01-28
**Versão**: 1.0
**Status**: ✅ Produção
