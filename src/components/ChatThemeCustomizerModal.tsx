'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useChatTheme } from '@/hooks/useChatTheme'
import { DEFAULT_BACKGROUNDS, DEFAULT_CHAT_THEME, type ChatTheme } from '@/lib/constants/chat-backgrounds'
import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2, RotateCcw, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ChatThemeCustomizerModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Modal de Personalização de Tema das Conversas
 *
 * Features:
 * - Tab 1: Seleção de cores das mensagens (recebidas e enviadas) com color picker
 * - Tab 2: Seleção de fundo (presets do WhatsApp + upload de imagem customizada)
 * - Preview em tempo real (sem salvar)
 * - Botão "Restaurar Padrão"
 * - Botão "Salvar" para persistir no banco
 */
export const ChatThemeCustomizerModal = ({
  isOpen,
  onClose,
}: ChatThemeCustomizerModalProps) => {
  const { theme: currentTheme, saveTheme, applyTheme, resetTheme } = useChatTheme()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado local do tema (para preview)
  const [previewTheme, setPreviewTheme] = useState<ChatTheme>(DEFAULT_CHAT_THEME)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Carregar tema atual ao abrir o modal
  useEffect(() => {
    if (isOpen && currentTheme) {
      setPreviewTheme(currentTheme)
    }
  }, [isOpen, currentTheme])

  // Aplicar preview em tempo real
  useEffect(() => {
    if (isOpen) {
      applyTheme(previewTheme)
    }
  }, [previewTheme, isOpen, applyTheme])

  // Restaurar tema original ao fechar sem salvar
  useEffect(() => {
    if (!isOpen && currentTheme) {
      applyTheme(currentTheme)
    }
  }, [isOpen, currentTheme, applyTheme])

  /**
   * Salvar tema no banco de dados
   */
  const handleSave = async () => {
    try {
      setSaving(true)
      await saveTheme(previewTheme)
      toast({
        title: 'Tema salvo!',
        description: 'Suas preferências foram salvas com sucesso.',
      })
      onClose()
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o tema. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Restaurar tema padrão
   */
  const handleReset = async () => {
    try {
      setSaving(true)
      await resetTheme()
      setPreviewTheme(DEFAULT_CHAT_THEME)
      toast({
        title: 'Tema restaurado',
        description: 'Voltou para as configurações padrão.',
      })
    } catch (error) {
      toast({
        title: 'Erro ao restaurar',
        description: 'Não foi possível restaurar o tema padrão.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Upload de imagem customizada
   */
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validar tamanho (5MB)
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: `Tamanho máximo: 5MB. Seu arquivo: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        variant: 'destructive',
      })
      return
    }

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Tipo de arquivo inválido',
        description: 'Use apenas JPEG, PNG ou WebP.',
        variant: 'destructive',
      })
      return
    }

    try {
      setUploading(true)

      // Criar FormData para upload
      const formData = new FormData()
      formData.append('file', file)

      // Fazer upload via API
      const response = await fetch('/api/chat-theme/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao fazer upload')
      }

      const data = await response.json()

      // Atualizar preview com a URL da imagem
      setPreviewTheme(prev => ({
        ...prev,
        backgroundType: 'custom',
        backgroundCustomUrl: data.url,
        backgroundPreset: undefined,
      }))

      toast({
        title: 'Upload concluído!',
        description: 'Sua imagem foi enviada com sucesso.',
      })
    } catch (error) {
      toast({
        title: 'Erro no upload',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              🎨
            </span>
            Personalizar Tema das Conversas
          </DialogTitle>
          <DialogDescription>
            Customize as cores das mensagens e o fundo da área de conversas
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="colors" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="colors">Cores das Mensagens</TabsTrigger>
            <TabsTrigger value="background">Fundo</TabsTrigger>
          </TabsList>

          {/* ============================================ */}
          {/* TAB 1: CORES DAS MENSAGENS                   */}
          {/* ============================================ */}
          <TabsContent value="colors" className="space-y-6 mt-6">
            {/* Cor das Mensagens Recebidas */}
          <div className="space-y-3">
            <Label htmlFor="incoming-bg-color">Cor das Mensagens Recebidas</Label>
            
            <div className="flex gap-3">
              {/* Cor de fundo */}
              <div className="flex-1">
                <Label htmlFor="incoming-bg-color" className="text-xs text-muted-foreground">
                  Fundo
                </Label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded border cursor-pointer"
                    style={{ backgroundColor: previewTheme.incomingMessageColor }}
                    onClick={() => document.getElementById('incoming-bg-color')?.click()}
                  />
                  <Input
                    id="incoming-bg-color"
                    type="color"
                    value={previewTheme.incomingMessageColor}
                    onChange={(e) =>
                      setPreviewTheme({ ...previewTheme, incomingMessageColor: e.target.value })
                    }
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={previewTheme.incomingMessageColor.toUpperCase()}
                    onChange={(e) => {
                      const value = e.target.value
                      if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                        setPreviewTheme({ ...previewTheme, incomingMessageColor: value })
                      }
                    }}
                    placeholder="#2d3338"
                    className="font-mono"
                    maxLength={7}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cor de fundo das mensagens que você recebe
                </p>
              </div>

              {/* Cor do texto */}
              <div className="flex-1">
                <Label htmlFor="incoming-text-color" className="text-xs text-muted-foreground">
                  Texto
                </Label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded border cursor-pointer"
                    style={{ backgroundColor: previewTheme.incomingTextColor }}
                    onClick={() => document.getElementById('incoming-text-color')?.click()}
                  />
                  <Input
                    id="incoming-text-color"
                    type="color"
                    value={previewTheme.incomingTextColor}
                    onChange={(e) =>
                      setPreviewTheme({ ...previewTheme, incomingTextColor: e.target.value })
                    }
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={previewTheme.incomingTextColor.toUpperCase()}
                    onChange={(e) => {
                      const value = e.target.value
                      if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                        setPreviewTheme({ ...previewTheme, incomingTextColor: value })
                      }
                 }}
                    placeholder="#FFFFFF"
                    className="font-mono"
                    maxLength={7}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cor do texto nas mensagens recebidas
                </p>
              </div>
            </div>
          </div>

          {/* Cor das Mensagens Enviadas */}
          <div className="space-y-3">
            <Label htmlFor="outgoing-bg-color">Cor das Mensagens Enviadas</Label>
            
            <div className="flex gap-3">
              {/* Cor de fundo */}
              <div className="flex-1">
                <Label htmlFor="outgoing-bg-color" className="text-xs text-muted-foreground">
                  Fundo
                </Label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded border cursor-pointer"
                    style={{ backgroundColor: previewTheme.outgoingMessageColor }}
                    onClick={() => document.getElementById('outgoing-bg-color')?.click()}
                  />
                  <Input
                    id="outgoing-bg-color"
                    type="color"
                    value={previewTheme.outgoingMessageColor}
                    onChange={(e) =>
                      setPreviewTheme({ ...previewTheme, outgoingMessageColor: e.target.value })
                    }
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={previewTheme.outgoingMessageColor.toUpperCase()}
                    onChange={(e) => {
                      const value = e.target.value
                      if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                        setPreviewTheme({ ...previewTheme, outgoingMessageColor: value })
                      }
                    }}
                    placeholder="#005c4b"
                    className="font-mono"
                    maxLength={7}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cor de fundo das mensagens que você envia
                </p>
              </div>

              {/* Cor do texto */}
              <div className="flex-1">
                <Label htmlFor="outgoing-text-color" className="text-xs text-muted-foreground">
                  Texto
                </Label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded border cursor-pointer"
                    style={{ backgroundColor: previewTheme.outgoingTextColor }}
                    onClick={() => document.getElementById('outgoing-text-color')?.click()}
                  />
                  <Input
                    id="outgoing-text-color"
                    type="color"
                    value={previewTheme.outgoingTextColor}
                    onChange={(e) =>
                      setPreviewTheme({ ...previewTheme, outgoingTextColor: e.target.value })
                    }
                    className="w-20"
                  />
                  <Input
                    type="text"
                    value={previewTheme.outgoingTextColor.toUpperCase()}
                    onChange={(e) => {
                      const value = e.target.value
                      if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                        setPreviewTheme({ ...previewTheme, outgoingTextColor: value })
                      }
                    }}
                    placeholder="#FFFFFF"
                    className="font-mono"
                    maxLength={7}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cor do texto nas mensagens enviadas
                </p>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview:</Label>
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
              {/* Mensagem recebida */}
              <div className="flex justify-start">
                <div
                  className="px-4 py-2 rounded-lg max-w-[70%]"
                  style={{
                    backgroundColor: previewTheme.incomingMessageColor,
                    color: previewTheme.incomingTextColor,
                  }}
                >
                  <p className="text-sm">Olá Este é uma mensagem recebida.</p>
                  <span className="text-xs opacity-70">10:30</span>
                </div>
              </div>

              {/* Mensagem enviada */}
              <div className="flex justify-end">
                <div
                  className="px-4 py-2 rounded-lg max-w-[70%]"
                  style={{
                    backgroundColor: previewTheme.outgoingMessageColor,
                    color: previewTheme.outgoingTextColor,
                  }}
                >
                  <p className="text-sm">Esta é uma mensagem enviada por você!</p>
                  <span className="text-xs opacity-70 flex items-center gap-1">
                    10:31 <CheckCircle2 className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </div>
          </TabsContent>

          {/* ============================================ */}
          {/* TAB 2: FUNDO                                 */}
          {/* ============================================ */}
          <TabsContent value="background" className="space-y-6 mt-6">
            {/* Galeria de Fundos Padrão */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Fundos Padrão do WhatsApp</Label>
              <div className="grid grid-cols-4 gap-3">
                {DEFAULT_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => setPreviewTheme(prev => ({
                      ...prev,
                      backgroundType: 'preset',
                      backgroundPreset: bg.id,
                      backgroundCustomUrl: undefined,
                    }))}
                    className={cn(
                      "relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                      previewTheme.backgroundType === 'preset' && previewTheme.backgroundPreset === bg.id
                        ? "border-primary ring-2 ring-primary ring-offset-2"
                        : "border-transparent hover:border-primary/50"
                    )}
                    title={bg.description}
                  >
                    <img
                      src={bg.thumbnail}
                      alt={bg.name}
                      className="w-full h-20 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5">
                      <p className="text-xs text-white text-center truncate font-medium">
                        {bg.name}
                      </p>
                    </div>
                    {previewTheme.backgroundType === 'preset' && previewTheme.backgroundPreset === bg.id && (
                      <div className="absolute top-1 right-1 bg-primary rounded-full p-1">
                        <CheckCircle2 className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Sem Fundo (Padrão) */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Sem Fundo</Label>
              <button
                onClick={() => setPreviewTheme(prev => ({
                  ...prev,
                  backgroundType: 'default',
                  backgroundPreset: undefined,
                  backgroundCustomUrl: undefined,
                }))}
                className={cn(
                  "w-full p-4 rounded-lg border-2 transition-all text-left",
                  previewTheme.backgroundType === 'default'
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <p className="font-medium text-sm">Usar fundo padrão do tema</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Sem imagem de fundo (depende do tema claro/escuro)
                </p>
              </button>
            </div>

            {/* Upload de Imagem Customizada */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Imagem Personalizada</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="hidden"
                id="background-upload"
              />
              <label
                htmlFor="background-upload"
                className={cn(
                  "flex items-center justify-center gap-3 border-2 border-dashed rounded-lg p-8 cursor-pointer transition-all",
                  uploading
                    ? "border-primary bg-primary/5 cursor-not-allowed"
                    : "border-border hover:border-primary hover:bg-primary/5"
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    <span className="text-sm font-medium text-primary">
                      Fazendo upload...
                    </span>
                  </>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        Clique para fazer upload
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        JPEG, PNG ou WebP (máx. 5MB)
                      </p>
                    </div>
                  </>
                )}
              </label>

              {/* Preview da Imagem Customizada */}
              {previewTheme.backgroundType === 'custom' && previewTheme.backgroundCustomUrl && (
                <div className="relative rounded-lg overflow-hidden border-2 border-primary">
                  <img
                    src={previewTheme.backgroundCustomUrl}
                    alt="Background customizado"
                    className="w-full h-32 object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-primary rounded-full p-1.5">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                    <p className="text-xs text-white font-medium">Imagem personalizada</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving || uploading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving || uploading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Salvar Tema
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
