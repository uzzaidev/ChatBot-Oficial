import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Robô / Flows
 * Artigo: Criar um Fluxo do Zero
 */
export const criarFluxoDoZero: BlogPost = {
    slug: 'criar-fluxo-do-zero',
    title: 'Como Criar um Fluxo de Atendimento do Zero',
    description: 'Passo a passo para configurar o assistente de IA com prompt personalizado, definir o pipeline de processamento e visualizar o fluxo de mensagens.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Robô / Flows'],
    tags: ['Fluxo', 'Agente', 'Prompt', 'Configuração', 'Automação'],
    readTime: '7 min',
    coverImage: '/images/help/robo-flows/criar-fluxo-do-zero.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'No UzzApp, um "fluxo" é o caminho que cada mensagem percorre desde o recebimento no WhatsApp até a resposta enviada ao cliente. O fluxo padrão tem 14 etapas (nós) e já vem pré-configurado. Você personaliza o comportamento principalmente pelo prompt do agente e pelos menus interativos.',
        },
        {
            type: 'list',
            title: 'Os 14 Nós do Pipeline de Processamento',
            ordered: true,
            items: [
                'Filtrar Status: ignora atualizações de status de entrega (só processa mensagens novas).',
                'Parsear Mensagem: extrai tipo, conteúdo e metadados da mensagem recebida.',
                'Verificar/Criar Cliente: busca ou cria o contato no banco de dados.',
                'Download de Mídia: baixa áudios, imagens e documentos do WhatsApp.',
                'Normalizar Mensagem: converte todos os tipos de mídia para texto (Whisper + Vision).',
                'Push para Redis: enfileira a mensagem para o sistema de batching inteligente.',
                'Salvar Mensagem do Usuário: persiste a mensagem no histórico.',
                'Aguardar Batch (30s): agrupa mensagens enviadas em sequência rápida.',
                'Buscar Histórico: carrega as últimas 15 mensagens para contexto da IA.',
                'Buscar Contexto RAG: pesquisa nos documentos da base de conhecimento.',
                'Gerar Resposta IA: chama o modelo de IA com todo o contexto.',
                'Formatar Resposta: divide em múltiplas mensagens, remove artefatos.',
                'Enviar e Salvar: envia pelo WhatsApp e salva no histórico simultaneamente.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/robo-flows/pipeline-diagrama.png',
            alt: 'Diagrama visual do pipeline de processamento',
            caption: 'Dashboard → Arquitetura do Fluxo — diagrama interativo dos 14 nós',
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Visualizar o fluxo interativamente',
            content: 'Acesse Dashboard → Arquitetura do Fluxo para ver o diagrama completo e clicável. Clique em qualquer nó para ver sua configuração e ajustar parâmetros. As alterações entram em vigor imediatamente após salvar.',
        },
        {
            type: 'list',
            title: 'Configurando o Agente — O Núcleo do Fluxo',
            ordered: true,
            items: [
                'Acesse Dashboard → Agentes → selecione ou crie um agente.',
                'Defina o Nome do Agente (identificação interna, ex: "Assistente Principal").',
                'Escreva o Prompt de Sistema: as instruções completas de comportamento.',
                'Selecione o Provedor de IA: Groq (velocidade) ou OpenAI (capacidade).',
                'Defina o modelo específico: Llama 3.3 70B, GPT-4o, GPT-4o-mini.',
                'Configure temperatura (0.0-1.0) e máximo de tokens por resposta.',
                'Ative ou desative ferramentas: transferência para humano, busca de documentos, TTS.',
                'Salve e publique o agente.',
            ],
        },
        {
            type: 'list',
            title: 'Estrutura do Prompt de Sistema — Boas Práticas',
            ordered: false,
            items: [
                'Identidade: "Você é [Nome], assistente da [Empresa]."',
                'Tom e estilo: "Responda sempre em português brasileiro, com tom profissional e empático."',
                'O que pode responder: liste os tópicos que o bot deve cobrir.',
                'Limitações: "Não forneça preços sem consultar o catálogo. Não discuta concorrentes."',
                'Quando transferir: "Se o cliente pedir para falar com humano, ou se a pergunta for sobre situações jurídicas, use a ferramenta de transferência."',
                'Formato de resposta: "Responda de forma concisa, máximo 3 parágrafos. Use listas quando adequado."',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Batching Inteligente — Anti-spam de IA',
            content: 'O nó 8 (Aguardar Batch) espera 30 segundos para agrupar mensagens enviadas em sequência rápida pelo mesmo cliente. Isso evita que a IA responda mensagem por mensagem de forma fragmentada. Você pode ajustar o tempo de batch em Configurações → Fluxo.',
        },
        {
            type: 'list',
            title: 'Testando o Fluxo',
            ordered: true,
            items: [
                'Envie uma mensagem de teste para o número de WhatsApp conectado.',
                'Acompanhe em tempo real no Dashboard → Debug — cada nó exibe seu status (sucesso/erro).',
                'Verifique o log de processamento para identificar se algum nó travou ou gerou erro.',
                'Ajuste o prompt e repita o teste até o comportamento ser o esperado.',
            ],
        },
        {
            type: 'cta',
            title: 'Quer criar menus interativos no bot?',
            description: 'Configure fluxos com botões e listas de seleção para guiar o cliente.',
            buttonText: 'Lógica Condicional e Gatilhos →',
            buttonHref: '/help/robo-flows/logica-condicional-e-gatilhos',
        },
    ],
};
