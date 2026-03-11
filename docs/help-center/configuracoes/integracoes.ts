import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Configurações
 * Artigo: Integrações — APIs e Credenciais
 */
export const integracoes: BlogPost = {
    slug: 'integracoes',
    title: 'Integrações — Conecte suas APIs e Ferramentas',
    description: 'Como configurar as integrações do UzzApp com OpenAI, Groq, Meta WhatsApp API e como usar o Vault para gerenciar credenciais com segurança.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Configurações'],
    tags: ['Integrações', 'API', 'OpenAI', 'Groq', 'Meta', 'Vault', 'Credenciais'],
    readTime: '6 min',
    coverImage: '/images/help/configuracoes/integracoes.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'O UzzApp é um orquestrador que conecta WhatsApp, provedores de IA e outras ferramentas usando suas próprias chaves de API. Cada empresa usa credenciais independentes — armazenadas com criptografia AES-256 no Vault. Você tem controle total sobre qual provedor de IA usa e quanto gasta.',
        },
        {
            type: 'list',
            title: 'Integrações Disponíveis',
            ordered: false,
            items: [
                'Meta WhatsApp Business API: obrigatória. Necessária para enviar e receber mensagens.',
                'OpenAI: para GPT-4o (chat avançado + visão), Whisper (transcrição de áudio), TTS (texto para voz) e Embeddings (base de conhecimento RAG).',
                'Groq: para Llama 3.3 70B (chat ultra rápido e de baixo custo).',
                'ElevenLabs: opcional. Para TTS multilíngue com vozes mais realistas.',
            ],
        },
        {
            type: 'list',
            title: 'Configurando as Credenciais no Vault',
            ordered: true,
            items: [
                'Acesse Dashboard → Configurações → aba "Credenciais".',
                'Para cada credencial, clique no campo correspondente e insira a chave.',
                'Clique em "Salvar". A chave é criptografada e armazenada no Vault antes de ser salva.',
                'Para atualizar uma credencial, simplesmente insira o novo valor e salve — a chave antiga é sobrescrita.',
                'Para verificar se uma credencial está configurada (sem ver o valor): o campo exibe "••••••••" quando preenchido.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/configuracoes/painel-credenciais.png',
            alt: 'Painel de credenciais do Vault no UzzApp',
            caption: 'Configurações → Credenciais — todas as integrações em um único lugar',
        },
        {
            type: 'list',
            title: 'Onde Obter Cada Chave de API',
            ordered: false,
            items: [
                'Meta (WhatsApp): developers.facebook.com → seu app → WhatsApp → Configuração da API.',
                'OpenAI: platform.openai.com/api-keys → "Create new secret key".',
                'Groq: console.groq.com/keys → "Create API Key".',
                'ElevenLabs: elevenlabs.io → perfil → API Keys.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Vault — Segurança das credenciais',
            content: 'As credenciais são criptografadas com AES-256 antes de serem salvas no banco de dados. Nem os administradores da Uzz.Ai têm acesso aos valores das suas chaves. Se uma chave for comprometida, gere uma nova chave no provedor e atualize aqui — a chave antiga fica imediatamente inativa.',
        },
        {
            type: 'list',
            title: 'Gerenciando o Budget de IA',
            ordered: true,
            items: [
                'Acesse Dashboard → Configurações → "Budget de IA".',
                'Defina um limite mensal em tokens ou em reais.',
                'Quando o limite for atingido, as chamadas de IA são automaticamente bloqueadas.',
                'Você recebe um alerta por e-mail ao atingir 80% do budget.',
                'Para aumentar o budget no meio do mês, basta atualizar o valor nas configurações.',
                'Útil para evitar surpresas em contas de IA durante testes ou picos de mensagens.',
            ],
        },
        {
            type: 'list',
            title: 'Webhook — Configuração e Verificação',
            ordered: false,
            items: [
                'URL do Webhook: https://chat.uzzai.com.br/api/webhook/SEU_CLIENT_ID',
                'Encontre seu Client ID em Configurações → Perfil → Client ID.',
                'Configure esta URL no Meta Developers como URL de Callback.',
                'Token de verificação: defina em Configurações → Credenciais → META_VERIFY_TOKEN.',
                'Insira o mesmo token no campo "Token de Verificação" no Meta Developers.',
                'Se o webhook parar de funcionar, verifique se o token de acesso da Meta não expirou.',
            ],
        },
        {
            type: 'cta',
            title: 'Dúvidas sobre integrações?',
            description: 'Nossa equipe de suporte ajuda na configuração de qualquer integração.',
            buttonText: 'Falar com Suporte →',
            buttonHref: '/help/suporte/como-solicitar-atendimento',
        },
    ],
};
