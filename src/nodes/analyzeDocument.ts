import { extractTextFromPDF, summarizePDFContent } from '@/lib/openai'

export const analyzeDocument = async (
  documentBuffer: Buffer,
  mimeType: string,
  filename?: string
): Promise<{
  content: string
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
  model?: string
}> => {
  try {
    if (mimeType === 'application/pdf') {
      const pdfText = await extractTextFromPDF(documentBuffer)

      if (!pdfText || pdfText.trim().length === 0) {
        return {
          content: `Recebi um documento PDF${filename ? ` chamado "${filename}"` : ''}, mas não consegui extrair texto dele. O arquivo pode estar protegido ou conter apenas imagens.`,
          usage: undefined,
          model: undefined
        }
      }

      const result = await summarizePDFContent(pdfText, filename)
      return {
        content: `📄 Documento recebido${filename ? ` (${filename})` : ''}:\n\n${result.content}`,
        usage: result.usage,
        model: result.model
      }
    }

    return {
      content: `Recebi um documento${filename ? ` chamado "${filename}"` : ''} do tipo ${mimeType}. No momento, apenas documentos PDF são suportados para análise automática.`,
      usage: undefined,
      model: undefined
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to analyze document: ${errorMessage}`)
  }
}
