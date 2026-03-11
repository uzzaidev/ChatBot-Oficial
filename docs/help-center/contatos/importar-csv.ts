import type { BlogPost } from '@/data/blog/types';

/**
 * Módulo: Contatos
 * Artigo: Importar Contatos via CSV
 */
export const importarCsv: BlogPost = {
    slug: 'importar-contatos-csv',
    title: 'Importar Contatos via Planilha (CSV)',
    description: 'Importe centenas ou milhares de contatos de uma só vez usando uma planilha CSV. Veja o formato correto e como mapear os campos.',
    publishedAt: '2026-03-05',
    author: 'Equipe Uzz.Ai',
    category: ['Contatos'],
    tags: ['Importação', 'CSV', 'Planilha', 'Contatos'],
    readTime: '5 min',
    coverImage: '/images/help/contatos/importar-csv.png',
    layout: 'long-form-reader',
    sections: [
        {
            type: 'text',
            content:
                'Se você já tem uma base de clientes em uma planilha (Excel, Google Sheets ou qualquer outra), pode importá-la diretamente para o UzzApp em formato CSV. O processo é simples e leva menos de 2 minutos para bases de até 10.000 contatos.',
        },
        {
            type: 'list',
            title: 'Passo 1 — Preparar a Planilha',
            ordered: false,
            items: [
                'A planilha deve estar no formato CSV (valores separados por vírgula).',
                'A primeira linha deve ser o cabeçalho com os nomes das colunas.',
                'Colunas obrigatórias: nome e telefone.',
                'Colunas opcionais: origem, tags, observacoes.',
                'O número de telefone deve conter o DDI (ex: 5551999887766).',
                'Tags múltiplas devem ser separadas por ponto-e-vírgula: "cliente;vip;2026".',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Modelo de planilha CSV',
            content: 'nome,telefone,origem,tags,observacoes\nJoão Silva,5551999887766,indicação,cliente;vip,Cliente desde 2024\nMaria Oliveira,5511988776655,site,,Interesse em produto X',
        },
        {
            type: 'list',
            title: 'Passo 2 — Iniciar a Importação',
            ordered: true,
            items: [
                'Acesse Dashboard → Contatos.',
                'Clique no botão "Importar" (ícone de upload) no canto superior direito.',
                'Selecione o arquivo CSV do seu computador (máximo 50MB por arquivo).',
                'O sistema exibirá uma prévia das primeiras 5 linhas para validação.',
            ],
        },
        {
            type: 'image',
            src: '/images/help/contatos/tela-importacao.png',
            alt: 'Tela de importação de contatos com preview do CSV',
            caption: 'Tela de importação — preview das primeiras linhas para validação',
        },
        {
            type: 'list',
            title: 'Passo 3 — Mapear os Campos',
            ordered: true,
            items: [
                'Na tela de mapeamento, associe cada coluna do CSV ao campo correspondente no UzzApp.',
                'O sistema tenta mapear automaticamente por nomes similares.',
                'Corrija os mapeamentos incorretos clicando no campo e selecionando o destino correto.',
                'Se uma coluna não tem campo correspondente, selecione "Ignorar".',
                'Clique em "Confirmar Importação".',
            ],
        },
        {
            type: 'list',
            title: 'Passo 4 — Acompanhar o Processamento',
            ordered: true,
            items: [
                'Uma barra de progresso mostra o andamento da importação.',
                'Ao final, um relatório indica: contatos importados com sucesso, duplicados ignorados e erros.',
                'Contatos com número de telefone inválido são listados no relatório de erros.',
                'Contatos duplicados (mesmo número já cadastrado) são ignorados por padrão.',
            ],
        },
        {
            type: 'highlight-box',
            variant: 'warning',
            title: 'Números inválidos',
            content: 'O sistema valida o formato do número durante a importação. Números sem DDI, com letras ou formatação incorreta são rejeitados e listados no relatório de erros. Corrija-os na planilha e reimporte apenas os inválidos.',
        },
        {
            type: 'highlight-box',
            variant: 'info',
            title: 'Duplicatas na importação',
            content: 'Se um número já existe na base, o contato é atualizado com os novos dados (nome, tags, observações) e não é duplicado. Isso permite usar a importação para atualizar dados em massa.',
        },
        {
            type: 'cta',
            title: 'Contatos importados — e agora?',
            description: 'Aprenda a segmentar e exportar sua base de contatos.',
            buttonText: 'Exportar e Gerenciar Listas →',
            buttonHref: '/help/contatos/exportar-e-listas',
        },
    ],
};
