# Handoff F1-03 — Configuração PWA (manifest + service worker)

> **Para o Claude Code:** card F1-03 destravado. F1-01 ✅ e banco pronto. Não depende de auth — pode rodar em paralelo com F1-04.

---

## Objetivo

Transformar o Next.js atual num PWA instalável no celular, com ícone customizado, splash screen e suporte offline básico. Ao final, o DinDin deve aparecer como um app na tela inicial do iOS e Android — não como aba do navegador.

---

## O que entregar

### 1. Instalar e configurar `next-pwa`

```bash
pnpm --filter web add next-pwa
pnpm --filter web add -D @types/next-pwa
```

Configurar em `web/next.config.js`:

```js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA({
  // config do Next existente
})
```

### 2. Web App Manifest (`web/app/manifest.ts`)

```ts
import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DinDin',
    short_name: 'DinDin',
    description: 'Controle financeiro do casal',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
```

### 3. Ícones

Criar os ícones em `web/public/`:
- `icon-192.png` — 192×192px
- `icon-512.png` — 512×512px
- `apple-touch-icon.png` — 180×180px (iOS)

Design: fundo escuro (`#0f172a`), emoji 💰 centralizado em branco. Simples e legível na tela inicial.

Adicionar no `web/app/layout.tsx`:
```tsx
export const metadata: Metadata = {
  title: 'DinDin',
  description: 'Controle financeiro do casal',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DinDin',
  },
  icons: {
    apple: '/apple-touch-icon.png',
  },
}
```

### 4. Modo escuro automático

No `web/app/globals.css`, garantir suporte a `prefers-color-scheme: dark`. O fundo da tela deve ser `#0f172a` (escuro) por padrão — o DinDin é um app noturno.

### 5. Atualizar `NEXT_PUBLIC_APP_URL` no `.env.example`

```
NEXT_PUBLIC_APP_URL=https://dindin-web-virid.vercel.app
```

---

## Definition of Done

- [ ] `next-pwa` instalado e configurado; build sem erros
- [ ] Manifest acessível em `/manifest.webmanifest`
- [ ] Ícones presentes em `public/` (192, 512, apple-touch-icon)
- [ ] Em Android Chrome: banner "Adicionar à tela inicial" aparece ou instalação manual funciona
- [ ] Em iOS Safari: "Adicionar à tela inicial" funciona e mostra ícone correto
- [ ] Splash screen com fundo `#0f172a` (sem tela branca no carregamento)
- [ ] Lighthouse PWA score ≥ 90 (rodar em `dindin-web-virid.vercel.app` após deploy)
- [ ] Build do Vercel verde após merge
- [ ] PR com smoke test: prints do ícone instalado em iOS ou Android + score do Lighthouse

---

## Avisos

- Testar **no celular real**, não só no DevTools do Chrome — comportamento de instalação difere bastante.
- Em iOS, o PWA só funciona bem se aberto via Safari — orientar a Gaia sobre isso no onboarding (F1-13).
- Service worker em modo dev está desabilitado (`disable: process.env.NODE_ENV === 'development'`) — testar sempre no deploy do Vercel.
- Não implementar offline sync agora — cache básico do shell é suficiente para o F1-03.

---

## Próximo card após merge

F1-04 — Auth magic link (se ainda não estiver em andamento em paralelo).
