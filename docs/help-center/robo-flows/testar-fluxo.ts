import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Robô / Flows
 * Artigo: Como Testar o Fluxo do Bot
 */
export const testarFluxo: BlogPost = {
    slug: 'testar-fluxo',
    title: 'Como Testar seu Bot Antes de Ir ao Ar',
    description: 'Use o painel de Debug e os endpoints de teste para validar cada etapa do fluxo, identificar erros e garantir que o bot está respondendo como esperado.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Robô / Flows'],
    tags: ['Teste', 'Debug', 'Validação', 'Fluxo'],
    readTime: '5 min',
    coverImage: '/images/help/robo-flows/testar-fluxo.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'Antes de divulgar seu número de WhatsApp para clientes, é fundamental testar o comportamento do bot em diferentes cenários. O UzzApp oferece um painel de debug completo e ferramentas de teste para cada etapa do pipeline.',
        },
        {
            type: 'list',
            title: 'Formas de Testar o Bot',
            ordered: false,
            items: [
                'Envio real: envie mensagens para o número conectado pelo seu próprio celular. O método mais fiel ao que o cliente verá.',
                'Dashboard de Debug: monitora cada mensagem em tempo real, mostrando o processamento etapa por etapa.',
                'Endpoints de teste: URLs específicas para testar nós individuais do pipeline sem precisar enviar mensagem de WhatsApp.',
                'Logs de execução: histórico de todas as execuções do fluxo com status e tempo de cada nó.',
            ],
        },
        {
            type: 'list',
            title: 'Usando o Dashboard de Debug',
            ordered: true,
            items: [
                'Acesse Dashboard → Debug.',
                'Envie uma mensagem de teste pelo WhatsApp.',
                'O painel exibe em tempo real: a mensagem recebida, cada nó do pipeline executado, o tempo de cada etapa e a resposta gerada.',
                'Clique em qualquer nó para ver os dados de entrada e saída detalhados.',
                'Identifique qual etapa está causando problema com base nos ícones de status (verde = sucesso, vermelho = erro).',
            ],
        },
        {
            type: 'image',
            src: '/images/help/robo-flows/painel-debug.png',
            alt: 'Painel de Debug do UzzApp mostrando pipeline de processamento',
            caption: 'Dashboard → Debug — cada nó do pipeline com status e tempo de execução',
        },
        {
            type: 'list',
            title: 'Cenários de Teste Recomendados',
            ordered: false,
            items: [
                'Mensagem simples: texto básico sobre um produto ou serviço que a IA deve saber responder.',
                'Pergunta da base de conhecimento: algo que está no documento que você fez upload — verifique se a resposta usa o conteúdo do documento.',
                'Pedido de transferência: escreva "quero falar com um humano" e verifique se o status muda para "Transferido".',
                'Mensagem de voz: grave um áudio e envie — verifique se a transcrição foi correta e a resposta adequada.',
                'Imagem: envie uma foto e verifique se o bot analisa o conteúdo (requer OpenAI GPT-4o).',
                'Sequência rápida: envie 3 mensagens em 5 segundos e verifique se o bot agrupa e responde com uma única resposta coerente.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Modo de teste da Meta (sem custo extra)',
            content: 'Durante os testes, você pode usar os números de telefone de teste cadastrados no Meta Developers (até 5 números gratuitos). Mensagens enviadas para/de esses números de teste não consomem créditos da Meta Business API. Adicione seu número pessoal como número de teste no painel Meta → WhatsApp → Números de Telefone de Teste.',
        },
        {
            type: 'list',
            title: 'O que fazer quando algo não funciona',
            ordered: false,
            items: [
                'Bot não responde: verifique no Debug se o webhook recebeu a mensagem. Se não recebeu, o problema é na configuração do webhook ou do token.',
                'Resposta incorreta: ajuste o prompt de sistema. Seja mais específico sobre o comportamento esperado.',
                'IA não usa os documentos: verifique se o documento está com status "Ativo" na Base de Conhecimento. Teste com uma pergunta que usa exatamente termos do documento.',
                'Erro de credenciais: verifique em Configurações → Credenciais se as chaves de API estão corretas e não expiraram.',
                'Timeout (resposta demorada): verifique a latência no Debug. Pode ser problema de conectividade com o provedor de IA.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Logs de erro detalhados',
            content: 'Acesse Dashboard → Debug → aba "Erros" para ver apenas as execuções que falharam, com a mensagem de erro completa. Isso facilita muito o diagnóstico de problemas.',
        },
        {
            type: 'cta',
            title: 'Tudo testado e funcionando?',
            description: 'Agora configure campanhas para enviar mensagens ativas para seus contatos.',
            buttonText: 'Criar Campanha →',
            buttonHref: '/help/campanhas-disparos/criar-campanha',
        },
    ],
};
