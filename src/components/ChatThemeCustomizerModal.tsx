'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Upload, RotateCcw, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChatTheme } from '@/hooks/useChatTheme'
import { DEFAULT_BACKGROUNDS, DEFAULT_CHAT_THEME, type ChatTheme } from '@/lib/constants/chat-backgrounds'
import { useToast } from '@/hooks/use-toast'

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
            {/* Cor Mensagens Recebidas */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Cor das Mensagens Recebidas</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Input
                    type="color"
                    value={previewTheme.incomingMessageColor}
                    onChange={(e) => setPreviewTheme(prev => ({
                      ...prev,
                      incomingMessageColor: e.target.value
                    }))}
                    className="w-20 h-12 cursor-pointer"
                  />
                </div>
                <Input
                  type="text"
                  value={previewTheme.incomingMessageColor.toUpperCase()}
                  onChange={(e) => {
                    const value = e.target.value
                    if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                      setPreviewTheme(prev => ({
                        ...prev,
                        incomingMessageColor: value
                      }))
                    }
                  }}
                  placeholder="#2D3338"
                  className="flex-1 font-mono"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Cor de fundo das mensagens que você recebe
              </p>
            </div>

            {/* Cor Mensagens Enviadas */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Cor das Mensagens Enviadas</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Input
                    type="color"
                    value={previewTheme.outgoingMessageColor}
                    onChange={(e) => setPreviewTheme(prev => ({
                      ...prev,
                      outgoingMessageColor: e.target.value
                    }))}
                    className="w-20 h-12 cursor-pointer"
                  />
                </div>
                <Input
                  type="text"
                  value={previewTheme.outgoingMessageColor.toUpperCase()}
                  onChange={(e) => {
                    const value = e.target.value
                    if (/^#[0-9A-F]{0,6}$/i.test(value)) {
                      setPreviewTheme(prev => ({
                        ...prev,
                        outgoingMessageColor: value
                      }))
                    }
                  }}
                  placeholder="#005C4B"
                  className="flex-1 font-mono"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Cor de fundo das mensagens que você envia
              </p>
            </div>

            {/* Preview Exemplo */}
            <div className="border rounded-lg p-6 space-y-3 bg-muted/30">
              <p className="text-sm font-semibold mb-4">Preview:</p>

              {/* Exemplo de mensagem recebida */}
              <div className="flex justify-start">
                <div
                  className="rounded-lg p-3 max-w-xs shadow-sm"
                  style={{ backgroundColor: previewTheme.incomingMessageColor }}
                >
                  <p className="text-sm text-white">
                    Olá! Esta é uma mensagem recebida.
                  </p>
                  <p className="text-xs text-white/70 mt-1">10:30</p>
                </div>
              </div>

              {/* Exemplo de mensagem enviada */}
              <div className="flex justify-end">
                <div
                  className="rounded-lg p-3 max-w-xs shadow-sm"
                  style={{ backgroundColor: previewTheme.outgoingMessageColor }}
                >
                  <p className="text-sm text-white">
                    Esta é uma mensagem enviada por você!
                  </p>
                  <p className="text-xs text-white/90 mt-1 flex items-center gap-1">
                    10:31 <CheckCircle2 className="h-3 w-3" />
                  </p>
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
