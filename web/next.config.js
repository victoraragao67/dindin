// Service worker via next-pwa. Desabilitado em dev (hot-reload incompatível com SW).
// Manifest servido via app/manifest.ts (Next.js nativo).
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = withPWA(nextConfig)
