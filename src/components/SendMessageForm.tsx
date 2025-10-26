'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const MAX_TEXTAREA_HEIGHT = 120 // Maximum height for textarea expansion (about 5 lines)
const MIN_TEXTAREA_HEIGHT = 40 // Minimum height for textarea

interface SendMessageFormProps {
  phone: string
  clientId: string
  onMessageSent?: () => void
}

export const SendMessageForm = ({
  phone,
  clientId,
  onMessageSent,
}: SendMessageFormProps) => {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-expand textarea like WhatsApp
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)
      textarea.style.height = `${newHeight}px`
    }
  }, [content])

  const handleSendMessage = async () => {
    if (!content.trim()) {
      toast({
        title: 'Atenção',
        description: 'Digite uma mensagem antes de enviar',
        variant: 'destructive',
      })
      return
    }

    try {
      setSending(true)

      const response = await fetch('/api/commands/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          content: content.trim(),
          client_id: clientId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao enviar mensagem')
      }

      toast({
        title: 'Sucesso',
        description: 'Mensagem enviada com sucesso',
      })

      setContent('')

      if (onMessageSent) {
        onMessageSent()
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex items-end gap-2 bg-white rounded-lg p-2">
      <textarea
        ref={textareaRef}
        placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={sending}
        className="flex-1 resize-none border-0 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-0 rounded-lg max-h-[120px] min-h-[40px]"
        rows={1}
      />

      <Button
        onClick={handleSendMessage}
        disabled={sending || !content.trim()}
        size="icon"
        className="h-10 w-10 rounded-full flex-shrink-0"
      >
        <Send className="h-4 w-4" />
      </Button>
    </div>
  )
}
