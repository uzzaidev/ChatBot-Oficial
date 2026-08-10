import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { DeepLinkingProvider } from '@/components/DeepLinkingProvider'
import { PushNotificationsProvider } from '@/components/PushNotificationsProvider'
import { NotificationManager } from '@/components/NotificationManager'
import { ThemeProvider } from '@/components/ThemeProvider'
import { MobileViewportProvider } from '@/components/MobileViewportProvider'
import { NativeNetworkBanner } from '@/components/NativeNetworkBanner'

// Fontes UZZ.AI — self-hosted via @fontsource (next/font/local) em vez de
// next/font/google. next/font/google baixa os arquivos da CDN do Google
// DURANTE o build; se essa rede falhar (aconteceu em build de produção no
// Vercel), o build inteiro quebra. Local elimina essa dependência de rede.
const poppins = localFont({
  src: [
    { path: '../../node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../node_modules/@fontsource/poppins/files/poppins-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-poppins',
  display: 'swap',
})

const inter = localFont({
  src: [
    { path: '../../node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
})

const exo2 = localFont({
  src: [
    { path: '../../node_modules/@fontsource/exo-2/files/exo-2-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../../node_modules/@fontsource/exo-2/files/exo-2-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-exo2',
  display: 'swap',
})

const firaCode = localFont({
  src: [
    { path: '../../node_modules/@fontsource/fira-code/files/fira-code-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../../node_modules/@fontsource/fira-code/files/fira-code-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../../node_modules/@fontsource/fira-code/files/fira-code-latin-600-normal.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-fira-code',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'UzzApp - WhatsApp Dashboard',
  description: 'Dashboard para gerenciamento de conversas WhatsApp',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
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
    <html lang="pt-BR" suppressHydrationWarning className={`${poppins.variable} ${inter.variable} ${exo2.variable} ${firaCode.variable}`}>
      <head>
        {/* Fallback link for browsers that don't read metadata.icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="application-name" content="UzzApp" />
        <meta name="apple-mobile-web-app-title" content="UzzApp" />
        {/* If you prefer an ICO file, place it at /public/favicon.ico and the browser will pick it up */}
      </head>
      <body className="font-inter">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          themes={['dark', 'light']}
          storageKey="uzzapp-theme"
        >
          <MobileViewportProvider>
            <DeepLinkingProvider>
              <PushNotificationsProvider>
                <NotificationManager enabled={true} />
                <NativeNetworkBanner />
                {children}
              </PushNotificationsProvider>
            </DeepLinkingProvider>
          </MobileViewportProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
