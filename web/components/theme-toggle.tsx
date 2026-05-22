'use client'

import { useTransition } from 'react'
import { useTheme } from '@/components/theme-provider'
import { updateTema } from '@/app/(app)/actions'

type Props = {
  temaAtual: 'light' | 'dark'
}

export function ThemeToggle({ temaAtual }: Props) {
  const { tema, setTema } = useTheme()
  const [isPending, startTransition] = useTransition()

  // Use server value as fallback before client hydrates
  const current = tema ?? temaAtual

  function handleChange(novoTema: 'light' | 'dark') {
    if (novoTema === current) return
    // Optimistic update
    setTema(novoTema)
    startTransition(async () => {
      await updateTema(novoTema)
    })
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
        Tema do app
      </span>
      <div
        className="flex rounded-lg overflow-hidden border"
        style={{ borderColor: 'var(--border)' }}
      >
        {(['light', 'dark'] as const).map(t => (
          <button
            key={t}
            onClick={() => handleChange(t)}
            disabled={isPending}
            className="px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60"
            style={{
              background: current === t ? 'var(--coral)' : 'var(--bg-2)',
              color: current === t ? '#fff' : 'var(--muted)',
            }}
          >
            {t === 'light' ? '☀️ Claro' : '🌙 Escuro'}
          </button>
        ))}
      </div>
    </div>
  )
}
