import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Campanhas / Disparos
 * Artigo: Agendamentos de Mensagens
 */
export const agendamentos: BlogPost = {
    slug: 'agendamentos',
    title: 'Agendamentos — Programe Mensagens para o Momento Certo',
    description: 'Como agendar campanhas e mensagens para serem enviadas em data e hora específicas, gerenciar agendamentos ativos e cancelar envios programados.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Campanhas / Disparos'],
    tags: ['Agendamento', 'Campanha', 'Programação', 'Automação'],
    readTime: '4 min',
    coverImage: '/images/help/campanhas-disparos/agendamentos.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'Com o sistema de agendamentos do UzzApp, você prepara suas campanhas com antecedência e define exatamente quando cada mensagem será enviada. Ideal para promoções de datas especiais, lembretes periódicos e comunicações em horários de pico.',
        },
        {
            type: 'list',
            title: 'Como Agendar uma Campanha',
            ordered: true,
            items: [
                'Crie a campanha normalmente (Dashboard → Campanhas → Nova Campanha).',
                'Selecione o template, os destinatários e preencha as variáveis.',
                'Na etapa de "Quando enviar", selecione "Agendar para data específica".',
                'Escolha a data e hora de envio. O horário é baseado no fuso configurado na sua conta.',
                'Clique em "Confirmar Agendamento". A campanha ficará com status "Agendada".',
            ],
        },
        {
            type: 'image',
            src: '/images/help/campanhas-disparos/agendar-campanha.png',
            alt: 'Seletor de data e hora para agendamento de campanha',
            caption: 'Na etapa final da campanha, escolha data e hora de envio',
        },
        {
            type: 'list',
            title: 'Gerenciando Agendamentos Ativos',
            ordered: false,
            items: [
                'Acesse Dashboard → Campanhas → aba "Agendadas" para ver todas as campanhas programadas.',
                'Cada campanha exibe: nome, template, número de destinatários, data/hora de envio e status.',
                'Você pode editar os destinatários ou as variáveis de uma campanha agendada até 1 hora antes do envio.',
                'Para cancelar: clique na campanha → "Cancelar Agendamento". A campanha muda para status "Cancelada".',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Boas práticas de horário',
            content: 'Para mensagens de marketing: horários de maior engajamento são terças a quintas entre 10h-12h e 18h-20h. Evite envios antes das 8h e após as 21h para não ser intrusivo. Para notificações transacionais (confirmação de pedido, código de acesso): envie imediatamente, sem esperar horário ideal.',
        },
        {
            type: 'list',
            title: 'Agendamento Recorrente',
            ordered: false,
            items: [
                'Para campanhas que se repetem (ex: lembrete semanal de pagamento), configure uma recorrência.',
                'Frequências disponíveis: diária, semanal, quinzenal, mensal.',
                'A recorrência usa sempre o mesmo template e os destinatários filtrados pelas tags selecionadas (novos contatos com essas tags entram automaticamente nos próximos envios).',
                'Cancele a recorrência a qualquer momento sem afetar os envios já realizados.',
            ],
        },
        {
            type: 'list',
            title: 'Agendamento de Agente por Horário de Funcionamento',
            ordered: false,
            items: [
                'Além das campanhas, você pode agendar quando o agente de IA fica ativo.',
                'Acesse Dashboard → Agentes → selecione o agente → aba "Agendamento".',
                'Defina os dias e horários de operação (ex: seg-sex 8h-18h).',
                'Fora desse horário, o bot responde com uma mensagem configurável de fora do expediente.',
                'Útil para não deixar clientes sem resposta alguma — mesmo fora do horário, o bot informa quando voltará.',
            ],
        },
        {
            type: 'cta',
            title: 'Quer acompanhar o desempenho das suas campanhas?',
            description: 'Veja métricas detalhadas de entrega, leitura e resposta em Analytics.',
            buttonText: 'Analytics e Relatórios →',
            buttonHref: '/help/crm/analytics-e-relatorios',
        },
    ],
};
