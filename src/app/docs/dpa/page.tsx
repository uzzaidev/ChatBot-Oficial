import type { Metadata } from 'next'
import Link from 'next/link'
import { PrintButton } from './PrintButton'

export const metadata: Metadata = {
  title: 'Acordo de Processamento de Dados (DPA) — UZZ.AI',
  description:
    'Acordo de Processamento de Dados Pessoais da Plataforma UZZ.AI, elaborado em conformidade com a LGPD (Lei nº 13.709/2018).',
  robots: { index: true, follow: true },
}

const sections = [
  {
    id: 'definicoes',
    title: '1. Definições',
    content: [
      {
        type: 'paragraph',
        text: 'Para fins deste DPA, aplicam-se as definições da LGPD (Lei nº 13.709/2018):',
      },
      {
        type: 'list',
        items: [
          '<strong>Dados Pessoais:</strong> Qualquer informação relacionada à pessoa natural identificada ou identificável inserida pelo CLIENTE na Plataforma, incluindo nomes, telefones, históricos de conversas e demais dados dos usuários finais do CLIENTE.',
          '<strong>Tratamento:</strong> Toda operação realizada com Dados Pessoais, incluindo coleta, armazenamento, processamento, transmissão e exclusão.',
          '<strong>Controlador:</strong> O CLIENTE — quem define as finalidades e os meios de tratamento dos Dados Pessoais de seus usuários finais.',
          '<strong>Operador:</strong> A UZZ.AI — quem realiza o tratamento em nome do Controlador, conforme suas instruções.',
          '<strong>Titular:</strong> Pessoa natural a quem os Dados Pessoais se referem (os usuários finais do CLIENTE).',
          '<strong>ANPD:</strong> Autoridade Nacional de Proteção de Dados.',
          '<strong>Suboperador:</strong> Terceiro contratado pela UZZ.AI para auxiliar na prestação dos serviços, sujeito às mesmas obrigações deste DPA.',
          '<strong>Incidente de Segurança:</strong> Acesso não autorizado, destruição, perda, alteração, divulgação ou qualquer forma de tratamento inadequado de Dados Pessoais.',
        ],
      },
    ],
  },
  {
    id: 'papeis',
    title: '2. Papéis Jurídicos e Escopo',
    content: [
      {
        type: 'subsection',
        title: '2.1. Controlador',
        text: 'O CLIENTE é o Controlador dos Dados Pessoais de seus usuários finais, sendo o único responsável por definir as finalidades do tratamento, obter as bases legais adequadas e garantir a conformidade com a LGPD.',
      },
      {
        type: 'subsection',
        title: '2.2. Operador',
        text: 'A UZZ.AI é Operadora, tratando os Dados Pessoais exclusivamente conforme as instruções do CLIENTE e para as finalidades contratadas, que compreendem:',
      },
      {
        type: 'list',
        items: [
          'Recebimento, processamento e envio de mensagens via WhatsApp Business API',
          'Geração de respostas automatizadas por modelos de linguagem (IA)',
          'Armazenamento de histórico de conversas e dados cadastrais dos usuários finais',
          'Busca semântica na base de conhecimento (RAG)',
          'Transferência de atendimento para agentes humanos (handoff)',
          'Geração de relatórios e dashboards de uso',
        ],
      },
      {
        type: 'subsection',
        title: '2.3. Base Legal do Tratamento',
        text: 'A UZZ.AI realiza o tratamento com fundamento no Art. 7º, V da LGPD (execução de contrato), processando apenas os dados estritamente necessários para a prestação dos serviços contratados (princípio da necessidade — Art. 6º, III).',
      },
    ],
  },
  {
    id: 'obrigacoes-uzzai',
    title: '3. Obrigações da UZZ.AI (Operadora)',
    content: [
      {
        type: 'subsection',
        title: '3.1. Instrução do Controlador',
        text: 'A UZZ.AI tratará os Dados Pessoais estritamente conforme as instruções documentadas do CLIENTE, salvo nos casos de cumprimento de obrigação legal ou ordem judicial, hipótese em que notificará o CLIENTE previamente quando legalmente possível.',
      },
      {
        type: 'subsection',
        title: '3.2. Medidas de Segurança',
        text: 'A UZZ.AI implementará e manterá medidas técnicas e administrativas de segurança, incluindo:',
      },
      {
        type: 'list',
        items: [
          'Criptografia em trânsito (TLS 1.2+) e em repouso (AES-256 via Supabase/pgsodium Vault)',
          'Controle de acesso baseado em papéis (RBAC) com isolamento multi-tenant (Row Level Security)',
          'Credenciais de API armazenadas em Vault criptografado (Supabase Vault / pgsodium)',
          'Logs de acesso mantidos por prazo mínimo de 6 meses (Art. 15, Marco Civil da Internet)',
          'Backups periódicos automatizados com retenção de 30 dias',
          'Infraestrutura hospedada em provedores certificados (Supabase/AWS, Vercel)',
        ],
      },
      {
        type: 'subsection',
        title: '3.3. Confidencialidade do Pessoal',
        text: 'A UZZ.AI garantirá que os colaboradores e prestadores com acesso a Dados Pessoais estejam sujeitos a obrigações de confidencialidade, inclusive após o término do vínculo.',
      },
    ],
  },
  {
    id: 'suboperadores',
    title: '4. Suboperadores Autorizados',
    content: [
      {
        type: 'paragraph',
        text: 'O CLIENTE autoriza a UZZ.AI a utilizar os seguintes Suboperadores para a prestação dos serviços. A UZZ.AI contratará cada Suboperador exigindo garantias de proteção de dados equivalentes às deste DPA:',
      },
      {
        type: 'table',
        headers: ['Suboperador', 'Papel', 'Localização'],
        rows: [
          ['Supabase (AWS)', 'Banco de dados e armazenamento', 'EUA (com SCCs)'],
          ['Vercel', 'Processamento serverless', 'EUA (com SCCs)'],
          ['OpenAI', 'Processamento de linguagem natural', 'EUA (com SCCs)'],
          ['Groq', 'Inferência de modelos de linguagem', 'EUA (com SCCs)'],
          ['Upstash (Redis)', 'Cache e enfileiramento', 'EUA (com SCCs)'],
          ['Meta Platforms', 'API de mensagens WhatsApp', 'EUA (com SCCs)'],
        ],
      },
      {
        type: 'paragraph',
        text: 'A UZZ.AI notificará o CLIENTE sobre inclusão de novos suboperadores com antecedência mínima de 15 dias, conferindo ao CLIENTE o direito de objeção fundamentada.',
      },
    ],
  },
  {
    id: 'obrigacoes-cliente',
    title: '5. Obrigações do CLIENTE (Controlador)',
    content: [
      {
        type: 'list',
        items: [
          '<strong>5.1. Conformidade:</strong> O CLIENTE é o único responsável por garantir que o tratamento de Dados Pessoais realizado por meio da Plataforma esteja em conformidade com a LGPD, incluindo a obtenção e documentação das bases legais adequadas (Art. 7º, LGPD).',
          '<strong>5.2. Opt-in WhatsApp:</strong> O CLIENTE obriga-se a obter opt-in válido e documentado de seus usuários finais antes de iniciar comunicações proativas via WhatsApp Business, em conformidade com as Políticas Comerciais da Meta.',
          '<strong>5.3. Transparência com Titulares:</strong> O CLIENTE obriga-se a informar seus usuários finais, de forma clara, sobre o uso de automação por inteligência artificial no atendimento (Art. 6º, VI da LGPD).',
          '<strong>5.4. Ponto de Contato:</strong> O CLIENTE será o responsável principal pelo atendimento a solicitações de Titulares e por comunicações à ANPD, na qualidade de Controlador.',
          '<strong>5.5. Base de Conhecimento:</strong> O CLIENTE é exclusivamente responsável pelo conteúdo inserido na base de conhecimento (RAG), garantindo conformidade com a LGPD e respeito a direitos de terceiros.',
        ],
      },
    ],
  },
  {
    id: 'incidentes',
    title: '6. Incidentes de Segurança',
    content: [
      {
        type: 'subsection',
        title: '6.1. Notificação ao Controlador',
        text: 'A UZZ.AI notificará o CLIENTE sobre qualquer Incidente de Segurança que possa acarretar risco ou dano relevante aos Titulares, no prazo máximo de 48 (quarenta e oito) horas após a confirmação do incidente, contendo: natureza do incidente, categorias de dados afetados, número aproximado de Titulares e medidas de mitigação adotadas.',
      },
      {
        type: 'subsection',
        title: '6.2. Responsabilidade do Controlador',
        text: 'Após receber a notificação, cabe ao CLIENTE avaliar a necessidade de comunicação à ANPD e aos Titulares (Art. 48, LGPD; Resolução CD/ANPD nº 15/2024), arcando com os custos correspondentes, salvo comprovação de culpa exclusiva da UZZ.AI.',
      },
    ],
  },
  {
    id: 'exclusao',
    title: '7. Término do Tratamento e Exclusão de Dados',
    content: [
      {
        type: 'paragraph',
        text: 'Com o término do contrato, a UZZ.AI:',
      },
      {
        type: 'list',
        items: [
          'Manterá os Dados Pessoais por até 90 (noventa) dias, prazo durante o qual o CLIENTE poderá solicitar exportação em formato estruturado (JSON/CSV)',
          'Findo o prazo de 90 dias sem solicitação, os dados serão permanentemente excluídos ou anonimizados, ressalvados aqueles cuja retenção seja exigida por lei (logs de acesso: 6 meses; dados fiscais: 5 anos)',
          'A exclusão lógica (soft delete) será finalizada em exclusão física em até 30 (trinta) dias adicionais',
          'A UZZ.AI emitirá, mediante solicitação formal, certificado de exclusão no prazo de 15 dias',
        ],
      },
    ],
  },
  {
    id: 'auditoria',
    title: '8. Auditoria e Vigência',
    content: [
      {
        type: 'subsection',
        title: '8.1. Registros',
        text: 'A UZZ.AI manterá registros documentados das atividades de tratamento realizadas como Operadora (Art. 37, LGPD), disponíveis para consulta pelo CLIENTE mediante solicitação formal, com prazo de resposta de 15 dias úteis.',
      },
      {
        type: 'subsection',
        title: '8.2. Vigência e Atualização',
        text: 'Este DPA tem vigência equivalente à do contrato de serviços. A UZZ.AI poderá atualizá-lo para adequação a alterações legais ou regulatórias, notificando o CLIENTE com antecedência mínima de 30 (trinta) dias.',
      },
    ],
  },
]

export default function DpaPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-gray-700">UZZ.AI</Link>
            <span>/</span>
            <span>Documentos Legais</span>
            <span>/</span>
            <span className="text-gray-700">DPA</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Acordo de Processamento de Dados Pessoais
              </h1>
              <p className="text-gray-500 text-sm">
                Versão 1.0 — Atualizado em 10 de março de 2026
              </p>
            </div>
            <PrintButton />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Preâmbulo */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-10">
          <h2 className="text-base font-semibold text-blue-900 mb-3">Sobre este Documento</h2>
          <p className="text-blue-800 text-sm leading-relaxed mb-3">
            Este Acordo de Processamento de Dados Pessoais (<strong>DPA</strong>) integra e
            complementa os{' '}
            <Link href="/terms" className="underline hover:text-blue-900">
              Termos e Condições de Uso
            </Link>{' '}
            e a{' '}
            <Link href="/privacy" className="underline hover:text-blue-900">
              Política de Privacidade
            </Link>{' '}
            da Plataforma UZZ.AI, elaborado em conformidade com a LGPD (Lei nº 13.709/2018).
          </p>
          <p className="text-blue-800 text-sm leading-relaxed">
            <strong>A aceitação dos Termos e Condições de Uso no ato do cadastro implica
            aceitação integral deste DPA</strong>, sem necessidade de assinatura física adicional,
            conforme o modelo SaaS de aceite eletrônico (Art. 8º, Marco Civil da Internet).
            Este documento está disponível para download/impressão a qualquer tempo.
          </p>
        </div>

        {/* Identificação das Partes */}
        <div className="mb-10 grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Operadora</p>
            <p className="font-semibold text-gray-900 mb-1">UZZ.AI TECNOLOGIA LTDA.</p>
            <p className="text-sm text-gray-600">CNPJ: 64.025.866/0001-30</p>
            <p className="text-sm text-gray-600">Av. Júlio de Castilhos, 1989 - Centro</p>
            <p className="text-sm text-gray-600">Caxias do Sul — RS, CEP 95013-215</p>
            <p className="text-sm text-gray-600 mt-2">
              DPO:{' '}
              <a href="mailto:dpo@uzzai.com.br" className="text-blue-600 hover:underline">
                dpo@uzzai.com.br
              </a>
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Controladora (CLIENTE)</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Pessoa jurídica que realiza o cadastro e contratação dos serviços na Plataforma,
              devidamente identificada no momento da adesão.
            </p>
            <p className="text-sm text-gray-500 mt-3 italic">
              Ao criar uma conta, o CLIENTE aceita os termos deste DPA.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-xl font-bold text-gray-900 mb-5 pb-2 border-b border-gray-100">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.content.map((block, i) => {
                  if (block.type === 'paragraph') {
                    return (
                      <p key={i} className="text-gray-700 leading-relaxed">
                        {block.text}
                      </p>
                    )
                  }
                  if (block.type === 'subsection') {
                    return (
                      <div key={i}>
                        <h3 className="font-semibold text-gray-900 mb-2">{block.title}</h3>
                        <p className="text-gray-700 leading-relaxed">{block.text}</p>
                      </div>
                    )
                  }
                  if (block.type === 'list') {
                    return (
                      <ul key={i} className="space-y-2">
                        {block.items!.map((item, j) => (
                          <li key={j} className="flex items-start gap-3 text-gray-700">
                            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                            <span
                              className="leading-relaxed text-sm"
                              dangerouslySetInnerHTML={{ __html: item }}
                            />
                          </li>
                        ))}
                      </ul>
                    )
                  }
                  if (block.type === 'table') {
                    return (
                      <div key={i} className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              {block.headers!.map((h) => (
                                <th
                                  key={h}
                                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {block.rows!.map((row, ri) => (
                              <tr key={ri}>
                                {row.map((cell, ci) => (
                                  <td key={ci} className="px-4 py-3 text-gray-700">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  }
                  return null
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Contato */}
        <div className="mt-12 rounded-xl border border-gray-200 p-6 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Contato — DPO e Privacidade</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <p className="font-medium text-gray-900 mb-1">Encarregado de Dados (DPO)</p>
              <p>Pedro Vitor Brunello Pagliarin</p>
              <a href="mailto:dpo@uzzai.com.br" className="text-blue-600 hover:underline">
                dpo@uzzai.com.br
              </a>
              <br />
              <a href="tel:+5554991590379" className="text-blue-600 hover:underline">
                (54) 99159-0379
              </a>
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Privacidade Geral</p>
              <a href="mailto:privacidade@uzzai.com.br" className="text-blue-600 hover:underline">
                privacidade@uzzai.com.br
              </a>
            </div>
          </div>
        </div>

        {/* Links relacionados */}
        <div className="mt-8 flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="text-blue-600 hover:underline">
            ← Política de Privacidade
          </Link>
          <Link href="/terms" className="text-blue-600 hover:underline">
            ← Termos e Condições de Uso
          </Link>
          <Link href="/precos" className="text-blue-600 hover:underline">
            ← Planos e Preços
          </Link>
        </div>

        <p className="mt-8 text-xs text-gray-400 text-center">
          © 2026 UZZ.AI TECNOLOGIA LTDA. — CNPJ 64.025.866/0001-30
        </p>
      </div>
    </main>
  )
}
