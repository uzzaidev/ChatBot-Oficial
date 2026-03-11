import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Conversas
 * Artigo: Como Gerenciar Conversas no Dashboard
 */
export const gerenciarConversas: BlogPost = {
    slug: 'gerenciar-conversas',
    title: 'Como Gerenciar Conversas no Dashboard',
    description: 'Aprenda a navegar pelo painel de conversas, responder como atendente humano, acompanhar status de entrega e gerenciar múltiplos atendimentos simultaneamente.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Conversas'],
    tags: ['Dashboard', 'Atendimento', 'WhatsApp', 'Conversas'],
    readTime: '6 min',
    coverImage: '/images/help/conversas/gerenciar-conversas.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'O Dashboard de Conversas é o centro de operações do UzzApp. É onde você acompanha todas as mensagens recebidas e enviadas via WhatsApp, vê o histórico completo de cada conversa, responde como atendente humano quando necessário e monitora o status de atendimento em tempo real.',
        },
        {
            type: 'list',
            title: 'O que você vê na tela de Conversas',
            ordered: false,
            items: [
                'Lista de conversas à esquerda: ordenada pela mais recente, com nome do contato, prévia da última mensagem e horário.',
                'Indicador de não lidas: bolinha verde com o número de mensagens não lidas.',
                'Status do atendimento: ícone indicando se está em modo "bot", "transferido" ou "humano".',
                'Janela de chat à direita: histórico completo de mensagens com status de entrega (enviado, entregue, lido).',
                'Suporte a todos os tipos de mídia: texto, áudio (com player), imagens, documentos e reações com emoji.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/conversas/dashboard-conversas.png',
            alt: 'Dashboard de Conversas do UzzApp',
            caption: 'Visão geral do Dashboard de Conversas — lista à esquerda, chat à direita',
        },
        {
            type: 'list',
            title: 'Como Responder como Atendente Humano',
            ordered: true,
            items: [
                'Clique na conversa que deseja atender na lista à esquerda.',
                'Se a conversa estiver em modo "bot", clique em "Assumir Atendimento" no topo da janela do chat.',
                'O status muda para "humano" e o bot para de responder automaticamente.',
                'Digite sua mensagem na caixa de texto inferior e pressione Enter ou clique em Enviar.',
                'Você pode enviar texto, imagens, documentos e áudios diretamente pelo painel.',
                'Quando terminar, clique em "Devolver para o Bot" para reativar o assistente de IA.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Status de Atendimento',
            content: 'Bot (automático): o assistente de IA responde todas as mensagens. Transferido: o bot parou de responder e está aguardando um atendente humano assumir. Humano: um atendente humano está respondendo — o bot não interfere. Para voltar ao modo bot, clique em "Devolver para o Bot".',
        },
        {
            type: 'list',
            title: 'Status de Entrega das Mensagens',
            ordered: false,
            items: [
                '1 traço cinza: mensagem enviada para a API do WhatsApp.',
                '2 traços cinzas: mensagem entregue ao telefone do destinatário.',
                '2 traços azuis: mensagem lida pelo destinatário.',
                'Ícone de erro: falha no envio. Clique para ver o motivo.',
            ],
        },
        {
            type: 'list',
            title: 'Ações Rápidas em cada Conversa',
            ordered: false,
            items: [
                'Marcar como lida: remove o indicador de não lida.',
                'Fixar conversa: mantém a conversa no topo da lista.',
                'Ver perfil do contato: abre os dados do contato no CRM.',
                'Abrir no WhatsApp Web: abre a conversa diretamente no WhatsApp Web (atalho rápido).',
                'Exportar histórico: salva o histórico da conversa em arquivo.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/conversas/acoes-rapidas.png',
            alt: 'Menu de ações rápidas em uma conversa',
            caption: 'Clique com o botão direito ou no ícone de opções para ver as ações disponíveis',
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Janela de 24 horas da Meta',
            content: 'O WhatsApp Business API só permite responder a uma conversa iniciada pelo cliente dentro de uma janela de 24 horas. Após esse período, você só pode enviar mensagens usando Templates aprovados pela Meta. O UzzApp indica quando uma conversa está fora da janela de 24 horas.',
        },
        {
            type: 'cta',
            title: 'Quer filtrar conversas específicas?',
            description: 'Aprenda a usar os filtros avançados e pesquisa no histórico de conversas.',
            buttonText: 'Filtros e Histórico →',
            buttonHref: '/help/conversas/filtros-e-historico',
        },
    ],
};
