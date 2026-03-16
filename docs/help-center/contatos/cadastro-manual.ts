import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Contatos
 * Artigo: Cadastro Manual de Contatos
 */
export const cadastroManual: BlogPost = {
    slug: 'cadastro-manual-contatos',
    title: 'Como Cadastrar Contatos Manualmente',
    description: 'Adicione contatos individualmente ao UzzApp, preencha os dados do perfil e inicie conversas diretamente pelo painel.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Contatos'],
    tags: ['Contatos', 'CRM', 'Cadastro', 'Lead'],
    readTime: '4 min',
    coverImage: '/images/help/contatos/cadastro-manual.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'O UzzApp cria contatos automaticamente quando clientes enviam mensagens pelo WhatsApp. Mas você também pode cadastrar contatos manualmente para, por exemplo, iniciar uma conversa ativa ou organizar sua base antes de importar.',
        },
        {
            type: 'list',
            title: 'Como Acessar o Módulo de Contatos',
            ordered: true,
            items: [
                'No menu lateral do Dashboard, clique em "Contatos".',
                'Você verá a lista de todos os contatos cadastrados, ordenada por data de criação.',
                'Para adicionar um novo, clique no botão "+ Novo Contato" no canto superior direito.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/contatos/lista-contatos.png',
            alt: 'Lista de contatos no UzzApp',
            caption: 'Dashboard → Contatos — lista completa com dados e status',
        },
        {
            type: 'list',
            title: 'Campos Disponíveis no Cadastro',
            ordered: false,
            items: [
                'Nome completo (obrigatório)',
                'Número de WhatsApp com DDI (obrigatório) — ex: 5551999887766',
                'Status inicial: bot, transferido ou humano',
                'Origem do lead: de onde veio esse contato (manual, importação, Meta Ads, etc.)',
                'Tags: para categorizar e filtrar contatos (ex: "cliente vip", "lead frio")',
                'Observações: campo livre para anotações internas sobre o contato',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Formato do número de telefone',
            content: 'O número deve incluir o código do país (DDI) sem símbolos. Formato correto: 5551999887766 (55 = Brasil, 51 = DDD Porto Alegre, 999887766 = número). Não use +, traços ou espaços.',
        },
        {
            type: 'list',
            title: 'Iniciando uma Conversa com um Contato Cadastrado',
            ordered: true,
            items: [
                'Na lista de contatos, clique no contato desejado para abrir seu perfil.',
                'Clique em "Abrir Conversa".',
                'Você será redirecionado para o Dashboard de Conversas com o chat aberto.',
                'Para enviar uma mensagem inicial (fora da janela de 24h), você precisará usar um Template aprovado.',
                'Para clientes que já conversaram recentemente (dentro de 24h), pode enviar mensagem livre diretamente.',
            ],
        },
        {
            type: 'list',
            title: 'Informações exibidas no Perfil do Contato',
            ordered: false,
            items: [
                'Dados de cadastro: nome, telefone, data de criação.',
                'Status atual: modo de atendimento (bot/transferido/humano).',
                'Origem do lead: como esse contato chegou ao sistema.',
                'Dados de Meta Ads (se aplicável): campanha, grupo de anúncio e ID do anúncio de origem.',
                'Histórico de conversas: lista de todas as sessões de chat com esse contato.',
                'Última interação: data e hora da última mensagem recebida ou enviada.',
            ],
        },
        {
            type: 'cta',
            title: 'Tem muitos contatos para cadastrar?',
            description: 'Use a importação via CSV para adicionar centenas de contatos de uma só vez.',
            buttonText: 'Importar CSV →',
            buttonHref: '/help/contatos/importar-csv',
        },
    ],
};
