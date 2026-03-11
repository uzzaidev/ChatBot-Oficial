import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Conversas
 * Artigo: Filtros e Histórico de Conversas
 */
export const filtrosEHistorico: BlogPost = {
    slug: 'filtros-e-historico',
    title: 'Filtros e Histórico de Conversas',
    description: 'Use filtros avançados para encontrar conversas específicas, pesquisar por contato ou palavra-chave, e acessar o histórico completo de atendimentos.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Conversas'],
    tags: ['Filtros', 'Busca', 'Histórico', 'Dashboard'],
    readTime: '4 min',
    coverImage: '/images/help/conversas/filtros-e-historico.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'Com o crescimento no volume de atendimentos, encontrar a conversa certa rapidamente é essencial. O UzzApp oferece filtros avançados e busca por texto para que você nunca perca nenhum atendimento importante.',
        },
        {
            type: 'list',
            title: 'Filtros Disponíveis na Lista de Conversas',
            ordered: false,
            items: [
                'Não lidas: exibe apenas conversas com mensagens que ainda não foram visualizadas.',
                'Aguardando humano: exibe conversas com status "transferido" — o bot parou e aguarda um atendente.',
                'Em atendimento humano: conversas onde um atendente está respondendo ativamente.',
                'Bot ativo: conversas em atendimento automático pelo assistente de IA.',
                'Por período: filtre por data (hoje, últimos 7 dias, últimos 30 dias, intervalo personalizado).',
                'Todos: remove todos os filtros e exibe a lista completa.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/conversas/filtros-painel.png',
            alt: 'Painel de filtros do Dashboard de Conversas',
            caption: 'Filtros disponíveis acima da lista de conversas',
        },
        {
            type: 'list',
            title: 'Como Usar a Busca',
            ordered: true,
            items: [
                'Clique na barra de busca no topo da lista de conversas.',
                'Digite o nome do contato, número de telefone ou qualquer palavra-chave.',
                'Os resultados são filtrados em tempo real enquanto você digita.',
                'A busca funciona tanto no nome do contato quanto no conteúdo das mensagens.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Busca por número de telefone',
            content: 'Você pode buscar pelo número completo com DDI (ex: 5551999999999) ou apenas pelos últimos dígitos. O sistema normaliza o formato automaticamente.',
        },
        {
            type: 'list',
            title: 'Acessando o Histórico Completo de uma Conversa',
            ordered: true,
            items: [
                'Clique em qualquer conversa na lista para abrir o histórico.',
                'Role para cima na janela do chat para ver mensagens mais antigas.',
                'O histórico completo é carregado progressivamente conforme você sobe.',
                'Mensagens de áudio têm um player integrado — clique para ouvir sem sair do painel.',
                'Imagens e documentos são abertos em preview com um clique.',
            ],
        },
        {
            type: 'list',
            title: 'Exportar Histórico de Conversa',
            ordered: true,
            items: [
                'Abra a conversa cujo histórico você deseja exportar.',
                'Clique no ícone de opções (três pontos) no canto superior direito da janela do chat.',
                'Selecione "Exportar Histórico".',
                'Escolha o formato: JSON (estruturado para integração) ou TXT (leitura humana).',
                'O arquivo é gerado e disponibilizado para download.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Limite de retenção de histórico',
            content: 'O histórico de mensagens é armazenado conforme o plano contratado. Planos básicos mantêm 90 dias de histórico; planos avançados mantêm histórico ilimitado. Verifique seu plano em Configurações → Plano.',
        },
        {
            type: 'cta',
            title: 'Precisa transferir para um humano?',
            description: 'Entenda como funciona o fluxo completo de transferência de atendimento.',
            buttonText: 'Transferência para Humano →',
            buttonHref: '/help/conversas/transferencia-para-humano',
        },
    ],
};
