# Matriz de Permissões - Phase 4 Admin Dashboard

> **Status**: ✅ Migration aplicada | ⚙️ Em desenvolvimento
> 
> **Última atualização**: 2025-10-30

## Hierarquia de Roles

```
admin (Super Admin)
  └─ client_admin (Client Administrator)
      └─ user (Regular User)
```

## 📋 Matriz de Permissões Completa

### 1. Gerenciamento de Usuários (User Management)

| Funcionalidade | `admin` | `client_admin` | `user` | Notas |
|----------------|---------|----------------|--------|-------|
| Ver próprio perfil | ✅ | ✅ | ✅ | Todos podem ver seus dados |
| Editar próprio perfil | ✅ | ✅ | ✅ | Nome, telefone, email (limitado) |
| Ver lista de usuários do client | ✅ | ✅ | ❌ | Apenas mesmo client_id |
| Ver detalhes de outro usuário | ✅ | ✅ | ❌ | Apenas mesmo client_id |
| Criar novo usuário | ✅ | ✅ | ❌ | Apenas roles: user, client_admin |
| Editar role de usuário | ✅ | ✅* | ❌ | *Não pode promover para admin |
| Editar permissions de usuário | ✅ | ✅ | ❌ | JSONB customizado |
| Desativar usuário | ✅ | ✅* | ❌ | *Não pode desativar a si mesmo |
| Reativar usuário | ✅ | ✅ | ❌ | Mudar is_active para true |
| Deletar usuário (hard delete) | ✅ | ❌ | ❌ | Apenas super admin |
| Promover para admin | ✅ | ❌ | ❌ | Apenas super admin |
| Ver usuários de outros clients | ✅ | ❌ | ❌ | Apenas super admin |

### 2. Sistema de Convites (Invites)

| Funcionalidade | `admin` | `client_admin` | `user` | Notas |
|----------------|---------|----------------|--------|-------|
| Ver lista de convites | ✅ | ✅ | ❌ | Apenas mesmo client_id |
| Criar convite | ✅ | ✅ | ❌ | Com email + role |
| Ver status de convite | ✅ | ✅ | ❌ | pending/accepted/expired/revoked |
| Revogar convite | ✅ | ✅ | ❌ | Mudar status para 'revoked' |
| Reenviar convite | ✅ | ✅ | ❌ | Gerar novo token |
| Deletar convite | ✅ | ✅ | ❌ | Remover permanentemente |
| Ver próprio convite (anônimo) | ✅ | ✅ | ✅ | Por email, antes de aceitar |
| Aceitar convite | ✅ | ✅ | ✅ | Cria user_profile automaticamente |

### 3. Configurações do Client (Client Settings)

| Funcionalidade | `admin` | `client_admin` | `user` | Notas |
|----------------|---------|----------------|--------|-------|
| Ver configurações do client | ✅ | ✅ | ✅ | Todos veem as configs gerais |
| Editar System Prompt | ✅ | ✅ | ❌ | Prompt da IA |
| Editar Formatter Prompt | ✅ | ✅ | ❌ | Formatação de respostas |
| Editar API Keys (Vault) | ✅ | ✅ | ❌ | OpenAI, Groq, Meta |
| Editar Tokens Meta | ✅ | ✅ | ❌ | Access Token, Verify Token |
| Editar Phone Number ID | ✅ | ✅ | ❌ | WhatsApp Business Phone |
| Editar Settings (JSONB) | ✅ | ✅ | ❌ | enableRAG, enableTools, etc |
| Editar Notification Email | ✅ | ✅ | ❌ | Email para alertas |
| Ver Vault Secrets | ✅ | ✅ | ❌ | Apenas via API (descriptografado) |
| Alterar Status do Client | ✅ | ❌ | ❌ | active/inactive/suspended |
| Alterar Plan do Client | ✅ | ❌ | ❌ | free/starter/professional/enterprise |

### 4. Conversas WhatsApp (Conversations)

| Funcionalidade | `admin` | `client_admin` | `user` | Notas |
|----------------|---------|----------------|--------|-------|
| Ver lista de conversas | ✅ | ✅ | ✅ | Filtradas por client_id |
| Ver detalhes de conversa | ✅ | ✅ | ✅ | Incluindo histórico completo |
| Ver mensagens de conversa | ✅ | ✅ | ✅ | Timeline completa |
| Atribuir conversa a usuário | ✅ | ✅ | ❌ | Campo assigned_to |
| Alterar status da conversa | ✅ | ✅ | ✅ | active/resolved/pending |
| Transferir para humano | ✅ | ✅ | ✅ | Se enableHumanHandoff=true |
| Enviar mensagem manual | ✅ | ✅ | ✅ | Via n8n webhook |
| Deletar conversa | ✅ | ❌ | ❌ | Apenas super admin |

### 5. Documentos RAG (Documents)

| Funcionalidade | `admin` | `client_admin` | `user` | Notas |
|----------------|---------|----------------|--------|-------|
| Ver documentos | ✅ | ✅ | ✅ | Filtrados por client_id |
| Upload de documentos | ✅ | ✅ | ❌ | PDF, TXT, DOCX |
| Editar metadata de documento | ✅ | ✅ | ❌ | Tags, categorias |
| Deletar documento | ✅ | ✅ | ❌ | Remove embeddings também |
| Ver embeddings | ✅ | ✅ | ❌ | Vetores para RAG |

### 6. Analytics & Logs (Usage Analytics)

| Funcionalidade | `admin` | `client_admin` | `user` | Notas |
|----------------|---------|----------------|--------|-------|
| Ver analytics dashboard | ✅ | ✅ | ✅ | Métricas gerais do client |
| Ver usage logs | ✅ | ✅ | ❌ | Logs de uso de API (tokens, custo) |
| Ver execution logs | ✅ | ✅ | ❌ | Logs de execução do workflow |
| Exportar relatórios | ✅ | ✅ | ❌ | CSV, JSON |
| Ver custos totais | ✅ | ✅ | ❌ | OpenAI + Groq |
| Ver métricas por usuário | ✅ | ✅ | ❌ | Quem mais usa o sistema |

### 7. Pricing Config (Configuração de Preços)

| Funcionalidade | `admin` | `client_admin` | `user` | Notas |
|----------------|---------|----------------|--------|-------|
| Ver configurações de preço | ✅ | ✅ | ❌ | Preços por modelo |
| Criar configuração de preço | ✅ | ✅ | ❌ | Custom pricing |
| Editar configuração de preço | ✅ | ✅ | ❌ | Ajustar valores |
| Deletar configuração de preço | ✅ | ✅ | ❌ | Remover custom pricing |

### 8. Workflow Debug (Desenvolvimento)

| Funcionalidade | `admin` | `client_admin` | `user` | Notas |
|----------------|---------|----------------|--------|-------|
| Ver página de debug | ✅ | ✅ | ❌ | /dashboard/debug |
| Ver execution logs | ✅ | ✅ | ❌ | Logs de execução do n8n |
| Reprocessar mensagem | ✅ | ✅ | ❌ | Rerun workflow manualmente |
| Ver erros detalhados | ✅ | ✅ | ❌ | Stack traces, input/output |

### 9. Administração Global (Super Admin Only)

| Funcionalidade | `admin` | `client_admin` | `user` | Notas |
|----------------|---------|----------------|--------|-------|
| Ver todos os clients | ✅ | ❌ | ❌ | Cross-client access |
| Criar novo client | ✅ | ❌ | ❌ | Onboarding |
| Editar qualquer client | ✅ | ❌ | ❌ | Sem restrição de client_id |
| Deletar client | ✅ | ❌ | ❌ | Cascata em todas tabelas |
| Ver estatísticas globais | ✅ | ❌ | ❌ | Todos os clients |
| Gerenciar Vault master keys | ✅ | ❌ | ❌ | Segurança crítica |

---

## 🔐 Implementação Técnica

### RLS Policies Aplicadas

```sql
-- user_profiles policies
✅ "Users can view own profile" - Todos autenticados
✅ "Users can update own profile" - Todos autenticados (sem mudar role)
✅ "Client admins can view team members" - Apenas admins do mesmo client_id
✅ "Client admins can create users" - Apenas admins (não pode criar 'admin')
✅ "Client admins can update team members" - Apenas admins (não pode promover para 'admin')
✅ "Client admins can deactivate users" - Apenas admins (não pode desativar a si mesmo)
✅ "Super admins have full access" - Role 'admin' tem acesso total

-- user_invites policies
✅ "Client admins can create invites" - Apenas admins do mesmo client_id
✅ "Client admins can view invites" - Apenas admins do mesmo client_id
✅ "Client admins can update invites" - Apenas admins do mesmo client_id
✅ "Client admins can delete invites" - Apenas admins do mesmo client_id
✅ "Users can view own invite by email" - Anônimo/autenticado por email
```

### Helper Functions Criadas

```sql
✅ get_current_user_role() → TEXT
   Retorna o role do usuário autenticado

✅ user_has_role(required_role TEXT) → BOOLEAN
   Verifica se o usuário tem role específico E está ativo

✅ user_is_admin() → BOOLEAN
   Verifica se é 'admin' OU 'client_admin' E está ativo

✅ get_current_user_client_id() → UUID
   Retorna o client_id do usuário autenticado
```

---

## 📝 Notas de Implementação

### Regras de Negócio

1. **Isolamento de Tenant**: Todos os admins (exceto super admin) só veem dados do seu client_id
2. **Proteção de Role**: Apenas super admin pode criar/promover para role 'admin'
3. **Auto-proteção**: Ninguém pode desativar a si mesmo
4. **Soft Delete**: Usuários são desativados (is_active=false) em vez de deletados
5. **Convites com Expiração**: Convites expiram em 7 dias automaticamente
6. **Audit Trail**: Todos os convites registram quem convidou (invited_by_user_id)

### Campos de Permissions (JSONB)

```json
{
  "canViewAnalytics": true,
  "canExportData": true,
  "canManageDocuments": false,
  "canSendMessages": true,
  "maxMonthlyMessages": 1000,
  "allowedFeatures": ["rag", "tools", "humanHandoff"]
}
```

**Uso**: Permite permissões customizadas além dos roles padrão.

---

## 🚀 Próximos Passos

### Backend (API Routes) - Em desenvolvimento
- [ ] `GET /api/admin/users` - Listar usuários do client
- [ ] `POST /api/admin/users` - Criar usuário
- [ ] `GET /api/admin/users/[id]` - Detalhes do usuário
- [ ] `PATCH /api/admin/users/[id]` - Editar usuário
- [ ] `DELETE /api/admin/users/[id]` - Desativar usuário
- [ ] `POST /api/admin/invite` - Criar convite
- [ ] `GET /api/admin/invites` - Listar convites
- [ ] `PATCH /api/admin/invites/[id]` - Revogar convite
- [ ] `POST /api/auth/accept-invite/[token]` - Aceitar convite

### Frontend (Admin Dashboard) - Em desenvolvimento
- [ ] `/app/admin/layout.tsx` - Layout com sidebar
- [ ] `/app/admin/users/page.tsx` - Lista de usuários
- [ ] `/app/admin/users/new/page.tsx` - Criar usuário
- [ ] `/app/admin/users/[id]/page.tsx` - Editar usuário
- [ ] `/app/admin/invites/page.tsx` - Gerenciar convites

### Middleware - Em desenvolvimento
- [ ] Adicionar role check em `middleware.ts`
- [ ] Proteger rotas `/admin/*` para client_admin e admin
- [ ] Injetar role no header para facilitar checks

---

## 📊 Status de Usuários Atuais

```sql
-- Ver usuários com roles
SELECT 
  email, 
  full_name, 
  role, 
  is_active,
  (SELECT name FROM clients WHERE id = user_profiles.client_id) as client_name
FROM user_profiles
ORDER BY role DESC, email;
```

**Usuários configurados**:
- ✅ Luis Fernando Boff → role: `admin` (Super Admin)

---

## 🔄 Changelog

### 2025-10-30 - Phase 4 Migration
- ✅ Criada migration `008_phase4_admin_roles.sql`
- ✅ Adicionadas colunas: role, permissions, is_active, phone
- ✅ Criadas funções helper para role checks
- ✅ Implementadas RLS policies para isolamento
- ✅ Criada tabela user_invites com client_id
- ✅ Promovido primeiro super admin (Luis Fernando Boff)
- 📝 Criada matriz de permissões (este documento)

---

**Legenda**: ✅ Permitido | ❌ Negado | ✅* Permitido com restrições
