import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Pagamentos
 * Artigo: Como Alterar o Plano
 */
export const alterarPlano: BlogPost = {
    slug: 'alterar-plano',
    title: 'Como Fazer Upgrade ou Downgrade do Plano',
    description: 'Passo a passo para mudar de plano no UzzApp, entender o pró-rata de cobranças e o que muda nos recursos disponíveis.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Pagamentos'],
    tags: ['Plano', 'Upgrade', 'Downgrade', 'Cobrança', 'Pró-rata'],
    readTime: '4 min',
    coverImage: '/images/help/pagamentos/alterar-plano.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'Você pode alterar seu plano a qualquer momento — tanto fazer upgrade (subir de plano) quanto downgrade (reduzir). Os dados e configurações são sempre preservados. Só os limites e recursos disponíveis mudam.',
        },
        {
            type: 'list',
            title: 'Como Fazer Upgrade (Subir de Plano)',
            ordered: true,
            items: [
                'Acesse Dashboard → Configurações → aba "Plano".',
                'Clique em "Alterar Plano".',
                'Selecione o novo plano desejado.',
                'Revise o resumo: valor do novo plano, crédito do plano atual (pró-rata) e valor a pagar agora.',
                'Confirme com sua forma de pagamento.',
                'O upgrade entra em vigor imediatamente — todos os novos recursos ficam disponíveis na hora.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Como funciona o pró-rata no upgrade',
            content: 'Se você fez upgrade no meio do ciclo, é cobrado proporcionalmente. Exemplo: plano Starter custa R$200/mês. Você faz upgrade para Pro (R$500/mês) 15 dias após a renovação. Você recebe um crédito de R$100 (metade do Starter não usado) e paga R$250 (metade do Pro para os 15 dias restantes). Na próxima renovação, paga R$500 cheio.',
        },
        {
            type: 'list',
            title: 'Como Fazer Downgrade (Reduzir o Plano)',
            ordered: true,
            items: [
                'Acesse Dashboard → Configurações → aba "Plano".',
                'Clique em "Alterar Plano" e selecione um plano menor.',
                'Leia o aviso sobre quais recursos serão desativados.',
                'Confirme a solicitação.',
                'O downgrade entra em vigor na próxima data de renovação (não imediatamente).',
                'Até a renovação, você mantém os recursos do plano atual.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Atenção ao fazer downgrade',
            content: 'Ao fazer downgrade, verifique se os novos limites atendem sua operação. Exemplo: se você tem 5 usuários no painel e o plano menor permite apenas 2, os 3 usuários excedentes serão desativados. O sistema informará exatamente o que será impactado antes de confirmar.',
        },
        {
            type: 'list',
            title: 'Cancelamento da Assinatura',
            ordered: true,
            items: [
                'Para cancelar, acesse Configurações → Plano → "Cancelar Assinatura".',
                'O cancelamento entra em vigor na próxima data de renovação.',
                'Até lá, você mantém acesso total.',
                'Após o cancelamento, seus dados ficam preservados por 30 dias.',
                'Para reativar dentro dos 30 dias, entre em contato com o suporte.',
                'Após 30 dias sem reativação, os dados são permanentemente excluídos.',
            ],
        },
        {
            type: 'list',
            title: 'Histórico de Cobranças',
            ordered: false,
            items: [
                'Acesse Configurações → Plano → "Histórico de Cobranças" para ver todos os pagamentos.',
                'Cada entrada mostra: data, valor, plano, status (pago/falhou) e link da nota fiscal.',
                'Baixe notas fiscais individuais ou exporte o histórico completo em CSV.',
            ],
        },
        {
            type: 'cta',
            title: 'Dúvidas sobre cobranças?',
            description: 'Entre em contato com nossa equipe — resolvemos rapidamente.',
            buttonText: 'Falar com Suporte →',
            buttonHref: '/help/suporte/como-solicitar-atendimento',
        },
    ],
};
