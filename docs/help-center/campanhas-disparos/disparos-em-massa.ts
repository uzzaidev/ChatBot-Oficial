import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Campanhas / Disparos
 * Artigo: Disparos em Massa
 */
export const disparosEmMassa: BlogPost = {
    slug: 'disparos-em-massa',
    title: 'Disparos em Massa — Envie para Centenas de Contatos',
    description: 'Como enviar uma campanha para grandes listas de contatos, monitorar a taxa de entrega e interpretar os relatórios de envio.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Campanhas / Disparos'],
    tags: ['Disparo', 'Massa', 'Campanha', 'Relatório', 'Entrega'],
    readTime: '5 min',
    coverImage: '/images/help/campanhas-disparos/disparos-em-massa.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'Campanhas em massa permitem enviar mensagens para centenas ou milhares de contatos de uma só vez. O UzzApp gerencia o envio de forma segura, respeitando os limites da API do WhatsApp e os critérios de qualidade da Meta.',
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Limites de envio da Meta',
            content: 'A Meta impõe limites de mensagens por dia baseados no nível de qualidade do seu número. Contas novas começam com 1.000 conversas por dia. Esse limite aumenta automaticamente conforme o histórico de qualidade do número melhora (até 100.000/dia para contas premium). Respeite esses limites para não ter o número bloqueado.',
        },
        {
            type: 'list',
            title: 'Selecionando os Destinatários',
            ordered: false,
            items: [
                'Todos os contatos: envia para toda a base (use com cautela — verifique o limite diário).',
                'Por tag: selecione contatos com uma ou mais tags. Ex: apenas contatos com tag "cliente-ativo".',
                'Por lista importada: faça upload de um CSV com apenas os números que devem receber a mensagem.',
                'Seleção manual: marque contatos individualmente na lista.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/campanhas-disparos/selecao-destinatarios.png',
            alt: 'Tela de seleção de destinatários para campanha em massa',
            caption: 'Selecione destinatários por tag, lista ou manualmente',
        },
        {
            type: 'list',
            title: 'Variáveis Dinâmicas por Contato',
            ordered: false,
            items: [
                'Se o template usa {{1}} para o nome, o sistema preenche automaticamente com o nome cadastrado do contato.',
                'Para variáveis personalizadas por contato (ex: número do pedido, saldo), você pode importar uma planilha CSV com as colunas correspondentes.',
                'A planilha deve ter uma coluna "telefone" e uma coluna para cada variável do template.',
                'O sistema cruza o número de telefone com a variável e personaliza cada mensagem.',
            ],
        },
        {
            type: 'list',
            title: 'Monitorando o Envio em Tempo Real',
            ordered: true,
            items: [
                'Após confirmar o envio, acesse a campanha na lista para ver o progresso.',
                'O painel exibe: total de mensagens, enviadas, entregues, lidas e com falha.',
                'Mensagens com falha têm o motivo detalhado (ex: número inválido, fora de cobertura).',
                'O envio acontece em lotes para respeitar os limites da API.',
            ],
        },
        {
            type: 'list',
            title: 'Interpretando o Relatório de Campanha',
            ordered: false,
            items: [
                'Taxa de entrega: % de mensagens entregues ao dispositivo. Deve ser > 95% para uma base saudável.',
                'Taxa de leitura: % de mensagens abertas. WhatsApp tende a ter taxas altas (60-80%).',
                'Taxa de resposta: % de destinatários que responderam. Indica engajamento com a campanha.',
                'Falhas: números inválidos, bloqueados ou que optaram por não receber mensagens da sua empresa.',
                'Custo estimado: baseado no número de conversas iniciadas e na categoria do template.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Qualidade do número e score da Meta',
            content: 'Se muitos destinatários bloquearem ou reportarem suas mensagens, a Meta reduz a classificação de qualidade do seu número. Isso pode limitar ou suspender o envio. Mantenha a qualidade: envie apenas para quem deu opt-in, use conteúdo relevante e respeite a frequência de envios.',
        },
        {
            type: 'cta',
            title: 'Quer agendar campanhas com antecedência?',
            description: 'Configure agendamentos para disparar mensagens no momento certo.',
            buttonText: 'Agendamentos →',
            buttonHref: '/help/campanhas-disparos/agendamentos',
        },
    ],
};
