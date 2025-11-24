import type { Metadata } from 'next'
// import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { DeepLinkingProvider } from '@/components/DeepLinkingProvider'
import { PushNotificationsProvider } from '@/components/PushNotificationsProvider'

// const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ChatBot Dashboard - WhatsApp SaaS',
  description: 'Dashboard para gerenciamento de conversas WhatsApp',
  icons: {
    icon: '/favcon.ico',
    shortcut: '/favcon.ico',
    apple: '/favcon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Fallback link for browsers that don't read metadata.icons */}
        <link rel="icon" href="/favcon.ico" />
        <link rel="shortcut icon" href="/favcon.ico" />
        {/* If you prefer an ICO file, place it at /public/favicon.ico and the browser will pick it up */}
      </head>
      <body>
        <DeepLinkingProvider>
          <PushNotificationsProvider>
            {children}
          </PushNotificationsProvider>
        </DeepLinkingProvider>
        <Toaster />
      </body>
    </html>
  )
}
