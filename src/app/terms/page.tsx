import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Termos de Serviço - UzzApp',
  description: 'Termos de serviço do UzzApp - Chatbot empresarial para WhatsApp',
}

/**
 * Termos de Serviço
 * 
 * Página pública com termos e condições de uso do aplicativo.
 * Obrigatória para publicação na Google Play Store.
 */
export default function TermsOfServicePage() {
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
            Termos de Serviço
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
              1. Aceitação dos Termos
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              Ao acessar e usar o aplicativo <strong>UzzApp</strong> (o &quot;Serviço&quot;), operado pela 
              <strong> Uzz.AI</strong> (&quot;nós&quot;, &quot;nosso&quot; ou &quot;empresa&quot;), você concorda em cumprir e 
              estar vinculado aos seguintes termos e condições de uso. Se você não concordar com 
              qualquer parte destes termos, não deve usar nosso Serviço.
            </p>
          </section>

          {/* Descrição do Serviço */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              2. Descrição do Serviço
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              O UzzApp é uma plataforma de chatbot empresarial que permite:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>Automatizar atendimento via WhatsApp Business API</li>
              <li>Processar mensagens usando inteligência artificial</li>
              <li>Gerenciar conversas e histórico de atendimento</li>
              <li>Receber notificações push sobre novas mensagens</li>
              <li>Configurar fluxos e respostas personalizadas</li>
            </ul>
          </section>

          {/* Conta de Usuário */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              3. Conta de Usuário
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              Para usar o Serviço, você deve:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>Criar uma conta fornecendo informações precisas e completas</li>
              <li>Manter a segurança de sua conta e senha</li>
              <li>Ser responsável por todas as atividades que ocorrem sob sua conta</li>
              <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
              <li>Ter pelo menos 18 anos de idade ou ter permissão de um responsável legal</li>
            </ul>
          </section>

          {/* Uso Aceitável */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              4. Uso Aceitável
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              Você concorda em NÃO usar o Serviço para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>Enviar spam, mensagens não solicitadas ou conteúdo abusivo</li>
              <li>Violar leis, regulamentos ou direitos de terceiros</li>
              <li>Interferir ou interromper o funcionamento do Serviço</li>
              <li>Tentar acessar áreas restritas ou contas de outros usuários</li>
              <li>Usar o Serviço para atividades ilegais ou fraudulentas</li>
              <li>Transmitir vírus, malware ou código malicioso</li>
              <li>Violar políticas do WhatsApp Business ou Meta</li>
            </ul>
          </section>

          {/* Propriedade Intelectual */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              5. Propriedade Intelectual
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              O Serviço e seu conteúdo original, funcionalidades e funcionalidades são e permanecerão 
              propriedade exclusiva da Uzz.AI e seus licenciadores. O Serviço é protegido por direitos 
              autorais, marcas registradas e outras leis. Você não pode reproduzir, modificar, 
              distribuir ou criar trabalhos derivados do Serviço sem nossa autorização prévia por escrito.
            </p>
          </section>

          {/* Dados do Usuário */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              6. Dados e Conteúdo do Usuário
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              Você mantém todos os direitos sobre os dados e conteúdo que você envia através do Serviço. 
              Ao usar o Serviço, você concede à Uzz.AI uma licença para:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>Processar e armazenar seus dados para fornecer o Serviço</li>
              <li>Usar seus dados para melhorar e personalizar o Serviço</li>
              <li>Compartilhar dados com terceiros conforme necessário para operar o Serviço 
                (conforme descrito em nossa Política de Privacidade)
              </li>
            </ul>
            <p className="text-erie-black-700 leading-relaxed mt-4">
              Você é responsável por garantir que possui todos os direitos necessários sobre o conteúdo 
              que envia e que não viola direitos de terceiros.
            </p>
          </section>

          {/* Pagamento */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              7. Pagamento e Assinaturas
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              Alguns recursos do Serviço podem estar disponíveis mediante pagamento de assinatura. 
              Os preços, termos de pagamento e recursos incluídos estão disponíveis em nosso portal. 
              Você concorda em pagar todas as taxas associadas à sua assinatura. As assinaturas são 
              renovadas automaticamente, a menos que canceladas. Você pode cancelar sua assinatura 
              a qualquer momento através das configurações da conta.
            </p>
          </section>

          {/* Limitação de Responsabilidade */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              8. Limitação de Responsabilidade
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              O Serviço é fornecido &quot;como está&quot; e &quot;conforme disponível&quot;. Não garantimos que o Serviço 
              será ininterrupto, livre de erros ou seguro. Em nenhuma circunstância a Uzz.AI será 
              responsável por quaisquer danos diretos, indiretos, incidentais, especiais ou consequenciais 
              resultantes do uso ou incapacidade de usar o Serviço.
            </p>
          </section>

          {/* Indenização */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              9. Indenização
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              Você concorda em indenizar e isentar a Uzz.AI, seus funcionários, diretores e agentes 
              de quaisquer reivindicações, danos, obrigações, perdas, responsabilidades, custos ou dívidas, 
              e despesas (incluindo honorários advocatícios) decorrentes de seu uso do Serviço ou 
              violação destes Termos.
            </p>
          </section>

          {/* Rescisão */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              10. Rescisão
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              Podemos encerrar ou suspender sua conta e acesso ao Serviço imediatamente, sem aviso prévio, 
              por qualquer motivo, incluindo violação destes Termos. Após a rescisão, seu direito de usar 
              o Serviço cessará imediatamente. Você pode encerrar sua conta a qualquer momento através 
              das configurações da conta ou entrando em contato conosco.
            </p>
          </section>

          {/* Alterações */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              11. Alterações nos Termos
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              Reservamo-nos o direito de modificar ou substituir estes Termos a qualquer momento. 
              Se fizermos alterações materiais, notificaremos você através do aplicativo ou por e-mail. 
              Seu uso continuado do Serviço após tais alterações constitui sua aceitação dos novos Termos.
            </p>
          </section>

          {/* Lei Aplicável */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              12. Lei Aplicável
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              Estes Termos serão regidos e interpretados de acordo com as leis do Brasil, sem dar 
              efeito a quaisquer princípios de conflitos de leis. Qualquer disputa relacionada a estes 
              Termos será submetida à jurisdição exclusiva dos tribunais competentes do Brasil.
            </p>
          </section>

          {/* Contato */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              13. Contato
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              Se você tiver dúvidas sobre estes Termos de Serviço, entre em contato conosco:
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
            <Link href="/privacy" className="text-mint-500 hover:text-mint-400">
              Política de Privacidade
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

