// Service worker via next-pwa. Desabilitado em dev (hot-reload incompatível com SW).
// Manifest servido via app/manifest.ts (Next.js nativo).
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Inclui handlers de push/notificationclick (worker/index.js)
  runtimeCaching: [
    {
      // Supabase API — NetworkFirst: tenta rede primeiro, fallback para cache
      // em caso de timeout (útil em 4G instável). Cache dura 60s.
      urlPattern: /^https:\/\/.+\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        networkTimeoutSeconds: 3,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 },
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = withPWA(nextConfig)
