'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
)

const GastosIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="16" rx="2"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
  </svg>
)

const ResumoIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
)

const MetasIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
)

export function BottomNav() {
  const pathname = usePathname()

  const tabs = [
    { href: '/',       label: 'Home',   Icon: HomeIcon   },
    { href: '/gastos', label: 'Gastos', Icon: GastosIcon },
    { href: '/resumo', label: 'Resumo', Icon: ResumoIcon },
    { href: '/metas',  label: 'Metas',  Icon: MetasIcon  },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex h-[56px]">
        {tabs.map(tab => {
          const isActive = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 transition-colors"
              style={{
                color: isActive ? 'var(--coral)' : 'var(--muted)',
                textDecoration: 'none',
                minHeight: 56,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <tab.Icon />
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400 }}>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
