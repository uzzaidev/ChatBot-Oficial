import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: CRM
 * Artigo: Rastreamento de Meta Ads
 */
export const rastreamentoMetaAds: BlogPost = {
    slug: 'rastreamento-meta-ads',
    title: 'Rastreamento de Meta Ads — Saiba de Qual Anúncio Veio Cada Lead',
    description: 'Como o UzzApp captura automaticamente os dados dos anúncios do Facebook e Instagram que geraram conversas no WhatsApp, vinculando cada lead à sua origem exata.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['CRM'],
    tags: ['Meta Ads', 'Facebook', 'Instagram', 'Rastreamento', 'ROI', 'Lead'],
    readTime: '5 min',
    coverImage: '/images/help/crm/rastreamento-meta-ads.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'Quando você roda anúncios no Facebook ou Instagram com o botão "Enviar mensagem no WhatsApp", o UzzApp captura automaticamente os dados do anúncio que gerou cada conversa. Você sabe exatamente qual campanha, qual grupo de anúncio e qual criativo trouxe cada lead — sem nenhuma configuração adicional.',
        },
        {
            type: 'list',
            title: 'Dados Capturados por Lead',
            ordered: false,
            items: [
                'Campanha: nome e ID da campanha do Meta Ads.',
                'Conjunto de anúncios (Ad Set): o grupo de anúncios onde o clique aconteceu.',
                'Anúncio (Ad): o criativo específico (imagem, vídeo, carrossel) que o cliente clicou.',
                'Ad ID: identificador único do anúncio para cruzamento com o Meta Ads Manager.',
                'URL de origem: link do anúncio que gerou o clique.',
                'Timestamp: data e hora do clique no anúncio.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/crm/lead-meta-ads.png',
            alt: 'Perfil de lead com dados de origem de anúncio',
            caption: 'Perfil do contato no CRM mostrando os dados do anúncio de origem',
        },
        {
            type: 'list',
            title: 'Como Funciona — Técnico (Simplificado)',
            ordered: true,
            items: [
                'O cliente clica no anúncio "Enviar mensagem no WhatsApp" no Facebook ou Instagram.',
                'O WhatsApp abre com uma mensagem pré-preenchida (configurada no anúncio).',
                'Quando o cliente envia a mensagem, o webhook do UzzApp recebe junto com os parâmetros do anúncio (ref_url, source_id, source_url).',
                'O sistema extrai e salva esses dados no perfil do lead automaticamente.',
                'Nenhuma configuração adicional é necessária — funciona com qualquer anúncio do tipo Click-to-WhatsApp.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Pré-requisito: Tipo de Anúncio',
            content: 'O rastreamento funciona apenas com anúncios do tipo "Click-to-WhatsApp" (botão de CTA que abre o WhatsApp diretamente). Anúncios que levam para um site ou landing page com link de WhatsApp não são rastreados automaticamente.',
        },
        {
            type: 'list',
            title: 'Onde Ver os Dados de Origem no CRM',
            ordered: true,
            items: [
                'Acesse Dashboard → Contatos ou CRM.',
                'Clique no lead desejado para abrir o perfil.',
                'Na seção "Origem do Lead", você verá os dados do anúncio se ele veio de um Click-to-WhatsApp.',
                'Leads orgânicos (sem anúncio) mostrarão "Orgânico" como origem.',
            ],
        },
        {
            type: 'list',
            title: 'Usando os Dados para Otimizar Campanhas',
            ordered: false,
            items: [
                'Filtre contatos por campanha específica para ver quantos leads ela gerou.',
                'Compare a taxa de conversão (leads que viraram clientes) por campanha.',
                'Identifique quais criativos geram leads mais qualificados — não apenas volume.',
                'Exporte a lista de leads por campanha para análise no Excel ou Google Sheets.',
                'Cruce com os dados de custo do Meta Ads Manager para calcular o CPL (Custo por Lead) real.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Dados disponíveis por até 30 dias',
            content: 'Os parâmetros de rastreamento do Meta ficam disponíveis por até 30 dias após o clique. Leads de anúncios que iniciaram conversa há mais de 30 dias podem não ter todos os dados de origem completos.',
        },
        {
            type: 'cta',
            title: 'Quer automatizar ações com base na origem do lead?',
            description: 'Configure automações no CRM para leads de anúncios específicos.',
            buttonText: 'Automações do CRM →',
            buttonHref: '/help/crm/automacoes',
        },
    ],
};
