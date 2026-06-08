import type { Metadata, Viewport } from 'next'
import { Fraunces, DM_Sans } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
})

export const viewport: Viewport = {
  themeColor: '#F5F0E8',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: { default: 'Nosso DinDin', template: '%s · Nosso DinDin' },
  description: 'Controle financeiro do casal',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nosso DinDin',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
