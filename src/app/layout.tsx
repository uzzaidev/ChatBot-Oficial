import type { Metadata } from 'next'
// import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { DeepLinkingProvider } from '@/components/DeepLinkingProvider'
import { PushNotificationsProvider } from '@/components/PushNotificationsProvider'
import { NotificationManager } from '@/components/NotificationManager'

// const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'UzzApp - WhatsApp Dashboard',
  description: 'Dashboard para gerenciamento de conversas WhatsApp',
  icons: {
    icon: '/favcon.ico',
    shortcut: '/favcon.ico',
    apple: '/favcon.ico',
  },
}

export const viewport = {
  width: 'device-width' as const,
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover' as const,
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="UzzApp" />
        <meta name="apple-mobile-web-app-title" content="UzzApp" />
        {/* If you prefer an ICO file, place it at /public/favicon.ico and the browser will pick it up */}
      </head>
      <body>
        <DeepLinkingProvider>
          <PushNotificationsProvider>
            <NotificationManager enabled={true} />
            {children}
          </PushNotificationsProvider>
        </DeepLinkingProvider>
        <Toaster />
      </body>
    </html>
  )
}
