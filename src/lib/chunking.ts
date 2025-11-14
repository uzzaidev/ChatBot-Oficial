/**
 * Semantic Text Chunking Library
 * 
 * Implementa chunking semântico com overlaps para melhor precisão em RAG.
 * 
 * Estratégias:
 * 1. Semantic Chunking - Divide por parágrafos/sentenças mantendo contexto
 * 2. Overlapping - 15-20% overlap entre chunks para continuidade
 * 3. Token-based - Respeita limites de tokens do modelo de embedding
 */

/**
 * Interface para configuração de chunking
 */
export interface ChunkingConfig {
  /**
   * Tamanho máximo do chunk em tokens
   * Recomendado: 400-600 tokens para text-embedding-3-small
   */
  chunkSize: number
  
  /**
   * Percentual de overlap entre chunks (0-100)
   * Recomendado: 15-20% para boa continuidade
   */
  overlapPercentage: number
  
  /**
   * Separadores semânticos (em ordem de prioridade)
   */
  separators?: string[]
}

/**
 * Interface para um chunk processado
 */
export interface TextChunk {
  /** Conteúdo do chunk */
  content: string
  
  /** Índice do chunk (0-based) */
  index: number
  
  /** Posição inicial no texto original */
  startPosition: number
  
  /** Posição final no texto original */
  endPosition: number
  
  /** Número estimado de tokens */
  tokenCount: number
  
  /** Metadados do chunk */
  metadata: {
    /** Total de chunks no documento */
    totalChunks: number
    
    /** Tipo de separador usado */
    separator: string
    
    /** Se este chunk tem overlap com o anterior */
    hasOverlap: boolean
    
    /** Se este chunk tem overlap com o próximo */
    hasNextOverlap: boolean
  }
}

/**
 * Separadores semânticos padrão (em ordem de prioridade)
 * 
 * 1. Quebra dupla de parágrafo
 * 2. Quebra simples de linha
 * 3. Ponto final + espaço
 * 4. Ponto e vírgula
 * 5. Vírgula
 * 6. Espaço (último recurso)
 */
const DEFAULT_SEPARATORS = [
  '\n\n',  // Parágrafos
  '\n',    // Linhas
  '. ',    // Sentenças
  '; ',    // Cláusulas
  ', ',    // Frases
  ' '      // Palavras (último recurso)
]

/**
 * Estima o número de tokens em um texto
 * 
 * Usa aproximação: 1 token ≈ 4 caracteres para português
 * Mais preciso seria usar tiktoken, mas isso adiciona dependência pesada
 * 
 * @param text - Texto para estimar
 * @returns Número estimado de tokens
 */
export const estimateTokens = (text: string): number => {
  // Aproximação: 1 token ≈ 4 caracteres
  // Para português, é geralmente entre 3.5-4.5 caracteres por token
  return Math.ceil(text.length / 4)
}

/**
 * Divide texto em chunks semânticos com overlap
 * 
 * Algoritmo:
 * 1. Divide texto usando separadores semânticos (parágrafos, sentenças)
 * 2. Agrupa segmentos até atingir tamanho máximo do chunk
 * 3. Adiciona overlap de X% com chunk anterior
 * 4. Retorna array de chunks com metadados
 * 
 * @param text - Texto a ser dividido
 * @param config - Configuração de chunking
 * @returns Array de chunks processados
 * 
 * @example
 * ```typescript
 * const chunks = semanticChunkText(documentText, {
 *   chunkSize: 500,
 *   overlapPercentage: 20
 * })
 * 
 * chunks.forEach(chunk => {
 *   console.log(`Chunk ${chunk.index}: ${chunk.tokenCount} tokens`)
 *   // Salvar no vector store
 * })
 * ```
 */
export const semanticChunkText = (
  text: string,
  config: ChunkingConfig
): TextChunk[] => {
  const {
    chunkSize,
    overlapPercentage,
    separators = DEFAULT_SEPARATORS
  } = config

  // Validação
  if (chunkSize <= 0) {
    throw new Error('chunkSize must be greater than 0')
  }
  if (overlapPercentage < 0 || overlapPercentage > 100) {
    throw new Error('overlapPercentage must be between 0 and 100')
  }

  // Se texto é menor que chunk size, retorna como único chunk
  const totalTokens = estimateTokens(text)
  if (totalTokens <= chunkSize) {
    return [{
      content: text,
      index: 0,
      startPosition: 0,
      endPosition: text.length,
      tokenCount: totalTokens,
      metadata: {
        totalChunks: 1,
        separator: 'none',
        hasOverlap: false,
        hasNextOverlap: false
      }
    }]
  }

  // Dividir texto usando separadores semânticos
  const segments = splitBySeparators(text, separators)
  
  // Calcular tamanho do overlap em tokens
  const overlapTokens = Math.floor(chunkSize * (overlapPercentage / 100))
  
  // Agrupar segmentos em chunks
  const chunks: TextChunk[] = []
  let currentChunk: string[] = []
  let currentTokens = 0
  let previousChunk: string | null = null
  let charPosition = 0

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const segmentTokens = estimateTokens(segment.text)

    // Se adicionar este segmento ultrapassa o limite, finaliza chunk atual
    if (currentTokens + segmentTokens > chunkSize && currentChunk.length > 0) {
      // Finalizar chunk atual
      const chunkText = currentChunk.join('')
      const chunkStartPos = charPosition - chunkText.length
      
      chunks.push({
        content: chunkText,
        index: chunks.length,
        startPosition: chunkStartPos,
        endPosition: charPosition,
        tokenCount: currentTokens,
        metadata: {
          totalChunks: 0, // Será atualizado no final
          separator: segment.separator,
          hasOverlap: previousChunk !== null,
          hasNextOverlap: i < segments.length - 1
        }
      })

      // Preparar próximo chunk com overlap
      previousChunk = chunkText
      currentChunk = []
      currentTokens = 0

      // Adicionar overlap do chunk anterior
      if (previousChunk && overlapTokens > 0) {
        const overlapText = getLastNTokens(previousChunk, overlapTokens)
        currentChunk.push(overlapText)
        currentTokens = estimateTokens(overlapText)
      }
    }

    // Adicionar segmento ao chunk atual
    currentChunk.push(segment.text)
    currentTokens += segmentTokens
    charPosition += segment.text.length
  }

  // Adicionar último chunk se houver conteúdo
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join('')
    const chunkStartPos = charPosition - chunkText.length
    
    chunks.push({
      content: chunkText,
      index: chunks.length,
      startPosition: chunkStartPos,
      endPosition: charPosition,
      tokenCount: currentTokens,
      metadata: {
        totalChunks: 0,
        separator: 'end',
        hasOverlap: previousChunk !== null,
        hasNextOverlap: false
      }
    })
  }

  // Atualizar totalChunks em todos os metadados
  const totalChunks = chunks.length
  chunks.forEach(chunk => {
    chunk.metadata.totalChunks = totalChunks
  })

  return chunks
}

/**
 * Interface para segmento de texto
 */
interface TextSegment {
  text: string
  separator: string
}

/**
 * Divide texto usando separadores semânticos
 * 
 * Tenta usar separadores de maior prioridade primeiro (parágrafos)
 * e fallback para separadores menores (palavras) se necessário
 * 
 * @param text - Texto a dividir
 * @param separators - Lista de separadores em ordem de prioridade
 * @returns Array de segmentos
 */
const splitBySeparators = (
  text: string,
  separators: string[]
): TextSegment[] => {
  // Tentar cada separador em ordem de prioridade
  for (const separator of separators) {
    const parts = text.split(separator)
    
    // Se conseguiu dividir em múltiplas partes, usar este separador
    if (parts.length > 1) {
      return parts
        .filter(part => part.trim().length > 0)
        .map(part => ({
          text: part + separator, // Re-adicionar separador
          separator
        }))
    }
  }

  // Se nenhum separador funcionou, retornar texto completo
  return [{
    text,
    separator: 'none'
  }]
}

/**
 * Obtém os últimos N tokens de um texto
 * 
 * Usado para criar overlap entre chunks
 * 
 * @param text - Texto de origem
 * @param tokenCount - Número de tokens a extrair
 * @returns Substring com aproximadamente N tokens
 */
const getLastNTokens = (text: string, tokenCount: number): string => {
  // Estimar quantos caracteres representam N tokens
  const charCount = tokenCount * 4 // 1 token ≈ 4 chars
  
  if (charCount >= text.length) {
    return text
  }

  // Pegar últimos N caracteres
  let result = text.slice(-charCount)
  
  // Tentar encontrar início de palavra/sentença para não cortar no meio
  const spaceIndex = result.indexOf(' ')
  if (spaceIndex > 0 && spaceIndex < result.length * 0.2) {
    // Se tem espaço nos primeiros 20%, começar depois dele
    result = result.slice(spaceIndex + 1)
  }

  return result
}

/**
 * Divide documento em chunks e gera metadata enriquecido
 * 
 * Adiciona informações úteis para RAG:
 * - Título/nome do documento
 * - Número do chunk e total
 * - Tipo de documento
 * - Timestamp
 * 
 * @param text - Texto do documento
 * @param config - Configuração de chunking
 * @param metadata - Metadados adicionais
 * @returns Array de chunks com metadata enriquecido
 * 
 * @example
 * ```typescript
 * const chunks = chunkDocumentForRAG(pdfText, {
 *   chunkSize: 500,
 *   overlapPercentage: 20
 * }, {
 *   filename: 'catalogo.pdf',
 *   documentType: 'catalog',
 *   uploadedBy: 'user123'
 * })
 * ```
 */
export const chunkDocumentForRAG = (
  text: string,
  config: ChunkingConfig,
  metadata: {
    filename?: string
    documentType?: string
    clientId?: string
    uploadedBy?: string
    uploadedAt?: Date
    [key: string]: any
  } = {}
): Array<TextChunk & { enrichedMetadata: Record<string, any> }> => {
  const chunks = semanticChunkText(text, config)
  
  return chunks.map(chunk => ({
    ...chunk,
    enrichedMetadata: {
      // Metadados do documento
      ...metadata,
      
      // Metadados do chunk
      chunkIndex: chunk.index,
      totalChunks: chunk.metadata.totalChunks,
      chunkTokenCount: chunk.tokenCount,
      
      // Informações de posição
      startPosition: chunk.startPosition,
      endPosition: chunk.endPosition,
      
      // Informações de overlap
      hasOverlap: chunk.metadata.hasOverlap,
      hasNextOverlap: chunk.metadata.hasNextOverlap,
      
      // Timestamp
      processedAt: new Date().toISOString(),
      
      // Preview do conteúdo (primeiros 100 chars)
      contentPreview: chunk.content.substring(0, 100) + '...'
    }
  }))
}

/**
 * Calcula estatísticas de chunking
 * 
 * Útil para debug e otimização
 * 
 * @param chunks - Array de chunks
 * @returns Estatísticas
 */
export const getChunkingStats = (chunks: TextChunk[]) => {
  const tokenCounts = chunks.map(c => c.tokenCount)
  const avgTokens = tokenCounts.reduce((a, b) => a + b, 0) / chunks.length
  const minTokens = Math.min(...tokenCounts)
  const maxTokens = Math.max(...tokenCounts)
  
  const chunksWithOverlap = chunks.filter(c => c.metadata.hasOverlap).length
  
  return {
    totalChunks: chunks.length,
    avgTokensPerChunk: Math.round(avgTokens),
    minTokensPerChunk: minTokens,
    maxTokensPerChunk: maxTokens,
    chunksWithOverlap,
    overlapPercentage: Math.round((chunksWithOverlap / chunks.length) * 100)
  }
}
