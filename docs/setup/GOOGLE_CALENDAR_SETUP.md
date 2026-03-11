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

## Produção — Verificação do App Google

Para uso em produção com qualquer conta Google (não apenas usuários de teste), é necessário passar pela **verificação do Google**.

### 1. Publicar o App

1. Vá em **APIs e Serviços** → **Tela de consentimento OAuth**
2. Clique em **Publicar app**
3. O Google solicitará verificação por usar escopo **confidencial**

### 2. Escopo Confidencial: `auth/calendar`

O escopo `https://www.googleapis.com/auth/calendar` é classificado como **confidencial** pelo Google. Isso significa que o Google exige:

- **Justificativa por escrito** de como o escopo será usado
- **Vídeo de demonstração** no YouTube mostrando o uso do escopo

### 3. Justificativa — "Como os escopos serão usados?"

Cole o texto abaixo no campo de justificativa na tela de consentimento OAuth:

> **Justificativa (copiar e colar):**
>
> O UzzApp é uma plataforma SaaS B2B de atendimento automatizado via WhatsApp Business API. Nossos clientes (empresas) conectam suas contas Google Calendar para que o agente de IA integrado possa:
>
> 1. **Consultar eventos futuros** — quando um contato pergunta pelo WhatsApp sobre disponibilidade de horários ou compromissos agendados, o agente IA consulta o Google Calendar do cliente (empresa) para fornecer uma resposta precisa e em tempo real.
>
> 2. **Criar novos eventos** — quando um contato solicita agendar uma reunião, consulta ou atendimento via WhatsApp, o agente IA cria o evento diretamente no Google Calendar do cliente (empresa), com título, data/hora, descrição e participantes.
>
> O acesso é feito exclusivamente via OAuth 2.0 com consentimento explícito do proprietário da conta Google. Cada empresa conecta seu próprio calendário uma única vez no painel de administração. Os tokens de acesso são armazenados de forma criptografada (AES-256) no Supabase Vault. O usuário final (contato no WhatsApp) nunca tem acesso direto ao calendário — todas as operações são intermediadas pelo agente IA e limitadas a leitura de eventos e criação de novos eventos. O proprietário da conta pode revogar o acesso a qualquer momento pelo painel do UzzApp ou diretamente em myaccount.google.com.

### 4. Vídeo de Demonstração (YouTube)

O Google exige um vídeo no YouTube mostrando como o escopo é usado. O vídeo deve demonstrar o fluxo completo do ponto de vista do usuário.

#### Roteiro do Vídeo (3-5 minutos)

**Cena 1 — Introdução (30s)**

- Mostrar a tela inicial do UzzApp (`uzzapp.uzzai.com.br`)
- Explicar brevemente: "O UzzApp é uma plataforma de atendimento via WhatsApp com IA. Vamos demonstrar a integração com Google Calendar."

**Cena 2 — Conexão OAuth (1 min)**

- Fazer login no dashboard
- Navegar até **Calendário** (`/dashboard/calendar`)
- Clicar em **"Conectar com Google"**
- Mostrar a tela de consentimento do Google (escopos sendo solicitados)
- Autorizar o acesso
- Mostrar a mensagem de sucesso e o email conectado no dashboard

**Cena 3 — Consulta de Agenda via WhatsApp (1 min)**

- Abrir o WhatsApp e enviar uma mensagem para o número do bot: _"Quais meus compromissos de amanhã?"_
- Mostrar a resposta do agente IA com os eventos do Google Calendar
- Destacar que os dados vêm do calendário real conectado

**Cena 4 — Criação de Evento via WhatsApp (1 min)**

- Enviar: _"Marca uma reunião sexta às 14h com o título Alinhamento de Projeto"_
- Mostrar a confirmação do agente IA
- Abrir o Google Calendar e mostrar o evento criado

**Cena 5 — Desconexão e Segurança (30s)**

- Voltar ao dashboard → Calendário
- Clicar em **"Desconectar"**
- Mostrar que o status muda para desconectado
- Mencionar: "O usuário pode revogar o acesso a qualquer momento pelo painel ou em myaccount.google.com"

#### Dicas para o Vídeo

- Grave com OBS Studio ou Loom (screencast com narração)
- Resolução mínima: 720p
- Faça upload como **Não listado** no YouTube (não precisa ser público)
- Cole o link do YouTube no campo **"Vídeo de demonstração"** na tela de consentimento OAuth

### 5. Após Envio

- Google revisa em **3 a 5 dias úteis**
- Pode pedir ajustes (responda pelo email indicado)
- Após aprovação, qualquer conta Google poderá autorizar o app
- Enquanto aguarda, o app funciona normalmente para **usuários de teste**

---

## Troubleshooting

| Erro                    | Causa                          | Solução                                                                                              |
| ----------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `redirect_uri_mismatch` | URI de callback não cadastrado | Verifique o URI exato em Credenciais                                                                 |
| `access_denied`         | Usuário recusou ou não é teste | Adicione como usuário de teste                                                                       |
| `invalid_client`        | Client ID/Secret incorretos    | Verifique `.env.local`                                                                               |
| Sem refresh token       | Usuário já autorizou antes     | Revogue acesso em [myaccount.google.com](https://myaccount.google.com/permissions) e tente novamente |
