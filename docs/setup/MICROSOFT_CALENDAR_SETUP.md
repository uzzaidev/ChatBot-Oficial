# Microsoft Calendar OAuth Setup Guide

## Pré-requisitos

- Conta Microsoft com acesso ao [Azure Portal](https://portal.azure.com/)
- Azure Active Directory (disponível gratuitamente)

---

## Passo 1: Registrar Aplicativo no Azure AD

1. Acesse [Azure Portal](https://portal.azure.com/)
2. Vá em **Azure Active Directory** → **Registros de aplicativo**
3. Clique em **Novo registro**
4. Preencha:
   - **Nome**: `UzzApp Calendar`
   - **Tipos de conta com suporte**: **Contas em qualquer diretório organizacional e contas pessoais da Microsoft** (multi-tenant + pessoal)
   - **URI de redirecionamento**: Tipo `Web`, URI:
     ```
     https://uzzapp.uzzai.com.br/api/auth/microsoft-calendar/callback
     ```
5. Clique em **Registrar**
6. Copie o **ID do aplicativo (cliente)** e o **ID do diretório (locatário)**

---

## Passo 2: Criar Secret do Cliente

1. No app registrado, vá em **Certificados e segredos**
2. Clique em **Novo segredo do cliente**
3. Descrição: `UzzApp Calendar`
4. Validade: **24 meses** (recomendado)
5. Clique em **Adicionar**
6. **COPIE O VALOR IMEDIATAMENTE** (não será mostrado novamente)

---

## Passo 3: Configurar Permissões da API

1. No app registrado, vá em **Permissões de API**
2. Clique em **Adicionar uma permissão** → **Microsoft Graph**
3. Selecione **Permissões delegadas**
4. Adicione:
   - `Calendars.ReadWrite`
   - `User.Read`
   - `offline_access`
5. Clique em **Adicionar permissões**

> **Nota**: `offline_access` permite obter refresh tokens para acesso contínuo.

---

## Passo 4: Adicionar URI de Redirecionamento para Dev

1. Vá em **Autenticação**
2. Em **URIs de redirecionamento**, adicione:
   ```
   http://localhost:3000/api/auth/microsoft-calendar/callback
   ```
3. Clique em **Salvar**

---

## Passo 5: Configurar Variáveis de Ambiente

Adicione ao `.env.local`:

```env
MICROSOFT_CALENDAR_CLIENT_ID=seu-application-client-id
MICROSOFT_CALENDAR_CLIENT_SECRET=seu-client-secret-value
MICROSOFT_CALENDAR_TENANT_ID=common
```

> **Nota sobre TENANT_ID**:
>
> - `common` → aceita contas pessoais + organizacionais (recomendado)
> - `organizations` → apenas contas corporativas
> - `consumers` → apenas contas pessoais (@hotmail, @outlook)
> - UUID específico → apenas um diretório Azure AD

---

## Passo 6: Verificar

1. Reinicie o servidor de desenvolvimento: `npm run dev`
2. Acesse `/dashboard/calendar`
3. Clique em **Conectar com Microsoft**
4. Autorize o acesso na tela da Microsoft
5. Você será redirecionado de volta com a mensagem de sucesso

---

## Produção

Para produção, a configuração do Azure AD já funciona sem processo de verificação adicional (diferente do Google). Apenas certifique-se de:

1. O URI de produção está nos **URIs de redirecionamento**
2. O secret do cliente não expirou
3. As permissões estão corretas

---

## Renovação do Secret

Secrets do Azure expiram. Quando expirar:

1. Vá em **Certificados e segredos**
2. Crie um novo secret
3. Atualize `MICROSOFT_CALENDAR_CLIENT_SECRET` no `.env.local` (e na produção)
4. O secret antigo pode ser deletado após atualizar

---

## Troubleshooting

| Erro                  | Causa                           | Solução                                  |
| --------------------- | ------------------------------- | ---------------------------------------- |
| `AADSTS50011`         | URI de redirect não registrado  | Adicione o URI exato em Autenticação     |
| `AADSTS7000218`       | Client secret inválido/expirado | Gere novo secret                         |
| `AADSTS700016`        | Application ID incorreto        | Verifique `MICROSOFT_CALENDAR_CLIENT_ID` |
| `invalid_grant`       | Refresh token expirado          | Reconecte pelo dashboard                 |
| `insufficient_claims` | Permissões não concedidas       | Verifique Permissões de API              |
