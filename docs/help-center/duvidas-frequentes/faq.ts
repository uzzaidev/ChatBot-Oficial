import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Dúvidas Frequentes
 * Artigo: FAQ — Perguntas Mais Frequentes
 */
export const faq: BlogPost = {
    slug: 'faq',
    title: 'Perguntas Frequentes (FAQ)',
    description: 'Respostas rápidas para as dúvidas mais comuns sobre o UzzApp — conexão, IA, custos, limites, segurança e muito mais.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Dúvidas Frequentes'],
    tags: ['FAQ', 'Dúvidas', 'Ajuda', 'Perguntas'],
    readTime: '8 min',
    coverImage: '/images/help/duvidas-frequentes/faq.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'Reunimos abaixo as perguntas que mais recebemos dos nossos clientes. Se sua dúvida não estiver aqui, entre em contato com o suporte — respondemos em até 24 horas.',
        },

        // ── BLOCO: WHATSAPP & CONEXÃO ──────────────────────────────
        {
            type: 'list',
            title: 'WhatsApp e Conexão',
            ordered: false,
            items: [
                'Posso usar meu número pessoal do WhatsApp? Não. O UzzApp usa a API Oficial do WhatsApp Business, que exige um número dedicado — não pode ser um número em uso no WhatsApp pessoal ou no aplicativo WhatsApp Business comum.',
                'Preciso ter o aplicativo WhatsApp Business instalado? Não. Com a API Oficial, o número é gerenciado diretamente pela plataforma. O app WhatsApp Business não é compatível com a API ao mesmo tempo no mesmo número.',
                'Quantos números de WhatsApp posso conectar? Depende do seu plano. Planos iniciais suportam 1 número. Planos avançados suportam múltiplos números — ideal para empresas com filiais ou times diferentes.',
                'O que é o webhook? É o endereço (URL) que o WhatsApp usa para enviar as mensagens recebidas para o UzzApp. Você configura este endereço no Meta Developers apontando para o UzzApp.',
                'O número pode ser bloqueado pela Meta? Sim, se você enviar spam, tiver muitos bloqueios ou reclamações. Mantenha boas práticas: envie apenas para quem deu opt-in, use templates aprovados e respeite a frequência de envios.',
            ],
        },

        // ── BLOCO: IA E RESPOSTAS ──────────────────────────────────
        {
            type: 'list',
            title: 'Inteligência Artificial e Respostas',
            ordered: false,
            items: [
                'Quanto tempo leva para o bot responder? Com Groq (Llama 3.3 70B): em média 1-2 segundos. Com OpenAI (GPT-4o): 3-5 segundos. Pode ser mais lento se a base de conhecimento precisar ser consultada.',
                'O bot pode responder perguntas sobre qualquer assunto? O bot responde com base no prompt de sistema e nos documentos da base de conhecimento. Configure o prompt para limitar o escopo do bot ao seu negócio.',
                'O que acontece se o cliente enviar várias mensagens seguidas? O sistema agrupa todas as mensagens enviadas em até 30 segundos antes de chamar a IA. Isso evita respostas fragmentadas e reduz o custo de chamadas à API.',
                'O bot entende português com gírias e erros de ortografia? Sim. Os modelos de linguagem modernos (Llama 3.3 e GPT-4o) têm excelente compreensão de português informal, incluindo gírias regionais e erros comuns de digitação.',
                'Posso ter mais de um agente de IA configurado? Sim. Você pode criar múltiplos agentes com personalidades e prompts diferentes e alternar entre eles — por horário, manualmente ou via testes A/B.',
            ],
        },

        // ── BLOCO: CUSTOS ──────────────────────────────────────────
        {
            type: 'list',
            title: 'Custos e Cobrança',
            ordered: false,
            items: [
                'Quanto custa o uso da IA? O custo da IA não está incluído no plano do UzzApp — é cobrado diretamente pelos provedores (OpenAI ou Groq) usando suas chaves de API. Groq é significativamente mais barato que OpenAI para volume alto.',
                'Como acompanhar o custo da IA? No Dashboard → Analytics você vê o consumo de tokens e o custo estimado em R$ por período. Configure um budget em Configurações para limitar os gastos.',
                'A Meta cobra por mensagem? Sim. A Meta cobra por conversa (janela de 24 horas), não por mensagem individual. Conversas iniciadas pelo cliente são gratuitas por 24h. Conversas iniciadas pela empresa (templates) têm custo variável por categoria e país.',
                'Posso usar a IA gratuita do Groq? O Groq tem um nível gratuito com limites de requisições. Para uso em produção com volume, o Groq tem planos pagos. Verifique os limites atuais em console.groq.com.',
            ],
        },

        // ── BLOCO: SEGURANÇA & DADOS ────────────────────────────────
        {
            type: 'list',
            title: 'Segurança e Dados',
            ordered: false,
            items: [
                'Os dados dos meus clientes são compartilhados com outras empresas? Não. O UzzApp é multi-tenant com isolamento completo. Cada empresa tem seus dados armazenados separadamente. Nenhuma empresa acessa dados de outra.',
                'Onde ficam armazenadas as conversas? As conversas são armazenadas em banco de dados seguro (Supabase/PostgreSQL) com Row Level Security. Apenas usuários autorizados da sua empresa têm acesso.',
                'Minhas chaves de API ficam seguras? Sim. Todas as chaves são criptografadas com AES-256 no Vault antes de serem salvas. Nem a equipe da Uzz.Ai consegue visualizar os valores das suas chaves.',
                'O UzzApp está em conformidade com a LGPD? Sim. Temos Política de Privacidade, Termos de Uso e DPA (Data Processing Agreement) disponíveis na plataforma. Em caso de solicitação de exclusão de dados de usuário, processamos em até 72 horas.',
            ],
        },

        // ── BLOCO: PROBLEMAS COMUNS ─────────────────────────────────
        {
            type: 'list',
            title: 'Problemas Comuns',
            ordered: false,
            items: [
                'O bot parou de responder de repente. O que fazer? Verifique: (1) O token de acesso da Meta não expirou? (2) O budget de IA foi atingido? (3) O webhook ainda está ativo? Acesse Dashboard → Debug para ver os logs de erro.',
                'O bot está respondendo fora do esperado. Como ajustar? Edite o prompt de sistema do agente em Dashboard → Agentes. Seja mais específico nas instruções. Teste após cada ajuste enviando mensagens reais.',
                'A transcrição de áudio está errada. O que pode ser? Ruído de fundo intenso, sotaque muito carregado ou áudio muito baixo podem afetar a precisão. O Whisper (OpenAI) é muito bom mas não perfeito — qualidade de áudio impacta diretamente.',
                'Configurei o webhook mas a Meta diz que falhou na verificação. Verifique: (1) O URL está exatamente certo, incluindo o Client ID? (2) O META_VERIFY_TOKEN nas configurações é idêntico ao token que você inseriu no Meta Developers? (3) O servidor está online e acessível?',
            ],
        },

        {
            type: 'cta',
            title: 'Não encontrou sua resposta?',
            description: 'Nossa equipe de suporte está disponível para ajudar você a resolver qualquer dúvida.',
            buttonText: 'Falar com Suporte →',
            buttonHref: '/help/suporte/como-solicitar-atendimento',
        },
    ],
};
