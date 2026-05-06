// next-pwa é ativado em F1-03 (service worker).
// Por ora apenas instalado como dependência; manifest servido via app/manifest.ts.
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: true, // Ativado em F1-03
})

/** @type {import('next').NextConfig} */
const nextConfig = {}

module.exports = withPWA(nextConfig)
