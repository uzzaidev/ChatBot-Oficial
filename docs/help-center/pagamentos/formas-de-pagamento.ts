import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Pagamentos
 * Artigo: Formas de Pagamento
 */
export const formasDePagamento: BlogPost = {
    slug: 'formas-de-pagamento',
    title: 'Formas de Pagamento Aceitas',
    description: 'Quais formas de pagamento o UzzApp aceita, como atualizar os dados de cobrança e o que acontece se um pagamento falhar.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Pagamentos'],
    tags: ['Pagamento', 'Cobrança', 'Cartão', 'PIX', 'Boleto'],
    readTime: '3 min',
    coverImage: '/images/help/pagamentos/formas-de-pagamento.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'O UzzApp oferece diferentes formas de pagamento para facilitar a gestão financeira da assinatura. A cobrança é mensal e recorrente — você paga no mesmo dia todo mês.',
        },
        {
            type: 'list',
            title: 'Formas de Pagamento Disponíveis',
            ordered: false,
            items: [
                'Cartão de crédito: Visa, Mastercard, Amex e Elo. Cobrança automática na data de renovação.',
                'PIX: pagamento manual a cada mês. Você recebe um QR Code por e-mail 5 dias antes da renovação.',
                'Boleto bancário: vencimento em 3 dias úteis. Recebido por e-mail 7 dias antes da renovação.',
            ],
        },
        {
            type: 'list',
            title: 'Como Atualizar os Dados de Cobrança',
            ordered: true,
            items: [
                'Acesse Dashboard → Configurações → aba "Plano" → "Dados de Cobrança".',
                'Clique em "Alterar forma de pagamento".',
                'Insira os novos dados do cartão ou selecione PIX/Boleto.',
                'Confirme. A nova forma de pagamento entra em vigor na próxima renovação.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/pagamentos/dados-cobranca.png',
            alt: 'Tela de dados de cobrança no UzzApp',
            caption: 'Configurações → Plano → Dados de Cobrança',
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'O que acontece se o pagamento falhar?',
            content: 'Se a cobrança do cartão falhar, você recebe um e-mail de aviso e tem 3 dias para regularizar. Após 3 tentativas falhas, a conta é suspensa temporariamente (dados preservados). Regularize o pagamento para reativar imediatamente. A conta não é excluída automaticamente por inadimplência — você tem 30 dias para regularizar antes de qualquer ação mais severa.',
        },
        {
            type: 'list',
            title: 'Emissão de Nota Fiscal',
            ordered: false,
            items: [
                'Notas fiscais são emitidas automaticamente para todos os pagamentos confirmados.',
                'Você recebe o link da NF por e-mail após a confirmação de cada pagamento.',
                'Para acessar o histórico de NFs: Configurações → Plano → "Histórico de Cobranças".',
                'Para NFs com dados diferentes (CNPJ da empresa), entre em contato com o suporte antes do próximo vencimento.',
            ],
        },
        {
            type: 'cta',
            title: 'Precisa mudar de plano?',
            description: 'Saiba como fazer upgrade ou downgrade sem perder dados.',
            buttonText: 'Alterar Plano →',
            buttonHref: '/help/pagamentos/alterar-plano',
        },
    ],
};
