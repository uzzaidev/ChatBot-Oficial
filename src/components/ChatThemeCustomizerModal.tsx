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
import { DEFAULT_BACKGROUNDS, DEFAULT_CHAT_THEME, type ChatTheme, type ChatThemeModeColors } from '@/lib/constants/chat-backgrounds'
import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2, Moon, RotateCcw, Sun, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface ChatThemeCustomizerModalProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Modal de Personalização de Tema das Conversas (Dual-Mode)
 *
 * Features:
 * - Seletor de modo (Escuro / Claro) para editar cores de cada modo
 * - Color pickers para mensagens recebidas e enviadas
 * - Preview lado a lado (dark + light)
 * - Seleção de fundo (presets + upload)
 * - Responsive (mobile-first)
 */
export const ChatThemeCustomizerModal = ({
  isOpen,
  onClose,
}: ChatThemeCustomizerModalProps) => {
  const { theme: currentTheme, saveTheme, applyTheme, resetTheme } = useChatTheme()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [previewTheme, setPreviewTheme] = useState<ChatTheme>(DEFAULT_CHAT_THEME)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [colorMode, setColorMode] = useState<'dark' | 'light'>('dark')

  // Load current theme when modal opens
  useEffect(() => {
    if (isOpen) {
      setPreviewTheme(currentTheme ?? DEFAULT_CHAT_THEME)
    }
  }, [isOpen, currentTheme])

  // Apply preview in real-time
  useEffect(() => {
    if (isOpen) {
      applyTheme(previewTheme)
    }
  }, [previewTheme, isOpen, applyTheme])

  // Restore original theme when closing without saving
  useEffect(() => {
    if (!isOpen && currentTheme) {
      applyTheme(currentTheme)
    }
  }, [isOpen, currentTheme, applyTheme])

  const handleSave = async () => {
    try {
      setSaving(true)
      await saveTheme(previewTheme)
      toast({
        title: 'Tema salvo!',
        description: 'Suas preferências foram salvas com sucesso.',
      })
      onClose()
    } catch {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o tema. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    try {
      setSaving(true)
      await resetTheme()
      setPreviewTheme(DEFAULT_CHAT_THEME)
      toast({
        title: 'Tema restaurado',
        description: 'Voltou para as configurações padrão.',
      })
    } catch {
      toast({
        title: 'Erro ao restaurar',
        description: 'Não foi possível restaurar o tema padrão.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      toast({
        title: 'Arquivo muito grande',
        description: `Tamanho máximo: 5MB. Seu arquivo: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        variant: 'destructive',
      })
      return
    }

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
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/chat-theme/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Erro ao fazer upload')
      }

      const data = await response.json()

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
    } catch (err) {
      toast({
        title: 'Erro no upload',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Helper to update color for current editing mode
  const updateColor = (field: keyof ChatThemeModeColors, value: string) => {
    setPreviewTheme(prev => ({
      ...prev,
      [colorMode]: {
        ...prev[colorMode],
        [field]: value,
      },
    }))
  }

  // Current editing mode colors
  const modeColors = previewTheme[colorMode]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            Personalizar Tema das Conversas
          </DialogTitle>
          <DialogDescription>
            Configure cores para modo escuro e claro separadamente
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="colors" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="colors">Cores</TabsTrigger>
            <TabsTrigger value="background">Fundo</TabsTrigger>
          </TabsList>

          {/* ============================================ */}
          {/* TAB 1: CORES DAS MENSAGENS                   */}
          {/* ============================================ */}
          <TabsContent value="colors" className="space-y-5 mt-4">
            {/* Mode Selector */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant={colorMode === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setColorMode('dark')}
                className="flex items-center gap-1.5"
              >
                <Moon className="h-4 w-4" />
                Modo Escuro
              </Button>
              <Button
                variant={colorMode === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setColorMode('light')}
                className="flex items-center gap-1.5"
              >
                <Sun className="h-4 w-4" />
                Modo Claro
              </Button>
            </div>

            {/* Incoming Message Colors */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Mensagens Recebidas
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ColorPicker
                  label="Fundo"
                  id={`incoming-bg-${colorMode}`}
                  value={modeColors.incomingMessageColor}
                  onChange={(v) => updateColor('incomingMessageColor', v)}
                />
                <ColorPicker
                  label="Texto"
                  id={`incoming-text-${colorMode}`}
                  value={modeColors.incomingTextColor}
                  onChange={(v) => updateColor('incomingTextColor', v)}
                />
              </div>
            </div>

            {/* Outgoing Message Colors */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Mensagens Enviadas
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ColorPicker
                  label="Fundo"
                  id={`outgoing-bg-${colorMode}`}
                  value={modeColors.outgoingMessageColor}
                  onChange={(v) => updateColor('outgoingMessageColor', v)}
                />
                <ColorPicker
                  label="Texto"
                  id={`outgoing-text-${colorMode}`}
                  value={modeColors.outgoingTextColor}
                  onChange={(v) => updateColor('outgoingTextColor', v)}
                />
              </div>
            </div>

            {/* Dual-Mode Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Preview</Label>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <PreviewPanel
                  mode="dark"
                  colors={previewTheme.dark}
                />
                <PreviewPanel
                  mode="light"
                  colors={previewTheme.light}
                />
              </div>
            </div>
          </TabsContent>

          {/* ============================================ */}
          {/* TAB 2: FUNDO                                 */}
          {/* ============================================ */}
          <TabsContent value="background" className="space-y-5 mt-4">
            {/* Preset Backgrounds Gallery */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Fundos Padrão</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {DEFAULT_BACKGROUNDS.map((bg) => (
                  <button
                    key={bg.id}
                    onClick={() => {
                      const suggested = bg.suggestedColors
                      setPreviewTheme(prev => ({
                        ...prev,
                        backgroundType: 'preset',
                        backgroundPreset: bg.id,
                        backgroundCustomUrl: undefined,
                        ...(suggested && {
                          dark: {
                            incomingMessageColor: suggested.dark.incomingBg,
                            outgoingMessageColor: suggested.dark.outgoingBg,
                            incomingTextColor: suggested.dark.incomingText,
                            outgoingTextColor: suggested.dark.outgoingText,
                          },
                          light: {
                            incomingMessageColor: suggested.light.incomingBg,
                            outgoingMessageColor: suggested.light.outgoingBg,
                            incomingTextColor: suggested.light.incomingText,
                            outgoingTextColor: suggested.light.outgoingText,
                          },
                        }),
                      }))
                    }}
                    className={cn(
                      'relative rounded-lg overflow-hidden border-2 transition-all hover:scale-105',
                      previewTheme.backgroundType === 'preset' && previewTheme.backgroundPreset === bg.id
                        ? 'border-primary ring-2 ring-primary ring-offset-2'
                        : 'border-transparent hover:border-primary/50'
                    )}
                    title={bg.description}
                  >
                    <img
                      src={bg.thumbnail}
                      alt={bg.name}
                      className="w-full h-16 sm:h-20 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                      <p className="text-[10px] sm:text-xs text-white text-center truncate font-medium">
                        {bg.name}
                      </p>
                    </div>
                    {previewTheme.backgroundType === 'preset' && previewTheme.backgroundPreset === bg.id && (
                      <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* No Background */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Sem Fundo</Label>
              <button
                onClick={() => setPreviewTheme(prev => ({
                  ...prev,
                  backgroundType: 'default',
                  backgroundPreset: undefined,
                  backgroundCustomUrl: undefined,
                }))}
                className={cn(
                  'w-full p-3 rounded-lg border-2 transition-all text-left',
                  previewTheme.backgroundType === 'default'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <p className="font-medium text-sm">Usar fundo padrão do tema</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sem imagem de fundo (adapta ao modo claro/escuro)
                </p>
              </button>
            </div>

            {/* Custom Upload */}
            <div className="space-y-2">
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
                  'flex items-center justify-center gap-3 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all',
                  uploading
                    ? 'border-primary bg-primary/5 cursor-not-allowed'
                    : 'border-border hover:border-primary hover:bg-primary/5'
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-5 w-5 text-primary animate-spin" />
                    <span className="text-sm font-medium text-primary">Fazendo upload...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Clique para upload</p>
                      <p className="text-xs text-muted-foreground">JPEG, PNG ou WebP (max 5MB)</p>
                    </div>
                  </>
                )}
              </label>

              {previewTheme.backgroundType === 'custom' && previewTheme.backgroundCustomUrl && (
                <div className="relative rounded-lg overflow-hidden border-2 border-primary">
                  <img
                    src={previewTheme.backgroundCustomUrl}
                    alt="Background customizado"
                    className="w-full h-24 object-cover"
                  />
                  <div className="absolute top-1.5 right-1.5 bg-primary rounded-full p-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saving || uploading}
            className="w-full sm:w-auto"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar Padrão
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving || uploading}
              className="flex-1 sm:flex-initial"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || uploading}
              className="flex-1 sm:flex-initial"
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

/* ============================================ */
/* Sub-components                               */
/* ============================================ */

interface ColorPickerProps {
  label: string
  id: string
  value: string
  onChange: (value: string) => void
}

const ColorPicker = ({ label, id, value, onChange }: ColorPickerProps) => (
  <div className="space-y-1">
    <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
    <div className="flex items-center gap-2">
      <div
        className="w-9 h-9 rounded border border-border cursor-pointer flex-shrink-0"
        style={{ backgroundColor: value }}
        onClick={() => document.getElementById(id)?.click()}
      />
      <Input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 flex-shrink-0 p-1 h-9"
      />
      <Input
        type="text"
        value={value.toUpperCase()}
        onChange={(e) => {
          const v = e.target.value
          if (/^#[0-9A-F]{0,6}$/i.test(v)) {
            onChange(v)
          }
        }}
        placeholder="#000000"
        className="font-mono text-xs h-9 flex-1 min-w-0"
        maxLength={7}
      />
    </div>
  </div>
)

interface PreviewPanelProps {
  mode: 'dark' | 'light'
  colors: ChatThemeModeColors
}

const PreviewPanel = ({ mode, colors }: PreviewPanelProps) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      {mode === 'dark' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      {mode === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
    </div>
    <div
      className="p-3 rounded-lg space-y-2"
      style={{ backgroundColor: mode === 'dark' ? '#0b141a' : '#efeae2' }}
    >
      {/* Incoming */}
      <div className="flex justify-start">
        <div
          className="px-3 py-1.5 rounded-lg max-w-[75%]"
          style={{
            backgroundColor: colors.incomingMessageColor,
            color: colors.incomingTextColor,
          }}
        >
          <p className="text-xs">Mensagem recebida</p>
          <span className="text-[10px] opacity-70">10:30</span>
        </div>
      </div>
      {/* Outgoing */}
      <div className="flex justify-end">
        <div
          className="px-3 py-1.5 rounded-lg max-w-[75%]"
          style={{
            backgroundColor: colors.outgoingMessageColor,
            color: colors.outgoingTextColor,
          }}
        >
          <p className="text-xs">Mensagem enviada</p>
          <span className="text-[10px] opacity-70 flex items-center gap-0.5">
            10:31 <CheckCircle2 className="w-2.5 h-2.5" />
          </span>
        </div>
      </div>
    </div>
  </div>
)
