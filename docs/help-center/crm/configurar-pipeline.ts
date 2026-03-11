import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: CRM
 * Artigo: Configurar Pipeline de Vendas
 */
export const configurarPipeline: BlogPost = {
    slug: 'configurar-pipeline-crm',
    title: 'Como Configurar o Pipeline de Vendas no CRM',
    description: 'Crie e personalize as etapas do funil de vendas, mova leads entre etapas e acompanhe o progresso de cada oportunidade no CRM integrado do UzzApp.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['CRM'],
    tags: ['CRM', 'Pipeline', 'Funil', 'Vendas', 'Leads'],
    readTime: '6 min',
    coverImage: '/images/help/crm/configurar-pipeline.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'O CRM do UzzApp é integrado diretamente ao fluxo de conversas do WhatsApp. Cada vez que um novo contato inicia uma conversa, ele é automaticamente registrado como lead. O pipeline organiza esses leads em etapas, permitindo acompanhar a jornada de cada cliente desde o primeiro contato até o fechamento.',
        },
        {
            type: 'list',
            title: 'Etapas Padrão do Pipeline',
            ordered: false,
            items: [
                'Novo Lead: contato acabou de enviar a primeira mensagem. Ainda não foi qualificado.',
                'Em Atendimento: conversa ativa — bot ou atendente humano respondendo.',
                'Qualificado: lead demonstrou interesse real. Atendente confirmou potencial.',
                'Proposta Enviada: produto, serviço ou orçamento foi apresentado.',
                'Negociação: cliente está avaliando ou pedindo ajustes.',
                'Convertido: venda ou objetivo principal concluído.',
                'Perdido: lead não avançou. Registre o motivo para análise.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/crm/pipeline-kanban.png',
            alt: 'Visualização Kanban do Pipeline de Vendas',
            caption: 'Dashboard → CRM → Pipeline — visualização em kanban com arrasto de cards',
        },
        {
            type: 'list',
            title: 'Personalizando as Etapas do Pipeline',
            ordered: true,
            items: [
                'Acesse Dashboard → CRM → "Configurações do Pipeline".',
                'Clique em "Editar Etapas" para renomear, reordenar ou excluir etapas.',
                'Para adicionar uma nova etapa, clique em "Adicionar Etapa" e defina nome e cor.',
                'Marque etapas como "etapa de fechamento" (positivo: Convertido) ou "etapa de perda" (Perdido) para os relatórios.',
                'Salve as alterações — as etapas são atualizadas em tempo real para todos os usuários.',
            ],
        },
        {
            type: 'list',
            title: 'Movendo Leads Entre Etapas',
            ordered: false,
            items: [
                'Na visualização Kanban: arraste o card do lead para a próxima etapa.',
                'Na lista de contatos: clique no lead → "Alterar Etapa do Pipeline".',
                'Automaticamente: configure regras de automação para mover leads com base em eventos (ex: ao receber resposta, mover para "Em Atendimento").',
                'Ao mover para "Convertido" ou "Perdido": um campo opcional pede o valor da venda ou motivo da perda.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Criação automática de leads',
            content: 'Toda nova conversa iniciada via WhatsApp cria automaticamente um registro no CRM com status "Novo Lead". Os dados capturados automaticamente são: nome (do perfil do WhatsApp), número de telefone, data/hora da primeira mensagem, e origem do lead (orgânico ou Meta Ads).',
        },
        {
            type: 'list',
            title: 'Informações Registradas em cada Lead',
            ordered: false,
            items: [
                'Dados de contato: nome, telefone, última mensagem.',
                'Etapa atual do pipeline e histórico de movimentações.',
                'Origem do lead: orgânico (cliente achou o número), Meta Ads (veio de anúncio), importado (adicionado manualmente).',
                'Se veio de Meta Ads: campanha, grupo de anúncio, ID do criativo.',
                'Histórico completo de conversas vinculadas.',
                'Observações e anotações manuais do atendente.',
                'Tags para categorização.',
            ],
        },
        {
            type: 'cta',
            title: 'Quer saber de qual anúncio vieram seus leads?',
            description: 'Veja como o rastreamento de Meta Ads funciona no CRM.',
            buttonText: 'Rastreamento de Meta Ads →',
            buttonHref: '/help/crm/rastreamento-meta-ads',
        },
    ],
};
