import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Primeiros Passos
 * Artigo: Como Conectar o WhatsApp Business ao UzzApp
 */
export const comoConectarWhatsapp: BlogPost = {
    slug: 'como-conectar-whatsapp',
    title: 'Como Conectar seu WhatsApp Business ao UzzApp',
    description: 'Passo a passo completo para conectar seu número do WhatsApp Business ao UzzApp usando a API Oficial da Meta.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Primeiros Passos'],
    tags: ['WhatsApp', 'Configuração', 'Meta', 'API'],
    readTime: '8 min',
    coverImage: '/images/help/primeiros-passos/como-conectar-whatsapp.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'Para começar a usar o UzzApp, você precisa conectar seu número de WhatsApp Business à plataforma usando a API Oficial da Meta (WhatsApp Business API). Este processo envolve configurar um aplicativo no Meta Developers, obter as credenciais necessárias e registrá-las no UzzApp.',
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Pré-requisitos',
            content: 'Antes de começar, certifique-se de ter: (1) Uma conta no Meta Business Suite verificada. (2) Um número de telefone exclusivo para o WhatsApp Business — não pode ser um número já em uso no WhatsApp pessoal. (3) Acesso ao painel do Meta Developers (developers.facebook.com). (4) Suas credenciais de acesso ao UzzApp.',
        },
        {
            type: 'text',
            content: 'Siga os passos abaixo na ordem correta. O processo leva em média 20 a 40 minutos na primeira vez.',
        },
        {
            type: 'list',
            title: 'Passo 1 — Criar o App no Meta Developers',
            ordered: true,
            items: [
                'Acesse developers.facebook.com e entre com sua conta Meta Business.',
                'Clique em "Meus Apps" → "Criar App".',
                'Selecione o tipo "Business" e dê um nome ao app (ex: "UzzApp MeuNegocio").',
                'Após criar, vá em "Adicionar Produto" e adicione o produto "WhatsApp".',
                'Selecione ou crie uma conta do WhatsApp Business associada ao seu Meta Business.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/primeiros-passos/meta-criar-app.png',
            alt: 'Tela de criação de app no Meta Developers',
            caption: 'Painel do Meta Developers — criação do app Business',
        },
        {
            type: 'list',
            title: 'Passo 2 — Obter as Credenciais',
            ordered: true,
            items: [
                'No painel do app, vá em WhatsApp → Configuração da API.',
                'Copie o "Token de Acesso Temporário" (começa com EAA...) — você precisará gerar um Token Permanente depois.',
                'Anote o "ID do Número de Telefone" (Phone Number ID).',
                'Anote o "ID da Conta do WhatsApp Business" (WABA ID).',
                'Em Configurações do App → Básicas, copie o "App Secret".',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Token Permanente vs. Temporário',
            content: 'O token temporário expira em 24 horas e é apenas para testes. Para produção, você deve gerar um Token Permanente via um Usuário do Sistema no Meta Business Suite. Acesse: Meta Business Suite → Configurações → Usuários do Sistema → Gerar Token.',
        },
        {
            type: 'list',
            title: 'Passo 3 — Configurar as Credenciais no UzzApp',
            ordered: true,
            items: [
                'Acesse seu painel UzzApp e vá em Configurações → Credenciais (Vault).',
                'Insira o Token de Acesso (META_ACCESS_TOKEN).',
                'Insira o ID do Número de Telefone (META_PHONE_NUMBER_ID).',
                'Insira o App Secret (META_APP_SECRET).',
                'Defina um Token de Verificação personalizado (META_VERIFY_TOKEN) — pode ser qualquer texto seguro, ex: "minha-empresa-2026".',
                'Salve as credenciais. Elas são criptografadas automaticamente com AES-256.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/primeiros-passos/uzzapp-credenciais.png',
            alt: 'Tela de configuração de credenciais no UzzApp',
            caption: 'Dashboard UzzApp → Configurações → Credenciais',
        },
        {
            type: 'list',
            title: 'Passo 4 — Configurar o Webhook no Meta',
            ordered: true,
            items: [
                'De volta ao Meta Developers, vá em WhatsApp → Configuração.',
                'Na seção "Webhooks", clique em "Configurar Webhooks".',
                'No campo URL de Callback, insira: https://chat.uzzai.com.br/api/webhook/SEU_CLIENT_ID',
                'No campo Token de Verificação, insira exatamente o mesmo texto que você definiu no passo anterior (META_VERIFY_TOKEN).',
                'Clique em "Verificar e Salvar". O Meta fará uma requisição ao UzzApp para confirmar.',
                'Após verificar, ative as assinaturas: messages e message_status_updates.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'success',
            title: 'Como encontrar seu Client ID',
            content: 'Seu Client ID é o identificador único da sua empresa no UzzApp. Você encontra em: Configurações → Minha Conta → Client ID. Ele tem o formato de um UUID (ex: 550e8400-e29b-41d4-a716-446655440000).',
        },
        {
            type: 'list',
            title: 'Passo 5 — Testar a Conexão',
            ordered: true,
            items: [
                'Envie uma mensagem de texto para o número de WhatsApp configurado.',
                'Acesse o Dashboard UzzApp → Conversas e verifique se a mensagem apareceu.',
                'Se a mensagem apareceu, a conexão está funcionando corretamente.',
                'Se não apareceu, verifique se o webhook está ativo e se o token de acesso é válido.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Número em produção',
            content: 'Durante o desenvolvimento, a Meta limita o envio de mensagens a apenas 5 números de teste cadastrados. Para liberar o número para produção e enviar para qualquer contato, você precisa passar pelo processo de verificação do negócio na Meta Business Suite e configurar o número para produção.',
        },
        {
            type: 'cta',
            title: 'Conexão feita? Próximo passo',
            description: 'Agora configure seu assistente de IA e faça o setup inicial da plataforma.',
            buttonText: 'Setup Inicial →',
            buttonHref: '/help/primeiros-passos/setup-inicial',
        },
    ],
};
