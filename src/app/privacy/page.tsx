import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidade - UzzApp',
  description: 'Política de privacidade do UzzApp - Chatbot empresarial para WhatsApp',
}

/**
 * Política de Privacidade
 * 
 * Página pública com informações sobre coleta e uso de dados.
 * Obrigatória para publicação na Google Play Store.
 */
export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-erie-black-900 via-erie-black-800 to-erie-black-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-mint-500 hover:text-mint-400 mb-4 inline-block"
          >
            ← Voltar para o portal
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            Política de Privacidade
          </h1>
          <p className="text-erie-black-400">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-2xl p-8 space-y-8">
          {/* Introdução */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              1. Introdução
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              A <strong>Uzz.AI</strong> (&quot;nós&quot;, &quot;nosso&quot; ou &quot;empresa&quot;) opera o aplicativo 
              <strong> UzzApp</strong> (o &quot;Serviço&quot;). Esta Política de Privacidade descreve 
              como coletamos, usamos, armazenamos e protegemos suas informações pessoais quando 
              você usa nosso aplicativo.
            </p>
            <p className="text-erie-black-700 leading-relaxed mt-4">
              Ao usar o UzzApp, você concorda com a coleta e uso de informações de acordo com 
              esta política. Se você não concordar com esta política, por favor, não use nosso 
              aplicativo.
            </p>
          </section>

          {/* Dados Coletados */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              2. Dados que Coletamos
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              Coletamos os seguintes tipos de informações:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>
                <strong>Informações de Conta:</strong> Nome, endereço de e-mail, número de 
                telefone e outras informações que você fornece ao criar uma conta.
              </li>
              <li>
                <strong>Dados de Conversas:</strong> Mensagens, áudios, imagens e documentos 
                trocados através do WhatsApp Business API.
              </li>
              <li>
                <strong>Dados de Uso:</strong> Informações sobre como você usa o aplicativo, 
                incluindo logs de acesso, timestamps e funcionalidades utilizadas.
              </li>
              <li>
                <strong>Dados Técnicos:</strong> Endereço IP, tipo de dispositivo, sistema 
                operacional, identificadores únicos do dispositivo.
              </li>
              <li>
                <strong>Tokens de Notificação:</strong> Tokens FCM (Firebase Cloud Messaging) 
                para envio de notificações push.
              </li>
            </ul>
          </section>

          {/* Como Usamos */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              3. Como Usamos Seus Dados
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              Usamos os dados coletados para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>Fornecer, manter e melhorar nossos serviços</li>
              <li>Processar e responder a mensagens através do WhatsApp Business API</li>
              <li>Enviar notificações push sobre novas mensagens e atualizações</li>
              <li>Personalizar sua experiência no aplicativo</li>
              <li>Garantir segurança e prevenir fraudes</li>
              <li>Cumprir obrigações legais e regulatórias</li>
              <li>Analisar uso do aplicativo para melhorias</li>
            </ul>
          </section>

          {/* Compartilhamento */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              4. Compartilhamento de Dados com Terceiros
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              Compartilhamos seus dados apenas com os seguintes terceiros, quando necessário:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>
                <strong>Meta (WhatsApp Business API):</strong> Para processar e enviar mensagens 
                através do WhatsApp.
              </li>
              <li>
                <strong>OpenAI:</strong> Para processamento de áudio (Whisper), análise de imagens 
                (GPT-4o Vision) e geração de embeddings.
              </li>
              <li>
                <strong>Groq:</strong> Para geração de respostas inteligentes usando modelos de IA 
                (Llama 3.3 70B).
              </li>
              <li>
                <strong>Supabase:</strong> Para armazenamento seguro de dados e autenticação.
              </li>
              <li>
                <strong>Firebase (Google):</strong> Para envio de notificações push.
              </li>
            </ul>
            <p className="text-erie-black-700 leading-relaxed mt-4">
              Todos os terceiros são obrigados a manter a confidencialidade de suas informações 
              e usar apenas para os fins especificados.
            </p>
          </section>

          {/* Segurança */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              5. Segurança dos Dados
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais para proteger seus 
              dados pessoais:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mt-4">
              <li>Criptografia em trânsito (HTTPS/TLS)</li>
              <li>Criptografia em repouso (banco de dados)</li>
              <li>Autenticação segura (Supabase Auth)</li>
              <li>Isolamento multi-tenant (Row Level Security)</li>
              <li>Backups automáticos e redundância</li>
              <li>Logs de auditoria para rastreabilidade</li>
            </ul>
          </section>

          {/* Retenção */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              6. Retenção de Dados
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              Mantemos seus dados pessoais apenas pelo tempo necessário para cumprir os fins 
              descritos nesta política, a menos que um período de retenção mais longo seja 
              exigido ou permitido por lei. Dados de conversas são mantidos enquanto sua conta 
              estiver ativa e podem ser excluídos a qualquer momento mediante solicitação.
            </p>
          </section>

          {/* Direitos do Usuário */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              7. Seus Direitos (LGPD)
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              De acordo com a Lei Geral de Proteção de Dados (LGPD), você tem os seguintes direitos:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li><strong>Acesso:</strong> Solicitar acesso aos seus dados pessoais</li>
              <li><strong>Correção:</strong> Solicitar correção de dados incompletos ou incorretos</li>
              <li><strong>Exclusão:</strong> Solicitar exclusão de seus dados pessoais</li>
              <li><strong>Portabilidade:</strong> Solicitar portabilidade dos seus dados</li>
              <li><strong>Revogação:</strong> Revogar consentimento a qualquer momento</li>
              <li><strong>Oposição:</strong> Opor-se ao processamento de seus dados</li>
            </ul>
            <p className="text-erie-black-700 leading-relaxed mt-4">
              Para exercer seus direitos, entre em contato conosco através de: 
              <a href="mailto:contato@uzzai.com.br" className="text-mint-600 hover:underline ml-1">
                contato@uzzai.com.br
              </a>
            </p>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              8. Cookies e Tecnologias Similares
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              O aplicativo mobile não utiliza cookies tradicionais. Utilizamos tecnologias similares 
              como tokens de autenticação e armazenamento local para manter sua sessão e preferências. 
              Esses dados são armazenados localmente no seu dispositivo e podem ser limpos através 
              das configurações do aplicativo.
            </p>
          </section>

          {/* Alterações */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              9. Alterações nesta Política
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você 
              sobre mudanças significativas publicando a nova política nesta página e atualizando 
              a data de &quot;Última atualização&quot;. Recomendamos que você revise esta política 
              periodicamente.
            </p>
          </section>

          {/* Contato */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              10. Contato
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco:
            </p>
            <div className="mt-4 space-y-2 text-erie-black-700">
              <p>
                <strong>Uzz.AI</strong>
              </p>
              <p>
                <strong>E-mail:</strong>{' '}
                <a href="mailto:contato@uzzai.com.br" className="text-mint-600 hover:underline">
                  contato@uzzai.com.br
                </a>
              </p>
              <p>
                <strong>Website:</strong>{' '}
                <a href="https://www.uzzai.com.br" target="_blank" rel="noopener noreferrer" className="text-mint-600 hover:underline">
                  https://www.uzzai.com.br
                </a>
              </p>
              <p>
                <strong>Portal do Produto:</strong>{' '}
                <a href="https://uzzapp.uzzai.com.br" target="_blank" rel="noopener noreferrer" className="text-mint-600 hover:underline">
                  https://uzzapp.uzzai.com.br
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-erie-black-400">
          <p>
            <Link href="/terms" className="text-mint-500 hover:text-mint-400">
              Termos de Serviço
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

