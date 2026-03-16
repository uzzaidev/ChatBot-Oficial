import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Contatos
 * Artigo: Exportar Contatos e Gerenciar Listas
 */
export const exportarEListas: BlogPost = {
    slug: 'exportar-e-gerenciar-listas',
    title: 'Exportar Contatos e Gerenciar Listas',
    description: 'Como exportar sua base de contatos, criar segmentações com tags e usar listas para campanhas e disparos.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Contatos'],
    tags: ['Exportação', 'Listas', 'Segmentação', 'Tags'],
    readTime: '4 min',
    coverImage: '/images/help/contatos/exportar-e-listas.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'Manter sua base de contatos organizada é fundamental para campanhas eficientes. O UzzApp permite exportar contatos filtrados, criar segmentações por tags e usar listas para disparos em massa.',
        },
        {
            type: 'list',
            title: 'Exportar Contatos para CSV',
            ordered: true,
            items: [
                'Acesse Dashboard → Contatos.',
                'Use os filtros para selecionar os contatos que deseja exportar (todos, por tag, por status, por período).',
                'Clique no botão "Exportar" no canto superior direito.',
                'Selecione os campos que deseja incluir: nome, telefone, status, origem, tags, data de cadastro.',
                'O arquivo CSV é gerado e disponibilizado para download em segundos.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/contatos/exportar-contatos.png',
            alt: 'Tela de exportação de contatos',
            caption: 'Selecione os campos e aplique filtros antes de exportar',
        },
        {
            type: 'list',
            title: 'Usando Tags para Segmentar sua Base',
            ordered: false,
            items: [
                'Tags são etiquetas que você adiciona a contatos para categorizá-los.',
                'Exemplos de tags úteis: "cliente-ativo", "lead-frio", "vip", "reengajamento", "produto-x".',
                'Um contato pode ter múltiplas tags.',
                'Para adicionar tags: abra o perfil do contato → campo "Tags" → digite e confirme.',
                'Para adicionar tags em massa: selecione múltiplos contatos na lista → "Ações em Massa" → "Adicionar Tag".',
            ],
        },
        {
            type: 'list',
            title: 'Filtrar Contatos por Tags',
            ordered: true,
            items: [
                'Na lista de contatos, clique no filtro "Tags".',
                'Selecione uma ou mais tags para filtrar.',
                'A lista exibirá apenas os contatos que possuem todas as tags selecionadas.',
                'Combine com outros filtros (status, data) para segmentações mais precisas.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Usar segmentação em campanhas',
            content: 'Quando criar uma campanha de disparo em massa (Campanhas → Nova Campanha), você pode selecionar destinatários filtrando por tags. Isso permite enviar mensagens apenas para o segmento relevante — ex: enviar uma promoção apenas para contatos com a tag "cliente-ativo".',
        },
        {
            type: 'list',
            title: 'Ações em Massa na Lista de Contatos',
            ordered: false,
            items: [
                'Selecionar múltiplos contatos: marque as caixas à esquerda de cada contato, ou "Selecionar Todos".',
                'Adicionar/remover tags em massa.',
                'Alterar status em massa (ex: colocar todos em modo bot).',
                'Exportar apenas os selecionados.',
                'Excluir contatos selecionados (irreversível).',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Exclusão de contatos',
            content: 'Excluir um contato remove permanentemente seus dados e histórico de conversas do sistema. Esta ação não pode ser desfeita. Para manter o histórico mas "arquivar" o contato, use uma tag como "inativo" em vez de excluir.',
        },
        {
            type: 'cta',
            title: 'Pronto para enviar uma campanha?',
            description: 'Use seus segmentos de contatos para criar disparos em massa com templates aprovados.',
            buttonText: 'Criar Campanha →',
            buttonHref: '/help/campanhas-disparos/criar-campanha',
        },
    ],
};
