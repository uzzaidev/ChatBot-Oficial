import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Acordo de Processamento de Dados | UzzApp',
  description:
    'Acordo de Processamento de Dados (DPA) do UzzApp - Condições, responsabilidades e garantias sobre o tratamento de dados pessoais conforme a LGPD.',
}

export default function DataProcessingAgreementPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-erie-black-900 via-erie-black-800 to-erie-black-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <Link href="/" className="text-mint-500 hover:text-mint-400 mb-4 inline-block">
            ← Voltar para o portal
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            Acordo de Processamento de Dados
          </h1>
          <p className="text-erie-black-400">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-2xl p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              1. Partes do Acordo
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              Este Acordo de Processamento de Dados (&quot;DPA&quot;) é celebrado entre:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>
                <strong>Controlador:</strong> O cliente (pessoa física ou jurídica) que contrata os
                serviços do UzzApp e determina as finalidades e meios do tratamento de dados pessoais.
              </li>
              <li>
                <strong>Operador:</strong>{' '}
                <strong>Uzz.AI</strong>, empresa responsável pela plataforma UzzApp, que processa
                dados pessoais em nome do Controlador conforme as instruções deste acordo e dos
                Termos de Serviço.
              </li>
            </ul>
            <p className="text-erie-black-700 leading-relaxed mt-4">
              Este DPA faz parte integrante dos Termos de Serviço do UzzApp e se aplica sempre que o
              Operador processa dados pessoais em nome do Controlador.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              2. Dados Processados
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              No âmbito da prestação dos serviços, o Operador processa as seguintes categorias de dados pessoais:
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-erie-black-800 mb-2">Dados dos Usuários Finais (clientes do Controlador):</h3>
                <ul className="list-disc list-inside space-y-1 text-erie-black-700 ml-4">
                  <li>Número de telefone WhatsApp (identificador principal)</li>
                  <li>Nome fornecido na plataforma WhatsApp</li>
                  <li>Conteúdo das mensagens trocadas (texto, áudio, imagens)</li>
                  <li>Histórico de conversas e interações</li>
                  <li>Metadados de mensagens (horário, status de entrega)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-erie-black-800 mb-2">Dados dos Administradores (usuários do Controlador):</h3>
                <ul className="list-disc list-inside space-y-1 text-erie-black-700 ml-4">
                  <li>Nome completo e endereço de e-mail</li>
                  <li>Credenciais de acesso (armazenadas com hash seguro)</li>
                  <li>Logs de acesso e atividade na plataforma</li>
                  <li>Chaves de API de terceiros (armazenadas com criptografia AES-256 via Vault)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              3. Finalidade do Processamento
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              O Operador processa os dados pessoais exclusivamente para as seguintes finalidades, mediante instrução do Controlador:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>Prestar o serviço de chatbot automatizado via WhatsApp Business API</li>
              <li>Processar e responder mensagens utilizando inteligência artificial</li>
              <li>Armazenar histórico de conversas para continuidade do atendimento</li>
              <li>Realizar busca semântica em bases de conhecimento (RAG) configuradas pelo Controlador</li>
              <li>Encaminhar atendimentos para humanos quando solicitado pelo sistema ou pelo usuário</li>
              <li>Gerar relatórios e métricas de uso para o Controlador</li>
              <li>Cumprir obrigações legais e regulatórias aplicáveis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              4. Período de Retenção
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              Os dados pessoais são retidos pelos seguintes períodos:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>
                <strong>Histórico de conversas:</strong> Retido durante todo o período de vigência
                do contrato e por até 90 (noventa) dias após o encerramento, para fins de migração
                e auditoria.
              </li>
              <li>
                <strong>Dados de usuários finais:</strong> Retidos enquanto o cliente mantiver
                contrato ativo com o Controlador ou até solicitação de exclusão.
              </li>
              <li>
                <strong>Logs de acesso e uso:</strong> Retidos por 12 (doze) meses para fins de
                segurança e auditoria.
              </li>
              <li>
                <strong>Credenciais e chaves de API:</strong> Excluídas imediatamente após
                encerramento do contrato ou substituição pelo Controlador.
              </li>
            </ul>
            <p className="text-erie-black-700 leading-relaxed mt-4">
              Após os períodos acima, os dados são eliminados de forma segura e irreversível, exceto
              quando a retenção for exigida por lei ou regulação específica.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              5. Subprocessadores
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              O Operador utiliza os seguintes subprocessadores para fornecer o serviço. O Controlador
              autoriza expressamente o uso destes subprocessadores ao aceitar este DPA:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-erie-black-700 border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-semibold border-b border-gray-200">Subprocessador</th>
                    <th className="text-left p-3 font-semibold border-b border-gray-200">Finalidade</th>
                    <th className="text-left p-3 font-semibold border-b border-gray-200">Localização</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="p-3 font-medium">Meta Platforms (WhatsApp)</td>
                    <td className="p-3">Entrega e recebimento de mensagens via WhatsApp Business API</td>
                    <td className="p-3">EUA / Global</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">OpenAI</td>
                    <td className="p-3">Processamento de linguagem natural, transcrição de áudio (Whisper) e análise de imagens (GPT-4o Vision)</td>
                    <td className="p-3">EUA</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Groq</td>
                    <td className="p-3">Processamento de linguagem natural (Llama 3.3 70B)</td>
                    <td className="p-3">EUA</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Supabase</td>
                    <td className="p-3">Armazenamento de dados, autenticação, banco de dados vetorial e gerenciamento de secrets (Vault)</td>
                    <td className="p-3">EUA / AWS</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium">Vercel</td>
                    <td className="p-3">Hospedagem da aplicação e infraestrutura serverless</td>
                    <td className="p-3">EUA / Global</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-erie-black-700 leading-relaxed mt-4">
              O Operador notificará o Controlador sobre adições ou substituições de subprocessadores
              com antecedência mínima de 30 (trinta) dias, permitindo ao Controlador manifestar
              objeções fundamentadas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              6. Direitos dos Titulares
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              O Operador compromete-se a auxiliar o Controlador no cumprimento dos direitos dos
              titulares previstos na Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018),
              incluindo:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>
                <strong>Acesso:</strong> Fornecimento de relatório com dados pessoais tratados, mediante solicitação do Controlador.
              </li>
              <li>
                <strong>Correção:</strong> Atualização de dados incorretos ou incompletos no sistema.
              </li>
              <li>
                <strong>Eliminação:</strong> Exclusão dos dados pessoais do titular do banco de dados,
                dentro de prazo razoável após solicitação.
              </li>
              <li>
                <strong>Portabilidade:</strong> Exportação dos dados em formato estruturado (JSON/CSV)
                mediante solicitação formal do Controlador.
              </li>
              <li>
                <strong>Oposição:</strong> Interrupção do processamento para finalidades específicas
                quando houver base legal para tal oposição.
              </li>
            </ul>
            <p className="text-erie-black-700 leading-relaxed mt-4">
              Solicitações de titulares devem ser encaminhadas pelo Controlador ao Operador através do
              e-mail{' '}
              <a href="mailto:privacidade@uzzai.com.br" className="text-mint-600 hover:underline">
                privacidade@uzzai.com.br
              </a>
              , e serão atendidas em até 15 (quinze) dias úteis.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              7. Medidas de Segurança
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              O Operador implementa medidas técnicas e organizacionais adequadas para proteger os
              dados pessoais contra acesso não autorizado, perda, destruição ou divulgação indevida:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>
                <strong>Criptografia em trânsito:</strong> Todas as comunicações utilizam TLS 1.2
                ou superior.
              </li>
              <li>
                <strong>Criptografia em repouso:</strong> Dados armazenados com criptografia AES-256.
                Chaves de API armazenadas no Supabase Vault com criptografia dedicada.
              </li>
              <li>
                <strong>Controle de acesso:</strong> Row Level Security (RLS) no banco de dados,
                garantindo isolamento completo entre tenants.
              </li>
              <li>
                <strong>Autenticação:</strong> Autenticação multifator disponível e tokens JWT com
                expiração configurada.
              </li>
              <li>
                <strong>Auditoria:</strong> Logs de acesso e atividade mantidos por 12 meses.
              </li>
              <li>
                <strong>Isolamento de tenants:</strong> Cada cliente possui seus próprios dados e
                credenciais isolados, sem compartilhamento entre tenants.
              </li>
              <li>
                <strong>Resposta a incidentes:</strong> O Operador notificará o Controlador em até
                72 horas após tomar ciência de uma violação de dados pessoais.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              8. Contato e Encarregado de Dados
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-4">
              Para questões relacionadas a este DPA, proteção de dados ou exercício de direitos de
              titulares, entre em contato com o Encarregado de Proteção de Dados (DPO) do Operador:
            </p>
            <div className="mt-4 space-y-2 text-erie-black-700 bg-gray-50 rounded-lg p-4">
              <p>
                <strong>Uzz.AI</strong>
              </p>
              <p>
                <strong>E-mail DPO:</strong>{' '}
                <a href="mailto:privacidade@uzzai.com.br" className="text-mint-600 hover:underline">
                  privacidade@uzzai.com.br
                </a>
              </p>
              <p>
                <strong>E-mail Geral:</strong>{' '}
                <a href="mailto:contato@uzzai.com.br" className="text-mint-600 hover:underline">
                  contato@uzzai.com.br
                </a>
              </p>
              <p>
                <strong>Website:</strong>{' '}
                <a
                  href="https://www.uzzai.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mint-600 hover:underline"
                >
                  https://www.uzzai.com.br
                </a>
              </p>
              <p>
                <strong>Portal:</strong>{' '}
                <a
                  href="https://uzzapp.uzzai.com.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-mint-600 hover:underline"
                >
                  https://uzzapp.uzzai.com.br
                </a>
              </p>
            </div>
          </section>
        </div>

        <div className="mt-8 text-center text-erie-black-400">
          <p>
            <Link href="/terms" className="text-mint-500 hover:text-mint-400">
              Termos de Serviço
            </Link>
            {' • '}
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

// inline-review: ok - static page, no data fetching, no secrets, proper metadata
