# Hero Section - Peladeiros

**Tipo:** Section (Hero)  
**Projeto:** Peladeiros  
**Data:** 2025-01-27  
**Status:** ✅ Documentado

---

## 📸 Visual

Hero section completa com:
- Badge de destaque animado no topo
- Logo Uzz.Ai + "Peladeiros"
- Título grande com destaque em verde
- Descrição com texto destacado
- 2 CTAs (primário e secundário)
- 3 estatísticas com ícones
- Mockup do app mobile à direita com animação hover

**Características visuais:**
- Background gradient escuro (`from-[#1C1C1C] via-[#0f242a] to-[#1C1C1C]`)
- Blur effects coloridos nos cantos
- Mockup com border glassmorphism
- Badges flutuantes animados
- Layout responsivo (2 colunas em desktop)

---

## 📍 Localização

**Arquivo:** `apps/web/app/[locale]/projetos/peladeiros/components/HeroSection.tsx`  
**Linhas:** 12-291  
**Componente React:** `<HeroSection />`

**Página:** `apps/web/app/[locale]/projetos/peladeiros/page.tsx` (linha 53)

**Como encontrar:**
1. Abrir `http://localhost:3000/pt/projetos/peladeiros`
2. Scroll até o topo (primeira seção)
3. Usar React Grab clicando em qualquer parte da seção

---

## 🎨 Design System

### **Cores**
- Primary: `#1ABC9C` (verde menta)
- Secondary: `#2E86AB` (azul)
- Accent: `#FFD700` (dourado)
- Background: `#1C1C1C` (preto)
- Text: `#B0B0B0` (cinza claro)

### **Tipografia**
- Headings: `font-poppins` (bold, 5xl-6xl)
- Body: `font-inter` (regular, xl)
- Badge: `font-bold uppercase tracking-widest`

### **Espaçamento**
- Section padding: `py-20 lg:py-32`
- Container: `max-w-7xl px-6 lg:px-8`
- Gap entre elementos: `gap-12` (grid), `gap-8` (vertical)

### **Efeitos Visuais**
- Background gradients com blur
- Hover lift no mockup (`hover:translate-y-[-8px]`)
- Pulse animation no badge
- Glassmorphism no mockup container

---

## 🔧 Dependências

```typescript
import { UserPlus, PlayCircle, CheckCircle2, TrendingUp, Users, Bell } from "lucide-react";
import { useEffect } from "react";
```

**Pacotes:**
- `lucide-react` - Ícones (UserPlus, PlayCircle, etc.)
- `react` - Hooks (useEffect)
- `tailwindcss` - Todos os estilos

**CSS Custom:**
- `peladeiros.css` - Animações customizadas (`animate-fade-in`)

---

## 💻 Como Copiar com React Grab

### **Passo a Passo:**

1. **Iniciar servidor:**
   ```bash
   pnpm dev
   ```

2. **Abrir página:**
   - Acesse `http://localhost:3000/pt/projetos/peladeiros`
   - A seção Hero está no topo da página

3. **Usar React Grab:**
   - Pressione e segure `Ctrl+C` (ou `Cmd+C`)
   - Clique em qualquer parte da seção Hero
   - Contexto completo será copiado

4. **Colar no Cursor/Claude:**
   ```
   [Contexto copiado pelo React Grab]
   
   Adapte esta Hero Section para [novo projeto]:
   - Mude cores para [novas cores]
   - Ajuste textos para [novos textos]
   - Mantenha estrutura mas adapte conteúdo
   ```

### **Contexto Esperado:**

```
Arquivo: apps/web/app/[locale]/projetos/peladeiros/components/HeroSection.tsx
Linha: 12, Coluna: 0
Componente: <HeroSection />
Stack: PeladeirosPage > HeroSection
```

---

## 🧩 Estrutura Interna

A seção contém:

1. **Background Layer**
   - Gradient background
   - Blur effects coloridos

2. **Content Container**
   - Grid 2 colunas (lg:grid-cols-2)

3. **Left Column (Content)**
   - Badge animado
   - Logo Uzz.Ai
   - Título principal
   - Descrição
   - 2 CTAs
   - 3 Estatísticas

4. **Right Column (Mockup)**
   - Container glassmorphism
   - Mockup mobile com conteúdo simulado
   - Badges flutuantes

---

## 📋 Componentes Internos

### **Badge de Destaque**
```tsx
<div className="inline-flex items-center gap-2 rounded-full border border-[#1ABC9C]/30 bg-[#1ABC9C]/10 px-4 py-1.5">
  <span className="animate-ping">...</span>
  100% GRATUITO • SPLIT PIX AUTOMÁTICO
</div>
```

### **CTAs**
- **Primário:** Botão verde com ícone (`bg-[#1ABC9C]`)
- **Secundário:** Botão outline (`border-[#1ABC9C]/50`)

### **Estatísticas**
- 3 itens com ícone + texto
- Cores diferentes por stat

### **Mockup Mobile**
- Container com glassmorphism
- Conteúdo simulado do app
- Badges flutuantes animados

---

## 🎯 Variações Possíveis

### **Variante 1: Sem Mockup**
- Remover coluna direita
- Centralizar conteúdo
- Útil para landing pages mais simples

### **Variante 2: Mockup Diferente**
- Trocar mockup mobile por imagem/vídeo
- Manter estrutura de conteúdo

### **Variante 3: Background Diferente**
- Trocar gradient por imagem de fundo
- Manter blur effects

---

## 🔗 Seções Relacionadas

- `ProblemaSection` - Próxima seção na página
- `SolucaoSection` - Seção seguinte
- `WaitlistSection` - CTA final (similar estrutura)

---

## 📝 Notas de Implementação

- **Performance:** Mockup é renderizado no cliente (`"use client"`)
- **Acessibilidade:** Todos os CTAs têm labels descritivos
- **Responsividade:** Layout adapta para mobile (1 coluna)
- **Animações:** Usa CSS custom (`animate-fade-in`) do `peladeiros.css`

---

## 🎨 Exemplo de Uso

```tsx
import { HeroSection } from './components/HeroSection';

export default function PeladeirosPage() {
  return (
    <main>
      <HeroSection />
      {/* Outras seções... */}
    </main>
  );
}
```

---

## 📚 Referências

- [Design System Uzz.Ai](./patterns/color-schemes.md)
- [Padrões de Animação](./patterns/animations.md)
- [Componente Badge](../components/badges/animated-badge.md)

---

**Última atualização:** 2025-01-27

