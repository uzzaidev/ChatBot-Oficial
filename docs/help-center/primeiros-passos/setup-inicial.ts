import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Primeiros Passos
 * Artigo: Setup Inicial — Configure seu Assistente de IA
 */
export const setupInicial: BlogPost = {
    slug: 'setup-inicial',
    title: 'Setup Inicial — Configure seu Assistente de IA em 10 Minutos',
    description: 'Após conectar o WhatsApp, configure o prompt do assistente, escolha o modelo de IA e faça seu primeiro teste de conversa.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Primeiros Passos'],
    tags: ['Configuração', 'IA', 'Agente', 'Prompt'],
    readTime: '6 min',
    coverImage: '/images/help/primeiros-passos/setup-inicial.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'Com o WhatsApp conectado, o próximo passo é configurar o comportamento do seu assistente de IA. O UzzApp usa um sistema de "Agentes" — cada agente tem um prompt de sistema (as instruções que definem como ele deve se comportar), um modelo de IA e configurações de resposta.',
        },
        {
            type: 'list',
            title: 'O que você vai configurar neste setup',
            ordered: false,
            items: [
                'Prompt de sistema: as instruções do assistente (nome, tom, o que pode e não pode responder)',
                'Modelo de IA: qual motor de IA será usado (Groq Llama ou OpenAI GPT-4o)',
                'Temperatura e tokens: controle sobre criatividade e tamanho das respostas',
                'Idioma e fuso horário',
                'Teste de funcionamento antes de ir ao ar',
            ],
        },
        {
            type: 'list',
            title: 'Passo 1 — Acessar o Gerenciador de Agentes',
            ordered: true,
            items: [
                'No painel do UzzApp, clique em "Agentes" no menu lateral.',
                'Você verá o agente padrão já criado. Clique em "Editar".',
                'Se quiser criar um novo agente do zero, clique em "Novo Agente".',
            ],
        },
        {
            type: 'image',
            src: '/images/help/primeiros-passos/agentes-painel.png',
            alt: 'Painel de Agentes do UzzApp',
            caption: 'Dashboard → Agentes → lista de agentes configurados',
        },
        {
            type: 'list',
            title: 'Passo 2 — Escrever o Prompt de Sistema',
            ordered: true,
            items: [
                'No editor de agente, localize o campo "Prompt de Sistema".',
                'Escreva as instruções do assistente. Defina: nome do assistente, nome da empresa, tom de voz, o que ele pode responder e o que deve encaminhar para um humano.',
                'Seja específico: quanto mais contexto você der, melhor será o atendimento.',
                'Salve o prompt clicando em "Salvar Rascunho" antes de ativar.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Exemplo de Prompt de Sistema',
            content: 'Você é a Sofia, assistente virtual da Empresa XYZ. Responda em português brasileiro, com tom profissional e amigável. Você pode responder sobre: horário de funcionamento (seg-sex 8h-18h), produtos do catálogo, políticas de troca e devolução (7 dias), e agendamentos. Caso o cliente queira falar com um humano ou o assunto não seja coberto acima, use a ferramenta de transferência para atendente.',
        },
        {
            type: 'list',
            title: 'Passo 3 — Escolher o Modelo de IA',
            ordered: true,
            items: [
                'No campo "Provedor de IA", selecione Groq (Llama 3.3 70B) ou OpenAI (GPT-4o).',
                'Groq é recomendado para a maioria dos casos: ultra rápido e com custo menor.',
                'OpenAI GPT-4o é recomendado se você precisar de análise de imagens (visão) ou respostas mais elaboradas.',
                'Certifique-se de que a chave de API do provedor escolhido está configurada em Configurações → Credenciais.',
            ],
        },
        {
            type: 'comparison',
            title: 'Groq (Llama) vs. OpenAI (GPT-4o)',
            before: {
                title: 'Groq — Llama 3.3 70B',
                items: ['Resposta em < 1 segundo', 'Custo menor por token', 'Ideal para atendimento em texto', 'Sem análise de imagens'],
            },
            after: {
                title: 'OpenAI — GPT-4o',
                items: ['Resposta em 2-4 segundos', 'Custo maior por token', 'Suporte a imagens (visão)', 'Respostas mais elaboradas'],
            },
        },
        {
            type: 'list',
            title: 'Passo 4 — Configurar Parâmetros Avançados (Opcional)',
            ordered: false,
            items: [
                'Temperatura (0.0 a 1.0): controla a criatividade. 0.3-0.7 é ideal para atendimento. Valores altos tornam o bot mais "criativo" mas menos previsível.',
                'Máximo de Tokens: limite de tamanho da resposta. 500-1000 tokens é adequado para a maioria dos casos.',
                'Histórico de Mensagens: quantas mensagens anteriores a IA considera (padrão: 15).',
            ],
        },
        {
            type: 'list',
            title: 'Passo 5 — Ativar o Agente e Testar',
            ordered: true,
            items: [
                'Clique em "Publicar" para ativar o agente.',
                'Envie uma mensagem de teste para o número de WhatsApp conectado.',
                'Verifique a resposta no Dashboard → Conversas.',
                'Se a resposta não estava adequada, volte ao editor e ajuste o prompt.',
                'Repita o teste até o comportamento estar correto.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'O agente não está respondendo?',
            content: 'Verifique: (1) O agente está com status "Ativo"? (2) As credenciais de API do provedor de IA estão configuradas e corretas? (3) O webhook do WhatsApp está ativo? Acesse o Dashboard → Debug para ver os logs de processamento de cada mensagem.',
        },
        {
            type: 'cta',
            title: 'Assistente funcionando?',
            description: 'Agora faça upload dos seus documentos para que a IA aprenda sobre o seu negócio.',
            buttonText: 'Base de Conhecimento →',
            buttonHref: '/help/robo-flows/base-de-conhecimento',
        },
    ],
};
