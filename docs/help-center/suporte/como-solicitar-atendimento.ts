import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Suporte
 * Artigo: Como Solicitar Atendimento
 */
export const comoSolicitarAtendimento: BlogPost = {
    slug: 'como-solicitar-atendimento',
    title: 'Como Solicitar Atendimento e Suporte',
    description: 'Canais de suporte disponíveis, como abrir um chamado, quais informações incluir para agilizar o atendimento e o que esperar dos tempos de resposta.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Suporte'],
    tags: ['Suporte', 'Atendimento', 'Chamado', 'Ajuda'],
    readTime: '4 min',
    coverImage: '/images/help/suporte/como-solicitar-atendimento.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'A equipe de suporte da Uzz.Ai está disponível para ajudar com questões técnicas, dúvidas sobre a plataforma, configurações avançadas e situações críticas. Escolha o canal mais adequado para sua necessidade.',
        },
        {
            type: 'list',
            title: 'Canais de Suporte Disponíveis',
            ordered: false,
            items: [
                'Chat no painel: disponível diretamente no Dashboard UzzApp. Ícone de chat no canto inferior direito. Tempo de resposta: até 4 horas em horário comercial.',
                'E-mail: contato@uzzai.com.br — para dúvidas não urgentes, documentação e questões de cobrança. Resposta em até 24 horas.',
                'WhatsApp da Uzz.Ai: para clientes nos planos Pro e Business — acesse o link direto no painel. Resposta prioritária.',
                'Base de conhecimento (este portal): disponível 24/7. Pesquise antes de abrir um chamado — a maioria das dúvidas está documentada aqui.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/suporte/icone-chat-suporte.png',
            alt: 'Ícone de chat de suporte no canto do painel',
            caption: 'O chat de suporte está sempre disponível no canto inferior direito do painel',
        },
        {
            type: 'list',
            title: 'Horários de Atendimento',
            ordered: false,
            items: [
                'Chat e WhatsApp: segunda a sexta, 9h às 18h (horário de Brasília).',
                'E-mail: respondido em até 24 horas, inclusive fins de semana para questões críticas.',
                'Fora do horário comercial: para emergências (bot completamente parado), envie e-mail com URGENTE no assunto. Nossa equipe monitora e responde situações críticas.',
            ],
        },
        {
            type: 'list',
            title: 'O Que Incluir no Chamado para Agilizar o Atendimento',
            ordered: true,
            items: [
                'Descrição do problema: o que está acontecendo? Quando começou? Com que frequência ocorre?',
                'O que você já tentou: ações que você tomou para resolver antes de abrir o chamado.',
                'Mensagem de erro: se houver, copie o texto exato do erro.',
                'Prints ou vídeo: um screenshot do problema vale mais que mil palavras. Para problemas de fluxo, um vídeo curto ajuda muito.',
                'ID do Client ou número de WhatsApp: para identificar sua conta rapidamente.',
                'Urgência: o atendimento está completamente parado? Ou é uma dúvida de configuração?',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Logs de Debug — Informação Valiosa',
            content: 'Antes de entrar em contato, acesse Dashboard → Debug e capture um print dos logs de erro da mensagem que falhou. Essa informação acelera muito o diagnóstico pela nossa equipe de suporte.',
        },
        {
            type: 'list',
            title: 'Tempos de Resposta por Prioridade',
            ordered: false,
            items: [
                'Crítico (bot completamente parado, sem nenhuma resposta): até 2 horas em horário comercial.',
                'Alto (funcionalidade principal impactada, ex: não consegue ver conversas): até 4 horas.',
                'Médio (funcionalidade secundária, ex: analytics não carregando): até 8 horas.',
                'Baixo (dúvida de configuração, melhoria, sugestão): até 24 horas.',
            ],
        },
        {
            type: 'list',
            title: 'Suporte Especializado — Onboarding e Configuração',
            ordered: false,
            items: [
                'Para clientes nos planos Pro e Business: você tem direito a uma sessão de onboarding dedicado — um especialista da Uzz.Ai configura a plataforma junto com você.',
                'Para configuração do agente de IA: nosso time pode revisar e sugerir melhorias no seu prompt de sistema.',
                'Para integração com a Meta: suporte completo na configuração do app, webhook e token de acesso.',
                'Agende sua sessão: contato@uzzai.com.br com o assunto "Onboarding Dedicado".',
            ],
        },
        {
            type: 'cta',
            title: 'Prefere falar com a gente agora?',
            description: 'Abra o chat no painel ou nos chame pelo e-mail.',
            buttonText: 'Abrir Chat de Suporte',
            buttonHref: '#support-chat',
        },
    ],
};
