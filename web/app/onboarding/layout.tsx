import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Configurar casal — Nosso DinDin' }

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'var(--bg, #fff)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  )
}
