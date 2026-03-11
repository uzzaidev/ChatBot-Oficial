import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Primeiros Passos
 * Artigo: Configuração da Conta
 */
export const configuracaoDaConta: BlogPost = {
    slug: 'configuracao-da-conta',
    title: 'Configuração da Conta — Perfil, Usuários e Preferências',
    description: 'Como configurar os dados da sua empresa, adicionar usuários à equipe e definir as preferências gerais da plataforma.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Primeiros Passos'],
    tags: ['Conta', 'Usuários', 'Configurações', 'Empresa'],
    readTime: '5 min',
    coverImage: '/images/help/primeiros-passos/configuracao-da-conta.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'As configurações da conta definem as informações da sua empresa na plataforma, quem tem acesso ao painel e como as notificações e preferências gerais funcionam. Esta configuração é feita uma única vez e pode ser ajustada a qualquer momento.',
        },
        {
            type: 'list',
            title: 'Acessando as Configurações',
            ordered: true,
            items: [
                'No menu lateral do Dashboard, clique em "Configurações".',
                'O painel de configurações é dividido em abas: Perfil da Empresa, Usuários, Notificações, Credenciais e Plano.',
            ],
        },
        {
            type: 'list',
            title: 'Aba: Perfil da Empresa',
            ordered: false,
            items: [
                'Nome da empresa: aparece nos logs e relatórios internos.',
                'Fuso horário: importante para o agendamento de mensagens e relatórios de analytics.',
                'Idioma padrão: define o idioma da interface do dashboard.',
                'Client ID: seu identificador único na plataforma (usado na URL do webhook). Não pode ser alterado.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/primeiros-passos/perfil-empresa.png',
            alt: 'Tela de perfil da empresa no UzzApp',
            caption: 'Configurações → Perfil da Empresa',
        },
        {
            type: 'list',
            title: 'Aba: Usuários — Adicionar Membros da Equipe',
            ordered: true,
            items: [
                'Clique na aba "Usuários" nas configurações.',
                'Clique em "Convidar Usuário" e insira o e-mail do novo membro.',
                'Selecione o perfil de acesso: Administrador (acesso total) ou Atendente (acesso apenas a conversas e contatos).',
                'O usuário receberá um e-mail de convite para criar sua senha e acessar o painel.',
                'Você pode remover ou alterar o perfil de qualquer usuário a qualquer momento.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Perfis de Acesso',
            content: 'Administrador: acesso total ao painel, incluindo configurações, credenciais, agentes, analytics e plano. Atendente: acesso apenas ao Dashboard de Conversas e Contatos — ideal para membros da equipe de suporte que só precisam gerenciar atendimentos.',
        },
        {
            type: 'list',
            title: 'Aba: Notificações',
            ordered: false,
            items: [
                'Ative ou desative notificações por e-mail quando uma conversa for transferida para humano.',
                'Configure quais eventos geram notificações push no aplicativo mobile.',
                'Defina o horário de silêncio (sem notificações) para fora do expediente.',
            ],
        },
        {
            type: 'list',
            title: 'Aba: Credenciais (Vault)',
            ordered: false,
            items: [
                'Todas as chaves de API são armazenadas aqui de forma criptografada (AES-256).',
                'META_ACCESS_TOKEN: token de acesso do WhatsApp Business API.',
                'META_PHONE_NUMBER_ID: ID do número de telefone na Meta.',
                'META_APP_SECRET: segredo do app no Meta Developers.',
                'META_VERIFY_TOKEN: token de verificação do webhook (você define).',
                'OPENAI_API_KEY: chave da OpenAI (para GPT-4o, Whisper, TTS, Embeddings).',
                'GROQ_API_KEY: chave da Groq (para Llama 3.3 70B).',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Segurança das Credenciais',
            content: 'As credenciais são criptografadas antes de serem salvas. Nenhum membro da equipe (nem mesmo administradores) consegue ver o valor das chaves após salvá-las — apenas sobrescrever. Se uma chave for comprometida, gere uma nova no provedor e atualize aqui.',
        },
        {
            type: 'list',
            title: 'Aba: Plano',
            ordered: false,
            items: [
                'Visualize seu plano atual, data de renovação e recursos incluídos.',
                'Veja o consumo de tokens do mês e o budget configurado.',
                'Faça upgrade ou downgrade de plano conforme sua necessidade.',
            ],
        },
        {
            type: 'cta',
            title: 'Conta configurada!',
            description: 'Com a conta pronta, explore o Dashboard de Conversas para gerenciar seu atendimento.',
            buttonText: 'Gerenciar Conversas →',
            buttonHref: '/help/conversas/gerenciar-conversas',
        },
    ],
};
