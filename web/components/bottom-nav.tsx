'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function BottomNav() {
  const pathname = usePathname()

  const tabs = [
    { href: '/',       label: 'Home',   icon: '🏠' },
    { href: '/gastos', label: 'Gastos', icon: '📋' },
    { href: '/resumo', label: 'Resumo', icon: '📊' },
    { href: '/config', label: 'Config', icon: '⚙️' },
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
      <div className="flex items-end h-[72px]">
        {tabs.map(tab => {
          const isActive = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center justify-center h-full gap-0.5 text-xs font-medium transition-colors"
              style={{ color: isActive ? 'var(--coral)' : 'var(--muted)' }}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
