import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Planos e Preços — UZZ.AI',
  description: 'Planos e preços da Plataforma UZZ.AI — Chatbot com IA para WhatsApp Business',
}

const features = [
  'Chatbot com IA (Llama 3.3 70B / GPT-4o)',
  'WhatsApp Business API integrado',
  'Painel de atendimento em tempo real',
  'Base de conhecimento (RAG) com PDF/TXT',
  'Handoff humano automático',
  'Histórico completo de conversas',
  'Multi-usuários com controle de acesso (RBAC)',
  'Suporte técnico por e-mail e WhatsApp',
  '99% de uptime (SLA)',
  'Sem limite de mensagens processadas',
]

const faqs = [
  {
    question: 'O que é o Setup?',
    answer:
      'Taxa única de ativação que cobre a configuração inicial do seu chatbot, integração com WhatsApp Business API e onboarding.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer:
      'Sim. Basta notificar com 30 dias de antecedência. Sem multa por cancelamento.',
  },
  {
    question: 'O preço inclui os custos de IA?',
    answer:
      'As chamadas de IA utilizam as suas próprias chaves de API (OpenAI/Groq), configuradas no painel. O plano não inclui créditos de terceiros.',
  },
]

export default function PrecosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-erie-black-900 via-erie-black-800 to-erie-black-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 text-left">
            <Link href="/" className="text-mint-500 hover:text-mint-400 inline-block">
              ← Voltar para o portal
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Planos e Preços
          </h1>
          <p className="text-erie-black-400 text-lg">
            Comece hoje com tudo incluído. Sem surpresas.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="flex justify-center mb-16">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border-2 border-mint-500 overflow-hidden">

            {/* Popular badge */}
            <div className="flex justify-center pt-6">
              <span className="inline-block bg-mint-500 text-white text-xs font-semibold px-4 py-1 rounded-full uppercase tracking-wide">
                Mais popular
              </span>
            </div>

            <div className="px-8 pt-6 pb-8">

              {/* Plan name */}
              <h2 className="text-3xl font-bold text-erie-black-900 text-center mb-6">
                UzzApp Plano Único
              </h2>

              {/* Price */}
              <div className="text-center mb-2">
                <span className="text-5xl font-extrabold text-erie-black-900">R$ 249,90</span>
                <span className="text-xl text-erie-black-500 ml-1">/mês</span>
              </div>
              <p className="text-center text-erie-black-500 mb-6">
                Setup único: R$ 1.000,00
              </p>

              {/* Divider */}
              <hr className="border-erie-black-200 mb-6" />

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="flex-shrink-0 text-mint-500 font-bold text-lg leading-tight">
                      ✓
                    </span>
                    <span className="text-erie-black-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="/register"
                className="block w-full text-center bg-erie-black-900 hover:bg-erie-black-800 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200"
              >
                Contratar agora
              </Link>

              {/* Small print */}
              <p className="text-center text-erie-black-500 text-xs mt-4">
                O setup é cobrado uma única vez na ativação da conta.
              </p>

            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-semibold text-white text-center mb-8">
            Dúvidas frequentes
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold text-erie-black-800 mb-3">
                  {faq.question}
                </h3>
                <p className="text-erie-black-700 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-erie-black-400">
          <p>
            <Link href="/privacy" className="text-mint-500 hover:text-mint-400">
              Privacidade
            </Link>
            {' • '}
            <Link href="/terms" className="text-mint-500 hover:text-mint-400">
              Termos
            </Link>
            {' • '}
            <Link href="/" className="text-mint-500 hover:text-mint-400">
              Voltar ao Portal
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
