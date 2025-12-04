'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Volume2, Play, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface TTSConfig {
  tts_enabled: boolean
  tts_provider: string
  tts_voice: string
  tts_speed: number
  tts_auto_offer: boolean
}

interface TTSStats {
  audiosThisMonth: number
  cacheHitRate: number
  estimatedCost: number
  cacheSavings: number
}

const VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutro e versátil' },
  { id: 'echo', name: 'Echo', description: 'Masculino e claro' },
  { id: 'fable', name: 'Fable', description: 'Feminino e suave' },
  { id: 'onyx', name: 'Onyx', description: 'Grave e profundo' },
  { id: 'nova', name: 'Nova', description: 'Feminino e energético' },
  { id: 'shimmer', name: 'Shimmer', description: 'Suave e caloroso' }
]

const PREVIEW_TEXT = 'Olá! Eu sou o assistente de inteligência artificial. Como posso ajudar você hoje?'

export default function TTSSettingsPage() {
  const { toast } = useToast()
  const [config, setConfig] = useState<TTSConfig>({
    tts_enabled: false,
    tts_provider: 'openai',
    tts_voice: 'alloy',
    tts_speed: 1.0,
    tts_auto_offer: true
  })
  const [stats, setStats] = useState<TTSStats>({
    audiosThisMonth: 0,
    cacheHitRate: 0,
    estimatedCost: 0,
    cacheSavings: 0
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)

  useEffect(() => {
    loadConfig()
    loadStats()
  }, [])

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/settings/tts')
      if (response.ok) {
        const data = await response.json()
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Failed to load TTS config:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/settings/tts/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to load TTS stats:', error)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (response.ok) {
        toast({
          title: 'Configurações salvas!',
          description: 'As configurações de TTS foram atualizadas com sucesso.',
        })
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações. Tente novamente.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const playVoicePreview = async (voiceId: string) => {
    setPlayingVoice(voiceId)
    try {
      const response = await fetch('/api/test/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: PREVIEW_TEXT,
          voice: voiceId,
          speed: config.tts_speed
        })
      })

      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        const audio = new Audio(audioUrl)

        audio.onended = () => {
          setPlayingVoice(null)
          URL.revokeObjectURL(audioUrl)
        }

        await audio.play()
      } else {
        throw new Error('Failed to generate preview')
      }
    } catch (error) {
      toast({
        title: 'Erro ao reproduzir',
        description: 'Não foi possível gerar o preview da voz.',
        variant: 'destructive'
      })
      setPlayingVoice(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações de Áudio (TTS)</h1>
          <p className="text-gray-500 mt-1">
            Configure o sistema de text-to-speech para mensagens de voz
          </p>
        </div>
        <Button onClick={saveConfig} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Salvar
            </>
          )}
        </Button>
      </div>

      {/* Master Switch */}
      <Card>
        <CardHeader>
          <CardTitle>Ativar TTS (Master Switch)</CardTitle>
          <CardDescription>
            Se desativado, o bot NUNCA enviará áudios, mesmo que o AI tente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="tts-enabled"
              checked={config.tts_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, tts_enabled: checked })}
            />
            <Label htmlFor="tts-enabled" className="cursor-pointer">
              {config.tts_enabled ? (
                <span className="text-green-600 font-medium">✓ Ativado</span>
              ) : (
                <span className="text-gray-500">Desativado</span>
              )}
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Auto Offer */}
      <Card>
        <CardHeader>
          <CardTitle>Oferta Automática de Áudio</CardTitle>
          <CardDescription>
            Permite que o AI ofereça áudio automaticamente em contextos apropriados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              id="tts-auto-offer"
              checked={config.tts_auto_offer}
              disabled={!config.tts_enabled}
              onCheckedChange={(checked) => setConfig({ ...config, tts_auto_offer: checked })}
            />
            <Label htmlFor="tts-auto-offer" className="cursor-pointer">
              {config.tts_auto_offer ? 'Permitir oferta automática' : 'Apenas quando solicitado'}
            </Label>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Se desativado, áudio só será enviado se cliente pedir explicitamente
          </p>
        </CardContent>
      </Card>

      {/* Voice Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Voz do Bot</CardTitle>
          <CardDescription>
            Escolha a voz que o bot usará para gerar mensagens de áudio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VOICES.map((voice) => (
              <div
                key={voice.id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition ${
                  config.tts_voice === voice.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${!config.tts_enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => config.tts_enabled && setConfig({ ...config, tts_voice: voice.id })}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold">{voice.name}</h3>
                    <p className="text-sm text-gray-500">{voice.description}</p>
                  </div>
                  {config.tts_voice === voice.id && (
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!config.tts_enabled || playingVoice !== null}
                  onClick={(e) => {
                    e.stopPropagation()
                    playVoicePreview(voice.id)
                  }}
                  className="w-full"
                >
                  {playingVoice === voice.id ? (
                    <>
                      <Volume2 className="mr-2 h-4 w-4 animate-pulse" />
                      Reproduzindo...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Testar Voz
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Speed Control */}
      <Card>
        <CardHeader>
          <CardTitle>Velocidade de Fala</CardTitle>
          <CardDescription>
            Ajuste a velocidade da fala (0.5x a 2.0x)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Velocidade: {config.tts_speed}x</Label>
              <span className="text-sm text-gray-500">
                {config.tts_speed < 0.8 && 'Muito lento'}
                {config.tts_speed >= 0.8 && config.tts_speed < 1.0 && 'Lento'}
                {config.tts_speed === 1.0 && 'Normal'}
                {config.tts_speed > 1.0 && config.tts_speed <= 1.3 && 'Rápido'}
                {config.tts_speed > 1.3 && 'Muito rápido'}
              </span>
            </div>
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={[config.tts_speed]}
              onValueChange={([value]) => setConfig({ ...config, tts_speed: value })}
              disabled={!config.tts_enabled}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas de Uso</CardTitle>
          <CardDescription>
            Acompanhe o uso e economia do sistema de TTS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{stats.audiosThisMonth}</p>
              <p className="text-sm text-gray-500">Áudios enviados (mês)</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{stats.cacheHitRate}%</p>
              <p className="text-sm text-gray-500">Taxa de cache</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">${stats.estimatedCost.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Custo estimado</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">${stats.cacheSavings.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Economia (cache)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900">
            <AlertCircle className="mr-2 h-5 w-5" />
            Como funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>
            • O AI decide automaticamente quando enviar áudio (explicações longas, tutoriais, etc.)
          </p>
          <p>
            • Cliente pode configurar preferência individual: sempre, nunca ou perguntar antes
          </p>
          <p>
            • Sistema de cache inteligente reduz custos em até 60%
          </p>
          <p>
            • Fallback automático para texto em caso de falha (cliente nunca fica sem resposta)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
