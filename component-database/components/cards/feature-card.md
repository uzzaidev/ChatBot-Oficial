# Feature Card - Peladeiros

**Tipo:** Card (Feature)  
**Projeto:** Peladeiros  
**Data:** 2025-01-27  
**Status:** ✅ Documentado

---

## 📸 Visual

Card de feature com:
- Ícone colorido no topo esquerdo
- Título e descrição
- Conteúdo customizado (gráficos, mockups, etc.)
- Gradient border no topo
- Hover effect com lift e shadow
- 6 variações de cor disponíveis

**Características visuais:**
- Background semi-transparente (`bg-white/5`)
- Border sutil (`border-white/10`)
- Gradient top border (`before:content-['']`)
- Hover: translateY(-8px) + shadow colorida
- Layout flexível para conteúdo customizado

---

## 📍 Localização

**Arquivo:** `apps/web/app/[locale]/projetos/peladeiros/components/FeaturesSection.tsx`  
**Linhas:** 280-354  
**Componente React:** `<FeatureCard />`

**Uso:** Dentro de `<FeaturesSection />` (linha 46-238)

**Como encontrar:**
1. Abrir `http://localhost:3000/pt/projetos/peladeiros`
2. Scroll até seção "Features Profissionais"
3. Usar React Grab em qualquer card de feature

---

## 🎨 Design System

### **Cores Disponíveis**
- `mint`: `#1ABC9C` (verde menta)
- `blue`: `#2E86AB` (azul)
- `gold`: `#FFD700` (dourado)
- `purple`: `purple-400/500`
- `pink`: `pink-400/500`
- `green`: `green-400/500`

### **Estrutura Visual**
- Background: `bg-white/5`
- Border: `border-white/10`
- Border radius: `rounded-2xl`
- Padding: `p-6`
- Gradient top: `before:bg-gradient-to-r from-[#1ABC9C] to-[#2E86AB]`

### **Hover Effects**
- Transform: `translate-y-[-8px]`
- Shadow: `shadow-[0_20px_40px_rgba(26,188,156,0.2)]`
- Border highlight: `hover:border-[color]/50`

---

## 🔧 Dependências

```typescript
import { Icon } from "lucide-react";
```

**Pacotes:**
- `lucide-react` - Ícones (BarChart3, Maximize, Bell, etc.)
- `tailwindcss` - Todos os estilos

---

## 💻 Como Copiar com React Grab

### **Passo a Passo:**

1. **Iniciar servidor:**
   ```bash
   pnpm dev
   ```

2. **Abrir página:**
   - Acesse `http://localhost:3000/pt/projetos/peladeiros`
   - Scroll até "Features Profissionais"

3. **Usar React Grab:**
   - Pressione `Ctrl+C` (ou `Cmd+C`)
   - Clique em qualquer Feature Card
   - Contexto será copiado

4. **Colar no Cursor:**
   ```
   [Contexto copiado]
   
   Adapte este Feature Card para [novo projeto]:
   - Mude cores para [novas cores]
   - Ajuste espaçamento
   - Mantenha estrutura mas adapte conteúdo
   ```

### **Contexto Esperado:**

```
Arquivo: apps/web/app/[locale]/projetos/peladeiros/components/FeaturesSection.tsx
Linha: 280, Coluna: 0
Componente: <FeatureCard icon={BarChart3} title="..." color="mint" />
Stack: PeladeirosPage > FeaturesSection > FeatureCard
```

---

## 📋 Props/Interface

```typescript
interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: "mint" | "blue" | "gold" | "purple" | "pink" | "green";
  content: React.ReactNode;
}
```

### **Exemplo de Uso:**

```tsx
<FeatureCard
  icon={BarChart3}
  title="Analytics Dashboard"
  description="Gráficos de atividade com tendências"
  color="mint"
  content={
    <div>
      {/* Conteúdo customizado */}
    </div>
  }
/>
```

---

## 🎯 Variações

### **Variante 1: Mega Feature Card**
- Versão maior (`MegaFeatureCard`)
- Ícone maior (h-14 w-14)
- Padding maior (`p-8`)
- Para features principais

### **Variante 2: Sem Gradient Border**
- Remover `before:content-['']`
- Border simples no topo
- Mais minimalista

### **Variante 3: Compacto**
- Padding menor (`p-4`)
- Ícone menor (`h-8 w-8`)
- Para grids densos

---

## 🔗 Componentes Relacionados

- `MegaFeatureCard` - Versão maior do mesmo componente
- `StatsCard` - Similar mas para estatísticas
- `PricingCard` - Similar estrutura para preços

---

## 📝 Notas de Implementação

- **Gradient Border:** Usa `before:content-['']` com `before:absolute`
- **Hover:** Transição suave com `transition-all`
- **Flexibilidade:** Aceita qualquer `content` como ReactNode
- **Cores:** Sistema de cores mapeado via objeto `colorClasses`

---

## 🎨 Exemplo Completo

```tsx
import { BarChart3 } from "lucide-react";
import { FeatureCard } from './components/FeatureCard';

export function FeaturesSection() {
  return (
    <FeatureCard
      icon={BarChart3}
      title="Analytics Dashboard"
      description="Gráficos de atividade com tendências"
      color="mint"
      content={
        <div className="bg-[#1C1C1C]/50 rounded-lg p-3">
          {/* Conteúdo customizado aqui */}
        </div>
      }
    />
  );
}
```

---

## 📚 Referências

- [Mega Feature Card](./mega-feature-card.md)
- [Padrões de Cores](./patterns/color-schemes.md)
- [Gradients](./patterns/gradients.md)

---

**Última atualização:** 2025-01-27

