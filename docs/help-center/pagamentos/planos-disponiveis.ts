import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Pagamentos
 * Artigo: Planos Disponíveis
 */
export const planosDisponiveis: BlogPost = {
    slug: 'planos-disponiveis',
    title: 'Planos Disponíveis no UzzApp',
    description: 'Conheça os planos disponíveis, o que cada um inclui em termos de funcionalidades, limites e suporte, e como escolher o plano certo para o seu negócio.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Pagamentos'],
    tags: ['Planos', 'Preços', 'Assinatura', 'Funcionalidades'],
    readTime: '5 min',
    coverImage: '/images/help/pagamentos/planos-disponiveis.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'O UzzApp é oferecido como assinatura mensal (SaaS). Os planos diferem em volume de conversas, número de usuários no painel, recursos avançados disponíveis e nível de suporte. Você pode trocar de plano a qualquer momento.',
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Custo de IA separado do plano',
            content: 'O plano do UzzApp cobre o acesso à plataforma. O custo das chamadas de IA (OpenAI, Groq) é cobrado diretamente pelos provedores de IA usando suas próprias chaves de API — você não paga para a Uzz.Ai pela IA, apenas pelo acesso à plataforma. Isso garante transparência total sobre os custos de IA.',
        },
        {
            type: 'list',
            title: 'O que está incluído em todos os planos',
            ordered: false,
            items: [
                'Conexão com WhatsApp Business API Oficial (Meta).',
                'Dashboard de Conversas completo.',
                'Assistente de IA com prompt personalizável.',
                'Base de Conhecimento (RAG) para upload de documentos.',
                'Transferência para atendente humano.',
                'CRM integrado com criação automática de leads.',
                'App mobile (iOS e Android).',
                'Notificações push.',
                'Credenciais seguras (Vault criptografado).',
                'Onboarding guiado.',
            ],
        },
        {
            type: 'comparison',
            title: 'Planos — Diferenças Principais',
            before: {
                title: 'Plano Starter',
                items: [
                    'Até 2 usuários no painel',
                    '1 número de WhatsApp',
                    'Histórico de 90 dias',
                    'Templates de mensagem (até 5)',
                    'Suporte via chat',
                    'Sem testes A/B de agentes',
                ],
            },
            after: {
                title: 'Plano Pro / Business',
                items: [
                    'Usuários ilimitados',
                    'Múltiplos números (Multi-tenant)',
                    'Histórico ilimitado',
                    'Templates ilimitados',
                    'Suporte prioritário + onboarding dedicado',
                    'Testes A/B de agentes + agendamento',
                ],
            },
        },
        {
            type: 'list',
            title: 'Como Verificar seu Plano Atual',
            ordered: true,
            items: [
                'Acesse Dashboard → Configurações → aba "Plano".',
                'Você verá: plano ativo, data de renovação, consumo do mês (conversas, tokens de IA) e recursos disponíveis.',
                'O indicador de uso mostra o percentual do limite mensal consumido.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/pagamentos/painel-plano.png',
            alt: 'Painel de plano e consumo no UzzApp',
            caption: 'Configurações → Plano — detalhes do plano ativo e uso do mês',
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Limite de conversas',
            content: 'Cada plano tem um limite de conversas mensais. Uma "conversa" é contada pela Meta como um período de 24 horas de interação com um contato. Se você ultrapassar o limite do plano, será cobrado por conversas adicionais ou poderá fazer upgrade. O UzzApp avisa quando você atingir 80% do limite.',
        },
        {
            type: 'cta',
            title: 'Pronto para fazer upgrade?',
            description: 'Veja como alterar seu plano sem perder nenhum dado ou configuração.',
            buttonText: 'Como Alterar o Plano →',
            buttonHref: '/help/pagamentos/alterar-plano',
        },
    ],
};
