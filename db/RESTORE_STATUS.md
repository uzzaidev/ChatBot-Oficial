# 📋 RESTORE MANUAL - Guia Rápido

## ✅ Estrutura Restaurada!

As tabelas foram criadas com sucesso. Agora precisamos inserir os dados.

## 📊 Dados Disponíveis no Backup (30/10/2025)

### Clientes (3 registros)
```
1. Client de Teste (test-client) - Plano Pro
2. UFRGS (ufrgs) - Plano Free  
3. Luis Fernando Boff (default-client) - Plano Pro
```

### Contatos WhatsApp (17 registros)
Vários contatos incluindo Isadora, Fernando, Nicole, Pedro Vitor, etc.

### ⚠️ Conversations e Messages
Estas tabelas estavam **VAZIAS** no backup de 30/10/2025.

## 🔧 Próximos Passos

### Opção 1: Dados Mínimos para Funcionar (RECOMENDADO)

Apenas recrie o cliente principal via Supabase:

1. Abra: https://app.supabase.com/project/jhodhxvvhohygijqcxbo/editor
2. Vá em tabela `clients`
3. Clique em "Insert row"
4. Preencha:
   - `id`: b21b314f-c49a-467d-94b3-a21ed4412227
   - `name`: Luis Fernando Boff
   - `slug`: default-client
   - `status`: active
   - `plan`: pro

### Opção 2: Importar Dados do Backup Manualmente

Os dados estão em `db/chatbot_data_20251030_175352.sql`. Você pode:

1. Abrir o arquivo
2. Encontrar as linhas COPY (exemplo):
```
COPY public.clients (...) FROM stdin;
b21b314f-c49a-467d-94b3-a21ed4412227	Luis Fernando Boff	default-client...
\.
```

3. Converter para INSERT manualmente
4. Executar no SQL Editor do Supabase

### Opção 3: Continuar Sem Dados Antigos

Se os dados do backup não são críticos:

1. Criar novo cliente via dashboard
2. Configurar webhooks do WhatsApp
3. Começar a usar normalmente

**As mensagens novas serão salvas automaticamente!**

## ✅ Verificar se Funcionou

```bash
npm run dev
```

Abra: http://localhost:3000/dashboard

- Se ver a interface → Estrutura OK! ✅
- Se ver "Nenhuma conversa" → Normal, precisa enviar mensagens
- Se der erro 500 → Problema com RLS ou credenciais

## 🆘 Se Ainda Tiver Problemas

Execute este SQL no Supabase para diagnóstico:

```sql
-- Ver tabelas
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Ver colunas de clients
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clients';

-- Inserir cliente teste
INSERT INTO clients (id, name, slug, status, plan)
VALUES (
  'b21b314f-c49a-467d-94b3-a21ed4412227',
  'Luis Fernando Boff',
  'default-client',
  'active',
  'pro'
);
```

## 📝 Resumo

✅ Estrutura restaurada (tabelas criadas)  
⚠️ Dados precisam ser inseridos manualmente  
💡 Recomendação: Criar cliente novo e começar do zero

**As mensagens antigas (se existirem) foram perdidas, mas o sistema está pronto para funcionar!**
