# [Nome do Componente]

**Tipo:** [Card/Button/Form/Section/etc.]  
**Projeto:** [Nome do Projeto]  
**Data:** YYYY-MM-DD  
**Status:** ✅ Documentado / 🟡 Em Progresso / ❌ Desatualizado

---

## 📸 Visual

[Screenshot ou descrição detalhada do componente]

**Características visuais principais:**
- [Lista de características visuais]

---

## 📍 Localização

**Arquivo:** `caminho/completo/para/Componente.tsx`  
**Linhas:** XX-YY  
**Componente React:** `<ComponenteNome />`

**Como encontrar:**
1. Abrir projeto em desenvolvimento
2. Navegar até a página que contém o componente
3. Usar React Grab para localizar código exato

---

## 🎨 Design System

### **Cores**
- Primary: `#1ABC9C`
- Secondary: `#2E86AB`
- Accent: `#FFD700`
- Background: `#1C1C1C`

### **Tipografia**
- Headings: Poppins (bold)
- Body: Inter (regular)
- Code: Fira Code

### **Espaçamento**
- Padding: `p-6`
- Gap: `gap-4`
- Margin: `mb-8`

### **Bordas e Efeitos**
- Border radius: `rounded-2xl`
- Border: `border-white/10`
- Hover: `hover:translate-y-[-8px]`
- Shadow: `shadow-[0_20px_40px_rgba(26,188,156,0.2)]`

---

## 🔧 Dependências

```typescript
// Imports necessários
import { Icon } from "lucide-react";
import { useState } from "react";
```

**Pacotes:**
- `lucide-react` - Ícones
- `framer-motion` - Animações (opcional)
- `tailwindcss` - Estilos

---

## 💻 Como Copiar com React Grab

### **Passo a Passo:**

1. **Iniciar servidor de desenvolvimento:**
   ```bash
   pnpm dev
   ```

2. **Abrir navegador:**
   - Acesse `http://localhost:3000`
   - Navegue até a página que contém o componente

3. **Usar React Grab:**
   - Pressione e segure `Ctrl+C` (Windows/Linux) ou `Cmd+C` (Mac)
   - Clique no componente
   - Contexto será copiado automaticamente

4. **Colar no Cursor/Claude:**
   ```
   [Contexto copiado pelo React Grab]
   
   Adapte este componente para [novo projeto]:
   - Mude cores para [novas cores]
   - Ajuste espaçamento para [novo espaçamento]
   ```

### **Contexto Esperado:**

```
Arquivo: apps/web/app/[locale]/projetos/[projeto]/components/Componente.tsx
Linha: XX, Coluna: YY
Componente: <ComponenteNome prop1="..." prop2="..." />
Stack: App > Page > Section > ComponenteNome
```

---

## 📋 Props/Interface

```typescript
interface ComponenteProps {
  // Propriedades do componente
  title: string;
  description?: string;
  variant?: "primary" | "secondary";
  className?: string;
}
```

---

## 🎯 Variações

### **Variante 1: [Nome]**
- Descrição da variante
- Quando usar
- Diferenças principais

### **Variante 2: [Nome]**
- Descrição da variante
- Quando usar
- Diferenças principais

---

## 🔗 Componentes Relacionados

- `[ComponenteRelacionado1]` - [Descrição da relação]
- `[ComponenteRelacionado2]` - [Descrição da relação]

---

## 📝 Notas de Implementação

- [Notas importantes sobre implementação]
- [Gotchas ou cuidados especiais]
- [Performance considerations]

---

## 🎨 Exemplo de Uso

```tsx
import { ComponenteNome } from './components/ComponenteNome';

export function MinhaPage() {
  return (
    <ComponenteNome
      title="Título"
      description="Descrição"
      variant="primary"
    />
  );
}
```

---

## 📚 Referências

- [Link para design system]
- [Link para documentação relacionada]
- [Link para issue/PR relacionado]

---

**Última atualização:** YYYY-MM-DD

