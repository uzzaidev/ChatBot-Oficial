# ⚡ Guia Rápido: Component Database + React Grab

**Como usar a database de componentes com React Grab em 5 minutos**

---

## 🎯 Objetivo

Ter uma **database visual** de todos os componentes do site para reutilização rápida em novos projetos usando React Grab.

---

## 🚀 Workflow Completo

### **1. Catalogar Componente (Primeira Vez)**

```
1. Identificar componente visual único
   ↓
2. Abrir projeto em http://localhost:3000
   ↓
3. Usar React Grab (Ctrl+C + clique)
   ↓
4. Criar documentação usando template
   ↓
5. Salvar em docs/component-database/
```

### **2. Reutilizar Componente (Próximas Vezes)**

```
1. Buscar na database
   docs/component-database/components/cards/feature-card.md
   ↓
2. Ler documentação (localização, dependências)
   ↓
3. Abrir projeto original em dev
   ↓
4. Usar React Grab para copiar contexto
   ↓
5. Colar no novo projeto com instruções
   ↓
6. IA adapta automaticamente
```

---

## 📝 Exemplo Prático

### **Cenário: Reutilizar Hero Section do Peladeiros**

#### **Passo 1: Buscar Documentação**

```bash
# Abrir arquivo
docs/component-database/sections/hero-sections/peladeiros-hero.md
```

#### **Passo 2: Ler Informações**

- ✅ Localização: `HeroSection.tsx` linha 12-291
- ✅ Dependências: `lucide-react`
- ✅ Cores: `#1ABC9C`, `#2E86AB`
- ✅ Estrutura: Badge + Logo + Título + CTAs + Mockup

#### **Passo 3: Copiar com React Grab**

1. Abrir `http://localhost:3000/pt/projetos/peladeiros`
2. Pressionar `Ctrl+C`
3. Clicar na Hero Section
4. Contexto copiado automaticamente

#### **Passo 4: Colar no Novo Projeto**

```
[Contexto copiado pelo React Grab]

Adapte esta Hero Section para o projeto "NovoApp":
- Mude cores primárias para #FF6B6B
- Ajuste textos para "Bem-vindo ao NovoApp"
- Remova o mockup mobile
- Mantenha estrutura de badge e CTAs
```

#### **Passo 5: IA Adapta**

Cursor/Claude edita automaticamente o código com as mudanças solicitadas.

---

## 🗂️ Estrutura da Database

```
docs/component-database/
├── README.md                    # Índice geral
├── sections/                    # Seções completas
│   ├── hero-sections/
│   │   └── peladeiros-hero.md
│   └── feature-sections/
├── components/                  # Componentes isolados
│   ├── cards/
│   │   └── feature-card.md
│   └── buttons/
└── templates/                   # Templates
    └── component-template.md
```

---

## 📋 Checklist de Catalogação

Para cada componente novo:

- [ ] Criar arquivo `.md` na categoria correta
- [ ] Preencher template completo
- [ ] Adicionar screenshot/descrição visual
- [ ] Documentar localização exata (arquivo + linhas)
- [ ] Listar dependências
- [ ] Adicionar exemplo de uso
- [ ] Adicionar entrada no README.md da categoria
- [ ] Testar React Grab funciona corretamente

---

## 💡 Dicas

### **Nomenclatura**

- Use kebab-case: `feature-card.md`
- Seja descritivo: `peladeiros-hero-section.md`
- Inclua projeto: `peladeiros-feature-card.md`

### **Localização**

- Sempre caminho completo: `apps/web/app/[locale]/projetos/...`
- Inclua números de linha quando possível
- Indique componente React: `<FeatureCard />`

### **Dependências**

- Liste TODAS as dependências
- Inclua versões quando relevante
- Documente imports necessários

---

## 🔍 Buscar Componentes

### **Por Tipo**

- Cards → `components/cards/`
- Buttons → `components/buttons/`
- Sections → `sections/hero-sections/`

### **Por Projeto**

- Peladeiros → Buscar "peladeiros" nos arquivos
- Site Builder → Buscar "site-builder"

### **Por Funcionalidade**

- Hero → `sections/hero-sections/`
- Features → `sections/feature-sections/`
- CTAs → `sections/cta-sections/`

---

## ✅ Próximos Passos

1. ✅ Estrutura criada
2. ✅ Templates prontos
3. ✅ Exemplos documentados (Peladeiros)
4. ⏳ Catalogar mais componentes
5. ⏳ Criar scripts de automação (opcional)

---

**Última atualização:** 2025-01-27

