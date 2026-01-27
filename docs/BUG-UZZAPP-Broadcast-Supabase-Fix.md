---
created: 2026-01-26T22:07
updated: 2026-01-26T22:08
---
# 🐛 BUG: Broadcast Supabase - Mensagens Enviadas Aparecendo como Não Lidas

## 📋 **DESCRIÇÃO DO PROBLEMA**

**Sintoma:**
- Mensagens **enviadas** pelo usuário estão aparecendo como **não lidas** (piscando)
- Quando o usuário clica em uma conversa, todas as mensagens já lidas aparecem como não lidas novamente
- O indicador de "não lida" está piscando para mensagens que o próprio usuário enviou

**Contexto:**
- Sistema: UZZAPP (Chatbot WhatsApp)
- Stack: Supabase (banco de dados) + Backend API
- Data identificação: 26/01/2026
- Status: Bug ativo, afetando UX

---

## 🔍 **ANÁLISE TÉCNICA (Explicação do Tech Lead)**

### **Como Funciona o Broadcast do Supabase**

**[[Luis Fernando Boff]] explicou:**

> "O Supabase tem uma funcionalidade que é **Broadcast**, ou seja, toda vez que atualiza um dado no banco de dados, ele manda para o nosso backend de forma automática. Então ele está sendo Broadcast na hora, não é?"

**Fluxo Normal:**
1. Mensagem é salva no Supabase (banco de dados)
2. Supabase envia Broadcast automático para o backend
3. Backend recebe o Broadcast
4. Backend marca mensagem como "não lida" **MAS** filtra apenas mensagens **recebidas** (não enviadas)

### **O Que Está Acontecendo (Bug)**

**[[Luis Fernando Boff]] identificou:**

> "A nossa API fazia ela? Ela quando chegava uma mensagem dessas, ela lotava como não lida? Mas ela filtrava só para mim, para mensagens recebidas assim não enviadas. Então, provavelmente esse filtro de não aparecer no Broadcast, mensagens enviadas saiu agora, provavelmente voltou."

**Problema:**
- O **filtro** que diferenciava mensagens **recebidas** vs **enviadas** foi perdido ou desativado
- Agora o Broadcast está processando **TODAS** as mensagens (incluindo as enviadas pelo próprio usuário)
- Resultado: Mensagens enviadas aparecem como "não lidas" e ficam piscando

**Evidência:**
> "Esse teu piscar toda vez que tu recebe um Broadcast do campo, ele está piscando, sem nenhum tipo de filtro, tem que filtrar só para aquelas que tu mensagens que tu recebeu. Não para os que tu enviou, fez sentido?"

---

## ✅ **SOLUÇÃO ESPERADA**

### **Comportamento Correto:**

1. **Broadcast recebe atualização** do Supabase (qualquer mudança no banco)
2. **Backend filtra** o Broadcast:
   - ✅ **Processa:** Mensagens **recebidas** (que o usuário ainda não leu)
   - ❌ **Ignora:** Mensagens **enviadas** pelo próprio usuário
3. **UI atualiza** apenas mensagens recebidas como "não lidas"
4. **Mensagens enviadas** nunca aparecem como "não lidas"

### **Filtro Necessário:**

```javascript
// Pseudocódigo do filtro esperado
if (broadcast.message.type === 'received' && !broadcast.message.isRead) {
  // Processa: marca como não lida, atualiza UI
} else if (broadcast.message.type === 'sent') {
  // Ignora: não processa mensagens enviadas
}
```

---

## 🔧 **AÇÃO REQUERIDA**

### **O Que Precisa Ser Corrigido:**

1. **Localizar o código** que processa o Broadcast do Supabase
2. **Restaurar/Adicionar o filtro** que diferencia mensagens recebidas vs enviadas
3. **Garantir** que mensagens enviadas nunca sejam marcadas como "não lidas"
4. **Testar** que o Broadcast só processa mensagens recebidas

### **Arquivos Prováveis:**

- Backend API que recebe Broadcast do Supabase
- Handler de mensagens/notificações
- Lógica de atualização de status "lido/não lido"

### **Critério de Sucesso:**

- ✅ Mensagens enviadas pelo usuário **nunca** aparecem como não lidas
- ✅ Apenas mensagens **recebidas** e não lidas aparecem com indicador
- ✅ Broadcast funciona corretamente para mensagens recebidas
- ✅ Não há mais "piscar" em mensagens enviadas

---

## 📝 **NOTAS ADICIONAIS**

**Importância do Entendimento (Luiz):**

> "O importante é tu quando acontecer essas coisas para ver assim, o que que eu faço? Não é que eu acho importante, é entender o que está acontecendo por trás. Não precisa saber o código, não saber onde que está o arquivo, mas entender o sentido, tipo de como que funciona, que nem, por exemplo, essa parte de Broadcast é bem importante."

**Contexto do Sistema:**
- Supabase usa Broadcast para atualizações em tempo real
- Backend precisa filtrar corretamente para evitar processar mensagens enviadas
- Este filtro existia antes e precisa ser restaurado

---

## 🎯 **RESUMO EXECUTIVO**

**Problema:** Filtro do Broadcast do Supabase que diferencia mensagens recebidas vs enviadas foi perdido.

**Causa:** Broadcast está processando todas as mensagens (incluindo enviadas), quando deveria processar apenas recebidas.

**Solução:** Restaurar filtro no backend que ignora mensagens enviadas no Broadcast.

**Prioridade:** Alta (afeta UX diretamente)

**Responsável:** Backend/API (processamento de Broadcast)

---

**Criado em:** 26/01/2026  
**Baseado em:** Explicação técnica de [[Luis Fernando Boff]] na reunião de 26/01/2026  
**Status:** Aguardando correção

