import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Solicitar Exclusão de Conta e Dados — UZZ.AI',
  description:
    'Saiba como solicitar a exclusão da sua conta e dados pessoais na Plataforma UZZ.AI, conforme a LGPD (Lei nº 13.709/2018).',
}

const retainedData = [
  {
    type: 'Logs de acesso',
    reason: 'Obrigação legal — Art. 15, Marco Civil da Internet (Lei nº 12.965/2014)',
    period: '6 meses',
  },
  {
    type: 'Dados fiscais e de faturamento',
    reason: 'Obrigação legal — legislação tributária brasileira',
    period: '5 anos',
  },
  {
    type: 'Registros de incidentes de segurança',
    reason: 'Prevenção a fraudes e obrigações regulatórias (ANPD)',
    period: '5 anos',
  },
]

const deletedData = [
  'Dados cadastrais da conta (nome, e-mail, telefone)',
  'Histórico de conversas e mensagens processadas',
  'Base de conhecimento (arquivos PDF/TXT carregados)',
  'Configurações do chatbot e fluxos de atendimento',
  'Dados dos usuários finais processados na plataforma',
  'Integrações e credenciais de API configuradas',
  'Relatórios e dados de uso',
]

export default function DeleteAccountPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-gray-700">UZZ.AI</Link>
            <span>/</span>
            <span className="text-gray-700">Exclusão de Conta</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Solicitar Exclusão de Conta e Dados
          </h1>
          <p className="text-gray-500 text-sm">
            UZZ.AI — Plataforma de Chatbot com IA para WhatsApp Business
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">

        {/* Aviso LGPD */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <p className="text-blue-800 text-sm leading-relaxed">
            Em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>,
            você tem o direito de solicitar a exclusão dos seus dados pessoais e o encerramento da sua conta
            na Plataforma UZZ.AI a qualquer momento.
          </p>
        </div>

        {/* Como solicitar */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5">
            Como solicitar a exclusão
          </h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Envie um e-mail para o DPO</p>
                <p className="text-gray-600 text-sm">
                  Envie sua solicitação para{' '}
                  <a
                    href="mailto:dpo@uzzai.com.br?subject=Solicitação de Exclusão de Conta — UZZ.AI&body=Olá, solicito a exclusão da minha conta e de todos os meus dados pessoais na Plataforma UZZ.AI.%0A%0ANome completo:%0AE-mail da conta:%0ACNPJ (se aplicável):%0A%0AAtenciosamente,"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    dpo@uzzai.com.br
                  </a>{' '}
                  com o assunto <strong>&quot;Solicitação de Exclusão de Conta — UZZ.AI&quot;</strong>.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Inclua no e-mail</p>
                <ul className="text-gray-600 text-sm space-y-1">
                  <li>— Nome completo do responsável pela conta</li>
                  <li>— E-mail cadastrado na Plataforma</li>
                  <li>— CNPJ da empresa (se aplicável)</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Aguarde a confirmação</p>
                <p className="text-gray-600 text-sm">
                  A UZZ.AI responderá em até <strong>15 dias úteis</strong> confirmando o recebimento e
                  informando o prazo de conclusão da exclusão. Após a exclusão, emitiremos um{' '}
                  <strong>certificado de exclusão</strong> mediante solicitação.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* O que é excluído */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5">
            O que é excluído
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Após o processamento da solicitação, os seguintes dados serão <strong>permanentemente excluídos</strong>{' '}
            em até <strong>90 dias</strong>:
          </p>
          <ul className="space-y-2">
            {deletedData.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="mt-1 flex-shrink-0 w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                  ✕
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* O que é retido */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5">
            Dados mantidos por obrigação legal
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Alguns dados precisam ser retidos por exigência legal, mesmo após a exclusão da conta:
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Tipo de dado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Fundamento legal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Prazo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {retainedData.map((row) => (
                  <tr key={row.type}>
                    <td className="px-4 py-3 font-medium text-gray-900">{row.type}</td>
                    <td className="px-4 py-3 text-gray-600">{row.reason}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{row.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Contato */}
        <section className="rounded-xl border border-gray-200 p-6 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Contato — DPO</h2>
          <p className="text-sm text-gray-600 mb-3">
            Para dúvidas sobre exclusão de dados ou exercício de outros direitos previstos na LGPD
            (Art. 18), entre em contato com o Encarregado de Proteção de Dados (DPO):
          </p>
          <div className="text-sm text-gray-700 space-y-1">
            <p><strong>Pedro Vitor Brunello Pagliarin</strong></p>
            <p>
              E-mail:{' '}
              <a href="mailto:dpo@uzzai.com.br" className="text-blue-600 hover:underline">
                dpo@uzzai.com.br
              </a>
            </p>
            <p>
              Telefone:{' '}
              <a href="tel:+5554991590379" className="text-blue-600 hover:underline">
                (54) 99159-0379
              </a>
            </p>
            <p className="text-gray-500 text-xs mt-2">
              UZZ.AI TECNOLOGIA LTDA. — CNPJ 64.025.866/0001-30
            </p>
          </div>
        </section>

        {/* Links */}
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="text-blue-600 hover:underline">
            ← Política de Privacidade
          </Link>
          <Link href="/terms" className="text-blue-600 hover:underline">
            ← Termos de Uso
          </Link>
          <Link href="/docs/dpa" className="text-blue-600 hover:underline">
            ← DPA
          </Link>
        </div>

        <p className="text-xs text-gray-400 text-center pb-4">
          © 2026 UZZ.AI TECNOLOGIA LTDA. — Todos os direitos reservados.
        </p>
      </div>
    </main>
  )
}
