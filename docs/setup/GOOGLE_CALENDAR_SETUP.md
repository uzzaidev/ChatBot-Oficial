# Google Calendar OAuth Setup Guide

## Pré-requisitos

- Conta Google com acesso ao [Google Cloud Console](https://console.cloud.google.com/)
- Projeto no Google Cloud (pode criar novo)

---

## Passo 1: Criar Projeto (se necessário)

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Clique em **Selecionar projeto** → **Novo Projeto**
3. Nome: `UzzApp Calendar` (ou nome da sua escolha)
4. Clique em **Criar**

---

## Passo 2: Habilitar Google Calendar API

1. No menu lateral, vá em **APIs e Serviços** → **Biblioteca**
2. Pesquise por **Google Calendar API**
3. Clique e depois em **Ativar**

---

## Passo 3: Configurar Tela de Consentimento OAuth

1. Vá em **APIs e Serviços** → **Tela de consentimento OAuth**
2. Selecione **Externo** (para permitir qualquer conta Google)
3. Preencha:
   - **Nome do app**: `UzzApp`
   - **E-mail de suporte**: seu email
   - **Domínios autorizados**: `uzzai.com.br`
   - **E-mail do desenvolvedor**: seu email
4. Em **Escopos**, adicione:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Em **Usuários de teste**, adicione os emails que usarão durante desenvolvimento
6. Clique em **Salvar e continuar**

> **Nota**: Enquanto o app estiver em modo "Teste", apenas os usuários de teste poderão autorizar. Para produção, será necessário verificar o app com Google.

---

## Passo 4: Criar Credenciais OAuth

1. Vá em **APIs e Serviços** → **Credenciais**
2. Clique em **Criar credenciais** → **ID do cliente OAuth**
3. Tipo de aplicação: **Aplicativo da Web**
4. Nome: `UzzApp Calendar OAuth`
5. **Origens JavaScript autorizadas**:
   ```
   https://uzzapp.uzzai.com.br
   http://localhost:3000
   ```
6. **URIs de redirecionamento autorizados**:
   ```
   https://uzzapp.uzzai.com.br/api/auth/google-calendar/callback
   http://localhost:3000/api/auth/google-calendar/callback
   ```
7. Clique em **Criar**
8. Copie o **ID do cliente** e o **Secret do cliente**

---

## Passo 5: Configurar Variáveis de Ambiente

Adicione ao `.env.local`:

```env
GOOGLE_CALENDAR_CLIENT_ID=seu-client-id.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=GOCSPX-sua-secret
```

---

## Passo 6: Verificar

1. Reinicie o servidor de desenvolvimento: `npm run dev`
2. Acesse `/dashboard/calendar`
3. Clique em **Conectar com Google**
4. Autorize o acesso na tela do Google
5. Você será redirecionado de volta com a mensagem de sucesso

---

## Produção

Para uso em produção com qualquer conta Google (não apenas usuários de teste):

1. Vá na **Tela de consentimento OAuth**
2. Clique em **Publicar app**
3. Google pode solicitar verificação (pode levar alguns dias)
4. Enquanto aguarda, o app funciona para usuários de teste

---

## Troubleshooting

| Erro                    | Causa                          | Solução                                                                                              |
| ----------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `redirect_uri_mismatch` | URI de callback não cadastrado | Verifique o URI exato em Credenciais                                                                 |
| `access_denied`         | Usuário recusou ou não é teste | Adicione como usuário de teste                                                                       |
| `invalid_client`        | Client ID/Secret incorretos    | Verifique `.env.local`                                                                               |
| Sem refresh token       | Usuário já autorizou antes     | Revogue acesso em [myaccount.google.com](https://myaccount.google.com/permissions) e tente novamente |
