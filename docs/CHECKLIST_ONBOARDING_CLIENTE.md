# Checklist de Onboarding de Novo Cliente

**Sistema:** UzzApp WhatsApp SaaS
**Versão:** 1.0 — 2026-03-30
**Uso:** Siga esta lista em ordem. Marque cada item antes de avançar para a próxima etapa.

---

## Visão Geral das Etapas

```
FASE 1 — Coleta de Informações
FASE 2 — Configuração Meta (WhatsApp Business API)
FASE 3 — Criação do Cliente na Plataforma
FASE 4 — Credenciais & Vault
FASE 5 — Prompt & Configuração do Bot
FASE 6 — Base de Conhecimento (RAG)
FASE 7 — Importação de Contatos
FASE 8 — Verificação do Webhook
FASE 9 — Testes & Validação
FASE 10 — Go-Live
```

---

## FASE 1 — Coleta de Informações do Cliente

> Preencher antes de qualquer configuração técnica.

### 1.1 Dados Gerais

- [ ] Nome da empresa / razão social
- [ ] Responsável técnico (nome + e-mail + WhatsApp)
- [ ] E-mail para receber notificações de handoff humano
- [ ] Horário de atendimento (para configurar no prompt)
- [ ] Segmento / nicho de atuação
- [ ] Idioma principal do atendimento (padrão: pt-BR)

### 1.2 Conta Meta Business

- [ ] Acesso ao **Meta Business Manager** do cliente (`business.facebook.com`)
- [ ] ID do **WhatsApp Business Account (WABA)**
- [ ] Número de telefone WhatsApp já registrado (ou a ser registrado)
- [ ] **META_ACCESS_TOKEN** (token permanente EAA... — não o temporário)
- [ ] **META_PHONE_NUMBER_ID** (ID do número na API)
- [ ] **META_APP_SECRET** (para validação HMAC do webhook)
- [ ] **META_VERIFY_TOKEN** (string customizada que o cliente escolhe — ex: `minha-empresa-2026`)

### 1.3 Chaves de IA

- [ ] **OpenAI API Key** (`sk-...`) — necessário para embeddings RAG + Whisper + GPT-4o Vision
- [ ] **Groq API Key** (`gsk_...`) — modelo principal do chatbot (Llama 3.3 70B)
- [ ] Confirmação do provedor preferido (padrão: Groq principal + OpenAI fallback)

### 1.4 Integrações Opcionais

- [ ] Google Calendar → precisa do OAuth (Client ID + Secret)
- [ ] Microsoft Calendar → precisa do Azure App (Client ID + Secret)
- [ ] ElevenLabs (TTS personalizado) → API key + Voice ID
- [ ] Firebase (push mobile) → Service Account JSON

---

## FASE 2 — Configuração Meta (WhatsApp Business API)

### 2.1 Registro do Número

- [ ] Número adquirido (chip local ou VoIP — VoIP requer aprovação Meta)
- [ ] Conta WhatsApp pessoal removida do número (obrigatório antes do registro via API)
- [ ] Número registrado no WABA via Meta Business Manager
- [ ] Verificação de telefone concluída (SMS ou chamada)
- [ ] Status do número = **Connected** no painel Meta

### 2.2 Configuração do App Meta

- [ ] App criado em `developers.facebook.com` (tipo: Business)
- [ ] Produto **WhatsApp** adicionado ao app
- [ ] Permissões concedidas: `whatsapp_business_messaging`, `whatsapp_business_management`
- [ ] Token permanente gerado via **System User** (não token de desenvolvedor — expira!)
- [ ] `META_APP_SECRET` copiado de: App → Configurações → Básico

### 2.3 Display do Número

- [ ] Nome de exibição (Display Name) aprovado pela Meta
- [ ] Foto de perfil do WhatsApp Business configurada
- [ ] Descrição / categoria configurada no perfil
- [ ] Status do WABA = **Active** (não "Restricted")

### 2.4 Templates de Mensagem (se aplicável)

- [ ] Templates de mensagem criados e aprovados pela Meta (para campanhas outbound)
- [ ] Templates sincronizados via `/dashboard/templates` → "Sync com Meta"

---

## FASE 3 — Criação do Cliente na Plataforma

### 3.1 Criar Registro do Cliente

- [ ] Acessar `/dashboard/admin/clients` (requer role `admin`)
- [ ] Criar novo cliente com:
  - [ ] Nome da empresa
  - [ ] Slug único (ex: `academia-fit` — usado na URL da loja)
  - [ ] E-mail do admin principal
  - [ ] Plano / orçamento mensal de IA (BRL)

### 3.2 Convidar Usuário Admin do Cliente

- [ ] Acessar `/dashboard/admin` → Convidar usuário
- [ ] Enviar convite para o e-mail do responsável do cliente
- [ ] Confirmar que o usuário aceitou o convite (`/accept-invite`)
- [ ] Confirmar que o `user_profiles.client_id` está correto no banco

### 3.3 Configurar Orçamento de IA

- [ ] Acessar `/dashboard/admin/budget-plans`
- [ ] Definir limite mensal de tokens/BRL para o cliente
- [ ] Confirmar criação do registro em `client_budgets`

---

## FASE 4 — Credenciais & Vault

> Todas as credenciais são armazenadas criptografadas no Supabase Vault. NUNCA em texto plano no banco.

### 4.1 Configurar Chaves via Dashboard

- [ ] Acessar `/dashboard/settings` logado como admin do cliente
- [ ] Inserir **META_ACCESS_TOKEN** (campo: Meta Access Token)
- [ ] Inserir **META_PHONE_NUMBER_ID** (campo: Phone Number ID)
- [ ] Inserir **META_VERIFY_TOKEN** (campo: Verify Token — string customizada)
- [ ] Inserir **GROQ_API_KEY** (campo: Groq API Key)
- [ ] Inserir **OPENAI_API_KEY** (campo: OpenAI API Key)
- [ ] Salvar → confirmar toast "Configurações salvas!"

### 4.2 Verificar Vault

- [ ] Acessar `/api/vault/debug` → confirmar que os `secret_id`s estão preenchidos nos campos:
  - `meta_access_token_secret_id`
  - `openai_api_key_secret_id`
  - `groq_api_key_secret_id`
- [ ] Testar credenciais: `/api/test/vault-config` → status 200 com keys válidas
- [ ] Verificar WABA ID: `/dashboard/settings` → campo "WABA ID" preenchido

### 4.3 Configurar Meta Config

- [ ] Acessar `/api/client/meta-config` (PUT) ou via Settings UI
- [ ] Confirmar que `phone_number_id` e `waba_id` estão salvos corretamente

---

## FASE 5 — Prompt & Configuração do Bot

### 5.1 System Prompt

- [ ] Acessar `/dashboard/settings` → aba "Prompt / IA"
- [ ] Escrever o **system prompt** com:
  - [ ] Persona / nome do assistente (ex: "Você é a Sofia, assistente da Academia Fit")
  - [ ] Tom de voz (formal, descontraído, etc.)
  - [ ] O que o bot PODE e NÃO PODE responder
  - [ ] Informações fixas (endereço, horários, preços principais)
  - [ ] Instrução de handoff: quando transferir para humano
  - [ ] Instrução sobre mensagem de boas-vindas para novos contatos
- [ ] Salvar e confirmar

### 5.2 Configurações do Modelo

- [ ] Provedor primário definido (padrão: `groq`)
- [ ] Modelo definido (padrão: `llama-3.3-70b-versatile`)
- [ ] Temperature configurada (padrão: 1.0 — aumentar para mais criatividade)
- [ ] Max tokens configurado (padrão: 1000)

### 5.3 Configurações de Comportamento

- [ ] **Batch window** definido (padrão: 10.000ms = 10s — tempo para agrupar mensagens rápidas)
- [ ] **Message delay** definido (padrão: 2.000ms — delay entre mensagens do bot)
- [ ] **Histórico de chat** definido (padrão: 15 mensagens)
- [ ] **Split de mensagens** ativado/desativado (padrão: ativo — quebra em `\n\n`)

### 5.4 Configuração dos Nodes (Flow Architecture)

- [ ] Acessar `/dashboard/flow-architecture`
- [ ] Revisar cada node e habilitar/desabilitar conforme necessidade:
  - [ ] **process_media** — transcrição de áudio e análise de imagem (requer OpenAI key)
  - [ ] **rag_context** — busca na base de conhecimento (habilitar se tiver RAG)
  - [ ] **fast_track_router** — cache de FAQs (recomendado manter ativo)
  - [ ] **detect_repetition** — evita respostas repetidas (recomendado)
  - [ ] **check_continuity** — saudação após 24h sem mensagens
  - [ ] **classify_intent** — classificação de intenção
  - [ ] **tts_response** — respostas em áudio (requer config de TTS)

### 5.5 Agente (Opcional)

- [ ] Se o cliente tiver múltiplas personas / agentes:
  - [ ] Acessar `/dashboard/agents`
  - [ ] Criar agente com prompt compilado
  - [ ] Ativar agente via "Activate" → confirma que `active_agent_id` está setado

---

## FASE 6 — Base de Conhecimento (RAG)

> Necessário apenas se o bot precisar responder perguntas baseadas em documentos internos.

### 6.1 Preparação dos Documentos

- [ ] Coletar documentos do cliente: FAQs, catálogo, manuais, políticas
- [ ] Formatos aceitos: **PDF** e **TXT** (máx 10MB por arquivo)
- [ ] Remover informações sensíveis/confidenciais que o bot NÃO deve revelar
- [ ] Estruturar o conteúdo em linguagem clara (evitar jargão interno)

### 6.2 Upload dos Documentos

- [ ] Acessar `/dashboard/knowledge`
- [ ] Para cada documento:
  - [ ] Fazer upload do arquivo
  - [ ] Confirmar número de chunks gerados (ex: "25 chunks criados")
  - [ ] Aguardar processamento completo (10-60s por arquivo)
- [ ] Verificar embeddings: `/api/debug/embeddings` → confirmar que há vetores

### 6.3 Teste da Busca RAG

- [ ] Acessar `/api/debug/documents` → confirmar documentos listados com `client_id` correto
- [ ] Fazer pergunta de teste via `/api/test/nodes/rag-context`
- [ ] Confirmar que chunks relevantes são retornados (similarity > 0.8)

---

## FASE 7 — Importação de Contatos

> Opcional na ativação inicial. Obrigatório se o cliente quiser enviar templates para base existente.

### 7.1 Preparação da Planilha

- [ ] Baixar template de importação: `/api/contacts/template` (GET)
- [ ] Preencher planilha com colunas obrigatórias:
  - `telefone` — formato internacional sem + (ex: `5554999887766`)
  - `nome` — nome do contato
- [ ] Colunas opcionais: `status`, `tags`, `notas`
- [ ] Validar que `telefone` é numérico (sem espaços, traços ou parênteses)

### 7.2 Importação

- [ ] Acessar `/dashboard/contacts` → "Importar"
- [ ] Upload da planilha CSV/XLSX
- [ ] Confirmar preview dos dados antes de confirmar
- [ ] Aguardar importação → confirmar total de contatos criados
- [ ] Verificar via `/api/contacts` que contatos têm `client_id` correto

### 7.3 Segmentação Inicial (Opcional)

- [ ] Definir status inicial dos contatos importados (padrão: `bot`)
- [ ] Aplicar tags via `/dashboard/contacts` se necessário

---

## FASE 8 — Verificação do Webhook Meta

### 8.1 URL do Webhook

- [ ] URL de produção do sistema confirmada (ex: `https://chat.luisfboff.com`)
- [ ] URL do webhook no formato correto: `https://<dominio>/api/webhook/<clientId>`
  - `clientId` = UUID do cliente no banco (tabela `clients`)
  - Localizar em: `/dashboard/settings` → campo "Client ID" ou via admin

### 8.2 Registrar Webhook no Meta

- [ ] Acessar: `developers.facebook.com` → App → WhatsApp → Configuração
- [ ] Campo **URL de Callback:** `https://<dominio>/api/webhook/<clientId>`
- [ ] Campo **Token de Verificação:** mesmo valor de `META_VERIFY_TOKEN` configurado no Vault
- [ ] Clicar em **Verificar e Salvar**
- [ ] Confirmar status = **Verified** ✅

### 8.3 Assinar Eventos

- [ ] Na seção **Campos de Webhook**, assinar:
  - [ ] `messages` — mensagens recebidas (OBRIGATÓRIO)
  - [ ] `message_deliveries` — confirmações de entrega (opcional)
  - [ ] `message_reads` — confirmações de leitura (opcional)

### 8.4 Validar Webhook

- [ ] Verificar logs de verificação: `/dashboard/backend` ou `/api/debug/logs`
- [ ] Confirmar que o challenge foi respondido corretamente (200 OK)
- [ ] Confirmar que `META_VERIFY_TOKEN` bate com o que foi inserido no Meta

---

## FASE 9 — Testes & Validação

### 9.1 Teste de Mensagem Básica

- [ ] Enviar "Olá" para o número WhatsApp do cliente
- [ ] Confirmar resposta do bot em < 10 segundos
- [ ] Verificar resposta condizente com o system prompt
- [ ] Verificar que contato foi criado em `clientes_whatsapp`

### 9.2 Teste de Mídia (se process_media ativado)

- [ ] Enviar mensagem de **áudio** → confirmar transcrição + resposta
- [ ] Enviar **imagem** → confirmar descrição via GPT-4o Vision + resposta
- [ ] Enviar **documento PDF** → confirmar análise + resposta
- [ ] Em caso de erro: verificar `/dashboard/backend` para detalhes

### 9.3 Teste de Handoff Humano

- [ ] Enviar: "Quero falar com um atendente"
- [ ] Confirmar resposta de transferência do bot
- [ ] Confirmar e-mail de notificação recebido no endereço configurado
- [ ] Verificar status do contato = `humano` em `/dashboard/contacts`
- [ ] Enviar outra mensagem → confirmar que o bot NÃO responde
- [ ] Reativar o bot: alterar status para `bot` via dashboard
- [ ] Confirmar que o bot volta a responder

### 9.4 Teste de RAG (se base de conhecimento configurada)

- [ ] Fazer pergunta sobre conteúdo do documento carregado
- [ ] Confirmar resposta correta baseada no documento
- [ ] Verificar via `/api/debug/embeddings` que busca retornou chunks

### 9.5 Teste de Duplicação de Mensagens

- [ ] Enviar 3 mensagens rápidas em sequência (< 5 segundos)
- [ ] Confirmar que o bot responde UMA VEZ para as 3 mensagens combinadas
- [ ] (Comportamento esperado do batch window de 10s)

### 9.6 Verificação de Logs e Monitoramento

- [ ] Acessar `/dashboard/backend` → verificar execuções sem erros
- [ ] Acessar `/dashboard/analytics` → confirmar registro de uso de tokens
- [ ] Verificar `/api/budget/status` → confirmar orçamento não excedido
- [ ] Acessar `/api/debug/config` → confirmar config carregada corretamente

---

## FASE 10 — Go-Live

### 10.1 Checklist Final Técnico

- [ ] Todos os testes da Fase 9 passaram ✅
- [ ] System prompt revisado e aprovado pelo cliente
- [ ] Base de conhecimento completa e testada
- [ ] Webhook verificado e assinando eventos `messages`
- [ ] Orçamento de IA definido com margem adequada
- [ ] E-mail de handoff configurado e testado
- [ ] Contatos importados (se aplicável)

### 10.2 Checklist de Segurança

- [ ] `META_VERIFY_TOKEN` é único (não compartilhado com outros clientes)
- [ ] Credenciais armazenadas SOMENTE no Vault (não em campos de texto simples)
- [ ] RLS policies ativas → cliente consegue ver APENAS seus próprios dados
- [ ] Token Meta é de **System User permanente** (não expira)

### 10.3 Entrega ao Cliente

- [ ] Número de WhatsApp está funcionando e respondendo
- [ ] Dashboard de acesso entregue (URL + credenciais de login)
- [ ] Orientar o cliente sobre:
  - [ ] Como alterar o prompt: `/dashboard/settings`
  - [ ] Como ver conversas: `/dashboard/conversations`
  - [ ] Como gerenciar contatos: `/dashboard/contacts`
  - [ ] Como fazer handoff manual: botão "Transferir" na conversa
  - [ ] Como reativar bot após handoff: alterar status para "bot"
  - [ ] Como subir novos documentos: `/dashboard/knowledge`
  - [ ] Como ver analytics: `/dashboard/analytics`

### 10.4 Monitoramento Pós-Ativação

- [ ] Monitorar primeiras 24h de operação
- [ ] Verificar `/dashboard/analytics` — tokens e custos dentro do esperado
- [ ] Verificar `/dashboard/backend` — sem erros críticos
- [ ] Coletar feedback do cliente sobre qualidade das respostas
- [ ] Ajustar prompt conforme necessário

---

## Referência Rápida — Problemas Comuns

| Sintoma | Causa Provável | Onde Investigar |
|---------|---------------|-----------------|
| Bot não responde | Webhook não verificado | `/dashboard/backend` → logs |
| "Invalid token" no webhook | `META_VERIFY_TOKEN` divergente | Comparar Vault vs Meta Dashboard |
| Resposta genérica / sem contexto | Prompt muito vago | `/dashboard/settings` → rever prompt |
| Áudio sem transcrição | OpenAI key inválida ou node desabilitado | `/api/vault/debug` + `/dashboard/flow-architecture` |
| RAG não encontra resposta | Embeddings não gerados | `/api/debug/embeddings` |
| Bot responde em handoff | Status não atualizado | `/dashboard/contacts` → checar status |
| Duplicate respostas | Batch window muito curto | `/dashboard/settings` → aumentar batch |
| Budget excedido | Limite de IA atingido | `/api/budget/status` + `/dashboard/admin/budget-plans` |
| Contatos não importados | Formato inválido do CSV | Baixar template: `/api/contacts/template` |

---

## IDs e URLs Importantes

| Item | Como obter |
|------|-----------|
| `clientId` (UUID) | `/dashboard/settings` → seção "Informações Técnicas" |
| `META_PHONE_NUMBER_ID` | Meta → App → WhatsApp → API Setup |
| `META_APP_SECRET` | Meta → App → Configurações → Básico |
| URL do Webhook | `https://<dominio>/api/webhook/<clientId>` |
| Logs de execução | `/dashboard/backend` |
| Debug de config | `/api/debug/config` |
| Status do budget | `/api/budget/status` |

---

*Documento gerado em 2026-03-30 — ChatBot-Oficial (UzzApp WhatsApp SaaS)*
