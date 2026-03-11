import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Campanhas / Disparos
 * Artigo: Como Criar uma Campanha de Mensagens
 */
export const criarCampanha: BlogPost = {
    slug: 'criar-campanha',
    title: 'Como Criar uma Campanha de Mensagens no WhatsApp',
    description: 'Aprenda a criar Templates de mensagem, submetê-los à aprovação da Meta e configurar sua primeira campanha de disparo.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Campanhas / Disparos'],
    tags: ['Campanha', 'Template', 'Meta', 'Marketing', 'Disparo'],
    readTime: '7 min',
    coverImage: '/images/help/campanhas-disparos/criar-campanha.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'O WhatsApp Business API permite enviar mensagens ativas (proativas) para contatos usando Templates pré-aprovados pela Meta. São ideais para promoções, confirmações de pedidos, lembretes de agendamento e notificações importantes.',
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Por que precisa de Template?',
            content: 'O WhatsApp só permite mensagens livres dentro de uma janela de 24 horas após o cliente enviar a última mensagem. Fora dessa janela, você só pode enviar Templates aprovados. Templates são mensagens pré-definidas revisadas pela Meta para garantir que não sejam spam.',
        },
        {
            type: 'list',
            title: 'Categorias de Template',
            ordered: false,
            items: [
                'Marketing: promoções, ofertas, novidades de produto, newsletters. Exige opt-in do cliente.',
                'Utilitário: confirmações de pedido, atualização de entrega, lembretes de compromisso, recibos.',
                'Autenticação: códigos de verificação OTP. Aprovação mais rápida, uso específico.',
            ],
        },
        {
            type: 'list',
            title: 'Passo 1 — Criar o Template',
            ordered: true,
            items: [
                'Acesse Dashboard → Templates → "Novo Template".',
                'Defina o nome do template (apenas letras minúsculas, números e underscores — ex: promo_marco_2026).',
                'Selecione a categoria: Marketing, Utilitário ou Autenticação.',
                'Selecione o idioma: Português (Brasil).',
                'Escreva o conteúdo da mensagem. Use variáveis dinâmicas com duplas chaves: {{1}} para nome do cliente, {{2}} para data, etc.',
                'Opcional: adicione cabeçalho (texto ou imagem), rodapé e botões (até 3 botões de resposta ou 1 botão de URL).',
                'Clique em "Salvar e Submeter para Aprovação".',
            ],
        },
        {
            type: 'image',
            src: '/images/help/campanhas-disparos/editor-template.png',
            alt: 'Editor de Template no UzzApp',
            caption: 'Dashboard → Templates → editor com preview em tempo real',
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Exemplo de Template de Marketing',
            content: 'Cabeçalho: [Imagem do produto]\n\nCorpo: Olá, {{1}}! 🎉 Temos uma oferta especial para você: {{2}} com {{3}} de desconto. Válido até {{4}}. Aproveite!\n\nBotão 1: Ver Oferta → https://seusite.com/oferta\nBotão 2: Não tenho interesse',
        },
        {
            type: 'list',
            title: 'Passo 2 — Aguardar Aprovação da Meta',
            ordered: false,
            items: [
                'Após submeter, o template fica com status "Em Revisão".',
                'A Meta analisa o template em até 24-48 horas (geralmente mais rápido).',
                'Quando aprovado, o status muda para "Aprovado" e o template fica disponível para uso.',
                'Se rejeitado, a Meta informa o motivo. Ajuste o conteúdo e resubmeta.',
                'Você recebe uma notificação no painel quando o status mudar.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Por que templates são rejeitados?',
            content: 'Motivos comuns de rejeição: (1) Conteúdo que parece spam ou enganoso. (2) Uso de caracteres especiais ou formatação não suportada. (3) Categoria incorreta (ex: template de marketing classificado como utilitário). (4) Variáveis indefinidas ou mal formatadas. Revise as políticas de templates da Meta antes de criar.',
        },
        {
            type: 'list',
            title: 'Passo 3 — Usar o Template em uma Campanha',
            ordered: true,
            items: [
                'Com o template aprovado, acesse Dashboard → Campanhas → "Nova Campanha".',
                'Selecione o template aprovado na lista.',
                'Defina os destinatários: selecione contatos individualmente, por tag ou importe uma lista.',
                'Preencha as variáveis dinâmicas do template: {{1}} = campo de nome do contato, {{2}} = texto fixo ou variável.',
                'Defina a data e hora de envio (imediato ou agendado).',
                'Revise o resumo: número de destinatários, prévia da mensagem.',
                'Clique em "Confirmar Envio".',
            ],
        },
        {
            type: 'cta',
            title: 'Pronto para disparar para muitos contatos?',
            description: 'Veja como fazer disparos em massa com controle de taxa e monitoramento.',
            buttonText: 'Disparos em Massa →',
            buttonHref: '/help/campanhas-disparos/disparos-em-massa',
        },
    ],
};
