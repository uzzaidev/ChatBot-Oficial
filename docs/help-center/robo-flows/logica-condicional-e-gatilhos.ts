import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Robô / Flows
 * Artigo: Lógica Condicional, Menus Interativos e Gatilhos
 */
export const logicaCondicionalEGatilhos: BlogPost = {
    slug: 'logica-condicional-e-gatilhos',
    title: 'Menus Interativos, Botões e Lógica Condicional',
    description: 'Como criar fluxos com botões e listas de seleção no WhatsApp, configurar respostas condicionais e definir gatilhos de transferência automática.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Robô / Flows'],
    tags: ['Fluxo', 'Botões', 'Menus', 'Interativo', 'Gatilho'],
    readTime: '6 min',
    coverImage: '/images/help/robo-flows/logica-condicional.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'Além das respostas livres geradas por IA, o UzzApp suporta mensagens interativas do WhatsApp Business API — botões de resposta rápida e listas de seleção. Esses elementos criam fluxos guiados onde o cliente clica em opções em vez de digitar.',
        },
        {
            type: 'list',
            title: 'Tipos de Mensagem Interativa',
            ordered: false,
            items: [
                'Botões de resposta rápida: até 3 botões por mensagem. Ideal para perguntas binárias ou ternárias. Ex: [Sim] [Não] [Mais informações].',
                'Lista de seleção: menu com múltiplas opções organizadas em seções. Ideal para cardápios, categorias de produto, departamentos. Até 10 itens por lista.',
                'Ambos os tipos aparecem como elementos visuais clicáveis no WhatsApp — não precisam que o cliente digite nada.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/robo-flows/botoes-whatsapp.png',
            alt: 'Exemplos de botões e lista de seleção no WhatsApp',
            caption: 'Botões de resposta rápida (esquerda) e lista de seleção (direita) no WhatsApp',
        },
        {
            type: 'list',
            title: 'Como Configurar Menus Interativos no Agente',
            ordered: true,
            items: [
                'No prompt do agente, instrua a IA sobre quando enviar menus interativos.',
                'Use linguagem clara: "Quando o cliente iniciar a conversa, envie uma lista com as opções: [Suporte Técnico], [Informações de Produto], [Financeiro], [Falar com Vendas]."',
                'A IA gerará a mensagem no formato correto da API do WhatsApp automaticamente.',
                'Após o cliente selecionar uma opção, a IA reconhece a resposta e continua o fluxo adequado.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Exemplo de instrução no prompt',
            content: 'Quando o cliente enviar a primeira mensagem, responda com uma lista de seleção com as seguintes opções:\n- Suporte: para dúvidas técnicas e problemas\n- Vendas: para compras e orçamentos\n- Financeiro: para boletos e pagamentos\n- Outros: para demais assuntos\n\nApós a seleção, conduza o atendimento conforme o departamento escolhido.',
        },
        {
            type: 'list',
            title: 'Lógica Condicional no Prompt',
            ordered: false,
            items: [
                'A lógica condicional é definida diretamente no prompt de sistema usando linguagem natural.',
                'Exemplo: "SE o cliente mencionar prazo de entrega, informe que o prazo padrão é 5 dias úteis. SE o cliente mencionar troca ou devolução, informe sobre a política de 7 dias e pergunte se deseja iniciar o processo."',
                'A IA é capaz de identificar intenções e seguir as instruções condicionais automaticamente.',
                'Para fluxos mais complexos, divida o prompt em seções claramente delimitadas por departamento ou situação.',
            ],
        },
        {
            type: 'list',
            title: 'Gatilhos de Transferência Automática',
            ordered: false,
            items: [
                'Solicitação explícita: cliente escreve "quero falar com humano", "preciso de um atendente" → transfere automaticamente.',
                'Intenção inferida: cliente demonstra frustração ("isso é um absurdo", "vocês nunca resolvem") → configure no prompt para transferir.',
                'Tópicos restritos: instrua o bot a transferir quando o assunto for além do seu escopo. Ex: "Para questões jurídicas ou reclamações formais, sempre use a ferramenta de transferência."',
                'Número de tentativas: "Se não conseguir resolver a dúvida do cliente após 3 tentativas, transfira para um atendente."',
            ],
        },
        {
            type: 'list',
            title: 'Agendamento de Ativação por Horário',
            ordered: true,
            items: [
                'Acesse Dashboard → Agentes → selecione o agente.',
                'Na aba "Agendamento", ative a opção de horário de funcionamento.',
                'Defina os dias da semana e horários em que o agente está ativo.',
                'Fora do horário, configure uma mensagem automática de fora do expediente.',
                'Você pode ter um agente de horário comercial (mais formal) e um fora do horário (apenas informa o expediente).',
            ],
        },
        {
            type: 'cta',
            title: 'Quer que o bot responda com base nos seus documentos?',
            description: 'Configure a Base de Conhecimento para que a IA aprenda com seus arquivos.',
            buttonText: 'Base de Conhecimento (RAG) →',
            buttonHref: '/help/robo-flows/base-de-conhecimento',
        },
    ],
};
