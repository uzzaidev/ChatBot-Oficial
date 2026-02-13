'use client'

/**
 * Connect WhatsApp Button
 *
 * Triggers Meta OAuth Embedded Signup flow
 * User clicks → redirects to Meta → authorizes → auto-provisions client
 */

import { Button } from '@/components/ui/button'
import { MessageSquare, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface ConnectWhatsAppButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  children?: React.ReactNode
}

export const ConnectWhatsAppButton = ({
  variant = 'default',
  size = 'lg',
  className = '',
  children,
}: ConnectWhatsAppButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleConnect = () => {
    setIsLoading(true)

    // Redirect to OAuth init endpoint
    window.location.href = '/api/auth/meta/init'
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Conectando...
        </>
      ) : (
        <>
          <MessageSquare className="mr-2 h-4 w-4" />
          {children || 'Conectar WhatsApp Business'}
        </>
      )}
    </Button>
  )
}
