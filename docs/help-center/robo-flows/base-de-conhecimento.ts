import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Robô / Flows
 * Artigo: Base de Conhecimento com IA (RAG)
 */
export const baseDeConhecimento: BlogPost = {
    slug: 'base-de-conhecimento',
    title: 'Base de Conhecimento — Como a IA Aprende com seus Documentos',
    description: 'Faça upload de PDFs, catálogos e manuais para que o assistente responda com base no seu conteúdo. Entenda como funciona o sistema RAG do UzzApp.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Robô / Flows'],
    tags: ['RAG', 'Conhecimento', 'Documentos', 'PDF', 'IA'],
    readTime: '6 min',
    coverImage: '/images/help/robo-flows/base-de-conhecimento.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'A Base de Conhecimento é um dos recursos mais poderosos do UzzApp. Você faz upload dos seus documentos — catálogos, manuais, FAQs, políticas, tabelas de preço — e a IA passa a responder baseada exatamente no seu conteúdo, com precisão e sem inventar informações.',
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'O que é RAG?',
            content: 'RAG (Retrieval-Augmented Generation) é a técnica que permite combinar IA generativa com busca em documentos. Em vez de depender apenas do que a IA "sabe", o sistema busca os trechos mais relevantes dos seus documentos para cada pergunta e usa essas informações para gerar a resposta — garantindo precisão e fidelidade ao seu conteúdo.',
        },
        {
            type: 'list',
            title: 'Formatos de Arquivo Aceitos',
            ordered: false,
            items: [
                'PDF (.pdf): catálogos, manuais, contratos, apresentações.',
                'Texto (.txt): FAQs, scripts de atendimento, políticas.',
                'Markdown (.md): documentação técnica, wikis internas.',
                'Imagens com texto (.jpg, .png, .webp): fotos de tabelas, cardápios, etiquetas — o sistema extrai o texto via OCR.',
                'Tamanho máximo: 10 MB por arquivo.',
            ],
        },
        {
            type: 'list',
            title: 'Como Fazer Upload de um Documento',
            ordered: true,
            items: [
                'Acesse Dashboard → Base de Conhecimento.',
                'Clique em "Fazer Upload" ou arraste o arquivo para a área indicada.',
                'Aguarde o processamento: o sistema divide o documento em trechos (chunks) de 500 tokens com 20% de sobreposição.',
                'Para cada trecho, são gerados vetores de significado (embeddings) com a API da OpenAI.',
                'Os vetores são armazenados no banco de dados vetorial (pgvector).',
                'Quando pronto, o documento aparece na lista com status "Ativo".',
            ],
        },
        {
            type: 'image',
            src: '/images/help/robo-flows/upload-documento.png',
            alt: 'Tela de upload de documento na Base de Conhecimento',
            caption: 'Dashboard → Base de Conhecimento — upload e lista de documentos',
        },
        {
            type: 'list',
            title: 'Como a IA Usa os Documentos',
            ordered: true,
            items: [
                'Cliente faz uma pergunta.',
                'O sistema gera um vetor de busca para a pergunta.',
                'Busca os 5 trechos de documentos mais similares (similaridade coseno > 0.8).',
                'Os trechos relevantes são injetados no contexto enviado para a IA.',
                'A IA gera a resposta baseada tanto no histórico da conversa quanto nos trechos encontrados.',
                'Se nenhum trecho relevante for encontrado, a IA responde com base apenas no prompt de sistema.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Qualidade do documento impacta a qualidade da resposta',
            content: 'Documentos com texto claro e bem estruturado geram melhores resultados. PDFs com texto embutido (não escaneados) são processados com muito mais precisão que PDFs de imagens. Organize o conteúdo com títulos e parágrafos bem definidos.',
        },
        {
            type: 'list',
            title: 'Gerenciando Documentos',
            ordered: false,
            items: [
                'Ativar/Desativar: você pode desativar um documento sem excluí-lo. A IA não buscará nesse documento enquanto estiver inativo.',
                'Substituir: exclua o documento antigo e faça upload da versão atualizada. Os vetores são regenerados automaticamente.',
                'Excluir: remove o documento e todos os seus vetores do banco de dados.',
                'Visualizar chunks: clique no documento para ver como ele foi dividido pelo sistema.',
            ],
        },
        {
            type: 'list',
            title: 'Dicas para Melhores Resultados',
            ordered: false,
            items: [
                'Use documentos focados em um tema por arquivo. Ex: um PDF só para tabela de preços, outro para políticas de troca.',
                'Inclua perguntas e respostas explícitas nos documentos (formato FAQ).',
                'Evite arquivos com muito conteúdo gráfico e pouco texto — o sistema busca texto, não imagens.',
                'Atualize os documentos sempre que houver mudanças nos produtos, preços ou políticas.',
                'Teste fazendo perguntas que o bot deveria saber responder e veja se as respostas estão corretas.',
            ],
        },
        {
            type: 'cta',
            title: 'Quer testar se o bot está usando os documentos corretamente?',
            description: 'Use o Dashboard de Debug para ver quais trechos foram retornados para cada pergunta.',
            buttonText: 'Testar o Fluxo →',
            buttonHref: '/help/robo-flows/testar-fluxo',
        },
    ],
};
