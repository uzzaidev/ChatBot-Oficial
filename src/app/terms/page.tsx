import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Termos e Condições de Uso — UZZ.AI',
  description: 'Termos e Condições de Uso da Plataforma UZZ.AI — Contrato B2B de SaaS para chatbot WhatsApp',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-erie-black-900 via-erie-black-800 to-erie-black-900">
      <div className="container mx-auto px-4 py-12 max-w-4xl">

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-mint-500 hover:text-mint-400 mb-4 inline-block">
            ← Voltar para o portal
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">
            Termos e Condições de Uso — Plataforma UZZ.AI
          </h1>
          <p className="text-erie-black-400 mb-4">
            Versão 1.0 • Última atualização: 10 de março de 2026
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-block bg-erie-black-700 text-erie-black-200 text-xs font-medium px-3 py-1 rounded-full">
              URL pública: /terms
            </span>
            <span className="inline-block bg-erie-black-700 text-erie-black-200 text-xs font-medium px-3 py-1 rounded-full">
              Relação B2B — CDC não aplicável
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-2xl p-8 space-y-8">

          {/* Identificação das Partes */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded text-blue-800 text-sm">
            <p className="font-semibold mb-2">IDENTIFICAÇÃO DAS PARTES</p>
            <p className="mb-1">
              <strong>CONTRATADA:</strong> UZZ.AI TECNOLOGIA LTDA. | CNPJ: 64.025.866/0001-30 |
              Sede: Av. Júlio de Castilhos, 1989 - Centro, Caxias do Sul — RS, CEP 95013-215 |
              E-mail:{' '}
              <a href="mailto:contato@uzzai.com.br" className="text-blue-700 hover:underline">
                contato@uzzai.com.br
              </a>
            </p>
            <p>
              <strong>CLIENTE:</strong> Pessoa jurídica que realiza o cadastro e contratação.
            </p>
          </div>

          {/* Seção 1 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              1. Objeto e Escopo dos Serviços
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">1.1 Objeto</h3>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              A UZZ.AI disponibiliza ao CLIENTE, mediante assinatura, a plataforma SaaS composta por:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) Interface web de gerenciamento de chatbots e atendimentos via WhatsApp Business;</li>
              <li>(b) Motor de IA para processamento e geração de respostas em linguagem natural;</li>
              <li>(c) Sistema de base de conhecimento com busca semântica (RAG);</li>
              <li>(d) Painel administrativo multi-tenant com RBAC;</li>
              <li>(e) Integrações com APIs de terceiros (Meta/WhatsApp, OpenAI, Groq), conforme plano contratado;</li>
              <li>(f) Módulo de handoff humano;</li>
              <li>(g) Relatórios, dashboards e histórico de conversas;</li>
              <li>(h) Suporte técnico conforme plano contratado.</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">1.2 Licença</h3>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              A UZZ.AI concede ao CLIENTE licença de uso limitada, não exclusiva, intransferível e revogável. São vedados:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) Engenharia reversa, decompilação ou acesso ao código-fonte;</li>
              <li>(b) Remover avisos de direitos autorais ou marcas;</li>
              <li>(c) Sublicenciar, revender ou ceder acesso a terceiros sem contrato de parceria;</li>
              <li>(d) Criar produtos derivados sem autorização;</li>
              <li>(e) Scraping ou extração massiva de dados;</li>
              <li>(f) Comprometer segurança ou infraestrutura de outros clientes.</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">1.3 Propriedade Intelectual</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              Todos os direitos de propriedade intelectual sobre a Plataforma, incluindo código-fonte, algoritmos,
              interfaces, marcas e documentação, pertencem exclusivamente à UZZ.AI.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">1.4 Dados do Cliente</h3>
            <p className="text-erie-black-700 leading-relaxed">
              O CLIENTE retém todos os direitos sobre seus dados e os dados de seus usuários finais inseridos na Plataforma.
            </p>
          </section>

          {/* Seção 2 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              2. Cadastro, Contas e Acesso
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">2.1 Elegibilidade</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              A Plataforma é destinada exclusivamente a pessoas jurídicas regularmente constituídas nos termos
              da legislação brasileira.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">2.2 Cadastro</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              O CLIENTE compromete-se a fornecer informações verídicas, completas e atualizadas no momento
              do cadastro e durante toda a vigência contratual.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">2.3 Segurança da Conta</h3>
            <p className="text-erie-black-700 leading-relaxed mb-3">O CLIENTE deve:</p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) Manter confidencialidade das credenciais de acesso;</li>
              <li>(b) Ser responsável por todas as atividades realizadas em sua conta;</li>
              <li>
                (c) Comunicar imediatamente suspeita de acesso não autorizado via{' '}
                <a href="mailto:seguranca@uzzai.com.br" className="text-mint-600 hover:underline">
                  seguranca@uzzai.com.br
                </a>
                .
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">2.4 Usuários Autorizados</h3>
            <p className="text-erie-black-700 leading-relaxed">
              O CLIENTE é responsável por garantir que todos os usuários autorizados em sua conta cumpram
              integralmente os presentes Termos.
            </p>
          </section>

          {/* Seção 3 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              3. Natureza da IA e Suas Limitações
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">3.1 Respostas Probabilísticas</h3>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              Os modelos de linguagem (LLM) operam por inferência estatística, podendo gerar respostas:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) Factualmente imprecisas, desatualizadas ou incorretas;</li>
              <li>(b) Incompletas ou inadequadas para determinados contextos;</li>
              <li>(c) &quot;Alucinação&quot; — informações que não correspondem à realidade.</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">3.2 Dever de Supervisão Humana</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              É responsabilidade indelegável do CLIENTE revisar e validar as informações geradas pela IA
              antes de aplicá-las em contextos críticos, especialmente em áreas de saúde, jurídico e financeiro.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">3.3 Configuração de Prompts</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              A eficácia das respostas da IA depende diretamente dos prompts e instruções configurados pelo
              CLIENTE. A UZZ.AI não se responsabiliza por resultados decorrentes de configurações inadequadas.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">3.4 Evolução dos Modelos</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              A UZZ.AI pode atualizar, substituir ou descontinuar modelos de IA utilizados na Plataforma
              sem que isso constitua violação contratual, desde que mantido o nível equivalente de qualidade.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">3.5 Exclusão de Responsabilidade por IA</h3>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              A UZZ.AI não se responsabiliza por danos decorrentes de:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>(a) Decisões tomadas sem supervisão humana com base em respostas da IA;</li>
              <li>(b) Má configuração de prompts pelo CLIENTE;</li>
              <li>(c) Respostas que violem direitos de terceiros por conta do conteúdo fornecido pelo CLIENTE.</li>
            </ul>
          </section>

          {/* Seção 4 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              4. Integração com Terceiros
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">4.1 Dependência de Terceiros</h3>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              A Plataforma opera em integração com serviços de terceiros, incluindo:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) Meta/WhatsApp Business API;</li>
              <li>(b) OpenAI;</li>
              <li>(c) Groq;</li>
              <li>(d) Supabase;</li>
              <li>(e) Vercel;</li>
              <li>(f) Redis/Upstash.</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">4.2 Ausência de Controle</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              A UZZ.AI não controla as políticas, disponibilidade, preços ou mudanças de serviços de terceiros,
              não sendo responsável por interrupções ou alterações causadas por tais plataformas.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">4.3 Políticas WhatsApp</h3>
            <p className="text-erie-black-700 leading-relaxed mb-3">O CLIENTE compromete-se a:</p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) Estar em conformidade com as Políticas Comerciais da Meta;</li>
              <li>(b) Obter opt-in válido dos usuários finais antes de iniciar conversas;</li>
              <li>(c) Não usar a Plataforma para spam ou envio de conteúdo ilegal;</li>
              <li>(d) Não enviar conteúdo discriminatório, abusivo ou que viole direitos de terceiros.</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">4.4 Bloqueios e Banimentos</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              O uso inadequado da Plataforma pode resultar em banimento do número WhatsApp Business pelo CLIENTE
              pela Meta, sem que a UZZ.AI tenha qualquer responsabilidade por tal ocorrência.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">4.5 Obrigações perante Terceiros</h3>
            <p className="text-erie-black-700 leading-relaxed">
              O CLIENTE é o único responsável por cumprir os termos de uso das plataformas de terceiros
              integradas à Plataforma UZZ.AI.
            </p>
          </section>

          {/* Seção 5 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              5. Obrigações do Cliente
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-3">O CLIENTE obriga-se a:</p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>(a) Utilizar a Plataforma exclusivamente para fins lícitos;</li>
              <li>(b) Não transmitir conteúdo ilegal, ofensivo, discriminatório ou que viole direitos de terceiros;</li>
              <li>(c) Cumprir a LGPD e demais normas da ANPD aplicáveis ao seu negócio;</li>
              <li>(d) Possuir base legal válida para o tratamento de dados de seus usuários finais;</li>
              <li>(e) Informar seus usuários finais que o atendimento é realizado por IA automatizada;</li>
              <li>(f) Cooperar com eventuais auditorias de conformidade solicitadas pela UZZ.AI;</li>
              <li>(g) Notificar imediatamente a UZZ.AI sobre qualquer incidente de segurança que tome conhecimento.</li>
            </ul>
          </section>

          {/* Seção 6 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              6. Privacidade e Proteção de Dados (LGPD)
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">6.1 Papéis Jurídicos</h3>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) UZZ.AI atua como <strong>OPERADORA</strong> dos dados pessoais dos usuários finais do CLIENTE;</li>
              <li>(b) O CLIENTE atua como <strong>CONTROLADOR</strong> dos dados de seus usuários finais;</li>
              <li>(c) UZZ.AI atua como <strong>CONTROLADORA</strong> dos dados cadastrais do CLIENTE.</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">6.2 Instrumento de Controle</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              Os detalhes sobre o tratamento de dados, suboperadores, transferências internacionais e direitos
              dos titulares estão descritos na{' '}
              <Link href="/privacy" className="text-mint-600 hover:underline">
                Política de Privacidade
              </Link>
              , parte integrante destes Termos.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">6.3 Garantia do Controlador</h3>
            <p className="text-erie-black-700 leading-relaxed mb-3">O CLIENTE declara e garante que:</p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) Possui base legal documentada para o tratamento de dados;</li>
              <li>(b) Obteve opt-in para envio de mensagens via WhatsApp e atendimento por IA;</li>
              <li>(c) Comunica adequadamente aos usuários sobre o atendimento automatizado.</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">6.4 Registros de Acesso</h3>
            <p className="text-erie-black-700 leading-relaxed">
              A UZZ.AI mantém registros de acesso em conformidade com o Art. 15 do Marco Civil da Internet
              (Lei 12.965/2014), pelo prazo mínimo de 6 meses.
            </p>
          </section>

          {/* Seção 7 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              7. Remuneração e Pagamento
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              7.1 Os valores devidos são definidos conforme o plano contratado, disponíveis em{' '}
              <Link href="/precos" className="text-mint-600 hover:underline">/precos</Link>.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              7.2 Os valores serão reajustados anualmente pelo IPCA, mediante notificação prévia de 30 dias.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              7.3 A cobrança será realizada automaticamente na forma de pagamento cadastrada pelo CLIENTE.
            </p>
            <p className="text-erie-black-700 leading-relaxed">
              7.4 Contestações de faturas devem ser apresentadas em até 30 dias da data de emissão.
            </p>
          </section>

          {/* Seção 8 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              8. Suspensão e Rescisão
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">8.1 Suspensão por Inadimplência</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              Atraso superior a 15 dias no pagamento enseja suspensão automática do acesso, acrescido de
              multa moratória de 2% e juros de 1% ao mês.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">8.2 Rescisão por Inadimplência</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              Atraso superior a 30 dias autoriza a UZZ.AI a rescindir o contrato de pleno direito, sem
              prejuízo da cobrança dos valores em aberto.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">8.3 Rescisão por Violação</h3>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              A UZZ.AI poderá rescindir imediatamente e sem ônus nos seguintes casos:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) Violação grave dos presentes Termos;</li>
              <li>(b) Uso da Plataforma para fins ilegais ou em violação às políticas da Meta;</li>
              <li>(c) Fornecimento de dados cadastrais falsos;</li>
              <li>(d) Atos que representem risco à segurança ou integridade da infraestrutura.</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">8.4 Rescisão Imotivada</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              Qualquer das partes pode rescindir o contrato sem justa causa mediante aviso prévio por
              escrito com antecedência mínima de 30 dias, liquidadas todas as obrigações pendentes.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">8.5 Rescisão por Teto Indenizatório</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              A UZZ.AI poderá rescindir o contrato imediatamente caso os danos causados pelo CLIENTE
              atinjam o teto indenizatório previsto na Cláusula 9.1. §1º Considera-se rompido o equilíbrio
              econômico-financeiro do contrato nessa hipótese. §2º Haverá cessação imediata dos serviços
              de IA e integrações.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">8.6 Dados após Rescisão</h3>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>(a) Os dados serão mantidos por 90 dias após a rescisão para exportação pelo CLIENTE;</li>
              <li>(b) Após 90 dias, os dados serão excluídos definitivamente;</li>
              <li>(c) Certificado de exclusão será emitido em até 15 dias mediante solicitação.</li>
            </ul>
          </section>

          {/* Seção 9 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              9. Limitação de Responsabilidade
            </h2>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">9.1 Teto Indenizatório</h3>
            <p className="text-erie-black-700 leading-relaxed mb-6">
              A responsabilidade total da UZZ.AI perante o CLIENTE fica limitada ao valor total pago pelo
              CLIENTE nos 12 meses anteriores ao evento gerador do dano.
            </p>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">9.2 Exclusão de Responsabilidade</h3>
            <p className="text-erie-black-700 leading-relaxed mb-3">A UZZ.AI não responde por:</p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4 mb-6">
              <li>(a) Lucros cessantes, perda de oportunidade ou danos imateriais;</li>
              <li>(b) Danos indiretos, consequenciais ou punitivos;</li>
              <li>(c) Perda de dados decorrente de falha de backup do CLIENTE;</li>
              <li>(d) Ataques cibernéticos sem negligência comprovada da UZZ.AI;</li>
              <li>(e) Indisponibilidade de serviços de terceiros (Meta, OpenAI, Groq, etc.);</li>
              <li>(f) Danos decorrentes de má utilização da Plataforma pelo CLIENTE;</li>
              <li>(g) Decisões tomadas sem supervisão humana com base em respostas da IA.</li>
            </ul>

            <h3 className="text-xl font-semibold text-erie-black-800 mb-3">9.3 Indenização pelo Cliente</h3>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              O CLIENTE obriga-se a indenizar e manter a UZZ.AI indene de danos, custas e honorários
              advocatícios decorrentes de:
            </p>
            <ul className="list-disc list-inside space-y-2 text-erie-black-700 ml-4">
              <li>(a) Violação dos presentes Termos;</li>
              <li>(b) Infração à LGPD ou normas de proteção de dados;</li>
              <li>(c) Reclamações de usuários finais do CLIENTE;</li>
              <li>(d) Violação das políticas da Meta/WhatsApp;</li>
              <li>(e) Conteúdo ilegal inserido na base de conhecimento ou nos prompts.</li>
            </ul>
          </section>

          {/* Seção 10 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              10. Disponibilidade e Suporte
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              10.1 A UZZ.AI envidará melhores esforços para manter a Plataforma disponível e operacional,
              condicionada à disponibilidade tecnológica dos sistemas, provedores de infraestrutura e
              serviços de terceiros utilizados no momento da prestação.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              10.2 Manutenções programadas serão comunicadas com antecedência mínima de 48 horas.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              10.3 A UZZ.AI não responde por indisponibilidades decorrentes de: (a) manutenções previamente
              notificadas; (b) falhas em serviços de terceiros (Meta, OpenAI, Groq, provedores de nuvem);
              (c) uso inadequado pelo CLIENTE; (d) eventos de força maior.
            </p>
            <p className="text-erie-black-700 leading-relaxed">
              10.4 Suporte técnico disponível via{' '}
              <a href="mailto:suporte@uzzai.com.br" className="text-mint-600 hover:underline">
                suporte@uzzai.com.br
              </a>
              .
            </p>
          </section>

          {/* Seção 11 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              11. Confidencialidade
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              11.1 Ambas as partes obrigam-se a manter em sigilo absoluto as informações confidenciais
              da outra parte a que tiverem acesso em virtude da presente relação.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              11.2 Excluem-se da obrigação de confidencialidade as informações que: (a) sejam de domínio
              público; (b) tenham sido desenvolvidas independentemente; (c) cuja divulgação seja exigida
              por lei ou ordem judicial.
            </p>
            <p className="text-erie-black-700 leading-relaxed">
              11.3 A obrigação de confidencialidade persiste por 5 anos após o término do contrato.
            </p>
          </section>

          {/* Seção 12 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              12. Força Maior
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              12.1 Nenhuma das partes será responsabilizada pelo descumprimento de obrigações decorrente
              de eventos fora de controle razoável, incluindo catástrofes naturais, guerras, pandemias,
              falhas generalizadas de infraestrutura de internet e atos de governo.
            </p>
            <p className="text-erie-black-700 leading-relaxed">
              12.2 A parte atingida deve notificar a outra em até 72 horas do evento.
            </p>
          </section>

          {/* Seção 13 */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              13. Disposições Gerais
            </h2>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              <strong>13.1 Natureza B2B.</strong> Os presentes Termos regulam uma relação exclusivamente
              entre pessoas jurídicas, sendo inaplicável o Código de Defesa do Consumidor (CDC).
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              <strong>13.2 Integralidade.</strong> Os presentes Termos, juntamente com a Política de
              Privacidade e eventuais aditivos, constituem o acordo integral entre as partes.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              <strong>13.3 Invalidade Parcial.</strong> A invalidade de qualquer cláusula não afeta a
              validade das demais.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              <strong>13.4 Renúncia.</strong> A omissão de qualquer das partes em exigir o cumprimento
              de qualquer obrigação não implica renúncia ao direito de exigi-la futuramente.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              <strong>13.5 Cessão.</strong> O CLIENTE não pode ceder seus direitos ou obrigações sem
              anuência prévia e por escrito da UZZ.AI.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              <strong>13.6 Alterações.</strong> A UZZ.AI poderá alterar os presentes Termos mediante
              notificação com antecedência de 30 dias.
            </p>
            <p className="text-erie-black-700 leading-relaxed mb-3">
              <strong>13.7 Lei Aplicável.</strong> Os presentes Termos são regidos pelas leis da República
              Federativa do Brasil.
            </p>
            <p className="text-erie-black-700 leading-relaxed">
              <strong>13.8 Foro.</strong> Fica eleito o foro da Comarca de Caxias do Sul/RS, com exclusão
              de qualquer outro, por mais privilegiado que seja, para dirimir quaisquer controvérsias
              decorrentes destes Termos.
            </p>
          </section>

          {/* Contato */}
          <section>
            <h2 className="text-2xl font-semibold text-erie-black-900 mb-4">
              Contato
            </h2>
            <div className="space-y-2 text-erie-black-700">
              <p><strong>UZZ.AI TECNOLOGIA LTDA.</strong> | CNPJ: 64.025.866/0001-30</p>
              <p>
                <a href="mailto:contato@uzzai.com.br" className="text-mint-600 hover:underline">contato@uzzai.com.br</a>
                {' | '}
                <a href="mailto:suporte@uzzai.com.br" className="text-mint-600 hover:underline">suporte@uzzai.com.br</a>
                {' | '}
                <a href="mailto:juridico@uzzai.com.br" className="text-mint-600 hover:underline">juridico@uzzai.com.br</a>
              </p>
              <p>Av. Júlio de Castilhos, 1989 - Centro, Caxias do Sul/RS — CEP 95013-215</p>
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
