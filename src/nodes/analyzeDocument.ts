import { extractTextFromPDF, summarizePDFContent } from '@/lib/openai'

export const analyzeDocument = async (
  documentBuffer: Buffer,
  mimeType: string,
  filename?: string
): Promise<string> => {
  try {
    if (mimeType === 'application/pdf') {
      const pdfText = await extractTextFromPDF(documentBuffer)

      if (!pdfText || pdfText.trim().length === 0) {
        return `Recebi um documento PDF${filename ? ` chamado "${filename}"` : ''}, mas não consegui extrair texto dele. O arquivo pode estar protegido ou conter apenas imagens.`
      }

      const summary = await summarizePDFContent(pdfText, filename)
      return `📄 Documento recebido${filename ? ` (${filename})` : ''}:\n\n${summary}`
    }

    return `Recebi um documento${filename ? ` chamado "${filename}"` : ''} do tipo ${mimeType}. No momento, apenas documentos PDF são suportados para análise automática.`
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to analyze document: ${errorMessage}`)
  }
}
