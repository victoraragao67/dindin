// Service worker via next-pwa. Desabilitado em dev (hot-reload incompatível com SW).
// Manifest servido via app/manifest.ts (Next.js nativo).
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',

  // Exclui push-sw.js do precaching — ele é um SW standalone registrado
  // em /push-handler/ e não deve ser tratado como asset a ser cacheado.
  buildExcludes: [/push-sw\.js$/],

  // Cache em runtime para a API do Supabase — NetworkFirst com fallback
  // para cache em caso de timeout (útil em 4G instável).
  runtimeCaching: [
    {
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
