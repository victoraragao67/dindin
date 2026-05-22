'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Drawer } from 'vaul'
import { createClient } from '@/lib/supabase/client'

const MENU_ITEMS = [
  { href: '/recorrentes', emoji: '🔁', label: 'Recorrentes' },
  { href: '/acerto',      emoji: '🤝', label: 'Acerto · PIX'  },
  { href: '/metas',       emoji: '🎯', label: 'Metas'         },
  { href: '/resumo',      emoji: '📊', label: 'Resumo'        },
]

export function MenuSheet() {
  const [open, setOpen]               = useState(false)
  const [confirmSair, setConfirmSair] = useState(false)
  const [loading, setLoading]         = useState(false)
  const router = useRouter()

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleClose() {
    setOpen(false)
    setConfirmSair(false)
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      {/* Botão hambúrguer */}
      <Drawer.Trigger asChild>
        <button
          aria-label="Abrir menu"
          className="inline-flex items-center justify-center w-12 h-12 -ml-2 rounded-xl transition-opacity active:opacity-70"
          style={{ color: 'var(--muted)' }}
        >
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true">
            <rect y="0"  width="22" height="2" rx="1" fill="currentColor"/>
            <rect y="7"  width="22" height="2" rx="1" fill="currentColor"/>
            <rect y="14" width="22" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60" />

        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl border-t outline-none"
          style={{
            background: 'var(--card)',
            borderColor: 'var(--border)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
          </div>

          {/* Título */}
          <Drawer.Title className="px-5 pt-2 pb-3 font-semibold text-base" style={{ color: 'var(--ink)' }}>
            Menu
          </Drawer.Title>

          {/* Itens primários */}
          <nav className="px-3">
            {MENU_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleClose}
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl transition-opacity active:opacity-70 min-h-[48px]"
              >
                <span className="text-xl w-7 shrink-0">{item.emoji}</span>
                <span className="text-sm font-medium flex-1" style={{ color: 'var(--ink)' }}>{item.label}</span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>›</span>
              </Link>
            ))}
          </nav>

          {/* Separador */}
          <div className="mx-5 my-2 border-t" style={{ borderColor: 'var(--border)' }} />

          {/* Itens de conta */}
          <div className="px-3 pb-4">
            <Link
              href="/config"
              onClick={handleClose}
              className="flex items-center gap-3 px-3 py-3.5 rounded-xl transition-opacity active:opacity-70 min-h-[48px]"
            >
              <span className="text-xl w-7 shrink-0">⚙️</span>
              <span className="text-sm font-medium flex-1" style={{ color: 'var(--ink)' }}>Configurações</span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>›</span>
            </Link>

            {!confirmSair ? (
              <button
                onClick={() => setConfirmSair(true)}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl transition-opacity active:opacity-70 min-h-[48px]"
              >
                <span className="text-xl w-7 shrink-0">🚪</span>
                <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--coral)' }}>Sair</span>
              </button>
            ) : (
              <div
                className="mt-1 rounded-xl px-4 py-4 space-y-3 border"
                style={{
                  background: 'color-mix(in srgb, var(--coral) 8%, transparent)',
                  borderColor: 'var(--coral)',
                }}
              >
                <p className="text-sm text-center" style={{ color: 'var(--ink)' }}>Tem certeza que quer sair?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmSair(false)}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity active:opacity-70"
                    style={{ background: 'var(--bg-2)', color: 'var(--ink)', border: '1px solid var(--border)' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white transition-opacity active:opacity-70 disabled:opacity-60"
                    style={{ background: 'var(--coral)' }}
                  >
                    {loading ? 'Saindo…' : 'Sair'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
