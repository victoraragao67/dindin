'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// Anúncio dismissível: informa que o casal pode gerenciar categorias.
// Dispensado uma vez, não volta (localStorage).
const KEY = 'dindin_tip_categorias_v1'

export function HomeTipCategorias() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true)
    } catch { /* localStorage indisponível — não mostra */ }
  }, [])

  if (!show) return null

  function dismiss(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
    setShow(false)
  }

  return (
    <Link
      href="/config/categorias"
      className="flex items-center gap-3 rounded-2xl px-4 py-3 border transition-opacity active:opacity-70"
      style={{
        background: 'color-mix(in srgb, var(--sage) 10%, var(--card))',
        borderColor: 'color-mix(in srgb, var(--sage) 30%, var(--border))',
        textDecoration: 'none',
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: 'color-mix(in srgb, var(--sage) 18%, transparent)' }}
      >
        🏷️
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Categorias do seu jeito
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
          Criem novas, ativem ou desativem — toque para gerenciar
        </p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dispensar"
        className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-opacity active:opacity-60"
        style={{ background: 'var(--bg-2)', color: 'var(--muted)' }}
      >
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </Link>
  )
}
