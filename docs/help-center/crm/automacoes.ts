import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: CRM
 * Artigo: Automações do CRM
 */
export const automacoesCrm: BlogPost = {
    slug: 'automacoes-crm',
    title: 'Automações do CRM — Mova Leads Automaticamente',
    description: 'Configure regras de automação para mover leads no pipeline, adicionar tags, atribuir atendentes e muito mais, com base em eventos do WhatsApp.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['CRM'],
    tags: ['CRM', 'Automação', 'Pipeline', 'Regras', 'Leads'],
    readTime: '5 min',
    coverImage: '/images/help/crm/automacoes.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'As automações do CRM eliminam tarefas manuais repetitivas. Em vez de mover leads de etapa em etapa manualmente, você define regras que fazem isso automaticamente com base em eventos — como receber uma mensagem, o bot detectar uma intenção ou um atendente assumir o atendimento.',
        },
        {
            type: 'list',
            title: 'Eventos que Disparam Automações',
            ordered: false,
            items: [
                'Nova conversa iniciada: lead criado e na etapa "Novo Lead".',
                'Mensagem recebida do cliente: cliente respondeu à campanha ou iniciou conversa.',
                'Transferência para humano: bot detectou pedido de atendente → etapa "Em Atendimento".',
                'Atendente assumiu: humano iniciou resposta → atualiza responsável do lead.',
                'Bot devolvido: atendimento retornou para o bot.',
                'Tag adicionada: permite encadear automações baseadas em tags.',
                'Tempo sem resposta: cliente não respondeu em X horas → mover para "Inativo".',
            ],
        },
        {
            type: 'list',
            title: 'Ações Disponíveis nas Automações',
            ordered: false,
            items: [
                'Mover lead para etapa do pipeline.',
                'Adicionar ou remover tag do contato.',
                'Alterar status do atendimento (bot / transferido / humano).',
                'Atribuir lead a um atendente específico.',
                'Enviar mensagem automática usando um template aprovado.',
                'Criar tarefa interna de acompanhamento com data de vencimento.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/crm/editor-automacao.png',
            alt: 'Editor de automações do CRM',
            caption: 'Dashboard → CRM → Automações — editor de regras com gatilho e ação',
        },
        {
            type: 'list',
            title: 'Como Criar uma Automação',
            ordered: true,
            items: [
                'Acesse Dashboard → CRM → "Automações".',
                'Clique em "Nova Automação".',
                'Defina o gatilho: qual evento dispara a automação.',
                'Opcionalmente, adicione condições: ex: "apenas se o lead estiver na etapa X" ou "apenas se tiver a tag Y".',
                'Defina a ação: o que acontece quando o gatilho é ativado.',
                'Nomeie a automação e ative-a.',
                'Monitore a execução no histórico de automações.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Exemplo prático de automação',
            content: 'Gatilho: "Nova conversa iniciada"\nCondição: "Origem = Meta Ads, Campanha = Promo Março"\nAção 1: Mover para etapa "Qualificado"\nAção 2: Adicionar tag "promo-marco-2026"\nAção 3: Atribuir ao atendente "João"\n\nResultado: todo lead que vier dos anúncios de março vai direto para qualificado, com tag e atendente responsável definidos automaticamente.',
        },
        {
            type: 'list',
            title: 'Monitorando as Automações',
            ordered: false,
            items: [
                'Acesse Dashboard → CRM → Automações → aba "Histórico".',
                'Veja cada execução: data, lead afetado, automação disparada e ação realizada.',
                'Automações com erros aparecem em vermelho — clique para ver o motivo.',
                'Pause ou desative automações sem precisar excluí-las.',
            ],
        },
        {
            type: 'cta',
            title: 'Quer entender os planos disponíveis?',
            description: 'Veja o que cada plano do UzzApp oferece e como fazer upgrade.',
            buttonText: 'Planos e Pagamentos →',
            buttonHref: '/help/pagamentos/planos-disponiveis',
        },
    ],
};
