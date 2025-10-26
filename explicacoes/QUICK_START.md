# Quick Start Guide - WhatsApp Chatbot Dashboard

Guia rápido para colocar o dashboard no ar em 5 minutos.

## Pré-requisitos

- Node.js 18+ instalado
- Conta Supabase (gratuito)
- n8n rodando (opcional para comandos)

## Passos Rápidos

### 1. Instalar Dependências (2 min)

```bash
cd "C:\Users\Luisf\OneDrive\Github\Chatbot v2"
npm install
```

### 2. Configurar Supabase (2 min)

#### a) Executar Migration

1. Acesse: https://app.supabase.com/project/_/sql
2. Abra o arquivo `migration.sql` deste projeto
3. Copie todo o conteúdo
4. Cole no SQL Editor do Supabase
5. Clique em "Run"

#### b) Obter Credenciais

1. Acesse: https://app.supabase.com/project/_/settings/api
2. Copie:
   - **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → será `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secreto!)

### 3. Configurar .env.local (1 min)

O arquivo `.env.local` já existe. Abra e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Deixe as variáveis n8n vazias por enquanto** (opcional).

### 4. Rodar o Projeto (10 segundos)

```bash
npm run dev
```

Abra: http://localhost:3000

## Pronto! 🎉

O dashboard está rodando. Você verá:

- **Dashboard vazio:** Normal, sem dados ainda
- **Mensagem "Nenhuma conversa encontrada":** Esperado

## Próximos Passos

### Opção A: Criar Dados de Teste Manualmente

No Supabase SQL Editor:

```sql
-- 1. Criar um cliente de teste
INSERT INTO clients (id, name, verify_token, meta_access_token, phone_number_id)
VALUES (
  'demo-client-id',
  'Cliente Demo',
  'demo_token_123',
  'demo_meta_token',
  '899639703222013'
);

-- 2. Criar uma conversa de teste
INSERT INTO conversations (client_id, phone, name, status, last_message)
VALUES (
  'demo-client-id',
  '5511999999999',
  'João Silva',
  'bot',
  'Olá, preciso de ajuda com energia solar'
);

-- 3. Criar algumas mensagens de teste
INSERT INTO messages (client_id, phone, name, content, type, direction, status)
VALUES
  ('demo-client-id', '5511999999999', 'João Silva', 'Olá, preciso de ajuda', 'text', 'incoming', 'read'),
  ('demo-client-id', '5511999999999', NULL, 'Olá João! Como posso ajudar?', 'text', 'outgoing', 'delivered');
```

Recarregue o dashboard → conversas aparecerão!

### Opção B: Integrar com n8n Existente

1. Configure as variáveis n8n no `.env.local`:
   ```env
   N8N_WEBHOOK_BASE_URL=https://sua-instancia-n8n.com
   N8N_SEND_MESSAGE_WEBHOOK=/webhook/send-message
   N8N_TRANSFER_HUMAN_WEBHOOK=/webhook/transfer-human
   ```

2. Crie webhooks no n8n workflow (veja README.md)

3. O n8n já está populando `Clientes WhatsApp` e `n8n_chat_histories`?
   - Adapte queries para usar essas tabelas
   - Ou migre dados para novas tabelas

## Troubleshooting

### "Missing NEXT_PUBLIC_SUPABASE_URL"
- Confirme que `.env.local` existe
- Confirme que variáveis estão preenchidas SEM aspas
- Reinicie: `Ctrl+C` depois `npm run dev`

### "Error fetching conversations"
- Verifique se migration.sql foi executada
- Confirme que tabelas `conversations` e `messages` existem
- Teste query no Supabase SQL Editor:
  ```sql
  SELECT * FROM get_conversation_summary('demo-client-id', 50);
  ```

### Dashboard carrega mas vazio
- Normal se não há dados
- Insira dados de teste (Opção A acima)
- Ou aguarde mensagens reais do WhatsApp via n8n

### Realtime não funciona
- Habilite: Database → Replication → messages (toggle on)
- Aguarde 1-2 minutos para propagar
- Recarregue página

## Deploy para Produção (Vercel)

```bash
# 1. Login
npx vercel login

# 2. Deploy
npx vercel

# 3. Adicionar variáveis de ambiente no dashboard Vercel
# Settings → Environment Variables

# 4. Deploy produção
npx vercel --prod
```

## Comandos Úteis

```bash
# Rodar desenvolvimento
npm run dev

# Build de produção
npm run build

# Rodar build local
npm start

# Lint
npm run lint
```

## Estrutura de Pastas

```
src/
├── app/              # Páginas e API routes
├── components/       # Componentes React
├── hooks/            # Custom hooks
└── lib/              # Utilities

migration.sql         # Schema do banco
.env.local           # Variáveis (PREENCHER!)
README.md            # Documentação completa
```

## Suporte

- Leia: `README.md` (documentação completa)
- Leia: `CLAUDE.md` (arquitetura do projeto)
- Leia: `IMPLEMENTATION_SUMMARY.md` (detalhes técnicos)

---

**Pronto para usar!** 🚀

Qualquer dúvida, consulte os arquivos de documentação.
