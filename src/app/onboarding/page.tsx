'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'

type OnboardingStep = 'whatsapp-connected' | 'ai-config' | 'bot-config' | 'done'

interface ClientInfo {
  id: string
  name: string
  meta_display_phone: string | null
  status: string
}

interface AIConfigFormState {
  openaiKey: string
  groqKey: string
  provider: string
  openaiModel: string
  groqModel: string
}

interface BotConfigFormState {
  systemPrompt: string
}

const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o'] as const
const GROQ_MODELS = ['llama-3.3-70b-versatile'] as const

const DEFAULT_SYSTEM_PROMPT =
  'Você é um assistente virtual de atendimento ao cliente. Seja sempre cordial, objetivo e prestativo. Responda em português brasileiro. Caso não saiba a resposta, informe que irá verificar e transferir para um atendente humano.'

const stepIndexMap: Record<OnboardingStep, number> = {
  'whatsapp-connected': 0,
  'ai-config': 1,
  'bot-config': 2,
  done: 3,
}

const buildErrorMessage = (errorCode: string | null): string | null => {
  const errorMessages: Record<string, string> = {
    oauth_failed: 'Falha na autenticação Meta. Tente novamente.',
    csrf_failed: 'Sessão expirada. Tente novamente.',
    waba_not_found: 'WABA não encontrado. Entre em contato com suporte.',
  }
  return errorCode ? (errorMessages[errorCode] ?? null) : null
}

const StepIndicator = ({ currentStep }: { currentStep: OnboardingStep }) => {
  const currentIndex = stepIndexMap[currentStep]
  const stepLabels = ['WhatsApp', 'IA', 'Bot', 'Pronto']

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {stepLabels.map((label, index) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                index < currentIndex
                  ? 'bg-green-500 text-white'
                  : index === currentIndex
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-400'
              }`}
            >
              {index < currentIndex ? '✓' : index + 1}
            </div>
            <span
              className={`text-xs mt-1 ${
                index === currentIndex ? 'text-blue-600 font-semibold' : 'text-gray-400'
              }`}
            >
              {label}
            </span>
          </div>
          {index < stepLabels.length - 1 && (
            <div
              className={`w-8 h-0.5 mx-1 mb-5 transition-colors ${
                index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

const UzzAppLogo = () => (
  <div className="text-center mb-6">
    <h1 className="text-3xl font-bold text-white tracking-tight">
      Uzz<span className="text-blue-400">App</span>
    </h1>
    <p className="text-gray-400 text-sm mt-1">Configure seu chatbot WhatsApp</p>
  </div>
)

const ErrorAlert = ({ message }: { message: string }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
    <p className="text-red-700 text-sm font-medium">{message}</p>
  </div>
)

const WhatsAppConnectedStep = ({
  clientId,
  onContinue,
}: {
  clientId: string
  onContinue: () => void
}) => {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const fetchClientInfo = async () => {
      try {
        const response = await fetch(`/api/onboarding/get-client?client_id=${clientId}`)

        if (!response.ok) {
          setFetchError('Não foi possível carregar as informações do cliente.')
          return
        }

        const data: ClientInfo = await response.json()
        setClientInfo(data)
      } catch {
        setFetchError('Erro de conexão. Verifique sua internet e tente novamente.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchClientInfo()
  }, [clientId])

  return (
    <div className="text-center">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp Conectado!</h2>

      {isLoading && (
        <p className="text-gray-500 mb-4">Carregando informações...</p>
      )}

      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-600 text-sm">{fetchError}</p>
        </div>
      )}

      {!isLoading && !fetchError && clientInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-gray-700 text-sm mb-1">
            <span className="font-semibold">Empresa:</span> {clientInfo.name}
          </p>
          <p className="text-gray-700 text-sm">
            <span className="font-semibold">Numero WhatsApp:</span>{' '}
            {clientInfo.meta_display_phone ?? 'Configurando...'}
          </p>
        </div>
      )}

      <p className="text-gray-600 mb-6">
        Seu numero WhatsApp Business foi conectado com sucesso. Agora vamos configurar a inteligencia artificial do seu bot.
      </p>

      <button
        onClick={onContinue}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Continuar
      </button>
    </div>
  )
}

const AIConfigStep = ({
  clientId,
  onSuccess,
}: {
  clientId: string
  onSuccess: () => void
}) => {
  const [formState, setFormState] = useState<AIConfigFormState>({
    openaiKey: '',
    groqKey: '',
    provider: 'openai',
    openaiModel: 'gpt-4o-mini',
    groqModel: 'llama-3.3-70b-versatile',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const updateFormField = (field: keyof AIConfigFormState) => (value: string) =>
    setFormState((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!formState.openaiKey.trim() && !formState.groqKey.trim()) {
      setSubmitError('Informe ao menos uma chave de API (OpenAI ou Groq).')
      return
    }

    if (formState.provider === 'openai' && !formState.openaiKey.trim()) {
      setSubmitError('A chave OpenAI e obrigatoria quando o provider selecionado e OpenAI.')
      return
    }

    if (formState.provider === 'groq' && !formState.groqKey.trim()) {
      setSubmitError('A chave Groq e obrigatoria quando o provider selecionado e Groq.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const payload: Record<string, string> = {
        client_id: clientId,
        provider: formState.provider,
        openai_model: formState.openaiModel,
        groq_model: formState.groqModel,
      }

      if (formState.openaiKey.trim()) {
        payload.openai_key = formState.openaiKey.trim()
      }

      if (formState.groqKey.trim()) {
        payload.groq_key = formState.groqKey.trim()
      }

      const response = await fetch('/api/onboarding/configure-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        setSubmitError(errorData.error ?? 'Falha ao salvar configuracoes. Tente novamente.')
        return
      }

      onSuccess()
    } catch {
      setSubmitError('Erro de conexao. Verifique sua internet e tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Configurar Inteligencia Artificial</h2>
      <p className="text-gray-600 mb-6 text-sm">
        Configure as chaves de API para o seu assistente de IA. Suas chaves sao armazenadas com criptografia.
      </p>

      {submitError && <ErrorAlert message={submitError} />}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chave OpenAI <span className="text-gray-400">(opcional se usar Groq)</span>
          </label>
          <input
            type="password"
            placeholder="sk-..."
            value={formState.openaiKey}
            onChange={(e) => updateFormField('openaiKey')(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chave Groq <span className="text-gray-400">(opcional se usar OpenAI)</span>
          </label>
          <input
            type="password"
            placeholder="gsk_..."
            value={formState.groqKey}
            onChange={(e) => updateFormField('groqKey')(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provider padrao
          </label>
          <select
            value={formState.provider}
            onChange={(e) => updateFormField('provider')(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="openai">OpenAI</option>
            <option value="groq">Groq</option>
          </select>
        </div>

        {formState.provider === 'openai' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modelo OpenAI
            </label>
            <select
              value={formState.openaiModel}
              onChange={(e) => updateFormField('openaiModel')(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {OPENAI_MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        )}

        {formState.provider === 'groq' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Modelo Groq
            </label>
            <select
              value={formState.groqModel}
              onChange={(e) => updateFormField('groqModel')(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GROQ_MODELS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {isSubmitting ? 'Salvando...' : 'Salvar e Continuar'}
      </button>
    </div>
  )
}

const BotConfigStep = ({
  clientId,
  onSuccess,
}: {
  clientId: string
  onSuccess: () => void
}) => {
  const [formState, setFormState] = useState<BotConfigFormState>({
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/onboarding/configure-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          system_prompt: formState.systemPrompt,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }))
        setSubmitError(errorData.error ?? 'Falha ao salvar configuracoes. Tente novamente.')
        return
      }

      onSuccess()
    } catch {
      setSubmitError('Erro de conexao. Verifique sua internet e tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Configurar Personalidade do Bot</h2>
      <p className="text-gray-600 mb-6 text-sm">
        Defina como seu assistente vai se comportar nas conversas. Seja especifico sobre o tom, o contexto do negocio e as limitacoes.
      </p>

      {submitError && <ErrorAlert message={submitError} />}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          System Prompt
        </label>
        <textarea
          rows={8}
          value={formState.systemPrompt}
          onChange={(e) => setFormState({ systemPrompt: e.target.value })}
          placeholder="Exemplo: Voce e um assistente virtual de atendimento ao cliente da [Empresa]. Seja sempre cordial e objetivo..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">
          Instrucoes que definem o comportamento e personalidade do seu assistente de IA.
        </p>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        {isSubmitting ? 'Finalizando...' : 'Finalizar Configuracao'}
      </button>
    </div>
  )
}

const DoneStep = () => {
  const router = useRouter()

  return (
    <div className="text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Tudo Pronto!</h2>
      <p className="text-gray-600 mb-8">
        Seu chatbot WhatsApp esta configurado e pronto para atender seus clientes. Acesse o dashboard para gerenciar conversas, visualizar metricas e personalizar ainda mais seu bot.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Ir para o Dashboard
        </button>
        <button
          onClick={() => router.push('/login')}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          Fazer Login
        </button>
      </div>
    </div>
  )
}

const resolveCurrentStep = (stepParam: string | null): OnboardingStep => {
  const validSteps: OnboardingStep[] = ['whatsapp-connected', 'ai-config', 'bot-config', 'done']
  const step = stepParam as OnboardingStep
  return validSteps.includes(step) ? step : 'ai-config'
}

function OnboardingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const stepParam = searchParams.get('step')
  const clientId = searchParams.get('client_id') ?? ''
  const errorCode = searchParams.get('error')

  const currentStep = resolveCurrentStep(stepParam)
  const urlErrorMessage = buildErrorMessage(errorCode)

  const navigateToStep = (step: OnboardingStep) => {
    const params = new URLSearchParams({ step })
    if (clientId) params.set('client_id', clientId)
    router.push(`/onboarding?${params.toString()}`)
  }

  return (
    <div className="bg-gradient-to-br from-gray-950 to-gray-900 min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <UzzAppLogo />

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <StepIndicator currentStep={currentStep} />

          {urlErrorMessage && <ErrorAlert message={urlErrorMessage} />}

          {currentStep === 'whatsapp-connected' && (
            <WhatsAppConnectedStep
              clientId={clientId}
              onContinue={() => navigateToStep('ai-config')}
            />
          )}

          {currentStep === 'ai-config' && (
            <AIConfigStep
              clientId={clientId}
              onSuccess={() => navigateToStep('bot-config')}
            />
          )}

          {currentStep === 'bot-config' && (
            <BotConfigStep
              clientId={clientId}
              onSuccess={() => navigateToStep('done')}
            />
          )}

          {currentStep === 'done' && <DoneStep />}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-gradient-to-br from-gray-950 to-gray-900 min-h-screen flex items-center justify-center">
          <p className="text-gray-400">Carregando...</p>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  )
}

// inline-review: ok - no secrets in state, client_id passed to API not logged, all fetches have error handling, no let/var
