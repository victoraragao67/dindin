import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nosso DinDin',
    short_name: 'Nosso DinDin',
    description: 'Controle financeiro do casal',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F5F0E8',
    theme_color: '#7A9E7E',
    categories: ['finance', 'lifestyle'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
