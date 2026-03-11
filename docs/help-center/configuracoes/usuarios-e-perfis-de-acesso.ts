import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Configurações
 * Artigo: Usuários e Perfis de Acesso
 */
export const usuariosEPerfisDeAcesso: BlogPost = {
    slug: 'usuarios-e-perfis-de-acesso',
    title: 'Usuários e Perfis de Acesso — Gerencie sua Equipe',
    description: 'Como adicionar usuários ao painel do UzzApp, definir permissões por perfil (administrador ou atendente) e gerenciar acessos da sua equipe.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Configurações'],
    tags: ['Usuários', 'Permissões', 'Equipe', 'Acesso', 'RBAC'],
    readTime: '4 min',
    coverImage: '/images/help/configuracoes/usuarios-e-perfis.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'O UzzApp usa um sistema de perfis de acesso (RBAC — Role-Based Access Control) para garantir que cada membro da equipe veja e acesse apenas o que é relevante para sua função. Você controla totalmente quem tem acesso e com quais permissões.',
        },
        {
            type: 'list',
            title: 'Perfis de Acesso Disponíveis',
            ordered: false,
            items: [
                'Administrador: acesso total. Pode configurar tudo — credenciais, agentes, plano, usuários, templates, CRM e analytics. Deve ser reservado para gestores e responsáveis técnicos.',
                'Atendente: acesso ao Dashboard de Conversas, Contatos e CRM (visualização). Não vê credenciais, configurações avançadas ou plano. Ideal para equipe de atendimento.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/configuracoes/lista-usuarios.png',
            alt: 'Lista de usuários com perfis de acesso',
            caption: 'Configurações → Usuários — lista de membros da equipe com perfis',
        },
        {
            type: 'list',
            title: 'Como Convidar um Novo Usuário',
            ordered: true,
            items: [
                'Acesse Dashboard → Configurações → aba "Usuários".',
                'Clique em "Convidar Usuário".',
                'Insira o e-mail do novo membro.',
                'Selecione o perfil: Administrador ou Atendente.',
                'Clique em "Enviar Convite".',
                'O usuário recebe um e-mail com link para criar senha e acessar o painel.',
                'O link de convite expira em 48 horas — se necessário, reenvie.',
            ],
        },
        {
            type: 'list',
            title: 'Gerenciando Usuários Existentes',
            ordered: false,
            items: [
                'Alterar perfil: clique no usuário → "Editar" → selecione o novo perfil. Entra em vigor imediatamente.',
                'Revogar acesso: clique no usuário → "Remover". O usuário perde o acesso imediatamente ao tentar fazer qualquer ação.',
                'Reativar: usuários removidos podem ser reconvidados pelo mesmo e-mail.',
                'Ver último acesso: a lista mostra data e hora do último login de cada usuário.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Limite de usuários por plano',
            content: 'O número de usuários simultâneos depende do seu plano. Plano Starter: até 2 usuários. Plano Pro: até 10. Plano Business: ilimitado. Se atingir o limite, você precisará remover um usuário antes de convidar outro, ou fazer upgrade de plano.',
        },
        {
            type: 'list',
            title: 'Boas Práticas de Segurança',
            ordered: false,
            items: [
                'Use o perfil Administrador apenas para quem realmente precisa configurar a plataforma.',
                'Atendentes devem ter perfil Atendente — eles não precisam ver credenciais ou configurações.',
                'Remova usuários assim que eles saírem da empresa.',
                'Revise periodicamente a lista de usuários (recomendado mensalmente).',
                'Cada usuário tem seu próprio login — nunca compartilhe senhas entre colaboradores.',
            ],
        },
        {
            type: 'cta',
            title: 'Configurou a equipe — e as integrações?',
            description: 'Veja como conectar suas chaves de API e integrar com outros sistemas.',
            buttonText: 'Configurar Integrações →',
            buttonHref: '/help/configuracoes/integracoes',
        },
    ],
};
