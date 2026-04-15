# Guia Completo — Configuração Meta Ads

**Para:** Qualquer pessoa, sem precisar ser técnico
**Tempo estimado:** 20–40 minutos
**Data:** 2026-03-30

---

## O que você vai conseguir fazer depois

Ao final deste guia, a plataforma vai conseguir:

- **Ver métricas de campanhas** — gasto, cliques, impressões, CPL por campanha
- **Receber leads de formulários** (Lead Ads) automaticamente no CRM
- **Enviar eventos de conversão** de volta para o Meta (CAPI) — melhora a performance dos anúncios
- **Sincronizar audiências** — criar públicos personalizados com sua base de contatos

---

## O que você precisa configurar

São 3 itens. O 4º (WABA ID) já está preenchido automaticamente.

| Item | O que é | Onde fica |
|------|---------|-----------|
| **Access Token** | Chave que autoriza o sistema a acessar sua conta Meta | Meta Business → System User |
| **Ad Account ID** | ID da sua conta de anúncios | Meta Business Settings |
| **Dataset ID (CAPI)** | ID do dataset para envio de conversões | Meta Events Manager |

---

## PARTE 1 — Access Token

> O sistema usa o mesmo token que já foi configurado para o WhatsApp.
> Se o token do WhatsApp já está funcionando, **você pode pular esta parte**
> e verificar apenas se ele tem as permissões adicionais abaixo.

### 1.1 — Verificar permissões do token existente

Se o WhatsApp já está funcionando, seu token está em:
`Dashboard → Configurações → Meta Access Token`

Este token precisa ter as seguintes permissões para o Meta Ads funcionar:

| Permissão | Para que serve |
|-----------|---------------|
| `whatsapp_business_messaging` | Já tem (WhatsApp) |
| `whatsapp_business_management` | Já tem (WhatsApp) |
| `ads_read` | Ler métricas de campanhas |
| `leads_retrieval` | Buscar leads dos formulários |
| `whatsapp_business_manage_events` | Enviar eventos CAPI |

**Como verificar:** Vá em [developers.facebook.com](https://developers.facebook.com) → seu App → Ferramentas → Debug do Token → cole o token → clique "Debug". Você verá as permissões listadas.

---

### 1.2 — Se precisar gerar um novo token com mais permissões

#### Passo 1 — Acesse o Meta Business Manager

Abra: **business.facebook.com**

Faça login com a conta que administra os anúncios.

---

#### Passo 2 — Vá em Configurações do Business

No menu lateral esquerdo, clique em **"Configurações"** (ícone de engrenagem no canto inferior esquerdo).

---

#### Passo 3 — Acesse Usuários do Sistema

No menu de Configurações, no lado esquerdo:
- Clique em **"Usuários"**
- Clique em **"Usuários do Sistema"**

---

#### Passo 4 — Crie ou use um Usuário do Sistema existente

Se já existe um usuário do sistema (provavelmente criado para o WhatsApp):
- Clique nele
- Clique em **"Gerar novo token"**

Se não existe:
- Clique em **"Adicionar"**
- Nome: `UzzApp Bot` (ou qualquer nome)
- Função: **Admin**
- Clique em **"Criar usuário do sistema"**

> ⚠️ **Por que Usuário do Sistema e não seu usuário pessoal?**
> Token de usuário pessoal expira ou fica inválido se você sair da empresa
> ou trocar a senha. Token de Usuário do Sistema é permanente.

---

#### Passo 5 — Gerar o token

Na tela do Usuário do Sistema:
1. Clique em **"Gerar novo token"**
2. Selecione seu **App** (o mesmo criado para o WhatsApp)
3. Em **"Permissões disponíveis"**, marque:
   - `ads_read`
   - `leads_retrieval`
   - `whatsapp_business_manage_events`
   - `whatsapp_business_messaging` (se não tiver)
   - `whatsapp_business_management` (se não tiver)
4. Clique em **"Gerar token"**
5. **Copie o token** — ele só aparece uma vez!

---

#### Passo 6 — Dar acesso ao Usuário do Sistema na conta de anúncios

Para o token conseguir ler campanhas, o Usuário do Sistema precisa ter acesso à sua conta de anúncios:

1. Ainda em **Configurações do Business**
2. Clique em **"Contas de Anúncios"** (menu esquerdo)
3. Clique na sua conta de anúncios
4. Clique em **"Adicionar pessoas"**
5. Selecione o Usuário do Sistema que você criou
6. Função: **Analista** (suficiente para leitura) ou **Anunciante**
7. Confirme

---

#### Passo 7 — Salvar o token na plataforma

1. Abra o dashboard: `/dashboard/settings`
2. Encontre o campo **"Meta Access Token"**
3. Cole o token copiado
4. Clique em **Salvar**

---

## PARTE 2 — Ad Account ID

O Ad Account ID identifica qual conta de anúncios o sistema vai monitorar.

### Como encontrar

**Opção A — Pelo Business Manager:**

1. Acesse: **business.facebook.com/settings**
2. Clique em **"Contas de Anúncios"** no menu esquerdo
3. Clique na sua conta de anúncios
4. No canto superior direito, você verá algo como:
   ```
   ID da Conta: 123456789
   ```
5. O Ad Account ID é esse número, mas com o prefixo `act_`:
   ```
   act_123456789
   ```

**Opção B — Pelo Gerenciador de Anúncios:**

1. Acesse: **adsmanager.facebook.com**
2. Olhe a URL do navegador — ela terá algo assim:
   ```
   adsmanager.facebook.com/adsmanager/manage?act=123456789
   ```
3. O número após `act=` é seu ID. Adicione o prefixo `act_`:
   ```
   act_123456789
   ```

### Como salvar na plataforma

1. Acesse `/dashboard/meta-ads` → aba **Config**
2. No campo **"Ad Account ID"**, cole o valor com o prefixo `act_`:
   ```
   act_123456789
   ```
3. Clique em **Salvar**

> ⚠️ **Atenção ao formato:** O sistema aceita com ou sem o prefixo `act_`,
> mas recomendamos sempre incluir para evitar confusão.

---

## PARTE 3 — Dataset ID (CAPI)

O Dataset ID é necessário para enviar **eventos de conversão** de volta ao Meta.
Isso ajuda o algoritmo do Meta a entender quem converteu e otimizar melhor
seus anúncios.

> **Exemplo prático:** Quando alguém manda mensagem pelo WhatsApp e vira cliente,
> o sistema avisa o Meta "esta pessoa que clicou no anúncio X converteu".
> O Meta usa isso para encontrar mais pessoas parecidas.

### Passo 1 — Acesse o Events Manager

Abra: **business.facebook.com/events_manager**

Ou pelo menu do Business Manager: **"Todas as ferramentas" → "Events Manager"**

---

### Passo 2 — Conectar uma fonte de dados

1. Clique em **"Conectar fontes de dados"** (botão verde ou azul)
2. Selecione **"Web"** (mesmo sendo WhatsApp, o CAPI usa esse tipo)

   > Se aparecer outras opções como "App" ou "Offline", selecione **"Web"**

3. Clique em **"Conectar"**

---

### Passo 3 — Configurar o dataset

1. Em **"Método de conexão"**, selecione **"API de Conversões"**
2. Clique em **"Avançar"**
3. Nome do dataset: `UzzApp WhatsApp` (ou o nome que preferir)
4. Clique em **"Criar"**

---

### Passo 4 — Copiar o Dataset ID

Após criar:
1. Você será redirecionado para a tela do dataset
2. No topo ou nas informações da página, você verá o **ID do Dataset**:
   ```
   Exemplo: 1234567890123456
   ```
3. Copie esse número

**Outra forma de encontrar:**
- Events Manager → clique no dataset criado
- Olhe a URL: `events_manager/dataset/XXXXXXXXXXXXXXXX`
- O número no final é o Dataset ID

---

### Passo 5 — Salvar na plataforma

1. Acesse `/dashboard/meta-ads` → aba **Config**
2. No campo **"Dataset ID (CAPI)"**, cole o ID copiado
3. Clique em **Salvar**

---

## PARTE 4 — Configurar Lead Ads (formulários)

> Esta parte é necessária apenas se você usa **formulários de Lead Ads**
> (anúncios com formulário dentro do próprio Facebook/Instagram, sem sair da plataforma).

### O que acontece

Quando alguém preenche um formulário do seu anúncio, o Meta envia um webhook
para o sistema. O sistema então:
1. Recebe os dados do lead (nome, telefone, e-mail)
2. Cria um contato em `clientes_whatsapp`
3. Cria um card no CRM automaticamente (se configurado)
4. Registra a origem como "Meta Ads"

### Como configurar o webhook de Lead Ads

1. Acesse: **developers.facebook.com** → seu App
2. No menu lateral, clique em **"WhatsApp" → "Configuração"**
3. Role até **"Webhooks"**
4. Clique em **"Gerenciar"** ao lado de Webhooks
5. Assine o evento: **`leadgen`**
   - Este evento dispara quando alguém preenche um formulário de Lead Ad

> ✅ O mesmo webhook já configurado para o WhatsApp (`/api/webhook/[clientId]`)
> também processa os eventos de `leadgen`. Não é necessário um webhook separado.

### Conectar o formulário à página

1. No Gerenciador de Anúncios, ao criar o anúncio com formulário
2. O formulário precisa estar conectado à **Página do Facebook** que está
   vinculada ao WABA (WhatsApp Business Account)
3. Isso garante que o webhook chegue no sistema correto

---

## PARTE 5 — Verificar se tudo está funcionando

### Verificação rápida

1. Acesse `/dashboard/meta-ads` → aba **Config**
2. Os 4 itens devem aparecer com **ícone verde** ✅:
   - Access Token ✅
   - Ad Account ID ✅
   - Dataset ID (CAPI) ✅
   - WABA ID ✅

### Verificar métricas de campanhas

1. Acesse `/dashboard/meta-ads` → aba **Visão Geral**
2. Se os dados carregarem, a integração está funcionando
3. Se aparecer erro "Sem permissão", revise as permissões do token (Parte 1)

### Verificar Lead Ads

1. Acesse `/dashboard/meta-ads` → aba **Lead Ads**
2. Seus formulários ativos devem aparecer listados
3. Se não aparecerem, verifique se o token tem a permissão `leads_retrieval`

### Verificar eventos CAPI

1. Acesse `/dashboard/meta-ads` → aba **Eventos CAPI**
2. Após o sistema começar a operar, eventos enviados aparecerão aqui
3. Também é possível verificar no Meta Events Manager → seu dataset → aba "Eventos"

---

## Problemas Comuns

### "Access Token inválido" ou "Token expirado"

**Causa:** Token de usuário pessoal (expira) ou permissões faltando.

**Solução:** Gerar novo token via Usuário do Sistema (Parte 1, passo 4–5).

---

### "Ad Account não encontrado" ou "Sem permissão"

**Causa:** O Usuário do Sistema não tem acesso à conta de anúncios.

**Solução:** Business Manager → Contas de Anúncios → adicionar o Usuário do Sistema (Parte 1, passo 6).

---

### Campanhas não aparecem

**Causa mais comum:** Ad Account ID com formato errado (sem o prefixo `act_`).

**Solução:** Confirmar que o ID está no formato `act_123456789`.

---

### Leads não chegam no CRM

**Causa:** Webhook `leadgen` não assinado no app, ou formulário não conectado à página correta.

**Solução:** Verificar assinatura do evento `leadgen` em developers.facebook.com.

---

### Dataset ID não aceito

**Causa:** Número copiado com espaços ou do lugar errado.

**Solução:** Copiar direto da URL do Events Manager ou do painel do dataset.

---

## Resumo dos Acessos Necessários

Para completar este guia você precisou ter acesso a:

| Plataforma | URL | O que fez lá |
|-----------|-----|-------------|
| Meta Business Manager | business.facebook.com | Criar Usuário do Sistema, gerar token |
| Meta Events Manager | business.facebook.com/events_manager | Criar dataset CAPI |
| Meta for Developers | developers.facebook.com | Verificar app e webhook |
| Gerenciador de Anúncios | adsmanager.facebook.com | Encontrar Ad Account ID |
| Dashboard UzzApp | /dashboard/meta-ads | Salvar as configurações |

---

## O que fazer depois de configurar

Com tudo configurado, recomenda-se:

1. **Criar regra de automação CRM:**
   Origem do Lead = Meta Ads → Adicionar tag "Anúncio" + Mover para coluna "Leads"

2. **Ativar o toggle "Auto-Tag Anúncios":**
   Em `/dashboard/crm` → Regras de Automação → Configurações Gerais

3. **Configurar alerta de orçamento:**
   Em `/dashboard/meta-ads` → aba **Alertas** → definir limite de gasto diário

4. **Testar com um lead real:**
   Criar um anúncio de teste com formulário → preencher com seu próprio número →
   verificar se o lead aparece em `/dashboard/crm`

---

*Guia criado em 2026-03-30*
*Sistema: UzzApp WhatsApp SaaS*
