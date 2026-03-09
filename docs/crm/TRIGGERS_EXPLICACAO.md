# 🎯 TRIGGERS CRM - O Que São e Como Funcionam

## 📖 O Que É Um Trigger?

**Trigger = Gatilho = Evento que dispara uma ação automática**

É como um "se isso acontecer, então faça aquilo". É a base do sistema de automação do CRM.

### Analogia Simples

Imagine um sistema de alarme:
- **Trigger (Gatilho):** Porta abre
- **Ação:** Toca alarme

No CRM é igual:
- **Trigger:** Cliente envia mensagem
- **Ação:** Mover card para coluna "Qualificando"

---

## 🔄 Como Funciona na Prática

```
EVENTO ACONTECE → TRIGGER DISPARA → AÇÃO É EXECUTADA
```

**Exemplo Real:**
1. Cliente envia mensagem: "Quanto custa?"
2. **Trigger:** `message_received` (mensagem recebida)
3. **Ação:** Mover card para coluna "Proposta" + Adicionar tag "Interessado em Preço"

---

## 📋 TRIGGERS EXISTENTES (7 Tipos Atuais)

### 1. `message_received` - Mensagem Recebida
**Quando dispara:** Cliente envia uma mensagem

**Variáveis disponíveis:**
- `message_type` - Tipo da mensagem (text, image, audio)
- `message_text` - Texto da mensagem
- `is_first_message` - É primeira mensagem? (true/false)

**Exemplo de uso:**
```
SE cliente envia mensagem
E mensagem contém "quanto custa"
ENTÃO mover card para coluna "Proposta"
```

---

### 2. `message_sent` - Mensagem Enviada
**Quando dispara:** Sistema envia mensagem para o cliente

**Variáveis disponíveis:**
- `message_type` - Tipo da mensagem
- `sent_by` - Quem enviou (bot, human, system)

**Exemplo de uso:**
```
SE bot envia mensagem
E mensagem é "Olá, como posso ajudar?"
ENTÃO adicionar tag "Primeiro Contato"
```

---

### 3. `inactivity` - Inatividade
**Quando dispara:** Cliente não responde por X dias

**Variáveis disponíveis:**
- `inactive_days` - Quantos dias sem resposta
- `last_message_date` - Data da última mensagem

**Configuração:**
- Dias de inatividade: 3, 7, 14, 30 (configurável)

**Exemplo de uso:**
```
SE cliente não responde por 7 dias
ENTÃO mover card para coluna "Frio"
E adicionar tag "Inativo"
```

---

### 4. `status_change` - Mudança de Status
**Quando dispara:** Status da conversa muda

**Variáveis disponíveis:**
- `from_status` - Status anterior (bot, human, closed)
- `to_status` - Novo status (bot, human, closed)

**Exemplo de uso:**
```
SE status muda de "bot" para "human"
ENTÃO adicionar tag "Transferido para Atendente"
E registrar atividade no timeline
```

---

### 5. `lead_source` - Origem do Lead
**Quando dispara:** Lead vem de uma fonte específica

**Variáveis disponíveis:**
- `source_type` - Tipo de origem (meta_ads, organic, direct, referral)
- `campaign_name` - Nome da campanha
- `ad_name` - Nome do anúncio
- `ad_id` - ID do anúncio

**Exemplo de uso:**
```
SE lead vem de "meta_ads" (anúncio Instagram/Facebook)
ENTÃO adicionar tag "Anúncio Meta"
E mover para coluna "Qualificando"
```

---

### 6. `transfer_human` - Transferência para Humano
**Quando dispara:** Cliente pede para falar com atendente

**Variáveis disponíveis:**
- `request_text` - Texto da solicitação
- `current_status` - Status atual

**Exemplo de uso:**
```
SE cliente pede "quero falar com alguém"
ENTÃO mudar status para "human"
E mover card para coluna "Em Atendimento"
```

---

### 7. `card_created` - Card Criado
**Quando dispara:** Novo card é criado no CRM

**Variáveis disponíveis:**
- `contact_name` - Nome do contato
- `phone` - Telefone
- `source_type` - Origem do lead

**Exemplo de uso:**
```
SE novo card é criado
E origem é "meta_ads"
ENTÃO adicionar tag "Novo Lead"
E atribuir para vendedor padrão
```

---

### 8. `tag_added` - Tag Adicionada
**Quando dispara:** Uma tag é adicionada ao card

**Variáveis disponíveis:**
- `tag_name` - Nome da tag
- `tag_id` - ID da tag

**Exemplo de uso:**
```
SE tag "Interessado" é adicionada
ENTÃO mover card para coluna "Qualificando"
```

---

## 🆕 TRIGGERS PROPOSTOS (Novos com IA)

Segundo o plano de automação, serão adicionados 3 novos triggers:

### 9. `temperature_change` - Mudança de Temperatura
**Quando dispara:** Temperatura do lead muda (quente → morno, morno → frio, etc.)

**Variáveis disponíveis:**
- `from_temperature` - Temperatura anterior (quente, morno, frio)
- `to_temperature` - Nova temperatura
- `confidence` - Confiança da classificação (0-100%)

**Exemplo de uso:**
```
SE temperatura muda para "quente"
E confiança ≥ 75%
ENTÃO mover card para coluna "Proposta"
E notificar vendedor
```

---

### 10. `ai_classification_complete` - Classificação IA Completa
**Quando dispara:** IA termina de classificar o lead

**Variáveis disponíveis:**
- `temperature` - Temperatura classificada
- `intent` - Intenção detectada
- `buying_signals` - Sinais de compra detectados
- `confidence` - Confiança da IA

**Exemplo de uso:**
```
SE IA classifica lead como "quente"
E confiança ≥ 80%
ENTÃO atualizar temperatura do card
E mover para coluna "Qualificando"
```

---

### 11. `confidence_low` - Confiança Baixa
**Quando dispara:** Classificação tem confiança baixa (< 70%)

**Variáveis disponíveis:**
- `current_confidence` - Confiança atual
- `classification_method` - Método usado (heuristic, ai, manual)

**Exemplo de uso:**
```
SE confiança < 70%
ENTÃO solicitar classificação manual
E adicionar tag "Revisar Classificação"
```

---

## 🎬 EXEMPLO COMPLETO: Fluxo com Múltiplos Triggers

**Cenário:** Cliente vê anúncio no Instagram e manda mensagem

### Passo 1: Card Criado
```
Trigger: card_created
Ação: Adicionar tag "Novo Lead"
```

### Passo 2: Mensagem Recebida
```
Trigger: message_received
Condição: Mensagem contém "quanto custa"
Ação: Mover para coluna "Qualificando"
```

### Passo 3: Origem Detectada
```
Trigger: lead_source
Condição: source_type = "meta_ads"
Ação: Adicionar tag "Anúncio Meta"
```

### Passo 4: Temperatura Calculada
```
Trigger: temperature_change
Condição: to_temperature = "quente" + confidence ≥ 75%
Ação: Mover para coluna "Proposta"
```

### Passo 5: Inatividade (se não responder)
```
Trigger: inactivity
Condição: inactive_days ≥ 7
Ação: Mover para coluna "Frio"
```

---

## 📊 TABELA RESUMO: Triggers vs Ações

| Trigger | Quando Dispara | Ação Mais Comum |
|---------|---------------|-----------------|
| `message_received` | Cliente envia mensagem | Mover card, adicionar tag |
| `message_sent` | Sistema envia mensagem | Registrar atividade |
| `inactivity` | Sem resposta por X dias | Mover para "Frio" |
| `status_change` | Status muda | Atualizar tags |
| `lead_source` | Lead vem de anúncio | Tag de origem |
| `transfer_human` | Cliente pede atendente | Mover para "Em Atendimento" |
| `card_created` | Novo card criado | Tag inicial, atribuir responsável |
| `tag_added` | Tag adicionada | Mover card, executar ação |
| `temperature_change` | Temperatura muda | Mover card automaticamente |
| `ai_classification_complete` | IA termina classificação | Atualizar temperatura |
| `confidence_low` | Confiança baixa | Solicitar revisão manual |

---

## 🔧 ONDE OS TRIGGERS SÃO CONFIGURADOS?

### 1. No Código (Constantes)
```typescript
// src/lib/crm-automation-constants.ts
export const AVAILABLE_TRIGGERS = [
  { id: "message_received", name: "Mensagem Recebida", ... },
  { id: "inactivity", name: "Inatividade", ... },
  // ...
]
```

### 2. No Banco de Dados (Regras)
```sql
-- Tabela: crm_automation_rules
INSERT INTO crm_automation_rules (
  trigger_type,        -- Qual trigger
  trigger_conditions,  -- Condições específicas
  action_type,         -- Qual ação executar
  action_params        -- Parâmetros da ação
) VALUES (
  'message_received',
  '{"contains_keyword": "quanto custa"}',
  'move_to_column',
  '{"column_id": "proposta"}'
);
```

### 3. Na Interface (UI)
```
Dashboard CRM → Configurações → Regras de Automação
→ Criar Nova Regra → Selecionar Trigger → Configurar Ação
```

---

## 💡 DICAS DE USO

### ✅ Boas Práticas

1. **Comece simples:** Use triggers básicos primeiro (`message_received`, `card_created`)
2. **Teste antes:** Configure regra e teste com conversa real
3. **Monitore:** Veja quais triggers disparam mais
4. **Ajuste:** Modifique condições baseado em resultados

### ❌ Evite

1. **Muitas regras conflitantes:** Pode causar loops infinitos
2. **Triggers muito sensíveis:** Ex: mover card a cada mensagem
3. **Ações irreversíveis:** Sempre permita override manual

---

## 🚀 PRÓXIMOS PASSOS

Para implementar os novos triggers com IA:

1. **Adicionar constantes** em `crm-automation-constants.ts`
2. **Criar migrations** para novos triggers
3. **Implementar lógica** nos nodes do chatbotFlow
4. **Adicionar UI** para configurar novos triggers

---

**Última atualização:** 2026-02-20
**Referência:** `checkpoints/2026-02-19_chatbot-oficial/CRM_AUTOMATION_PLAN.md`

