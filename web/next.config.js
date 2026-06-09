// Service worker via next-pwa. Desabilitado em dev (hot-reload incompatível com SW).
// Manifest servido via app/manifest.ts (Next.js nativo).
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',

  // Desabilita o precaching de todos os assets estáticos do Next.js.
  // Sem precaching, o SW instala em milissegundos em vez de aguardar
  // ~40 requests de chunks JS/CSS (que podiam levar 30s+ em 4G fraco),
  // o que estava causando o sw-timeout na inscrição de push.
  // O app continua funcional: assets são carregados normalmente pela rede.
  buildExcludes: [/.*/],

  // Cache em runtime apenas para a API do Supabase — NetworkFirst com
  // fallback para cache em caso de timeout (útil em 4G instável).
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
