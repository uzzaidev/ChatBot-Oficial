# 💰 Botão de Trigger Manual para IA - Economia de Custos

## 🎯 Problema

**Situação atual (proposta):**
- IA classifica automaticamente em 100% dos casos ambíguos
- Custo: R$ 0,003 por classificação
- Com 1000 conversas/dia = R$ 3,00/dia = R$ 90/mês

**Problema:** 
- Muitas classificações podem ser desnecessárias
- Usuário pode querer revisar antes de usar IA
- Custo pode explodir sem controle

---

## ✅ Solução: Botão Manual "Classificar com IA"

### Conceito

**Ao invés de:** IA rodar automaticamente sempre que confidence < 70%

**Fazer:** IA só roda quando usuário clicar no botão "🔄 Reclassificar com IA"

### Benefícios

1. **Economia de 80-90% dos custos**
   - IA só roda quando realmente necessário
   - Usuário decide quais leads valem a pena classificar com IA

2. **Controle total do usuário**
   - Usuário vê classificação heurística primeiro
   - Decide se precisa de IA ou não
   - Pode classificar manualmente se preferir

3. **Transparência**
   - Usuário vê exatamente quando IA é usada
   - Sabe quanto está gastando
   - Pode priorizar leads importantes

---

## 🎨 UI/UX Proposta

### 1. Card do CRM (Visualização)

```
┌─────────────────────────────────────────┐
│  João Silva                     [Fechar]│
├─────────────────────────────────────────┤
│                                          │
│  📊 CLASSIFICAÇÃO                        │
│  ┌────────────────────────────────────┐ │
│  │ Temperatura: ☀️ MORNO (65%)        │ │
│  │ Origem: 📱 Meta Ads                │ │
│  │ Confiança: 65% (Média)              │ │
│  │ Método: Regras Heurísticas          │ │
│  │                                    │ │
│  │ ⚠️ Confiança abaixo do ideal       │ │
│  │                                    │ │
│  │ [🔄 Reclassificar com IA]          │ │
│  │     Custo: R$ 0,003                │ │
│  │                                    │ │
│  │ [✏️ Classificar Manualmente]       │ │
│  └────────────────────────────────────┘ │
│                                          │
│  💬 CONVERSA                             │
│  [histórico...]                          │
└─────────────────────────────────────────┘
```

### 2. Lista de Cards (Badge)

```
┌─────────────┬─────────────┬─────────────┐
│ Novo Lead   │ Qualif.     │ Proposta    │
├─────────────┼─────────────┼─────────────┤
│             │             │             │
│ ┌─────────┐ │ ┌─────────┐ │ ┌─────────┐ │
│ │João     │ │ │Maria    │ │ │Pedro    │ │
│ │☀️ 65%   │ │ │🔥 85%   │ │ │🔥 92%   │ │
│ │⚠️ Baixa │ │ │✅ Alta  │ │ │✅ Alta  │ │
│ │         │ │ │         │ │ │         │ │
│ │[🔄 IA] │ │ │         │ │ │         │ │
│ └─────────┘ │ └─────────┘ │ └─────────┘ │
│             │             │             │
│ ┌─────────┐ │             │             │
│ │Carlos   │ │             │             │
│ │❄️ 32%   │ │             │             │
│ │⚠️ Baixa │ │             │             │
│ │         │ │             │             │
│ │[🔄 IA] │ │             │             │
│ └─────────┘ │             │             │
└─────────────┴─────────────┴─────────────┘
```

**Legenda:**
- ⚠️ = Confiança baixa (< 70%) - Botão IA aparece
- ✅ = Confiança alta (≥ 70%) - Botão IA não aparece
- [🔄 IA] = Botão para reclassificar com IA

---

## 🔧 Implementação Técnica

### 1. Modificar Função de Classificação

**ANTES (Automático):**
```typescript
// src/nodes/classifyLeadWithAI.ts
export const classifyLeadWithAI = async (input) => {
  // Verifica se pode usar IA
  const canUse = await canUseAIClassification(input.clientId);
  
  if (!canUse) {
    return null; // Não classifica
  }
  
  // Classifica automaticamente
  return await callAI(input);
}
```

**DEPOIS (Manual/On-Demand):**
```typescript
// src/nodes/classifyLeadWithAI.ts
export const classifyLeadWithAI = async (
  input: {
    clientId: string;
    phone: string;
    conversationHistory: Array<{role: string, content: string}>;
    heuristicResult?: { temperature: string; confidence: number };
    // NOVO: Flag para indicar se é manual
    isManual?: boolean;
  }
) => {
  // Verifica se pode usar IA
  const canUse = await canUseAIClassification(input.clientId);
  
  if (!canUse) {
    throw new Error('Limite mensal de IA atingido ou IA desabilitada');
  }
  
  // Classifica (sempre manual agora)
  const result = await callAI(input);
  
  // Log de uso manual
  await logAIClassification(input.clientId, input.phone, {
    ...result,
    method: 'manual_button', // Indica que foi via botão
    triggered_by: input.userId // Quem clicou
  });
  
  return result;
}
```

### 2. Nova API Route para Classificação Manual

```typescript
// src/app/api/crm/classify-with-ai/route.ts (NOVO ARQUIVO)

import { NextRequest, NextResponse } from 'next/server';
import { classifyLeadWithAI } from '@/nodes/classifyLeadWithAI';
import { getConversationHistory } from '@/lib/conversations';

export async function POST(request: NextRequest) {
  try {
    const { cardId, clientId, phone } = await request.json();
    
    // 1. Buscar histórico da conversa
    const conversationHistory = await getConversationHistory(clientId, phone);
    
    // 2. Buscar classificação heurística atual (se existir)
    const { data: currentScore } = await supabase
      .from('lead_scores')
      .select('*')
      .eq('card_id', cardId)
      .single();
    
    // 3. Classificar com IA
    const aiResult = await classifyLeadWithAI({
      clientId,
      phone,
      conversationHistory,
      heuristicResult: currentScore ? {
        temperature: currentScore.temperature,
        confidence: currentScore.confidence
      } : undefined,
      isManual: true, // Flag importante
      userId: request.user.id // Quem está classificando
    });
    
    // 4. Atualizar lead_scores
    await supabase
      .from('lead_scores')
      .upsert({
        card_id: cardId,
        client_id: clientId,
        phone: parseInt(phone),
        temperature: aiResult.temperature,
        confidence: aiResult.confidence,
        calculation_method: 'ai_manual', // Novo método
        last_calculated_at: new Date().toISOString()
      });
    
    // 5. Retornar resultado
    return NextResponse.json({
      success: true,
      classification: aiResult
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### 3. Componente React - Botão de IA

```typescript
// src/components/crm/ReclassifyWithAIButton.tsx (NOVO ARQUIVO)

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface ReclassifyWithAIButtonProps {
  cardId: string;
  clientId: string;
  phone: string;
  currentConfidence?: number;
  onClassificationComplete?: (result: any) => void;
}

export function ReclassifyWithAIButton({
  cardId,
  clientId,
  phone,
  currentConfidence,
  onClassificationComplete
}: ReclassifyWithAIButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Só mostra botão se confiança < 70%
  if (currentConfidence && currentConfidence >= 70) {
    return null;
  }
  
  const handleReclassify = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/crm/classify-with-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          clientId,
          phone
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao classificar');
      }
      
      const { classification } = await response.json();
      
      toast.success('Lead reclassificado com IA!', {
        description: `Temperatura: ${classification.temperature} (${classification.confidence}% confiança)`
      });
      
      // Callback para atualizar UI
      if (onClassificationComplete) {
        onClassificationComplete(classification);
      }
      
    } catch (error) {
      toast.error('Erro ao classificar', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      onClick={handleReclassify}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Classificando...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Reclassificar com IA
        </>
      )}
      <span className="text-xs text-muted-foreground ml-1">
        (R$ 0,003)
      </span>
    </Button>
  );
}
```

### 4. Integrar no Card Detail Panel

```typescript
// src/components/crm/CardDetailPanel.tsx (MODIFICAR)

import { ReclassifyWithAIButton } from './ReclassifyWithAIButton';

// Dentro do componente:
<div className="space-y-4">
  {/* Classificação atual */}
  <div className="border rounded-lg p-4">
    <h3 className="font-semibold mb-2">Classificação</h3>
    
    <div className="space-y-2">
      <div>
        <span className="text-sm text-muted-foreground">Temperatura:</span>
        <span className="ml-2 font-medium">{temperature}</span>
      </div>
      
      <div>
        <span className="text-sm text-muted-foreground">Confiança:</span>
        <span className="ml-2 font-medium">{confidence}%</span>
        {confidence < 70 && (
          <span className="ml-2 text-xs text-yellow-600">⚠️ Baixa</span>
        )}
      </div>
      
      {/* Botão de IA (só aparece se confiança < 70%) */}
      {confidence < 70 && (
        <div className="mt-4">
          <ReclassifyWithAIButton
            cardId={card.id}
            clientId={card.client_id}
            phone={card.phone}
            currentConfidence={confidence}
            onClassificationComplete={(result) => {
              // Atualizar estado local
              setTemperature(result.temperature);
              setConfidence(result.confidence);
            }}
          />
        </div>
      )}
    </div>
  </div>
</div>
```

---

## 📊 Comparação: Automático vs Manual

| Aspecto | Automático (Proposta Original) | Manual (Com Botão) |
|---------|-------------------------------|-------------------|
| **Custo/mês** | R$ 90 (1000 conversas) | R$ 9-18 (100-200 cliques) |
| **Economia** | - | **80-90%** |
| **Controle** | Sistema decide | Usuário decide |
| **Transparência** | Baixa (oculto) | Alta (visível) |
| **UX** | Automático (conveniente) | Manual (mais trabalho) |
| **Precisão** | Pode classificar leads irrelevantes | Só classifica quando necessário |

---

## 🎯 Regras de Exibição do Botão

### Quando Mostrar Botão "🔄 Reclassificar com IA"

1. **Confiança < 70%** (classificação heurística incerta)
2. **Lead ainda ativo** (não arquivado/fechado)
3. **IA habilitada** nas configurações
4. **Limite mensal não atingido**
5. **Card tem conversa** (pelo menos 1 mensagem)

### Quando NÃO Mostrar

1. **Confiança ≥ 70%** (heurística já é suficiente)
2. **IA desabilitada** nas configurações
3. **Limite mensal atingido**
4. **Card arquivado/fechado**
5. **Sem histórico de conversa**

---

## 💡 Modo Híbrido (Opcional)

### Opção: Permitir Ambos (Automático + Manual)

**Configuração nas Settings:**
```
┌─────────────────────────────────────────┐
│  🤖 Classificação com IA                 │
├─────────────────────────────────────────┤
│                                          │
│  [ ] Habilitar classificação automática  │
│      (IA roda quando confidence < 70%)  │
│                                          │
│  [✓] Permitir classificação manual       │
│      (Botão "Reclassificar com IA")      │
│                                          │
│  Limite mensal: [1000] classificações    │
│                                          │
│  Custo estimado: R$ 3,00/mês             │
│  (se usar 100% do limite)                │
└─────────────────────────────────────────┘
```

**Lógica:**
- Se automático habilitado: IA roda automaticamente + botão disponível
- Se automático desabilitado: Só botão manual disponível

---

## 📈 Métricas e Monitoramento

### Dashboard de Uso de IA

```
┌─────────────────────────────────────────┐
│  🤖 Uso de Classificação IA             │
├─────────────────────────────────────────┤
│                                          │
│  Este Mês:                               │
│  ┌────────────────────────────────────┐ │
│  │ Classificações: 47/1000            │ │
│  │ Custo: R$ 0,14                      │ │
│  │                                      │ │
│  │ [████░░░░░░░░░░░░░░] 4.7%           │ │
│  └────────────────────────────────────┘ │
│                                          │
│  Últimas Classificações:                │
│  • 20/02 14:30 - João Silva (Quente)    │
│  • 20/02 13:15 - Maria Santos (Morno)   │
│  • 20/02 12:00 - Pedro Costa (Quente)   │
│                                          │
│  [Ver Todas]                             │
└─────────────────────────────────────────┘
```

---

## ✅ Checklist de Implementação

### Backend
- [ ] Criar API route `/api/crm/classify-with-ai`
- [ ] Modificar `classifyLeadWithAI()` para suportar modo manual
- [ ] Adicionar campo `method: 'ai_manual'` no log
- [ ] Adicionar campo `triggered_by` (userId) no log

### Frontend
- [ ] Criar componente `ReclassifyWithAIButton`
- [ ] Integrar no `CardDetailPanel`
- [ ] Adicionar badge "⚠️ Baixa Confiança" nos cards
- [ ] Adicionar toast de sucesso/erro

### Database
- [ ] Adicionar coluna `calculation_method` em `lead_scores` (se não existir)
- [ ] Adicionar coluna `triggered_by` em `ai_classification_logs`
- [ ] Criar view para métricas de uso de IA

### Settings
- [ ] Adicionar toggle "Habilitar IA automática" (opcional)
- [ ] Mostrar limite mensal e uso atual
- [ ] Mostrar custo estimado

---

## 🎓 Conclusão

### Vantagens do Botão Manual

1. **Economia de 80-90%** nos custos de IA
2. **Controle total** do usuário
3. **Transparência** de quando IA é usada
4. **Flexibilidade** para usar quando necessário

### Quando Usar Cada Modo

- **Botão Manual:** Quando quer economizar e ter controle
- **Automático:** Quando precisa de classificação em 100% dos casos
- **Híbrido:** Melhor dos dois mundos (recomendado)

---

**Última atualização:** 2026-02-20
**Referência:** `checkpoints/2026-02-19_chatbot-oficial/CRM_AUTOMATION_PLAN.md`

