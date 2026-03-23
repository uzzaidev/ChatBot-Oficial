# 📋 PLANO 2: Personalização de Tema das Conversas

## 🎯 Objetivo Geral
Implementar um sistema completo de personalização visual da área de conversas, permitindo que cada usuário customize:
1. **Cor das mensagens recebidas** (incoming)
2. **Cor das mensagens enviadas** (outgoing)
3. **Imagem de fundo** da área de conversas

**Características:**
- ✅ Color picker livre (RGB) para mensagens
- ✅ Galeria de fundos padrão do WhatsApp
- ✅ Upload de imagem personalizada (até 5MB)
- ✅ Preview em tempo real (sem salvar)
- ✅ Armazenamento no Supabase Storage
- ✅ Configuração individual por usuário (não compartilhada)
- ✅ Botão de paleta ao lado do tema claro/escuro

---

## 📊 PARTE 1: Banco de Dados

### 1.1. Nova Tabela: `user_chat_themes`

**Finalidade:** Armazenar as configurações de tema de cada usuário

**Estrutura:**
```sql
CREATE TABLE user_chat_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Cores das mensagens (formato hex)
  incoming_message_color VARCHAR(7) DEFAULT '#2d3338', -- Cinza escuro padrão
  outgoing_message_color VARCHAR(7) DEFAULT '#005c4b',  -- Verde WhatsApp padrão

  -- Background da área de conversas
  background_type VARCHAR(20) DEFAULT 'default', -- 'default' | 'preset' | 'custom'
  background_preset VARCHAR(50), -- Nome do preset (ex: 'whatsapp-1', 'whatsapp-2', etc.)
  background_custom_url TEXT,    -- URL da imagem no Supabase Storage

  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: Um usuário só pode ter uma configuração
  UNIQUE(user_id)
);

-- Índice para busca rápida
CREATE INDEX idx_user_chat_themes_user_id ON user_chat_themes(user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_user_chat_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_chat_themes_updated_at
  BEFORE UPDATE ON user_chat_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_chat_themes_updated_at();
```

### 1.2. Políticas RLS (Row Level Security)

```sql
-- Habilitar RLS
ALTER TABLE user_chat_themes ENABLE ROW LEVEL SECURITY;

-- Política: Usuário pode ver apenas sua própria configuração
CREATE POLICY "Users can view own chat theme"
  ON user_chat_themes
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuário pode inserir sua própria configuração
CREATE POLICY "Users can insert own chat theme"
  ON user_chat_themes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuário pode atualizar sua própria configuração
CREATE POLICY "Users can update own chat theme"
  ON user_chat_themes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuário pode deletar sua própria configuração
CREATE POLICY "Users can delete own chat theme"
  ON user_chat_themes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Política: Service role pode acessar tudo (para migrações/admin)
CREATE POLICY "Service role can access all chat themes"
  ON user_chat_themes
  FOR ALL
  USING (auth.role() = 'service_role');
```

### 1.3. Migration File

**Criar:** `supabase/migrations/YYYYMMDDHHMMSS_create_user_chat_themes.sql`

```sql
-- Migration: Create user_chat_themes table
-- Created: 2026-02-01

BEGIN;

-- Criar tabela
CREATE TABLE user_chat_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  incoming_message_color VARCHAR(7) DEFAULT '#2d3338',
  outgoing_message_color VARCHAR(7) DEFAULT '#005c4b',
  background_type VARCHAR(20) DEFAULT 'default',
  background_preset VARCHAR(50),
  background_custom_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Criar índice
CREATE INDEX idx_user_chat_themes_user_id ON user_chat_themes(user_id);

-- Criar trigger de updated_at
CREATE OR REPLACE FUNCTION update_user_chat_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_chat_themes_updated_at
  BEFORE UPDATE ON user_chat_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_chat_themes_updated_at();

-- Habilitar RLS
ALTER TABLE user_chat_themes ENABLE ROW LEVEL SECURITY;

-- Criar políticas RLS
CREATE POLICY "Users can view own chat theme"
  ON user_chat_themes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat theme"
  ON user_chat_themes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat theme"
  ON user_chat_themes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat theme"
  ON user_chat_themes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can access all chat themes"
  ON user_chat_themes FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;
```

---

## 📦 PARTE 2: Supabase Storage

### 2.1. Criar Bucket

**Nome:** `chat-backgrounds`

**Configurações:**
- **Público:** Sim (as URLs precisam ser acessíveis sem autenticação)
- **Tamanho máximo de arquivo:** 5MB
- **Tipos de arquivo permitidos:** `image/jpeg`, `image/png`, `image/webp`
- **Estrutura de pastas:** `/user-{user_id}/background-{timestamp}.{ext}`

**Script de criação (Supabase Dashboard ou SQL):**
```sql
-- Criar bucket via SQL (alternativa ao dashboard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-backgrounds', 'chat-backgrounds', true);
```

### 2.2. Políticas de Storage

```sql
-- Política: Usuário pode fazer upload na própria pasta
CREATE POLICY "Users can upload to own folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-backgrounds' AND
    (storage.foldername(name))[1] = concat('user-', auth.uid()::text)
  );

-- Política: Usuário pode ver arquivos da própria pasta
CREATE POLICY "Users can view own files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'chat-backgrounds' AND
    (storage.foldername(name))[1] = concat('user-', auth.uid()::text)
  );

-- Política: Usuário pode deletar arquivos da própria pasta
CREATE POLICY "Users can delete own files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'chat-backgrounds' AND
    (storage.foldername(name))[1] = concat('user-', auth.uid()::text)
  );

-- Política: Todos podem ler arquivos públicos (para exibir backgrounds)
CREATE POLICY "Public can read all backgrounds"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'chat-backgrounds');
```

### 2.3. Fundos Padrão do WhatsApp

**Armazenar em:** `public/assets/chat-backgrounds/`

**Lista de fundos padrão:**
1. `whatsapp-default.png` - Padrão original do WhatsApp (bolinhas sutis)
2. `whatsapp-dark.png` - Fundo escuro sólido
3. `whatsapp-light.png` - Fundo claro sólido
4. `whatsapp-abstract-1.png` - Abstrato colorido 1
5. `whatsapp-abstract-2.png` - Abstrato colorido 2
6. `whatsapp-nature-1.png` - Natureza (folhas)
7. `whatsapp-nature-2.png` - Natureza (flores)
8. `whatsapp-geometric.png` - Padrão geométrico

**Estrutura de metadados:**
```typescript
export const DEFAULT_BACKGROUNDS = [
  {
    id: 'default',
    name: 'Padrão WhatsApp',
    url: '/assets/chat-backgrounds/whatsapp-default.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/whatsapp-default-thumb.png',
    category: 'default'
  },
  {
    id: 'dark',
    name: 'Escuro Sólido',
    url: '/assets/chat-backgrounds/whatsapp-dark.png',
    thumbnail: '/assets/chat-backgrounds/thumbs/whatsapp-dark-thumb.png',
    category: 'solid'
  },
  // ... outros backgrounds
]
```

---

## 🎨 PARTE 3: Componentes React

### 3.1. Componente: `ChatThemePaletteButton.tsx`

**Localização:** `src/components/ChatThemePaletteButton.tsx`

**Finalidade:** Botão de paleta que abre o modal de personalização

**Estrutura:**
```tsx
'use client'

import { Palette } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChatThemeCustomizerModal } from '@/components/ChatThemeCustomizerModal'

export const ChatThemePaletteButton = () => {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowModal(true)}
        className="relative"
        title="Personalizar tema das conversas"
      >
        <Palette className="h-5 w-5" />
      </Button>

      <ChatThemeCustomizerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  )
}
```

### 3.2. Componente: `ChatThemeCustomizerModal.tsx`

**Localização:** `src/components/ChatThemeCustomizerModal.tsx`

**Finalidade:** Modal principal de personalização com preview em tempo real

**Estrutura (resumida):**
```tsx
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Upload, RotateCcw } from 'lucide-react'

interface ChatTheme {
  incomingMessageColor: string
  outgoingMessageColor: string
  backgroundType: 'default' | 'preset' | 'custom'
  backgroundPreset?: string
  backgroundCustomUrl?: string
}

export const ChatThemeCustomizerModal = ({ isOpen, onClose }: Props) => {
  const [theme, setTheme] = useState<ChatTheme>({
    incomingMessageColor: '#2d3338',
    outgoingMessageColor: '#005c4b',
    backgroundType: 'default',
  })

  // Carregar tema atual do usuário
  useEffect(() => {
    if (isOpen) {
      loadUserTheme()
    }
  }, [isOpen])

  // Aplicar tema em tempo real (preview)
  useEffect(() => {
    applyThemePreview(theme)
  }, [theme])

  const handleSave = async () => {
    await saveThemeToDatabase(theme)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalizar Tema das Conversas</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="colors">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="colors">Cores das Mensagens</TabsTrigger>
            <TabsTrigger value="background">Fundo</TabsTrigger>
          </TabsList>

          {/* Tab 1: Cores das Mensagens */}
          <TabsContent value="colors">
            <div className="space-y-4">
              {/* Color Picker - Mensagens Recebidas */}
              <div>
                <Label>Cor das Mensagens Recebidas</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="color"
                    value={theme.incomingMessageColor}
                    onChange={(e) => setTheme({ ...theme, incomingMessageColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={theme.incomingMessageColor}
                    onChange={(e) => setTheme({ ...theme, incomingMessageColor: e.target.value })}
                    placeholder="#2d3338"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Color Picker - Mensagens Enviadas */}
              <div>
                <Label>Cor das Mensagens Enviadas</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="color"
                    value={theme.outgoingMessageColor}
                    onChange={(e) => setTheme({ ...theme, outgoingMessageColor: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={theme.outgoingMessageColor}
                    onChange={(e) => setTheme({ ...theme, outgoingMessageColor: e.target.value })}
                    placeholder="#005c4b"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Preview Exemplo */}
              <div className="border rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium mb-2">Preview:</p>
                {/* Exemplo de mensagem recebida */}
                <div className="flex justify-start">
                  <div
                    className="rounded-lg p-3 max-w-xs"
                    style={{ backgroundColor: theme.incomingMessageColor }}
                  >
                    <p className="text-sm text-white">Olá! Esta é uma mensagem recebida.</p>
                  </div>
                </div>
                {/* Exemplo de mensagem enviada */}
                <div className="flex justify-end">
                  <div
                    className="rounded-lg p-3 max-w-xs"
                    style={{ backgroundColor: theme.outgoingMessageColor }}
                  >
                    <p className="text-sm text-white">Esta é uma mensagem enviada!</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Fundo */}
          <TabsContent value="background">
            <div className="space-y-4">
              {/* Galeria de Fundos Padrão */}
              <div>
                <Label>Fundos Padrão do WhatsApp</Label>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {DEFAULT_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setTheme({
                        ...theme,
                        backgroundType: 'preset',
                        backgroundPreset: bg.id,
                      })}
                      className={cn(
                        "relative rounded-lg overflow-hidden border-2 transition-all",
                        theme.backgroundType === 'preset' && theme.backgroundPreset === bg.id
                          ? "border-primary ring-2 ring-primary"
                          : "border-transparent hover:border-primary/50"
                      )}
                    >
                      <img
                        src={bg.thumbnail}
                        alt={bg.name}
                        className="w-full h-20 object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
                        <p className="text-xs text-white text-center truncate">{bg.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload de Imagem Customizada */}
              <div>
                <Label>Upload de Imagem Personalizada</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="background-upload"
                  />
                  <label
                    htmlFor="background-upload"
                    className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary transition-colors"
                  >
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Clique para fazer upload (máx. 5MB)
                    </span>
                  </label>
                  {theme.backgroundCustomUrl && (
                    <div className="mt-2">
                      <img
                        src={theme.backgroundCustomUrl}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center mt-6">
          <Button
            variant="outline"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar Tema
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### 3.3. Hook: `useChatTheme.ts`

**Localização:** `src/hooks/useChatTheme.ts`

**Finalidade:** Gerenciar o tema atual do usuário e aplicar as configurações

**Estrutura:**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClientBrowser } from '@/lib/supabase'

interface ChatTheme {
  incomingMessageColor: string
  outgoingMessageColor: string
  backgroundType: 'default' | 'preset' | 'custom'
  backgroundPreset?: string
  backgroundCustomUrl?: string
}

export const useChatTheme = () => {
  const [theme, setTheme] = useState<ChatTheme | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTheme()
  }, [])

  const loadTheme = async () => {
    try {
      const supabase = createClientBrowser()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('user_chat_themes')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Erro ao carregar tema:', error)
        return
      }

      if (data) {
        setTheme({
          incomingMessageColor: data.incoming_message_color,
          outgoingMessageColor: data.outgoing_message_color,
          backgroundType: data.background_type,
          backgroundPreset: data.background_preset,
          backgroundCustomUrl: data.background_custom_url,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar tema:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveTheme = async (newTheme: ChatTheme) => {
    try {
      const supabase = createClientBrowser()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Usuário não autenticado')

      const { error } = await supabase
        .from('user_chat_themes')
        .upsert({
          user_id: user.id,
          incoming_message_color: newTheme.incomingMessageColor,
          outgoing_message_color: newTheme.outgoingMessageColor,
          background_type: newTheme.backgroundType,
          background_preset: newTheme.backgroundPreset,
          background_custom_url: newTheme.backgroundCustomUrl,
        })

      if (error) throw error

      setTheme(newTheme)
      applyTheme(newTheme)
    } catch (error) {
      console.error('Erro ao salvar tema:', error)
      throw error
    }
  }

  const applyTheme = (themeToApply: ChatTheme) => {
    // Aplicar cores das mensagens via CSS variables
    document.documentElement.style.setProperty(
      '--chat-incoming-color',
      themeToApply.incomingMessageColor
    )
    document.documentElement.style.setProperty(
      '--chat-outgoing-color',
      themeToApply.outgoingMessageColor
    )

    // Aplicar background
    let backgroundUrl = ''
    if (themeToApply.backgroundType === 'preset' && themeToApply.backgroundPreset) {
      const preset = DEFAULT_BACKGROUNDS.find(bg => bg.id === themeToApply.backgroundPreset)
      backgroundUrl = preset?.url || ''
    } else if (themeToApply.backgroundType === 'custom' && themeToApply.backgroundCustomUrl) {
      backgroundUrl = themeToApply.backgroundCustomUrl
    }

    if (backgroundUrl) {
      document.documentElement.style.setProperty(
        '--chat-background-image',
        `url('${backgroundUrl}')`
      )
    } else {
      document.documentElement.style.removeProperty('--chat-background-image')
    }
  }

  return {
    theme,
    loading,
    saveTheme,
    applyTheme,
  }
}
```

---

## 🔌 PARTE 4: API Routes

### 4.1. Upload de Imagem

**Criar:** `src/app/api/chat-theme/upload/route.ts`

**Finalidade:** Fazer upload de imagem de fundo para o Supabase Storage

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Obter arquivo do FormData
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 })
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Use JPEG, PNG ou WebP.' },
        { status: 400 }
      )
    }

    // Validar tamanho (5MB = 5 * 1024 * 1024 bytes)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo: 5MB.' },
        { status: 400 }
      )
    }

    // Gerar nome único do arquivo
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const fileName = `user-${user.id}/background-${timestamp}.${extension}`

    // Fazer upload para o Supabase Storage
    const { data, error } = await supabase.storage
      .from('chat-backgrounds')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Erro ao fazer upload:', error)
      return NextResponse.json(
        { error: 'Erro ao fazer upload da imagem' },
        { status: 500 }
      )
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('chat-backgrounds')
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: data.path,
    })
  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
```

### 4.2. Obter Tema do Usuário

**Criar:** `src/app/api/chat-theme/route.ts`

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('user_chat_themes')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Erro ao buscar tema:', error)
      return NextResponse.json({ error: 'Erro ao buscar tema' }, { status: 500 })
    }

    return NextResponse.json({ theme: data || null })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      incomingMessageColor,
      outgoingMessageColor,
      backgroundType,
      backgroundPreset,
      backgroundCustomUrl,
    } = body

    const { data, error } = await supabase
      .from('user_chat_themes')
      .upsert({
        user_id: user.id,
        incoming_message_color: incomingMessageColor,
        outgoing_message_color: outgoingMessageColor,
        background_type: backgroundType,
        background_preset: backgroundPreset,
        background_custom_url: backgroundCustomUrl,
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao salvar tema:', error)
      return NextResponse.json({ error: 'Erro ao salvar tema' }, { status: 500 })
    }

    return NextResponse.json({ theme: data })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
```

---

## 🎨 PARTE 5: Integração com Componentes Existentes

### 5.1. Adicionar Botão ao Layout

**Modificar:** `src/app/dashboard/conversations/layout.tsx` ou similar

**Adicionar ao lado do ThemeToggle:**
```tsx
import { ChatThemePaletteButton } from '@/components/ChatThemePaletteButton'

// Onde está o ThemeToggle, adicionar:
<div className="flex items-center gap-2">
  <ChatThemePaletteButton />
  <ThemeToggle />
</div>
```

### 5.2. Aplicar Tema em `ConversationDetail`

**Modificar:** `src/components/ConversationDetail.tsx`

**Adicionar no início do componente:**
```tsx
import { useChatTheme } from '@/hooks/useChatTheme'

export const ConversationDetail = ({ ... }) => {
  const { theme, loading } = useChatTheme()

  // Aplicar tema quando carregar
  useEffect(() => {
    if (theme && !loading) {
      // Tema já é aplicado automaticamente pelo hook
    }
  }, [theme, loading])

  // ... resto do componente
}
```

### 5.3. Atualizar `MessageBubble.tsx`

**Modificar:** `src/components/MessageBubble.tsx` (linha 516-519)

**Usar CSS variables dinâmicas:**
```tsx
// Antes (linha 517-519)
const bubbleStyles = isIncoming
  ? 'bg-[hsl(var(--message-incoming-bg))] shadow-md border border-border'
  : 'bg-[hsl(var(--message-outgoing-bg))] shadow-lg'

// Depois
const bubbleStyles = isIncoming
  ? 'shadow-md border border-border'
  : 'shadow-lg'

const bubbleColorStyle = isIncoming
  ? { backgroundColor: 'var(--chat-incoming-color, #2d3338)' }
  : { backgroundColor: 'var(--chat-outgoing-color, #005c4b)' }

// E no JSX:
<div
  className={`... ${bubbleStyles}`}
  style={bubbleColorStyle}
>
  {/* conteúdo */}
</div>
```

### 5.4. Atualizar `ConversationDetail` (Background)

**Modificar:** `src/components/ConversationDetail.tsx`

**Adicionar background dinâmico na área de chat:**
```tsx
// No container principal das mensagens (linha 690)
<ScrollArea
  ref={scrollAreaRef}
  className="h-full px-2 md:px-4"
  style={{
    backgroundImage: 'var(--chat-background-image, none)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }}
>
  {/* mensagens */}
</ScrollArea>
```

### 5.5. Adicionar CSS Variables em `globals.css`

**Modificar:** `src/app/globals.css`

**Adicionar novas variáveis:**
```css
@layer base {
  :root {
    /* ... variáveis existentes ... */

    /* Chat theme customization */
    --chat-incoming-color: #2d3338; /* Padrão cinza escuro */
    --chat-outgoing-color: #005c4b;  /* Padrão verde WhatsApp */
    --chat-background-image: none;   /* Sem imagem por padrão */
  }

  .light {
    /* ... variáveis existentes ... */

    /* Chat theme customization (light mode) */
    --chat-incoming-color: #ffffff;  /* Branco no modo claro */
    --chat-outgoing-color: #005c4b;  /* Verde WhatsApp */
  }
}
```

---

## 📋 PARTE 6: Checklist de Implementação

### FASE 1: Banco de Dados ✅

- [ ] **1.1** Criar migration `create_user_chat_themes.sql`
- [ ] **1.2** Aplicar migration: `supabase db push`
- [ ] **1.3** Verificar tabela criada no Supabase Dashboard
- [ ] **1.4** Testar políticas RLS (criar/ler/atualizar próprio tema)

### FASE 2: Storage ✅

- [ ] **2.1** Criar bucket `chat-backgrounds` no Supabase Dashboard
- [ ] **2.2** Configurar bucket como público
- [ ] **2.3** Aplicar políticas de storage
- [ ] **2.4** Fazer upload dos fundos padrão do WhatsApp para `public/assets/chat-backgrounds/`
- [ ] **2.5** Criar thumbnails dos fundos (100x100px)

### FASE 3: API Routes ✅

- [ ] **3.1** Criar `/api/chat-theme/route.ts` (GET e POST)
- [ ] **3.2** Criar `/api/chat-theme/upload/route.ts` (upload de imagem)
- [ ] **3.3** Testar upload com Postman/Thunder Client
- [ ] **3.4** Verificar URLs públicas das imagens

### FASE 4: Hooks e Utilitários ✅

- [ ] **4.1** Criar hook `useChatTheme.ts`
- [ ] **4.2** Criar arquivo de constantes `DEFAULT_BACKGROUNDS`
- [ ] **4.3** Testar carregar tema do usuário
- [ ] **4.4** Testar salvar tema

### FASE 5: Componentes UI ✅

- [ ] **5.1** Criar `ChatThemePaletteButton.tsx`
- [ ] **5.2** Criar `ChatThemeCustomizerModal.tsx`
- [ ] **5.3** Implementar Tab "Cores das Mensagens" com color pickers
- [ ] **5.4** Implementar Tab "Fundo" com galeria de presets
- [ ] **5.5** Implementar upload de imagem customizada
- [ ] **5.6** Implementar preview em tempo real
- [ ] **5.7** Implementar botão "Restaurar Padrão"
- [ ] **5.8** Implementar função de salvar

### FASE 6: Integração ✅

- [ ] **6.1** Adicionar `ChatThemePaletteButton` ao lado do `ThemeToggle`
- [ ] **6.2** Adicionar CSS variables em `globals.css`
- [ ] **6.3** Modificar `MessageBubble.tsx` para usar cores dinâmicas
- [ ] **6.4** Modificar `ConversationDetail.tsx` para aplicar background
- [ ] **6.5** Integrar `useChatTheme` hook no `ConversationDetail`

### FASE 7: Testes ✅

- [ ] **7.1** Testar criar tema novo (primeiro acesso)
- [ ] **7.2** Testar atualizar tema existente
- [ ] **7.3** Testar color picker para mensagens recebidas
- [ ] **7.4** Testar color picker para mensagens enviadas
- [ ] **7.5** Testar selecionar fundo padrão
- [ ] **7.6** Testar upload de imagem (JPEG, PNG, WebP)
- [ ] **7.7** Testar limite de 5MB (deve bloquear arquivos maiores)
- [ ] **7.8** Testar preview em tempo real (sem salvar)
- [ ] **7.9** Testar restaurar padrão
- [ ] **7.10** Testar persistência (recarregar página)
- [ ] **7.11** Testar isolamento entre usuários (usuário A não vê tema do usuário B)
- [ ] **7.12** Testar em modo claro e escuro

---

## 🎨 Fundos Padrão do WhatsApp (Assets)

### Lista de Fundos a Criar/Obter:

1. **whatsapp-default.png** - Padrão original (bolinhas sutis em fundo escuro)
   - Resolução: 1920x1080px
   - Cor base: `#0b141a` com padrão de círculos opacos

2. **whatsapp-dark.png** - Sólido escuro
   - Resolução: 1920x1080px
   - Cor: `#0b141a`

3. **whatsapp-light.png** - Sólido claro
   - Resolução: 1920x1080px
   - Cor: `#e5ddd5` (bege claro WhatsApp)

4. **whatsapp-abstract-1.png** - Abstrato colorido
   - Gradiente: Verde menta → Azul
   - Padrão: Ondas suaves

5. **whatsapp-abstract-2.png** - Abstrato colorido 2
   - Gradiente: Roxo → Rosa
   - Padrão: Geométrico

6. **whatsapp-nature-1.png** - Natureza (folhas)
   - Imagem: Folhas verdes em fundo escuro
   - Opacity: 20%

7. **whatsapp-nature-2.png** - Natureza (flores)
   - Imagem: Flores suaves em fundo claro
   - Opacity: 30%

8. **whatsapp-geometric.png** - Padrão geométrico
   - Padrão: Hexágonos ou triângulos
   - Cores: Tom sobre tom

**Fonte:** Criar no Figma/Canva ou baixar de sites de assets gratuitos (Unsplash, Pexels)

---

## 🔧 Estrutura de Arquivos

```
src/
├── app/
│   ├── api/
│   │   └── chat-theme/
│   │       ├── route.ts           # GET/POST tema
│   │       └── upload/
│   │           └── route.ts       # Upload imagem
│   ├── dashboard/
│   │   └── conversations/
│   │       └── layout.tsx         # Adicionar botão
│   └── globals.css                # CSS variables
├── components/
│   ├── ChatThemePaletteButton.tsx
│   ├── ChatThemeCustomizerModal.tsx
│   ├── ConversationDetail.tsx     # Modificar
│   └── MessageBubble.tsx          # Modificar
├── hooks/
│   └── useChatTheme.ts
└── lib/
    └── constants/
        └── chat-backgrounds.ts    # Lista de fundos padrão

public/
└── assets/
    └── chat-backgrounds/
        ├── whatsapp-default.png
        ├── whatsapp-dark.png
        ├── whatsapp-light.png
        ├── whatsapp-abstract-1.png
        ├── whatsapp-abstract-2.png
        ├── whatsapp-nature-1.png
        ├── whatsapp-nature-2.png
        ├── whatsapp-geometric.png
        └── thumbs/                # Thumbnails 100x100
            ├── whatsapp-default-thumb.png
            ├── whatsapp-dark-thumb.png
            └── ...

supabase/
└── migrations/
    └── YYYYMMDDHHMMSS_create_user_chat_themes.sql
```

---

## ⚠️ Avisos Importantes

1. **NÃO modificar** cores de texto automaticamente (manter contraste legível)
2. **VALIDAR** sempre o tamanho do arquivo (máx. 5MB)
3. **TESTAR** contraste de cores (WCAG AA) ao salvar
4. **LIMPAR** imagens antigas do Storage ao fazer novo upload
5. **COMPRIMIR** imagens antes do upload (client-side) para economia de storage
6. **MANTER** fallback para tema padrão se carregar falhar
7. **USAR** Supabase Storage (não base64) para melhor performance

---

## 🎯 Critérios de Aceitação

### Funcionalidades Básicas
- [ ] Botão de paleta aparece ao lado do tema claro/escuro
- [ ] Modal abre ao clicar no botão
- [ ] Usuário pode escolher cor para mensagens recebidas (color picker)
- [ ] Usuário pode escolher cor para mensagens enviadas (color picker)
- [ ] Usuário pode selecionar fundo padrão da galeria
- [ ] Usuário pode fazer upload de imagem personalizada (até 5MB)

### Preview e Persistência
- [ ] Mudanças aparecem em tempo real (preview) sem salvar
- [ ] Ao clicar "Salvar", configurações são persistidas no banco
- [ ] Ao recarregar a página, tema personalizado é mantido
- [ ] "Restaurar Padrão" volta para cores originais

### Isolamento e Segurança
- [ ] Cada usuário vê apenas seu próprio tema
- [ ] Não é possível acessar/modificar tema de outro usuário
- [ ] Upload de imagem valida tipo e tamanho
- [ ] Storage policies impedem acesso não autorizado

### Responsividade
- [ ] Modal responsivo (mobile, tablet, desktop)
- [ ] Color pickers funcionam em touch screens
- [ ] Upload de imagem funciona em mobile

### Performance
- [ ] Tema carrega rápido (< 500ms)
- [ ] Preview não causa lag ao mudar cores
- [ ] Imagens são otimizadas/comprimidas

---

**Última atualização:** 2026-02-01
**Versão:** 1.0
**Responsável:** Claude Code
**Tempo estimado:** 12-16 horas de desenvolvimento
