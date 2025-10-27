# Como Habilitar Realtime no Supabase

## Problema

O dashboard não atualiza automaticamente quando novas mensagens chegam, mesmo com o código de realtime implementado.

## Causa

A tabela `n8n_chat_histories` **não está com replicação habilitada** no Supabase. Por padrão, apenas algumas tabelas têm realtime ativo.

## Solução: Habilitar Realtime no Supabase

### Passo 1: Acessar o Supabase
1. Acesse: https://app.supabase.com/project/_/database/replication
2. Ou vá em: **Database** → **Replication**

### Passo 2: Habilitar Replicação
1. Procure pela tabela `n8n_chat_histories`
2. Clique no **toggle** ao lado dela para **ATIVAR** (deve ficar verde/azul)
3. Aguarde 10-30 segundos para a replicação ativar

### Passo 3: Verificar no Dashboard
1. Abra uma conversa no dashboard: https://chat.luisfboff.com/dashboard/conversations/[phone]
2. Envie uma mensagem pelo WhatsApp
3. A mensagem deve aparecer **instantaneamente** no dashboard (sem refresh!)

## Como Funciona

### Antes (SEM realtime habilitado)
```
WhatsApp → n8n → Supabase → [NADA ACONTECE] → Dashboard precisa fazer refresh
```

### Depois (COM realtime habilitado)
```
WhatsApp → n8n → Supabase → [REALTIME EVENT] → Dashboard recebe automaticamente
```

## Verificar se Está Funcionando

Abra o **Console do Navegador** (F12) e procure por:

```
✅ Conectado ao Realtime para 555499250023
```

Se aparecer isso, o realtime está ativo e funcionando!

## Outras Tabelas que Podem Precisar de Realtime

Se você usar outras tabelas no futuro, também habilite realtime para:
- `conversations` (para atualizar status)
- `messages` (se migrar para essa tabela no futuro)
- `Clientes WhatsApp` (para ver mudanças de status)

## Observações Importantes

1. **Não precisa de polling** - Com realtime ativo, não é necessário ficar buscando mensagens de X em X segundos
2. **Performance** - Realtime é muito mais eficiente que polling
3. **UX** - Mensagens aparecem instantaneamente, como no WhatsApp Web
4. **Grátis** - O plano free do Supabase inclui realtime

## Troubleshooting

### "CLOSED" aparece no console em vez de "SUBSCRIBED"
**Solução**: Realtime não está habilitado na tabela. Volte ao Passo 2.

### Mensagens ainda não aparecem
**Solução**: Limpe o cache do navegador (Ctrl+Shift+Delete) e recarregue a página.

### Demora muito para conectar
**Solução**: Isso é normal na primeira conexão. Aguarde até 30 segundos.
