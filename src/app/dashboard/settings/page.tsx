'use client'

/**
 * Settings Page
 *
 * /dashboard/settings
 *
 * Client Component (Mobile Compatible)
 * Motivo: Static Export (Capacitor) não suporta Server Components
 * 
 * Implementação completa do Settings com:
 * 1. Perfil do Usuário - visualizar/editar nome, email, telefone, alterar senha
 * 2. Variáveis de Ambiente - gerenciar credenciais do Vault (Meta, OpenAI, Groq)
 * 3. Bot Configurations - gerenciar configurações modulares do bot
 * 
 * Baseado na implementação do desenvolvedor sênior
 * IMPORTANTE: Edição de variáveis requer revalidação de senha
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Save, Lock, Copy, Check, Bot, CheckCircle, XCircle, AlertTriangle, Rocket, MessageCircle, Mic } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import { SliderControl } from '@/components/ui/slider-control'
import BotConfigurationManager from '@/components/BotConfigurationManager'
export default function SettingsPage() {
  // Estado do perfil
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
  })
  const [editingProfile, setEditingProfile] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)

  // Estado da senha
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [loadingPassword, setLoadingPassword] = useState(false)

  // Estado das variáveis de ambiente
  const [secrets, setSecrets] = useState({
    meta_access_token: '',
    meta_verify_token: '',
    meta_app_secret: '', // SECURITY FIX (VULN-012)
    meta_phone_number_id: '',
    whatsapp_business_account_id: '', // WABA ID
    openai_api_key: '',
    groq_api_key: '',
    webhook_url: '',
  })
  const [editingSecrets, setEditingSecrets] = useState(false)
  const [loadingSecrets, setLoadingSecrets] = useState(false)
  const [revalidationPassword, setRevalidationPassword] = useState('')
  const [showRevalidationModal, setShowRevalidationModal] = useState(false)
  const [revalidating, setRevalidating] = useState(false)

  const [aiKeysMode, setAiKeysMode] = useState<'platform_only' | 'byok_allowed'>('platform_only')

  // Estado de visibilidade de senhas
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  // Estado de notificações
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Estado de cópia
  const [copied, setCopied] = useState<string | null>(null)

  // Estado do Agent Config
  const [agentConfig, setAgentConfig] = useState({
    system_prompt: '',
    formatter_prompt: '',
    openai_model: 'gpt-4o',
    groq_model: 'llama-3.3-70b-versatile',
    primary_model_provider: 'groq', // NOVO
    settings: {
      enable_rag: false,
      max_tokens: 2000,
      temperature: 0.7,
      enable_tools: false,
      max_chat_history: 10,
      enable_human_handoff: false,
      message_split_enabled: false,
      batching_delay_seconds: 10,
      message_delay_ms: 2000, // Delay between split messages
    },
  })
  const [editingAgent, setEditingAgent] = useState(false)
  const [loadingAgent, setLoadingAgent] = useState(false)
  const [showAgentRevalidationModal, setShowAgentRevalidationModal] = useState(false)
  const [agentRevalidationPassword, setAgentRevalidationPassword] = useState('')
  const [agentRevalidating, setAgentRevalidating] = useState(false)

  // Estado do teste de modelo
  const [testingModel, setTestingModel] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    latency_ms?: number
  } | null>(null)

  // Carregar perfil do usuário
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { apiFetch } = await import('@/lib/api')
        const response = await apiFetch('/api/user/profile')
        const data = await response.json()

        if (response.ok) {
          setProfile({
            full_name: data.full_name || '',
            email: data.email || '',
            phone: data.phone || '',
          })
        }
      } catch (error) {
      }
    }

    fetchProfile()
  }, [])

  // Carregar variáveis de ambiente
  useEffect(() => {
    const fetchSecrets = async () => {
      try {
        const { apiFetch } = await import('@/lib/api')
        const response = await apiFetch('/api/vault/secrets')
        const data = await response.json()

        if (response.ok) {
          setSecrets(data.secrets || {})
          if (data.ai_keys_mode === 'platform_only' || data.ai_keys_mode === 'byok_allowed') {
            setAiKeysMode(data.ai_keys_mode)
          }
        }
      } catch (error) {
      }
    }

    fetchSecrets()
  }, [])

  // Carregar configurações do Agent
  useEffect(() => {
    const fetchAgentConfig = async () => {
      try {
        const { apiFetch } = await import('@/lib/api')
        const response = await apiFetch('/api/client/config')
        const data = await response.json()

        if (response.ok && data.config) {
          setAgentConfig({
            system_prompt: data.config.system_prompt || '',
            formatter_prompt: data.config.formatter_prompt || '',
            openai_model: data.config.openai_model || 'gpt-4o',
            groq_model: data.config.groq_model || 'llama-3.3-70b-versatile',
            primary_model_provider: data.config.primary_model_provider || 'groq', // NOVO
            settings: data.config.settings || {
              enable_rag: false,
              max_tokens: 2000,
              temperature: 0.7,
              enable_tools: false,
              max_chat_history: 10,
              enable_human_handoff: false,
              message_split_enabled: false,
              batching_delay_seconds: 10,
              message_delay_ms: 2000,
            },
          })

          if (data.config.ai_keys_mode === 'platform_only' || data.config.ai_keys_mode === 'byok_allowed') {
            setAiKeysMode(data.config.ai_keys_mode)
          }

          // Also update WABA ID from client config if present
          if (data.whatsapp_business_account_id) {
            setSecrets(prev => ({
              ...prev,
              whatsapp_business_account_id: data.whatsapp_business_account_id
            }))
          }
        }
      } catch (error) {
      }
    }

    fetchAgentConfig()
  }, [])

  // Atualizar nome do usuário
  const handleUpdateProfile = async () => {
    setLoadingProfile(true)
    setNotification(null)

    try {
      const { apiFetch } = await import('@/lib/api')
      const response = await apiFetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: profile.full_name }),
      })

      const data = await response.json()

      if (response.ok) {
        setNotification({ type: 'success', message: 'Nome atualizado com sucesso!' })
        setEditingProfile(false)
      } else {
        setNotification({ type: 'error', message: data.error || 'Erro ao atualizar nome' })
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Erro ao atualizar nome' })
    } finally {
      setLoadingProfile(false)
    }
  }

  // Atualizar senha
  const handleUpdatePassword = async () => {
    setLoadingPassword(true)
    setNotification(null)

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setNotification({ type: 'error', message: 'As senhas não coincidem' })
      setLoadingPassword(false)
      return
    }

    if (passwordForm.new_password.length < 8) {
      setNotification({ type: 'error', message: 'A senha deve ter pelo menos 8 caracteres' })
      setLoadingPassword(false)
      return
    }

    try {
      const { apiFetch } = await import('@/lib/api')
      const response = await apiFetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setNotification({ type: 'success', message: 'Senha atualizada com sucesso!' })
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      } else {
        setNotification({ type: 'error', message: data.error || 'Erro ao atualizar senha' })
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Erro ao atualizar senha' })
    } finally {
      setLoadingPassword(false)
    }
  }

  // Revalidar senha antes de editar variáveis
  const handleRevalidatePassword = async () => {
    setRevalidating(true)
    setNotification(null)

    try {
      const { apiFetch } = await import('@/lib/api')
      const response = await apiFetch('/api/user/revalidate-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: revalidationPassword }),
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setShowRevalidationModal(false)
        setEditingSecrets(true)
        setRevalidationPassword('')
        setNotification({ type: 'success', message: 'Senha validada! Você pode editar as variáveis.' })
      } else {
        setNotification({ type: 'error', message: 'Senha incorreta' })
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Erro ao validar senha' })
    } finally {
      setRevalidating(false)
    }
  }

  // Atualizar variável de ambiente
  const handleUpdateSecret = async (key: string, value: string) => {
    setLoadingSecrets(true)
    setNotification(null)

    try {
      const { apiFetch } = await import('@/lib/api')

      // WABA ID is stored in clients table, not vault
      if (key === 'whatsapp_business_account_id') {
        const response = await apiFetch('/api/client/waba-id', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ whatsapp_business_account_id: value }),
        })

        const data = await response.json()

        if (response.ok) {
          setNotification({ type: 'success', message: 'WABA ID atualizado com sucesso!' })
          // Update local state
          setSecrets(prev => ({ ...prev, whatsapp_business_account_id: value }))
        } else {
          setNotification({ type: 'error', message: data.error || 'Erro ao atualizar WABA ID' })
        }
      } else {
        // Other secrets go to vault
        const response = await apiFetch('/api/vault/secrets', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        })

        const data = await response.json()

        if (response.ok) {
          setNotification({ type: 'success', message: `${key} atualizado com sucesso!` })
          // Recarregar secrets para mostrar valor atualizado (mascarado)
          const refreshResponse = await apiFetch('/api/vault/secrets')
          const refreshData = await refreshResponse.json()
          if (refreshResponse.ok) {
            setSecrets(refreshData.secrets || {})
            if (refreshData.ai_keys_mode === 'platform_only' || refreshData.ai_keys_mode === 'byok_allowed') {
              setAiKeysMode(refreshData.ai_keys_mode)
            }
          }
        } else {
          const errorMessage = data.details
            ? `${data.error}: ${data.details}`
            : data.error || 'Erro ao atualizar variável'
          setNotification({ type: 'error', message: errorMessage })
        }
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Erro ao atualizar variável' })
    } finally {
      setLoadingSecrets(false)
    }
  }

  const handleUpdateAIKeysMode = async (mode: 'platform_only' | 'byok_allowed') => {
    setLoadingSecrets(true)
    setNotification(null)

    try {
      const { apiFetch } = await import('@/lib/api')
      const response = await apiFetch('/api/client/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ai_keys_mode: mode }),
      })

      const data = await response.json()

      if (response.ok) {
        setAiKeysMode(mode)
        setNotification({ type: 'success', message: 'Modo de chaves de IA atualizado com sucesso!' })
      } else {
        setNotification({ type: 'error', message: data.error || 'Erro ao atualizar modo de chaves de IA' })
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Erro ao atualizar modo de chaves de IA' })
    } finally {
      setLoadingSecrets(false)
    }
  }

  // Copiar para clipboard
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  // Toggle visibilidade de senha
  const togglePasswordVisibility = (key: string) => {
    setShowPasswords((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Revalidar senha antes de editar configurações do Agent
  const handleRevalidateAgentPassword = async () => {
    setAgentRevalidating(true)
    setNotification(null)

    try {
      const { apiFetch } = await import('@/lib/api')
      const response = await apiFetch('/api/user/revalidate-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: agentRevalidationPassword }),
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setShowAgentRevalidationModal(false)
        setEditingAgent(true)
        setAgentRevalidationPassword('')
        setNotification({ type: 'success', message: 'Senha validada! Você pode editar as configurações do Agent.' })
      } else {
        setNotification({ type: 'error', message: 'Senha incorreta' })
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Erro ao validar senha' })
    } finally {
      setAgentRevalidating(false)
    }
  }

  // Salvar configurações do Agent
  const handleSaveAgentConfig = async () => {
    setLoadingAgent(true)
    setNotification(null)

    try {
      const { apiFetch } = await import('@/lib/api')
      const response = await apiFetch('/api/client/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentConfig),
      })

      const data = await response.json()

      if (response.ok) {
        setNotification({ type: 'success', message: 'Configurações do Agent atualizadas com sucesso!' })
        setEditingAgent(false)
      } else {
        setNotification({ type: 'error', message: data.error || 'Erro ao atualizar configurações' })
      }
    } catch (error) {
      setNotification({ type: 'error', message: 'Erro ao atualizar configurações' })
    } finally {
      setLoadingAgent(false)
    }
  }

  // Testar modelo selecionado
  const handleTestModel = async () => {
    setTestingModel(true)
    setTestResult(null)
    setNotification(null)

    try {
      const provider = agentConfig.primary_model_provider
      const model = provider === 'openai' ? agentConfig.openai_model : agentConfig.groq_model

      const { apiFetch } = await import('@/lib/api')
      const response = await apiFetch('/api/client/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model }),
      })

      const data = await response.json()

      if (data.success) {
        setTestResult({
          success: true,
          message: `${data.message} (${data.latency_ms}ms)`,
          latency_ms: data.latency_ms,
        })
        setNotification({
          type: 'success',
          message: `Modelo testado com sucesso! Latência: ${data.latency_ms}ms`
        })
      } else {
        setTestResult({
          success: false,
          message: data.message || data.error,
        })
        setNotification({
          type: 'error',
          message: `${data.message || data.error}`
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Erro ao conectar com o servidor',
      })
      setNotification({
        type: 'error',
        message: 'Erro ao testar modelo'
      })
    } finally {
      setTestingModel(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1419] p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-poppins font-bold bg-gradient-to-r from-uzz-mint to-uzz-blue bg-clip-text text-transparent mb-2">
            ⚙️ Configurações
          </h1>
          <p className="text-uzz-silver text-lg">Gerencie seu perfil, agent e variáveis de ambiente</p>
        </div>

        {/* Notification */}
        {notification && (
          <Alert variant={notification.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        )}

        {/* Seção 1: Perfil do Usuário */}
        <Card className="bg-gradient-to-br from-[#1e2530] to-[#1a1f26] border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-xl font-poppins text-white flex items-center gap-2">
              👤 Perfil do Usuário
            </CardTitle>
            <CardDescription className="text-uzz-silver">
              Visualize e edite suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Nome */}
            <div>
              <Label htmlFor="full_name">Nome Completo</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  disabled={!editingProfile || loadingProfile}
                />
                {!editingProfile ? (
                  <Button onClick={() => setEditingProfile(true)}>Editar</Button>
                ) : (
                  <>
                    <Button onClick={handleUpdateProfile} disabled={loadingProfile}>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingProfile(false)}
                      disabled={loadingProfile}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Email (readonly) */}
            <div>
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input 
                id="email" 
                value={profile.email} 
                disabled 
                className="mt-2 bg-white/5 border-white/10 text-white/70" 
              />
              <p className="text-xs text-uzz-silver mt-1">O email não pode ser alterado</p>
            </div>

            {/* Telefone (readonly) */}
            <div>
              <Label htmlFor="phone" className="text-white">Telefone</Label>
              <Input
                id="phone"
                value={profile.phone || 'Não configurado'}
                disabled
                className="mt-2 bg-white/5 border-white/10 text-white/70"
              />
              <p className="text-xs text-uzz-silver mt-1">
                Telefone do WhatsApp configurado nas variáveis de ambiente
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seção 2: Alterar Senha */}
        <Card className="bg-gradient-to-br from-[#1e2530] to-[#1a1f26] border-white/10">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-xl font-poppins text-white flex items-center gap-2">
              🔐 Alterar Senha
            </CardTitle>
            <CardDescription className="text-uzz-silver">
              Atualize sua senha de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label htmlFor="current_password" className="text-white">Senha Atual</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, current_password: e.target.value })
                }
                disabled={loadingPassword}
                className="mt-2 bg-white/5 border-white/10 text-white"
                placeholder="Digite sua senha atual"
              />
            </div>

            <div>
              <Label htmlFor="new_password" className="text-white">Nova Senha</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, new_password: e.target.value })
                }
                disabled={loadingPassword}
                className="mt-2 bg-white/5 border-white/10 text-white"
                placeholder="Mínimo 8 caracteres"
              />
              <p className="text-xs text-uzz-silver mt-1">Mínimo 8 caracteres</p>
            </div>

            <div>
              <Label htmlFor="confirm_password" className="text-white">Confirmar Nova Senha</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                }
                disabled={loadingPassword}
                className="mt-2 bg-white/5 border-white/10 text-white"
                placeholder="Digite novamente"
              />
            </div>

            <Button 
              onClick={handleUpdatePassword} 
              disabled={loadingPassword}
              className="w-full bg-gradient-to-r from-uzz-mint to-uzz-blue text-white hover:from-uzz-blue hover:to-uzz-mint"
            >
              {loadingPassword ? 'Atualizando...' : 'Atualizar Senha'}
            </Button>
          </CardContent>
        </Card>

        {/* Seção 3: Configurações do Agent */}
        <Card className="bg-gradient-to-br from-[#1e2530] to-[#1a1f26] border-white/10">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="w-6 h-6 text-uzz-mint" />
                <div>
                  <CardTitle className="text-xl font-poppins text-white">Configurações do Agent</CardTitle>
                  <CardDescription className="text-uzz-silver">
                    Configure os prompts e modelos de IA do seu assistente.
                    <br />
                    <span className="text-xs text-uzz-silver/80">
                      ℹ️ Groq é usado para conversação (rápido e econômico), OpenAI para mídia (Vision, Whisper)
                    </span>
                  </CardDescription>
                </div>
              </div>
              {!editingAgent && (
                <Button
                  onClick={() => setShowAgentRevalidationModal(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Editar
                </Button>
              )}
              {editingAgent && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSaveAgentConfig}
                    disabled={loadingAgent}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Tudo
                  </Button>
                  <Button
                    onClick={() => setEditingAgent(false)}
                    variant="outline"
                    disabled={loadingAgent}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Alert de Atenção */}
            {!editingAgent && (
              <Alert className="bg-amber-500/10 border-amber-500/30">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-200 text-sm">
                  <strong>Atenção:</strong> Mudanças no System Prompt afetam TODAS as conversas. Teste antes de aplicar em produção.
                </AlertDescription>
              </Alert>
            )}

            {/* System Prompt */}
            <div>
              <Label htmlFor="system_prompt" className="text-white">System Prompt</Label>
              <Textarea
                id="system_prompt"
                value={agentConfig.system_prompt}
                onChange={(e) =>
                  setAgentConfig({ ...agentConfig, system_prompt: e.target.value })
                }
                disabled={!editingAgent}
                placeholder="## 🤖 Assistente Oficial Uzz.AI

## 🎯 Identidade e Papel

Você é o assistente oficial de IA da Uzz.AI..."
                rows={8}
                className="mt-2 font-mono text-sm bg-white/5 border-white/10 text-white placeholder:text-uzz-silver/50"
              />
              <p className="text-xs text-uzz-silver mt-1">
                Prompt principal que define o comportamento do assistente
              </p>
            </div>

            {/* Formatter Prompt */}
            <div>
              <Label htmlFor="formatter_prompt" className="text-white">Formatter Prompt (Opcional)</Label>
              <Textarea
                id="formatter_prompt"
                value={agentConfig.formatter_prompt || ''}
                onChange={(e) =>
                  setAgentConfig({ ...agentConfig, formatter_prompt: e.target.value })
                }
                disabled={!editingAgent}
                placeholder="Formate a resposta de forma clara, objetiva e profissional.

**Regras:**
- Máximo 3-4 frases por mensagem (exceto quando listar features ou opções)
- Use emojis com moderação..."
                rows={5}
                className="mt-2 font-mono text-sm bg-white/5 border-white/10 text-white placeholder:text-uzz-silver/50"
              />
              <p className="text-xs text-uzz-silver mt-1">
                Prompt usado para formatar as respostas do assistente
              </p>
            </div>

            {/* Primary Provider Selection */}
            <div className="bg-gradient-to-br from-blue-500/10 to-uzz-blue/10 border border-uzz-blue/30 rounded-lg p-4">
              <Label htmlFor="primary_model_provider" className="text-base font-semibold text-white flex items-center gap-2">
                🤖 Provedor Principal do Agente
              </Label>
              <p className="text-xs text-uzz-silver mb-3">
                Escolha qual IA vai responder as mensagens de texto do seu chatbot
              </p>

              <Select
                value={agentConfig.primary_model_provider}
                onValueChange={(value) =>
                  setAgentConfig({ ...agentConfig, primary_model_provider: value })
                }
                disabled={!editingAgent}
              >
                <SelectTrigger className="mt-2 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e2530] border-white/20 text-white">
                  <SelectItem value="groq">
                    <div className="flex items-center gap-2">
                      <Rocket className="h-4 w-4 flex-shrink-0" />
                      <div className="flex flex-col items-start">
                        <span className="font-semibold">Groq (Llama) - Recomendado</span>
                        <span className="text-xs text-gray-500">
                          Rápido (~1000 tokens/s) • Econômico (~$0.60/1M tokens)
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="openai">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 flex-shrink-0" />
                      <div className="flex flex-col items-start">
                        <span className="font-semibold">OpenAI (GPT)</span>
                        <span className="text-xs text-gray-500">
                          Mais inteligente • Mais lento • Mais caro (~$5/1M tokens)
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Alertas de custo */}
              {agentConfig.primary_model_provider === 'openai' && (
                <Alert className="mt-3 bg-amber-500/10 border-amber-500/30">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <AlertDescription className="text-amber-200 text-xs">
                    <strong>💰 Custo estimado:</strong> GPT-4o é ~8x mais caro que Groq.
                    Para 100k mensagens/mês, pode custar $500+ vs $60 com Groq.
                  </AlertDescription>
                </Alert>
              )}

              {agentConfig.primary_model_provider === 'groq' && (
                <Alert className="mt-3 bg-green-500/10 border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <AlertDescription className="text-green-200 text-xs">
                    <strong>✅ Econômico:</strong> Llama 3.3 70B oferece ótima qualidade
                    com custo muito baixo (~$0.60/1M tokens).
                  </AlertDescription>
                </Alert>
              )}

              {/* Botão de teste */}
              <div className="mt-4">
                <Button
                  onClick={handleTestModel}
                  disabled={testingModel || !editingAgent}
                  variant="outline"
                  size="sm"
                  className="w-full border-uzz-mint/30 text-uzz-mint hover:bg-uzz-mint/10 hover:text-white"
                >
                  {testingModel ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Testando modelo...
                    </>
                  ) : (
                    <>
                      🧪 Testar Modelo
                    </>
                  )}
                </Button>
              </div>

              {/* Resultado do teste */}
              {testResult && (
                <Alert className={`mt-3 ${testResult.success
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                  }`}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <AlertDescription className={testResult.success ? 'text-green-200' : 'text-red-200'}>
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Divisor */}
            <div className="border-t border-white/10 my-6"></div>

            <h3 className="font-semibold text-base mb-2 text-white">
              Modelos Específicos
            </h3>
            <p className="text-xs text-uzz-silver mb-4">
              Configure qual versão do modelo será usado para cada provedor
            </p>

            {/* OpenAI Model */}
            <div>
              <Label htmlFor="openai_model" className="text-white">
                Modelo OpenAI
                {agentConfig.primary_model_provider === 'openai' && (
                  <span className="ml-2 text-xs bg-uzz-blue/20 text-uzz-blue px-2 py-0.5 rounded border border-uzz-blue/30">
                    EM USO
                  </span>
                )}
              </Label>
              <Select
                value={agentConfig.openai_model}
                onValueChange={(value) =>
                  setAgentConfig({ ...agentConfig, openai_model: value })
                }
                disabled={!editingAgent}
              >
                <SelectTrigger className="mt-2 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e2530] border-white/20 text-white">
                  {agentConfig.openai_model &&
                    ![
                      'gpt-4o',
                      'gpt-4o-mini',
                      'gpt-4-turbo',
                      'gpt-3.5-turbo',
                    ].includes(agentConfig.openai_model) && (
                      <SelectItem value={agentConfig.openai_model}>
                        {agentConfig.openai_model} (Atual)
                      </SelectItem>
                    )}
                  <SelectItem value="gpt-4o">GPT-4o (Recomendado)</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (Mais rápido)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Econômico)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-uzz-silver mt-1 flex items-center gap-1">
                {agentConfig.primary_model_provider === 'openai'
                  ? (
                    <>
                      <MessageCircle className="h-3 w-3 text-uzz-mint" />
                      Conversação +
                      <Mic className="h-3 w-3 ml-1 text-uzz-mint" />
                      Mídia (transcrição, imagens, PDFs)
                    </>
                  )
                  : (
                    <>
                      <Mic className="h-3 w-3 text-uzz-silver" />
                      Apenas para: Transcrição de áudio, análise de imagens e documentos
                    </>
                  )
                }
              </p>
            </div>

            {/* Groq Model */}
            <div>
              <Label htmlFor="groq_model" className="text-white">
                Modelo Groq
                {agentConfig.primary_model_provider === 'groq' && (
                  <span className="ml-2 text-xs bg-uzz-blue/20 text-uzz-blue px-2 py-0.5 rounded border border-uzz-blue/30">
                    EM USO
                  </span>
                )}
              </Label>
              <Select
                value={agentConfig.groq_model}
                onValueChange={(value) =>
                  setAgentConfig({ ...agentConfig, groq_model: value })
                }
                disabled={!editingAgent}
              >
                <SelectTrigger className="mt-2 bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1e2530] border-white/20 text-white">
                  {agentConfig.groq_model &&
                    ![
                      'llama-3.3-70b-versatile',
                      'llama-3.1-70b-versatile',
                      'llama-3.1-8b-instant',
                      'mixtral-8x7b-32768',
                    ].includes(agentConfig.groq_model) && (
                      <SelectItem value={agentConfig.groq_model}>
                        {agentConfig.groq_model} (Atual)
                      </SelectItem>
                    )}
                  <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B (Recomendado)</SelectItem>
                  <SelectItem value="llama-3.1-70b-versatile">Llama 3.1 70B</SelectItem>
                  <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B (Mais rápido)</SelectItem>
                  <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-uzz-silver mt-1 flex items-center gap-1">
                {agentConfig.primary_model_provider === 'groq'
                  ? (
                    <>
                      <MessageCircle className="h-3 w-3 text-uzz-mint" />
                      Usado para: Respostas de texto do agente (conversação principal)
                    </>
                  )
                  : '(Não está sendo usado no momento)'
                }
              </p>
            </div>

            {/* Divisor */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="font-semibold text-base mb-6 text-white">Configurações Avançadas</h3>
              
              {/* Toggles */}
              <div className="space-y-4 mb-6">
                <ToggleSwitch
                  id="enable_rag"
                  label="Habilitar RAG"
                  description="Busca contexto em documentos enviados (base de conhecimento)"
                  checked={agentConfig.settings.enable_rag}
                  onCheckedChange={(checked) =>
                    setAgentConfig({
                      ...agentConfig,
                      settings: { ...agentConfig.settings, enable_rag: checked },
                    })
                  }
                  disabled={!editingAgent}
                />

                <ToggleSwitch
                  id="enable_tools"
                  label="Habilitar Function Calling"
                  description="Permite IA executar ações (transferência, agendamento, etc)"
                  checked={agentConfig.settings.enable_tools}
                  onCheckedChange={(checked) =>
                    setAgentConfig({
                      ...agentConfig,
                      settings: { ...agentConfig.settings, enable_tools: checked },
                    })
                  }
                  disabled={!editingAgent}
                />

                <ToggleSwitch
                  id="enable_human_handoff"
                  label="Transferência Humana"
                  description="Permite IA transferir conversa para atendente humano"
                  checked={agentConfig.settings.enable_human_handoff}
                  onCheckedChange={(checked) =>
                    setAgentConfig({
                      ...agentConfig,
                      settings: { ...agentConfig.settings, enable_human_handoff: checked },
                    })
                  }
                  disabled={!editingAgent}
                />

                <ToggleSwitch
                  id="message_split_enabled"
                  label="Dividir Mensagens Longas"
                  description="Quebra respostas grandes em várias mensagens WhatsApp"
                  checked={agentConfig.settings.message_split_enabled}
                  onCheckedChange={(checked) =>
                    setAgentConfig({
                      ...agentConfig,
                      settings: { ...agentConfig.settings, message_split_enabled: checked },
                    })
                  }
                  disabled={!editingAgent}
                />
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SliderControl
                  id="max_tokens"
                  label="Max Tokens"
                  description="100 - 8000 (Padrão: 6000)"
                  value={agentConfig.settings.max_tokens}
                  onValueChange={(value) =>
                    setAgentConfig({
                      ...agentConfig,
                      settings: { ...agentConfig.settings, max_tokens: value },
                    })
                  }
                  min={100}
                  max={8000}
                  step={100}
                  disabled={!editingAgent}
                />

                <SliderControl
                  id="temperature"
                  label="Temperature"
                  description="0.0 - 2.0 (0 = determinístico, 2 = criativo)"
                  value={agentConfig.settings.temperature}
                  onValueChange={(value) =>
                    setAgentConfig({
                      ...agentConfig,
                      settings: { ...agentConfig.settings, temperature: value },
                    })
                  }
                  min={0}
                  max={2}
                  step={0.1}
                  disabled={!editingAgent}
                />

                <SliderControl
                  id="max_chat_history"
                  label="Max Chat History"
                  description="1 - 50 mensagens (Padrão: 15)"
                  value={agentConfig.settings.max_chat_history}
                  onValueChange={(value) =>
                    setAgentConfig({
                      ...agentConfig,
                      settings: { ...agentConfig.settings, max_chat_history: value },
                    })
                  }
                  min={1}
                  max={50}
                  step={1}
                  disabled={!editingAgent}
                />

                <SliderControl
                  id="batching_delay_seconds"
                  label="Delay de Agrupamento"
                  description="0 - 60 segundos (Padrão: 10)"
                  value={agentConfig.settings.batching_delay_seconds}
                  onValueChange={(value) =>
                    setAgentConfig({
                      ...agentConfig,
                      settings: { ...agentConfig.settings, batching_delay_seconds: value },
                    })
                  }
                  min={0}
                  max={60}
                  step={1}
                  unit="s"
                  disabled={!editingAgent}
                />

                <SliderControl
                  id="message_delay_ms"
                  label="Delay entre Mensagens"
                  description="0 - 10000 ms (delay entre mensagens divididas)"
                  value={agentConfig.settings.message_delay_ms}
                  onValueChange={(value) =>
                    setAgentConfig({
                      ...agentConfig,
                      settings: { ...agentConfig.settings, message_delay_ms: value },
                    })
                  }
                  min={0}
                  max={10000}
                  step={100}
                  unit="ms"
                  disabled={!editingAgent}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 3.5: Envio de Documentos RAG */}
        <Card className="bg-gradient-to-br from-[#1e2530] to-[#1a1f26] border-white/10">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-poppins text-white flex items-center gap-2">
                  📄 Envio de Documentos RAG
                </CardTitle>
                <CardDescription className="text-uzz-silver">
                  Configure como o agente envia documentos e imagens da base de conhecimento via WhatsApp
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <Alert className="bg-blue-500/10 border-blue-500/30">
              <AlertDescription className="text-blue-200 text-sm">
                <strong>Nota:</strong> Esta funcionalidade permite que o agente busque e envie automaticamente documentos, catálogos, manuais e imagens armazenados na base de conhecimento quando solicitado pelo usuário. Requer RAG e Function Calling habilitados.
              </AlertDescription>
            </Alert>

            {/* Status Indicator */}
            <Alert className={agentConfig.settings.enable_rag && agentConfig.settings.enable_tools 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-amber-500/10 border-amber-500/30'
            }>
              {agentConfig.settings.enable_rag && agentConfig.settings.enable_tools ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-200 text-sm">
                    <strong>✅ Ativo:</strong> Agente pode buscar e enviar documentos via tool <code className="bg-white/10 px-1 rounded">buscar_documento</code>
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <AlertDescription className="text-amber-200 text-sm">
                    <strong>⚠️ Inativo:</strong> Habilite RAG e Function Calling para usar esta funcionalidade
                  </AlertDescription>
                </>
              )}
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Habilitar/Desabilitar */}
              <ToggleSwitch
                id="enable_document_sending"
                label="Habilitar envio de documentos"
                description="Permite que o agente busque e envie documentos da base de conhecimento"
                checked={agentConfig.settings.enable_rag && agentConfig.settings.enable_tools}
                onCheckedChange={() => {}} // Disabled - controlled by RAG and Tools
                disabled={true}
              />

              {/* Threshold de Similaridade */}
              <SliderControl
                id="doc_search_threshold"
                label="Threshold de Similaridade"
                description="Padrão: 0.7 (valores maiores = mais rigoroso)"
                value={0.7}
                onValueChange={() => {}} // TODO: Implement when backend supports
                min={0}
                max={1}
                step={0.1}
                disabled={!editingAgent || !agentConfig.settings.enable_rag}
              />

              {/* Máximo de Documentos */}
              <SliderControl
                id="doc_max_results"
                label="Máximo de Documentos"
                description="Padrão: 3 documentos (1-5)"
                value={3}
                onValueChange={() => {}} // TODO: Implement when backend supports
                min={1}
                max={5}
                step={1}
                disabled={!editingAgent || !agentConfig.settings.enable_rag}
              />

              {/* Tamanho Máximo */}
              <SliderControl
                id="doc_max_file_size"
                label="Tamanho Máximo"
                description="WhatsApp: máx 16MB documentos, 5MB imagens"
                value={10}
                onValueChange={() => {}} // TODO: Implement when backend supports
                min={1}
                max={16}
                step={1}
                unit="MB"
                disabled={!editingAgent || !agentConfig.settings.enable_rag}
              />
            </div>

            {/* Como usar */}
            <div className="border-t border-white/10 pt-4">
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <AlertDescription>
                  <h4 className="text-sm font-semibold mb-2 text-blue-200">💡 Como usar:</h4>
                  <ul className="text-xs text-blue-200/90 space-y-1 list-disc list-inside">
                    <li>Faça upload de documentos em <strong>/dashboard/knowledge</strong></li>
                    <li>Usuário solicita via WhatsApp: <em>&quot;me envia o catálogo&quot;</em></li>
                    <li>AI aciona tool <code className="bg-white/10 px-1 rounded">buscar_documento</code> automaticamente</li>
                    <li>Sistema busca na base, encontra o documento mais relevante</li>
                    <li>Envia PDF/imagem diretamente no WhatsApp</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Seção 4: Variáveis de Ambiente */}
        <Card className="bg-gradient-to-br from-[#1e2530] to-[#1a1f26] border-white/10">
          <CardHeader className="border-b border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-poppins text-white flex items-center gap-2">
                  🔑 Variáveis de Ambiente
                </CardTitle>
                <CardDescription className="text-uzz-silver">
                  Gerencie as credenciais de API do seu cliente
                </CardDescription>
              </div>
              {!editingSecrets && (
                <Button
                  onClick={() => setShowRevalidationModal(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Editar
                </Button>
              )}
              {editingSecrets && (
                <Button
                  onClick={() => setEditingSecrets(false)}
                  variant="outline"
                >
                  Bloquear Edição
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            {/* Meta Access Token */}
            <div>
              <Label htmlFor="meta_access_token" className="text-white">Meta Access Token</Label>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Input
                    id="meta_access_token"
                    type={showPasswords['meta_access_token'] ? 'text' : 'password'}
                    value={secrets.meta_access_token}
                    onChange={(e) =>
                      setSecrets({ ...secrets, meta_access_token: e.target.value })
                    }
                    disabled={!editingSecrets}
                    className="bg-white/5 border-white/10 text-white font-mono text-sm"
                    placeholder="EAABsbCS1iHgBO7ZC..."
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('meta_access_token')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-uzz-silver hover:text-white transition-colors"
                  >
                    {showPasswords['meta_access_token'] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {editingSecrets && (
                  <Button
                    onClick={() =>
                      handleUpdateSecret('meta_access_token', secrets.meta_access_token)
                    }
                    disabled={loadingSecrets}
                    className="bg-gradient-to-r from-uzz-mint to-uzz-blue text-white hover:from-uzz-blue hover:to-uzz-mint"
                  >
                    Salvar
                  </Button>
                )}
              </div>
            </div>

            {/* Meta Verify Token */}
            <div>
              <Label htmlFor="meta_verify_token">Meta Verify Token</Label>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Input
                    id="meta_verify_token"
                    type={showPasswords['meta_verify_token'] ? 'text' : 'password'}
                    value={secrets.meta_verify_token}
                    onChange={(e) =>
                      setSecrets({ ...secrets, meta_verify_token: e.target.value })
                    }
                    disabled={!editingSecrets}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('meta_verify_token')}
                    className="absolute right-2 top-2"
                  >
                    {showPasswords['meta_verify_token'] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {editingSecrets && (
                  <Button
                    onClick={() =>
                      handleUpdateSecret('meta_verify_token', secrets.meta_verify_token)
                    }
                    disabled={loadingSecrets}
                  >
                    Salvar
                  </Button>
                )}
              </div>
            </div>

            {/* Meta App Secret - SECURITY FIX (VULN-012) */}
            <div>
              <Label htmlFor="meta_app_secret">
                Meta App Secret
                <span className="text-xs text-muted-foreground ml-2">
                  (HMAC validation - diferente do Verify Token)
                </span>
              </Label>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <Input
                    id="meta_app_secret"
                    type={showPasswords['meta_app_secret'] ? 'text' : 'password'}
                    value={secrets.meta_app_secret}
                    onChange={(e) =>
                      setSecrets({ ...secrets, meta_app_secret: e.target.value })
                    }
                    disabled={!editingSecrets}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('meta_app_secret')}
                    className="absolute right-2 top-2"
                  >
                    {showPasswords['meta_app_secret'] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {editingSecrets && (
                  <Button
                    onClick={() =>
                      handleUpdateSecret('meta_app_secret', secrets.meta_app_secret)
                    }
                    disabled={loadingSecrets}
                  >
                    Salvar
                  </Button>
                )}
              </div>
            </div>

            {/* Meta Phone Number ID */}
            <div>
              <Label htmlFor="meta_phone_number_id">Meta Phone Number ID</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="meta_phone_number_id"
                  value={secrets.meta_phone_number_id}
                  onChange={(e) =>
                    setSecrets({ ...secrets, meta_phone_number_id: e.target.value })
                  }
                  disabled={!editingSecrets}
                />
                {editingSecrets && (
                  <Button
                    onClick={() =>
                      handleUpdateSecret('meta_phone_number_id', secrets.meta_phone_number_id)
                    }
                    disabled={loadingSecrets}
                  >
                    Salvar
                  </Button>
                )}
              </div>
            </div>

            {/* WhatsApp Business Account ID */}
            <div>
              <Label htmlFor="whatsapp_business_account_id">WhatsApp Business Account ID (WABA ID)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="whatsapp_business_account_id"
                  value={secrets.whatsapp_business_account_id}
                  onChange={(e) =>
                    setSecrets({ ...secrets, whatsapp_business_account_id: e.target.value })
                  }
                  disabled={!editingSecrets}
                  placeholder="123456789012345"
                />
                {editingSecrets && (
                  <Button
                    onClick={() =>
                      handleUpdateSecret('whatsapp_business_account_id', secrets.whatsapp_business_account_id)
                    }
                    disabled={loadingSecrets}
                  >
                    Salvar
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ID da conta comercial do WhatsApp (usado para criar templates)
              </p>
            </div>

            {/* Divisor */}
            <div className="border-t my-6"></div>

            {/* Seção de Credenciais de IA */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base mb-2">🔑 Credenciais de IA (Fallback)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Configure suas chaves de API da OpenAI e Groq. Estas credenciais são usadas como <strong>fallback automático</strong> caso o AI Gateway falhe ou fique sem créditos.
                </p>
                <Alert className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <strong>Como funciona o fallback:</strong> Quando o AI Gateway não está disponível ou apresenta erro,
                    o sistema automaticamente usa as credenciais abaixo (OpenAI como preferência).
                    Isto garante que seu chatbot nunca pare de funcionar.
                  </AlertDescription>
                </Alert>
              </div>

              {/* OpenAI API Key */}
              <div>
                <Label htmlFor="openai_api_key">
                  OpenAI API Key
                  <span className="text-xs text-blue-600 ml-2">(Usado como fallback principal)</span>
                </Label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Input
                      id="openai_api_key"
                      type={showPasswords['openai_api_key'] ? 'text' : 'password'}
                      value={secrets.openai_api_key}
                      onChange={(e) =>
                        setSecrets({ ...secrets, openai_api_key: e.target.value })
                      }
                      disabled={!editingSecrets}
                      placeholder="sk-proj-..."
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('openai_api_key')}
                      className="absolute right-2 top-2"
                    >
                      {showPasswords['openai_api_key'] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {editingSecrets && (
                    <Button
                      onClick={() =>
                        handleUpdateSecret('openai_api_key', secrets.openai_api_key)
                      }
                      disabled={loadingSecrets}
                    >
                      Salvar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Obtenha em: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">platform.openai.com/api-keys</a>
                </p>
              </div>

              {/* Groq API Key */}
              <div>
                <Label htmlFor="groq_api_key">
                  Groq API Key
                  <span className="text-xs text-gray-500 ml-2">(Opcional - secundário)</span>
                </Label>
                <div className="flex gap-2 mt-2">
                  <div className="relative flex-1">
                    <Input
                      id="groq_api_key"
                      type={showPasswords['groq_api_key'] ? 'text' : 'password'}
                      value={secrets.groq_api_key}
                      onChange={(e) =>
                        setSecrets({ ...secrets, groq_api_key: e.target.value })
                      }
                      disabled={!editingSecrets}
                      placeholder="gsk_..."
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('groq_api_key')}
                      className="absolute right-2 top-2"
                    >
                      {showPasswords['groq_api_key'] ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {editingSecrets && (
                    <Button
                      onClick={() =>
                        handleUpdateSecret('groq_api_key', secrets.groq_api_key)
                      }
                      disabled={loadingSecrets}
                    >
                      Salvar
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Obtenha em: <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">console.groq.com/keys</a>
                </p>
              </div>
            </div>

            {/* Webhook URL (readonly) */}
            <div>
              <Label htmlFor="webhook_url">Webhook URL</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="webhook_url"
                  value={secrets.webhook_url}
                  disabled
                  className="font-mono text-sm"
                />
                <Button
                  onClick={() => handleCopy(secrets.webhook_url, 'webhook_url')}
                  variant="outline"
                  size="icon"
                >
                  {copied === 'webhook_url' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Use esta URL para configurar o webhook na Meta API
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seção 4.5: Text-to-Speech (TTS) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mic className="w-5 h-5 text-blue-500" />
                <div>
                  <CardTitle>Text-to-Speech (TTS)</CardTitle>
                  <CardDescription>
                    Configure o envio de respostas em áudio (mensagens de voz)
                  </CardDescription>
                </div>
              </div>
              <Button
                onClick={() => window.location.href = '/dashboard/settings/tts'}
                variant="default"
                className="gap-2"
              >
                <Mic className="w-4 h-4" />
                Ver Configurações Completas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Mic className="h-4 w-4" />
              <AlertDescription>
                O bot pode converter respostas longas em mensagens de voz (áudio) para melhor experiência do usuário.
                Configure voz, velocidade e quando usar áudio através da página de configurações completas.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">6</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Vozes Disponíveis</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">HD</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Qualidade de Áudio</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">0.5-2x</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Velocidade Ajustável</p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-2">Recursos Disponíveis:</h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
                <li>Preview de vozes (Alloy, Echo, Fable, Onyx, Nova, Shimmer)</li>
                <li>Controle de velocidade de fala (0.5x a 2.0x)</li>
                <li>Qualidade HD (tts-1-hd) ou Rápida (tts-1)</li>
                <li>Estatísticas de uso e economia de cache</li>
                <li>Player com waveform e transcrição no WhatsApp</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Dica:</strong> Configure no prompt do sistema quando o bot deve usar áudio.
                Exemplo: &quot;Use a tool enviar_resposta_em_audio para explicações longas (mais de 500 caracteres)&quot;.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seção 5: Bot Configurations */}
        <BotConfigurationManager />
      </div>

      {/* Modal de Revalidação de Senha */}
      {showRevalidationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirme sua Senha</CardTitle>
              <CardDescription>
                Por segurança, confirme sua senha antes de editar as variáveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="revalidation_password">Senha</Label>
                <Input
                  id="revalidation_password"
                  type="password"
                  value={revalidationPassword}
                  onChange={(e) => setRevalidationPassword(e.target.value)}
                  disabled={revalidating}
                  onKeyDown={(e) => e.key === 'Enter' && handleRevalidatePassword()}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleRevalidatePassword}
                  disabled={revalidating || !revalidationPassword}
                  className="flex-1"
                >
                  {revalidating ? 'Validando...' : 'Confirmar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRevalidationModal(false)
                    setRevalidationPassword('')
                  }}
                  disabled={revalidating}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Revalidação de Senha - Agent Config */}
      {showAgentRevalidationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Confirme sua Senha</CardTitle>
              <CardDescription>
                Por segurança, confirme sua senha antes de editar as configurações do Agent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="agent_revalidation_password">Senha</Label>
                <Input
                  id="agent_revalidation_password"
                  type="password"
                  value={agentRevalidationPassword}
                  onChange={(e) => setAgentRevalidationPassword(e.target.value)}
                  disabled={agentRevalidating}
                  onKeyDown={(e) => e.key === 'Enter' && handleRevalidateAgentPassword()}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleRevalidateAgentPassword}
                  disabled={agentRevalidating || !agentRevalidationPassword}
                  className="flex-1"
                >
                  {agentRevalidating ? 'Validando...' : 'Confirmar'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAgentRevalidationModal(false)
                    setAgentRevalidationPassword('')
                  }}
                  disabled={agentRevalidating}
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
