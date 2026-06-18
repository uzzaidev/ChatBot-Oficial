'use client'

/**
 * Message Block Properties Panel
 *
 * Edit a text message and (optionally) attach an image/document — picked from
 * the knowledge base or uploaded new — with a caption.
 *
 * @phase Phase 5 - Interface Drag-and-Drop
 * @created 2025-12-06
 */

import { useEffect, useRef, useState } from 'react'

interface MessageBlockPropertiesProps {
  node: any
  onUpdate: (data: any) => void
}

interface MediaDoc {
  id: string
  filename: string
  url: string
  mimeType: string | null
  type: 'image' | 'document'
}

export default function MessageBlockProperties({ node, onUpdate }: MessageBlockPropertiesProps) {
  const [messageText, setMessageText] = useState(node.data.messageText || '')
  const [caption, setCaption] = useState(node.data.mediaCaption || '')
  const [source, setSource] = useState<'base' | 'upload'>('base')
  const [docs, setDocs] = useState<MediaDoc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const mediaUrl: string = node.data.mediaUrl || ''
  const mediaType: 'image' | 'document' = node.data.mediaType || 'document'
  const mediaFilename: string = node.data.mediaFilename || ''

  useEffect(() => {
    setMessageText(node.data.messageText || '')
    setCaption(node.data.mediaCaption || '')
  }, [node.data.messageText, node.data.mediaCaption])

  const loadDocs = async () => {
    setLoadingDocs(true)
    setError(null)
    try {
      const res = await fetch('/api/flows/media/documents')
      const data = await res.json()
      if (res.ok) setDocs(data.documents || [])
      else setError(data.error || 'Falha ao carregar documentos')
    } catch {
      setError('Falha ao carregar documentos')
    } finally {
      setLoadingDocs(false)
    }
  }

  useEffect(() => {
    if (!mediaUrl && source === 'base' && docs.length === 0) {
      void loadDocs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, mediaUrl])

  const setMedia = (m: MediaDoc) => {
    onUpdate({
      mediaUrl: m.url,
      mediaType: m.type,
      mediaFilename: m.filename,
      mediaMimeType: m.mimeType || '',
    })
  }

  const clearMedia = () => {
    onUpdate({ mediaUrl: '', mediaType: '', mediaFilename: '', mediaMimeType: '' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/flows/media/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setMedia(data)
      } else {
        setError(data.error || 'Falha no upload')
      }
    } catch {
      setError('Falha no upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Texto da Mensagem
        </label>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onBlur={() => onUpdate({ messageText })}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="Digite a mensagem..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
          maxLength={1024}
        />
        <p className="text-xs text-gray-500 mt-1">{messageText.length}/1024 caracteres</p>
      </div>

      {/* Attachment */}
      <div className="border-t border-gray-200 pt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Anexo (opcional)
        </label>

        {error && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
            {error}
          </div>
        )}

        {mediaUrl ? (
          // Selected attachment
          <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
            <span className="text-2xl">{mediaType === 'image' ? '🖼️' : '📄'}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{mediaFilename}</p>
              <p className="text-xs text-gray-500 capitalize">{mediaType}</p>
            </div>
            {mediaType === 'image' && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl} alt={mediaFilename} className="h-10 w-10 rounded object-cover" />
            )}
            <button
              type="button"
              onClick={clearMedia}
              className="text-xs text-red-600 hover:text-red-700 font-medium shrink-0"
            >
              Remover
            </button>
          </div>
        ) : (
          // Source picker
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSource('base')}
                className={`flex-1 py-1.5 px-3 text-sm rounded-lg border transition-colors ${
                  source === 'base'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Da base
              </button>
              <button
                type="button"
                onClick={() => setSource('upload')}
                className={`flex-1 py-1.5 px-3 text-sm rounded-lg border transition-colors ${
                  source === 'upload'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Enviar novo
              </button>
            </div>

            {source === 'base' ? (
              <div>
                {loadingDocs ? (
                  <p className="text-xs text-gray-500 py-2">Carregando documentos...</p>
                ) : docs.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">
                    Nenhum documento na base.{' '}
                    <button
                      type="button"
                      onClick={() => void loadDocs()}
                      className="text-blue-600 hover:underline"
                    >
                      Recarregar
                    </button>
                  </p>
                ) : (
                  <select
                    onChange={(e) => {
                      const doc = docs.find((d) => d.id === e.target.value)
                      if (doc) setMedia(doc)
                    }}
                    defaultValue=""
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="" disabled>
                      Escolha um documento...
                    </option>
                    {docs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.type === 'image' ? '🖼️ ' : '📄 '}
                        {d.filename}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-sm file:font-medium hover:file:bg-blue-700 disabled:opacity-50"
                />
                {uploading && <p className="text-xs text-gray-500 mt-1">Enviando...</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Imagem (até 5MB) ou documento (PDF/DOC/XLS, até 100MB). Não entra na base de
                  conhecimento.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Caption */}
        {mediaUrl && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Legenda (opcional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onBlur={() => onUpdate({ mediaCaption: caption })}
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Legenda que acompanha o anexo..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[60px]"
              maxLength={1024}
            />
          </div>
        )}
      </div>

      {/* Preview */}
      {(messageText || mediaUrl) && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-gray-600 mb-1 font-medium">Preview:</p>
          {messageText && <p className="text-sm text-gray-900 whitespace-pre-wrap">{messageText}</p>}
          {mediaUrl && (
            <p className="text-sm text-gray-700 mt-1">
              {mediaType === 'image' ? '🖼️' : '📄'} {mediaFilename}
              {caption ? ` — ${caption}` : ''}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
