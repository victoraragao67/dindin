import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: { default: 'DinDin', template: '%s · DinDin' },
  description: 'Controle financeiro do casal — registe gastos em segundos',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DinDin',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
