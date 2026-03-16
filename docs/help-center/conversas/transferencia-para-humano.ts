import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Conversas
 * Artigo: Transferência para Atendente Humano
 */
export const transferenciaParaHumano: BlogPost = {
    slug: 'transferencia-para-humano',
    title: 'Transferência para Atendente Humano — Como Funciona',
    description: 'Entenda o fluxo completo de transferência: como o bot detecta a intenção, o que muda no painel, como o atendente assume e como devolver para o bot.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Conversas'],
    tags: ['Transferência', 'Humano', 'Atendimento', 'Bot'],
    readTime: '5 min',
    coverImage: '/images/help/conversas/transferencia-para-humano.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'O UzzApp foi projetado para equilibrar automação e toque humano. Quando um cliente pede para falar com um humano — ou quando a situação exige — o assistente de IA transfere o atendimento de forma automática, sem precisar de intervenção manual.',
        },
        {
            type: 'list',
            title: 'Os Três Status de Atendimento',
            ordered: false,
            items: [
                'Bot (automático): o assistente de IA responde todas as mensagens. Status padrão de toda nova conversa.',
                'Transferido: o bot parou de responder e aguarda um atendente humano assumir. Visível na lista com ícone laranja.',
                'Humano: um atendente humano está respondendo ativamente. O bot não interfere enquanto este status estiver ativo.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/conversas/status-atendimento.png',
            alt: 'Ícones de status de atendimento no painel de conversas',
            caption: 'Ícones de status na lista de conversas — verde (bot), laranja (transferido), azul (humano)',
        },
        {
            type: 'list',
            title: 'Como o Bot Detecta a Intenção de Transferência',
            ordered: false,
            items: [
                'O cliente escreve frases como: "quero falar com um atendente", "preciso de um humano", "me conecte com alguém", "falar com responsável".',
                'A IA detecta a intenção e aciona automaticamente a ferramenta interna de transferência.',
                'O status da conversa muda imediatamente para "Transferido".',
                'O bot para de responder qualquer nova mensagem nessa conversa.',
                'A conversa aparece destacada na lista com filtro "Aguardando Humano".',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Transferência manual pelo atendente',
            content: 'Além da transferência automática pelo bot, qualquer atendente com acesso ao painel pode mudar o status manualmente. Abra a conversa → clique em "Assumir Atendimento". Útil quando o gestor percebe que uma conversa precisa de atenção sem que o cliente tenha pedido.',
        },
        {
            type: 'list',
            title: 'Como o Atendente Assume a Conversa',
            ordered: true,
            items: [
                'Filtre a lista de conversas por "Aguardando Humano" para ver todas as pendentes.',
                'Clique na conversa que deseja atender.',
                'Clique no botão "Assumir Atendimento" no topo da janela do chat.',
                'O status muda para "Humano" e o bot fica completamente inativo.',
                'Responda normalmente pelo campo de mensagem — o cliente recebe como mensagem normal do WhatsApp.',
                'Você pode enviar texto, imagens, documentos e áudios.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/conversas/assumir-atendimento.png',
            alt: 'Botão de assumir atendimento no chat',
            caption: 'Botão "Assumir Atendimento" aparece no topo do chat quando o status é "Transferido"',
        },
        {
            type: 'list',
            title: 'Como Devolver o Atendimento para o Bot',
            ordered: true,
            items: [
                'Após finalizar o atendimento humano, clique em "Devolver para o Bot" no topo da janela.',
                'O status volta para "Bot" e o assistente de IA retoma as respostas automáticas.',
                'O bot continuará com o contexto da conversa (as mensagens do atendimento humano fazem parte do histórico).',
                'O cliente não percebe a transição — a conversa continua naturalmente.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'O bot não retoma sozinho',
            content: 'Importante: quando o status está em "Humano", o bot não volta automaticamente. Você precisa clicar em "Devolver para o Bot" manualmente. Isso garante que o atendente humano tenha controle total sobre quando a automação retorna.',
        },
        {
            type: 'list',
            title: 'Dicas para Equipes de Atendimento',
            ordered: false,
            items: [
                'Mantenha o app mobile instalado com notificações push ativadas para receber alertas em tempo real quando houver transferências.',
                'Use o filtro "Aguardando Humano" no início de cada turno para ver o que está pendente.',
                'Após resolver o problema do cliente, sempre devolva para o bot para não deixar conversas travadas em modo humano.',
                'Registre observações importantes no perfil do contato no CRM para referência futura.',
            ],
        },
        {
            type: 'cta',
            title: 'Receba alertas de transferências no celular',
            description: 'Configure as notificações push no app mobile para ser avisado imediatamente.',
            buttonText: 'App Mobile e Notificações →',
            buttonHref: '/help/configuracoes/app-mobile',
        },
    ],
};
