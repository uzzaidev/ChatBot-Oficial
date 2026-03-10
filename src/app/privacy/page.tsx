import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidade — UZZ.AI',
  description: 'Política de Privacidade e Proteção de Dados da UZZ.AI — Conformidade com LGPD (Lei nº 13.709/2018)',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-erie-black-900 via-erie-black-800 to-erie-black-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-mint-500 hover:text-mint-400 mb-4 inline-block">
            ← Voltar para o portal
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            Política de Privacidade e Proteção de Dados — UZZ.AI
          </h1>
          <p className="text-erie-black-400">
            Versão 1.0 • Última atualização: 10 de março de 2026 • Em conformidade com LGPD (Lei nº 13.709/2018)
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-2xl p-8 space-y-8">

          {/* Identificação */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded text-blue-800 text-sm">
            <p className="font-semibold mb-2">IDENTIFICAÇÃO DO CONTROLADOR / OPERADOR</p>
            <p className="mb-1">
              <strong>UZZ.AI TECNOLOGIA LTDA.</strong> | CNPJ: 64.025.866/0001-30
            </p>
            <p className="mb-1">
              Sede: Av. Júlio de Castilhos, 1989 - Centro, Caxias do Sul — RS, CEP 95013-215
            </p>
            <p className="mb-1">
              <a href="mailto:privacidade@uzzai.com.br" className="text-blue-700 hover:underline">privacidade@uzzai.com.br</a>
              {' | '}
              DPO: <a href="mailto:dpo@uzzai.com.br" className="text-blue-700 hover:underline">dpo@uzzai.com.br</a>
            </p>
          </div>

          {/* Seção 1 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              1. Definições Fundamentais
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Termo</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Definição</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Dado Pessoal</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Informação relacionada a pessoa natural identificada ou identificável (Art. 5º, I, LGPD)</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Dado Sensível</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Dado sobre origem racial, religião, saúde, vida sexual, dado genético ou biométrico (Art. 5º, II, LGPD)</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Titular</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Pessoa natural a quem se referem os dados pessoais</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Controlador</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Pessoa jurídica que decide sobre o tratamento de dados</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Operador</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Pessoa jurídica que trata dados em nome do Controlador</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Tratamento</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Toda operação com dados pessoais: coleta, armazenamento, processamento, exclusão e demais operações</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">CLIENTE</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Empresa que contrata a Plataforma UZZ.AI</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Usuário Final</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Pessoa física que interage com o chatbot via WhatsApp (cliente do CLIENTE)</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">ANPD</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Autoridade Nacional de Proteção de Dados</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Seção 2 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              2. Papéis Jurídicos (LGPD Art. 5º)
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">2.1 UZZ.AI como Operadora</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              No contexto dos dados pessoais dos Usuários Finais do CLIENTE, a UZZ.AI atua como
              <strong> OPERADORA</strong>, processando tais dados exclusivamente conforme as instruções
              do CLIENTE-CONTROLADOR. Um Instrumento de Controle (DPA — Data Processing Agreement) é
              disponibilizado mediante solicitação.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">2.2 Cliente como Controlador</h3>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              O CLIENTE atua como <strong>CONTROLADOR</strong> dos dados de seus Usuários Finais, sendo responsável por:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) Possuir base legal válida para o tratamento;</li>
              <li>(b) Obter opt-in inequívoco para envio de mensagens WhatsApp e atendimento por IA;</li>
              <li>(c) Informar os usuários sobre o atendimento automatizado por IA;</li>
              <li>(d) Responder perante a ANPD e os titulares de dados;</li>
              <li>(e) Garantir que o conteúdo da base de conhecimento não viole direitos de terceiros.</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">2.3 UZZ.AI como Controladora</h3>
            <p className="text-erie-black-700 leading-relaxed">
              Em relação aos dados cadastrais do próprio CLIENTE, a UZZ.AI atua como <strong>CONTROLADORA</strong>,
              tratando tais dados para execução do contrato, faturamento e suporte.
            </p>
          </section>

          {/* Seção 3 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              3. Princípios LGPD (Art. 6º)
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              O tratamento de dados realizado pela UZZ.AI observa os seguintes princípios:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-erie-black-700 ml-4">
              <li><strong>Finalidade</strong> — tratamento para finalidades legítimas, específicas, explícitas e informadas;</li>
              <li><strong>Adequação</strong> — compatibilidade com as finalidades informadas ao titular;</li>
              <li><strong>Necessidade</strong> — limitação ao mínimo necessário (data minimization);</li>
              <li><strong>Livre Acesso</strong> — garantia de consulta facilitada aos titulares;</li>
              <li><strong>Qualidade dos Dados</strong> — exatidão, clareza e atualização;</li>
              <li><strong>Transparência</strong> — informações claras sobre o tratamento;</li>
              <li><strong>Segurança</strong> — medidas técnicas e administrativas de proteção;</li>
              <li><strong>Prevenção</strong> — Privacy by Design e by Default;</li>
              <li><strong>Não Discriminação</strong> — vedação ao tratamento para fins discriminatórios;</li>
              <li><strong>Responsabilização e Prestação de Contas</strong> (Accountability) — demonstração de conformidade.</li>
            </ol>
          </section>

          {/* Seção 4 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              4. Dados Coletados e Finalidades
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">4.1 Dados do Cliente</h3>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Categoria</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Dados Coletados</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Finalidade</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Base Legal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Identificação</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Razão social, CNPJ, nome fantasia, endereço</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Cadastro, NF, conformidade fiscal</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Execução de contrato (Art. 7º, V)</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Contato</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">E-mail corporativo, telefone, nome do representante</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Comunicações, suporte</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Execução de contrato (Art. 7º, V)</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Acesso</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">E-mail e senha (hash bcrypt), logs de acesso</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Autenticação, segurança</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Execução de contrato / Legítimo interesse (Art. 7º, V e IX)</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Financeiro</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Dados bancários, histórico de pagamentos</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Cobrança, faturamento</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Execução de contrato (Art. 7º, V)</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Uso da Plataforma</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Configurações, prompts, logs de sistema</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Suporte, melhoria, auditoria</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Legítimo interesse (Art. 7º, IX)</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Credenciais de API</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Tokens Meta, OpenAI, Groq (criptografados)</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Operação das integrações</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Execução de contrato (Art. 7º, V)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">4.2 Dados dos Usuários Finais</h3>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Categoria</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Dados Coletados</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Finalidade</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Identificação</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Número de telefone WhatsApp, nome de perfil</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Identificação e gestão de conversas</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Conversas</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Histórico completo de mensagens (texto, áudio transcrito, descrição de imagens)</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Contexto para IA, relatórios para o CLIENTE</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Mídia</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Áudios (processados e descartados), imagens (analisadas e descartadas), documentos</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Transcrição e análise visual contextualizada</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Metadata</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Data/hora, status da conversa (bot/humano), tipo de mensagem</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Funcionamento do sistema, analytics</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Localização</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Apenas se compartilhada voluntariamente pelo usuário</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Resposta contextualizada</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded text-blue-800 text-sm mb-6">
              Áudios e imagens são enviados à API OpenAI para processamento e não são armazenados pela UZZ.AI após processamento.
            </div>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">4.3 Site Institucional</h3>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) IP anonimizado para analytics;</li>
              <li>(b) Formulário de contato mediante consentimento;</li>
              <li>(c) Cookies de sessão por legítimo interesse.</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">4.4 Dados Sensíveis</h3>
            <p className="text-erie-black-700 leading-relaxed">
              O tratamento de dados sensíveis pode ocorrer conforme o setor de atuação do CLIENTE.
              Nesse caso, exige-se consentimento específico do Usuário Final, sendo responsabilidade
              exclusiva do CLIENTE-CONTROLADOR obtê-lo.
            </p>
          </section>

          {/* Seção 5 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              5. Base Legal (LGPD Art. 7º)
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">5.1 Dados do Cliente</h3>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>Execução de contrato (Art. 7º, V);</li>
              <li>Obrigação legal (Art. 7º, II);</li>
              <li>Legítimo interesse (Art. 7º, IX).</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">5.2 Dados de Usuários Finais</h3>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              A base legal é definida pelo CLIENTE-CONTROLADOR, podendo incluir:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>Consentimento (Art. 7º, I);</li>
              <li>Execução de contrato com o titular (Art. 7º, V);</li>
              <li>Legítimo interesse (Art. 7º, IX).</li>
            </ul>
          </section>

          {/* Seção 6 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              6. Compartilhamento e Suboperadores
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">6.1 Suboperadores</h3>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Suboperador</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">País</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Dados</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Finalidade</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Certificações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Supabase (AWS São Paulo)</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Brasil</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Dados de CLIENTEs e Usuários Finais</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Armazenamento principal</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">SOC 2 Type II</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Vercel</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">EUA/Global</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Dados de requisições (temporário)</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Processamento serverless</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">SOC 2 Type II</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">OpenAI</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">EUA</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Conteúdo de mensagens, áudios, imagens</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">IA generativa, Whisper, GPT-4o Vision</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">SOC 2 Type II, ISO 27001</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Groq</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">EUA</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Conteúdo de mensagens</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Inferência de modelos alternativos</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Política própria</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Upstash (Redis)</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">EUA</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Conteúdo de mensagens (&lt; 60 segundos)</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Enfileiramento, eliminado automaticamente</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">SOC 2</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Meta Platforms</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">EUA</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Número de telefone, conteúdo de mensagens</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Envio/recebimento via WhatsApp Business API</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Política WhatsApp Business</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded text-blue-800 text-sm mb-6">
              Dados cadastrais e histórico de conversas são armazenados primariamente no Supabase
              em servidores AWS na região de São Paulo — Brasil.
            </div>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">6.2 Transferência Internacional</h3>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) Realizada mediante Cláusulas Contratuais Padrão (SCCs);</li>
              <li>(b) Suboperadores com certificações SOC 2/ISO 27001 e DPAs vigentes;</li>
              <li>(c) O CLIENTE autoriza as transferências ao contratar a Plataforma.</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">6.3 Não Compartilhamento</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              A UZZ.AI <strong>não</strong> compartilha dados para fins de marketing de terceiros,
              com concorrentes do CLIENTE ou com entidades não listadas nesta Política.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">6.4 Obrigação Legal</h3>
            <p className="text-erie-black-700 leading-relaxed">
              A UZZ.AI pode divulgar dados quando exigido por lei ou ordem judicial, notificando o
              CLIENTE previamente sempre que legalmente permitido.
            </p>
          </section>

          {/* Seção 7 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              7. Retenção e Exclusão
            </h2>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Categoria</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Prazo</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Fundamento</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Dados cadastrais do CLIENTE</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Contrato + 5 anos</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Obrigações fiscais (CTN)</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Histórico de conversas</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Contrato + 90 dias após rescisão</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Disponível para exportação</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Documentos RAG</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Até exclusão pelo CLIENTE ou rescisão</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Execução do serviço</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Logs de acesso</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">6 meses</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Art. 15, Marco Civil da Internet</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Logs de auditoria de segurança</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">12 meses</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Legítimo interesse</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Dados anonimizados</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Indefinidamente</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Finalidade estatística</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Dados fiscais (NF, contratos)</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">5 anos</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Art. 195, CTN</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-erie-black-700 text-sm italic">
              Certificado de exclusão emitido em até 15 dias mediante solicitação.
            </p>
          </section>

          {/* Seção 8 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              8. Segurança da Informação
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">8.1 Medidas Técnicas</h3>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Medida</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Criptografia em trânsito</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">TLS 1.3 (HTTPS) em todas as comunicações</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Criptografia em repouso</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">AES-256 (Supabase/AWS) para todos os dados</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Criptografia de secrets</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">pgsodium via Supabase Vault (criptografia de envelope)</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Controle de acesso</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">RBAC com princípio do menor privilégio</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Isolamento multi-tenant</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">RLS (Row Level Security) no PostgreSQL</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Autenticação</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Hash bcrypt; suporte a 2FA</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Backup</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Automático diário, retenção de 30 dias (Supabase)</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Monitoramento</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Logs de acesso e auditoria com alertas</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">8.2 Medidas Organizacionais</h3>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) Acesso restrito por função (need-to-know);</li>
              <li>(b) Treinamentos periódicos de segurança para colaboradores;</li>
              <li>(c) Acordos de confidencialidade com todos os colaboradores e fornecedores;</li>
              <li>(d) Avaliação de segurança antes de contratar novos suboperadores;</li>
              <li>(e) Testes de segurança e penetração periódicos;</li>
              <li>(f) Plano de resposta a incidentes documentado e testado.</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">8.3 Privacy by Design e by Default</h3>
            <p className="text-erie-black-700 leading-relaxed">
              A privacidade e a proteção de dados são incorporadas desde o design dos sistemas e
              processos da UZZ.AI, com configurações padrão que maximizam a proteção dos titulares.
            </p>
          </section>

          {/* Seção 9 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              9. Direitos dos Titulares (LGPD Art. 18)
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">9.1 Seus Direitos</h3>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Direito</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Confirmação</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Saber se tratamos seus dados pessoais</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Acesso</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Obter cópia dos dados que mantemos</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Retificação</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Corrigir dados incompletos ou inexatos</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Anonimização/Bloqueio/Eliminação</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Solicitar para dados desnecessários ou tratados em desconformidade</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Portabilidade</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Receber dados em formato estruturado e interoperável</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Eliminação</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Solicitar exclusão de dados tratados com consentimento</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Informação</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Saber com quem compartilhamos seus dados</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Revogação</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Retirar consentimento a qualquer momento</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Oposição</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Opor-se ao tratamento por legítimo interesse</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Revisão automatizada</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Solicitar revisão humana de decisões automatizadas</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">9.2 Como Exercer</h3>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>
                <strong>CLIENTEs:</strong> Painel da Plataforma ou{' '}
                <a href="mailto:privacidade@uzzai.com.br" className="text-mint-600 hover:underline">privacidade@uzzai.com.br</a>
                {' '}ou{' '}
                <a href="mailto:dpo@uzzai.com.br" className="text-mint-600 hover:underline">dpo@uzzai.com.br</a>;
              </li>
              <li>
                <strong>Usuários Finais:</strong> Contatar o CLIENTE (Controlador); se não atendido:{' '}
                <a href="mailto:privacidade@uzzai.com.br" className="text-mint-600 hover:underline">privacidade@uzzai.com.br</a>;
              </li>
              <li><strong>Prazo de resposta:</strong> 15 dias úteis, prorrogável por igual período.</li>
            </ul>
          </section>

          {/* Seção 10 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              10. DPO — Encarregado de Proteção de Dados
            </h2>
            <div className="bg-erie-black-50 border border-erie-black-200 rounded-lg p-6">
              <p className="text-erie-black-800 mb-2">
                <strong>Nome:</strong> Pedro Vitor Brunello Pagliarin
              </p>
              <p className="text-erie-black-800 mb-2">
                <strong>E-mail:</strong>{' '}
                <a href="mailto:dpo@uzzai.com.br" className="text-mint-600 hover:underline">dpo@uzzai.com.br</a>
              </p>
              <p className="text-erie-black-800 mb-2">
                <strong>Telefone:</strong>{' '}
                <a href="tel:+5554991590379" className="text-mint-600 hover:underline">(54) 99159-0379</a>
              </p>
              <p className="text-erie-black-800">
                <strong>Endereço:</strong> Av. Júlio de Castilhos, 1989 - Centro, Caxias do Sul/RS — CEP 95013-215
              </p>
            </div>
          </section>

          {/* Seção 11 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              11. Notificação de Incidentes (LGPD Art. 48)
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              11.1 Em caso de incidente de segurança, a UZZ.AI adotará imediatamente medidas de contenção.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              11.2 Notificação ao CLIENTE: até 24 horas para incidentes de alta gravidade; até 72 horas
              para incidentes de gravidade moderada.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              11.3 Notificação à ANPD: até 72 horas conforme Resolução CD/ANPD nº 15/2024.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              11.4 A notificação conterá:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) Natureza dos dados pessoais afetados;</li>
              <li>(b) Informações de contato do DPO;</li>
              <li>(c) Categorias e número estimado de titulares afetados;</li>
              <li>(d) Medidas técnicas adotadas para remediar o incidente;</li>
              <li>(e) Riscos relacionados ao incidente;</li>
              <li>(f) Medidas mitigadoras dos efeitos aos titulares.</li>
            </ul>
            <p className="text-erie-black-700 leading-relaxed">
              11.5 Para reportar incidentes:{' '}
              <a href="mailto:seguranca@uzzai.com.br" className="text-mint-600 hover:underline">seguranca@uzzai.com.br</a>
            </p>
          </section>

          {/* Seção 12 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              12. Cookies
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">12.1 Tipos de Cookies Utilizados</h3>
            <div className="overflow-x-auto mb-6">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Tipo</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Nome</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Finalidade</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Duração</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Essencial</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Sessão</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-mono text-xs">sb-access-token</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Autenticação Supabase</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Sessão</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Sim</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Sessão</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-mono text-xs">sb-refresh-token</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Renovação de sessão</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">7 dias</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Sim</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Preferências</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-mono text-xs">uzzai-theme</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Tema (claro/escuro)</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">1 ano</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Não</td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Analytics</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-mono text-xs">_ga, _gid</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Google Analytics (anonimizado)</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">2 anos</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">Não</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-erie-black-700 leading-relaxed mb-3">
              12.2 Os cookies podem ser gerenciados pelo navegador. Cookies essenciais não podem ser
              desabilitados sem comprometer o funcionamento da Plataforma.
            </p>
            <p className="text-erie-black-700 leading-relaxed">
              12.3 O Google Analytics é configurado com <code className="bg-erie-black-100 px-1 rounded text-xs">anonymize_ip: true</code> ativado.
            </p>
          </section>

          {/* Seção 13 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              13. IA — Transparência
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              13.1 A Plataforma utiliza modelos de linguagem de terceiros (OpenAI, Groq). O CLIENTE é
              responsável por informar seus usuários finais que o atendimento é realizado por IA automatizada.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              13.2 Decisões automatizadas de triagem de atendimentos são tomadas pela IA. O CLIENTE
              é responsável por garantir revisão humana em decisões que possam impactar significativamente
              os usuários finais.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              13.3 A UZZ.AI <strong>não utiliza</strong> dados de conversas dos CLIENTEs para treinar
              modelos de IA proprietários ou de terceiros.
            </p>
            <p className="text-erie-black-700 leading-relaxed">
              13.4 Em relação aos provedores externos: por padrão, dados transmitidos via API para
              OpenAI e Groq <strong>não são utilizados por esses provedores para treinamento de modelos
              públicos</strong>, conforme suas políticas de uso de API vigentes. A UZZ.AI monitora
              eventuais alterações nestas políticas e notificará os CLIENTEs caso ocorram mudanças
              relevantes. O CLIENTE pode consultar as políticas atuais diretamente em{' '}
              <a href="https://openai.com/policies/api-data-usage-policies" target="_blank" rel="noopener noreferrer" className="text-mint-600 hover:underline">openai.com/policies</a>
              {' '}e{' '}
              <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-mint-600 hover:underline">groq.com/privacy-policy</a>.
            </p>
          </section>

          {/* Seção 14 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              14. Menores de Idade
            </h2>
            <p className="text-erie-black-700 leading-relaxed">
              A Plataforma UZZ.AI é destinada a pessoas jurídicas (B2B). O CLIENTE é responsável por
              garantir, em sua própria plataforma, o consentimento de responsáveis legais para o
              tratamento de dados de menores de idade, conforme Art. 14 da LGPD.
            </p>
          </section>

          {/* Seção 15 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              15. Alterações
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              15.1 Esta Política pode ser atualizada periodicamente para refletir mudanças em práticas
              de privacidade, legislação ou funcionalidades da Plataforma.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              15.2 Alterações relevantes serão notificadas por e-mail com antecedência mínima de 30 dias.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              15.3 Exigências legais supervenientes podem ter vigência imediata.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              15.4 A versão vigente estará sempre disponível em{' '}
              <Link href="/privacy" className="text-mint-600 hover:underline">/privacy</Link>.
            </p>
            <p className="text-erie-black-700 leading-relaxed">
              15.5 O uso contínuo da Plataforma após notificação de alterações constitui aceitação da
              nova versão desta Política.
            </p>
          </section>

          {/* Seção 16 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              16. Lei Aplicável e Foro
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              16.1 Esta Política é regida pela LGPD (Lei 13.709/2018), Marco Civil da Internet
              (Lei 12.965/2014) e, quando aplicável, pelo CDC (Lei 8.078/1990) para consumidores finais.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              16.2 Fica eleito o foro da Comarca de Caxias do Sul/RS para dirimir quaisquer
              controvérsias decorrentes desta Política.
            </p>
            <p className="text-erie-black-700 leading-relaxed">
              16.3 Titulares podem peticionar diretamente à ANPD em{' '}
              <a
                href="https://www.gov.br/anpd"
                target="_blank"
                rel="noopener noreferrer"
                className="text-mint-600 hover:underline"
              >
                gov.br/anpd
              </a>
              .
            </p>
          </section>

          {/* Contato */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              Canais de Contato
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Canal</th>
                    <th className="border border-erie-black-200 p-3 bg-erie-black-50 font-semibold text-erie-black-800 text-left">Contato</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Privacidade</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">
                      <a href="mailto:privacidade@uzzai.com.br" className="text-mint-600 hover:underline">privacidade@uzzai.com.br</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">DPO</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">
                      <a href="mailto:dpo@uzzai.com.br" className="text-mint-600 hover:underline">dpo@uzzai.com.br</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Incidentes de segurança</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">
                      <a href="mailto:seguranca@uzzai.com.br" className="text-mint-600 hover:underline">seguranca@uzzai.com.br</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Jurídico/Compliance</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">
                      <a href="mailto:juridico@uzzai.com.br" className="text-mint-600 hover:underline">juridico@uzzai.com.br</a>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Endereço</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">
                      Av. Júlio de Castilhos, 1989 - Centro, Caxias do Sul/RS — CEP 95013-215
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700 font-medium">Site</td>
                    <td className="border border-erie-black-200 p-3 text-erie-black-700">
                      <a href="https://uzzapp.uzzai.com.br" target="_blank" rel="noopener noreferrer" className="text-mint-600 hover:underline">
                        uzzapp.uzzai.com.br
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-erie-black-400">
          <p>
            <Link href="/terms" className="text-mint-500 hover:text-mint-400">
              Termos e Condições
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
