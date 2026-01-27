---
created: 2026-01-26T22:08
updated: 2026-01-26T22:08
---
# 🔧 INSTRUÇÕES PARA CLAUDE CODE - Correção Bug Broadcast Supabase

## PROBLEMA

Mensagens **enviadas** pelo usuário estão aparecendo como **não lidas** (piscando) no UZZAPP.

---

## EXPLICAÇÃO TÉCNICA DO PROBLEMA

### Como Funciona (Correto):

1. **Supabase Broadcast:** Toda vez que atualiza um dado no banco, Supabase envia Broadcast automático para o backend
2. **Backend filtra:** Processa apenas mensagens **recebidas** (não enviadas)
3. **UI atualiza:** Marca como "não lida" apenas mensagens recebidas

### O Que Está Acontecendo (Bug):

- O **filtro** que diferencia mensagens recebidas vs enviadas foi perdido/desativado
- Broadcast está processando **TODAS** as mensagens (incluindo enviadas)
- Resultado: Mensagens enviadas aparecem como "não lidas" e ficam piscando

**Citação do Tech Lead:**
> "A nossa API fazia ela? Ela quando chegava uma mensagem dessas, ela lotava como não lida? Mas ela filtrava só para mim, para mensagens recebidas assim não enviadas. Então, provavelmente esse filtro de não aparecer no Broadcast, mensagens enviadas saiu agora, provavelmente voltou."

> "Esse teu piscar toda vez que tu recebe um Broadcast do campo, ele está piscando, sem nenhum tipo de filtro, tem que filtrar só para aquelas que tu mensagens que tu recebeu. Não para os que tu enviou."

---

## SOLUÇÃO REQUERIDA

### O Que Fazer:

1. **Localizar** o código que processa Broadcast do Supabase (backend/API)
2. **Adicionar/Restaurar filtro** que:
   - ✅ **Processa:** Mensagens **recebidas** e não lidas
   - ❌ **Ignora:** Mensagens **enviadas** pelo usuário
3. **Garantir** que Broadcast só atualiza status de mensagens recebidas

### Filtro Esperado:

```javascript
// Pseudocódigo - ajustar conforme linguagem/framework usado
if (broadcast.message.type === 'received' && !broadcast.message.isRead) {
  // Processa: marca como não lida, atualiza UI
  updateMessageStatus(broadcast.message, 'unread');
} else if (broadcast.message.type === 'sent') {
  // Ignora: não processa mensagens enviadas
  return; // ou continue
}
```

### Critério de Sucesso:

- ✅ Mensagens enviadas **nunca** aparecem como não lidas
- ✅ Apenas mensagens recebidas e não lidas têm indicador
- ✅ Não há mais "piscar" em mensagens enviadas

---

## ONDE PROCURAR

- Backend API que recebe Broadcast do Supabase
- Handler/Listener de mensagens do Supabase
- Lógica de atualização de status "lido/não lido"
- Componente que processa notificações em tempo real

---

**Prioridade:** Alta  
**Impacto:** UX diretamente afetada  
**Baseado em:** Análise técnica de Luis Fernando Boff (Tech Lead) - 26/01/2026

