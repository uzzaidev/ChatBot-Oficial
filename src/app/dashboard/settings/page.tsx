'use client'

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
import BotConfigurationManager from '@/components/BotConfigurationManager'

/**
 * Settings Page - Configurações do Usuário
 *
 * Seções:
 * 1. Perfil do Usuário - visualizar/editar nome, email, telefone, alterar senha
 * 2. Variáveis de Ambiente - gerenciar credenciais do Vault (Meta, OpenAI, Groq)
 * 3. Bot Configurations - gerenciar configurações modulares do bot
 *
 * IMPORTANTE: Edição de variáveis requer revalidação de senha
 */
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
    openai_api_key: '',
    groq_api_key: '',
    webhook_url: '',
  })
  const [editingSecrets, setEditingSecrets] = useState(false)
  const [loadingSecrets, setLoadingSecrets] = useState(false)
  const [revalidationPassword, setRevalidationPassword] = useState('')
  const [showRevalidationModal, setShowRevalidationModal] = useState(false)
  const [revalidating, setRevalidating] = useState(false)

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
        const response = await fetch('/api/user/profile')
        const data = await response.json()

        if (response.ok) {
          setProfile({
            full_name: data.full_name || '',
            email: data.email || '',
            phone: data.phone || '',
          })
        }
      } catch (error) {
        console.error('[settings] Erro ao carregar perfil:', error)
      }
    }

    fetchProfile()
  }, [])

  // Carregar variáveis de ambiente
  useEffect(() => {
    const fetchSecrets = async () => {
      try {
        const response = await fetch('/api/vault/secrets')
        const data = await response.json()

        if (response.ok) {
          setSecrets(data.secrets || {})
        }
      } catch (error) {
        console.error('[settings] Erro ao carregar secrets:', error)
      }
    }

    fetchSecrets()
  }, [])

  // Carregar configurações do Agent
  useEffect(() => {
    const fetchAgentConfig = async () => {
      try {
        const response = await fetch('/api/client/config')
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
            },
          })
        }
      } catch (error) {
        console.error('[settings] Erro ao carregar agent config:', error)
      }
    }

    fetchAgentConfig()
  }, [])

  // Atualizar nome do usuário
  const handleUpdateProfile = async () => {
    setLoadingProfile(true)
    setNotification(null)

    try {
      const response = await fetch('/api/user/profile', {
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
      const response = await fetch('/api/user/password', {
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
      const response = await fetch('/api/user/revalidate-password', {
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

    console.log('[settings] Salvando secret:', { key, valueLength: value?.length })

    try {
      const response = await fetch('/api/vault/secrets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })

      const data = await response.json()

      console.log('[settings] Resposta do servidor:', { ok: response.ok, status: response.status, data })

      if (response.ok) {
        setNotification({ type: 'success', message: `${key} atualizado com sucesso!` })
        // Recarregar secrets para mostrar valor atualizado (mascarado)
        const refreshResponse = await fetch('/api/vault/secrets')
        const refreshData = await refreshResponse.json()
        if (refreshResponse.ok) {
          setSecrets(refreshData.secrets || {})
        }
      } else {
        const errorMessage = data.details
          ? `${data.error}: ${data.details}`
          : data.error || 'Erro ao atualizar variável'
        setNotification({ type: 'error', message: errorMessage })
        console.error('[settings] Erro ao salvar:', { error: data.error, details: data.details })
      }
    } catch (error) {
      console.error('[settings] Exceção ao salvar:', error)
      setNotification({ type: 'error', message: 'Erro ao atualizar variável' })
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
      const response = await fetch('/api/user/revalidate-password', {
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
      const response = await fetch('/api/client/config', {
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

      const response = await fetch('/api/client/test-model', {
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-600 mt-1">Gerencie seu perfil e variáveis de ambiente</p>
        </div>

        {/* Notification */}
        {notification && (
          <Alert variant={notification.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        )}

        {/* Seção 1: Perfil do Usuário */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil do Usuário</CardTitle>
            <CardDescription>Visualize e edite suas informações pessoais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile.email} disabled className="mt-2" />
              <p className="text-xs text-gray-500 mt-1">O email não pode ser alterado</p>
            </div>

            {/* Telefone (readonly) */}
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={profile.phone || 'Não configurado'}
                disabled
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Telefone do WhatsApp configurado nas variáveis de ambiente
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seção 2: Alterar Senha */}
        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>Atualize sua senha de acesso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="current_password">Senha Atual</Label>
              <Input
                id="current_password"
                type="password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, current_password: e.target.value })
                }
                disabled={loadingPassword}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="new_password">Nova Senha</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.new_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, new_password: e.target.value })
                }
                disabled={loadingPassword}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
            </div>

            <div>
              <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
                }
                disabled={loadingPassword}
                className="mt-2"
              />
            </div>

            <Button onClick={handleUpdatePassword} disabled={loadingPassword}>
              {loadingPassword ? 'Atualizando...' : 'Atualizar Senha'}
            </Button>
          </CardContent>
        </Card>

        {/* Seção 3: Configurações do Agent */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <div>
                  <CardTitle>Configurações do Agent</CardTitle>
                  <CardDescription>
                    Configure os prompts e modelos de IA do seu assistente.
                    <br />
                    <span className="text-xs">
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
          <CardContent className="space-y-6">
            {/* System Prompt */}
            <div>
              <Label htmlFor="system_prompt">System Prompt</Label>
              <Textarea
                id="system_prompt"
                value={agentConfig.system_prompt}
                onChange={(e) =>
                  setAgentConfig({ ...agentConfig, system_prompt: e.target.value })
                }
                disabled={!editingAgent}
                placeholder="Você é um assistente virtual prestativo..."
                rows={6}
                className="mt-2 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Prompt principal que define o comportamento do assistente
              </p>
            </div>

            {/* Formatter Prompt */}
            <div>
              <Label htmlFor="formatter_prompt">Formatter Prompt (Opcional)</Label>
              <Textarea
                id="formatter_prompt"
                value={agentConfig.formatter_prompt || ''}
                onChange={(e) =>
                  setAgentConfig({ ...agentConfig, formatter_prompt: e.target.value })
                }
                disabled={!editingAgent}
                placeholder="Formate a resposta de forma clara e objetiva..."
                rows={4}
                className="mt-2 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Prompt usado para formatar as respostas do assistente
              </p>
            </div>

            {/* Primary Provider Selection */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <Label htmlFor="primary_model_provider" className="text-base font-semibold">
                🤖 Provedor Principal do Agente
              </Label>
              <p className="text-xs text-gray-600 mb-3">
                Escolha qual IA vai responder as mensagens de texto do seu chatbot
              </p>
              
              <Select
                value={agentConfig.primary_model_provider}
                onValueChange={(value) =>
                  setAgentConfig({ ...agentConfig, primary_model_provider: value })
                }
                disabled={!editingAgent}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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
                        <span className="font-semibold">OpenAI (GPT-4o)</span>
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
                <div className="mt-3 text-xs bg-yellow-50 border border-yellow-200 p-3 rounded flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Custo estimado:</strong> GPT-4o é ~8x mais caro que Groq.
                    Para 100k mensagens/mês, pode custar $500+ vs $60 com Groq.
                  </div>
                </div>
              )}
              
              {agentConfig.primary_model_provider === 'groq' && (
                <div className="mt-3 text-xs bg-green-50 border border-green-200 p-3 rounded flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong>Econômico:</strong> Llama 3.3 70B oferece ótima qualidade
                    com custo muito baixo (~$0.60/1M tokens).
                  </div>
                </div>
              )}

              {/* Botão de teste */}
              <div className="mt-4">
                <Button
                  onClick={handleTestModel}
                  disabled={testingModel || !editingAgent}
                  variant="outline"
                  size="sm"
                  className="w-full"
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
                <div className={`mt-3 text-xs p-3 rounded flex items-start gap-2 ${
                  testResult.success 
                    ? 'bg-green-50 border border-green-200 text-green-800' 
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {testResult.success ? <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Divisor */}
            <div className="border-t my-4"></div>

            <h3 className="font-semibold text-sm mb-2">
              Modelos Específicos
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Configure qual versão do modelo será usado para cada provedor
            </p>

            {/* OpenAI Model */}
            <div>
              <Label htmlFor="openai_model">
                Modelo OpenAI
                {agentConfig.primary_model_provider === 'openai' && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
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
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o">GPT-4o (Recomendado)</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (Mais rápido)</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Econômico)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                {agentConfig.primary_model_provider === 'openai' 
                  ? (
                    <>
                      <MessageCircle className="h-3 w-3" />
                      Conversação + 
                      <Mic className="h-3 w-3 ml-1" />
                      Mídia (transcrição, imagens, PDFs)
                    </>
                  )
                  : (
                    <>
                      <Mic className="h-3 w-3" />
                      Apenas para: Transcrição de áudio, análise de imagens e documentos
                    </>
                  )
                }
              </p>
            </div>

            {/* Groq Model */}
            <div>
              <Label htmlFor="groq_model">
                Modelo Groq
                {agentConfig.primary_model_provider === 'groq' && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
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
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="llama-3.3-70b-versatile">Llama 3.3 70B (Recomendado)</SelectItem>
                  <SelectItem value="llama-3.1-70b-versatile">Llama 3.1 70B</SelectItem>
                  <SelectItem value="llama-3.1-8b-instant">Llama 3.1 8B (Mais rápido)</SelectItem>
                  <SelectItem value="mixtral-8x7b-32768">Mixtral 8x7B</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                {agentConfig.primary_model_provider === 'groq'
                  ? (
                    <>
                      <MessageCircle className="h-3 w-3" />
                      Usado para: Respostas de texto do agente (conversação principal)
                    </>
                  )
                  : '(Não está sendo usado no momento)'
                }
              </p>
            </div>

            {/* Divisor */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-sm mb-4">Configurações Avançadas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Enable RAG */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable_rag">Habilitar RAG</Label>
                    <p className="text-xs text-gray-500">Busca contexto em documentos enviados (base de conhecimento)</p>
                  </div>
                  <Input
                    type="checkbox"
                    id="enable_rag"
                    checked={agentConfig.settings.enable_rag}
                    onChange={(e) =>
                      setAgentConfig({
                        ...agentConfig,
                        settings: { ...agentConfig.settings, enable_rag: e.target.checked },
                      })
                    }
                    disabled={!editingAgent}
                    className="w-5 h-5"
                  />
                </div>

                {/* Enable Tools */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable_tools">Habilitar Function Calling</Label>
                    <p className="text-xs text-gray-500">Permite IA executar ações (transferência, agendamento, etc)</p>
                  </div>
                  <Input
                    type="checkbox"
                    id="enable_tools"
                    checked={agentConfig.settings.enable_tools}
                    onChange={(e) =>
                      setAgentConfig({
                        ...agentConfig,
                        settings: { ...agentConfig.settings, enable_tools: e.target.checked },
                      })
                    }
                    disabled={!editingAgent}
                    className="w-5 h-5"
                  />
                </div>

                {/* Enable Human Handoff */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enable_human_handoff">Transferência Humana</Label>
                    <p className="text-xs text-gray-500">Permite IA transferir conversa para atendente humano</p>
                  </div>
                  <Input
                    type="checkbox"
                    id="enable_human_handoff"
                    checked={agentConfig.settings.enable_human_handoff}
                    onChange={(e) =>
                      setAgentConfig({
                        ...agentConfig,
                        settings: { ...agentConfig.settings, enable_human_handoff: e.target.checked },
                      })
                    }
                    disabled={!editingAgent}
                    className="w-5 h-5"
                  />
                </div>

                {/* Message Split Enabled */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="message_split_enabled">Dividir Mensagens Longas</Label>
                    <p className="text-xs text-gray-500">Quebra respostas grandes em várias mensagens WhatsApp</p>
                  </div>
                  <Input
                    type="checkbox"
                    id="message_split_enabled"
                    checked={agentConfig.settings.message_split_enabled}
                    onChange={(e) =>
                      setAgentConfig({
                        ...agentConfig,
                        settings: { ...agentConfig.settings, message_split_enabled: e.target.checked },
                      })
                    }
                    disabled={!editingAgent}
                    className="w-5 h-5"
                  />
                </div>

                {/* Max Tokens */}
                <div>
                  <Label htmlFor="max_tokens">Max Tokens</Label>
                  <Input
                    type="number"
                    id="max_tokens"
                    value={agentConfig.settings.max_tokens}
                    onChange={(e) =>
                      setAgentConfig({
                        ...agentConfig,
                        settings: { ...agentConfig.settings, max_tokens: parseInt(e.target.value) || 2000 },
                      })
                    }
                    disabled={!editingAgent}
                    min={100}
                    max={8000}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">100 - 8000</p>
                </div>

                {/* Temperature */}
                <div>
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    type="number"
                    id="temperature"
                    value={agentConfig.settings.temperature}
                    onChange={(e) =>
                      setAgentConfig({
                        ...agentConfig,
                        settings: { ...agentConfig.settings, temperature: parseFloat(e.target.value) || 0.7 },
                      })
                    }
                    disabled={!editingAgent}
                    min={0}
                    max={2}
                    step={0.1}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">0.0 - 2.0 (criatividade)</p>
                </div>

                {/* Max Chat History */}
                <div>
                  <Label htmlFor="max_chat_history">Max Chat History</Label>
                  <Input
                    type="number"
                    id="max_chat_history"
                    value={agentConfig.settings.max_chat_history}
                    onChange={(e) =>
                      setAgentConfig({
                        ...agentConfig,
                        settings: { ...agentConfig.settings, max_chat_history: parseInt(e.target.value) || 10 },
                      })
                    }
                    disabled={!editingAgent}
                    min={1}
                    max={50}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">1 - 50 mensagens</p>
                </div>

                {/* Batching Delay */}
                <div>
                  <Label htmlFor="batching_delay_seconds">Delay de Agrupamento (s)</Label>
                  <Input
                    type="number"
                    id="batching_delay_seconds"
                    value={agentConfig.settings.batching_delay_seconds}
                    onChange={(e) =>
                      setAgentConfig({
                        ...agentConfig,
                        settings: { ...agentConfig.settings, batching_delay_seconds: parseInt(e.target.value) || 10 },
                      })
                    }
                    disabled={!editingAgent}
                    min={0}
                    max={60}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">0 - 60 segundos</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 4: Variáveis de Ambiente */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Variáveis de Ambiente</CardTitle>
                <CardDescription>
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
          <CardContent className="space-y-4">
            {/* Meta Access Token */}
            <div>
              <Label htmlFor="meta_access_token">Meta Access Token</Label>
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
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('meta_access_token')}
                    className="absolute right-2 top-2"
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

            {/* OpenAI API Key */}
            <div>
              <Label htmlFor="openai_api_key">OpenAI API Key (opcional)</Label>
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
            </div>

            {/* Groq API Key */}
            <div>
              <Label htmlFor="groq_api_key">Groq API Key (opcional)</Label>
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
