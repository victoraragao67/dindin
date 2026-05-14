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
  const [open, setOpen]             = useState(false)
  const [confirmSair, setConfirmSair] = useState(false)
  const [loading, setLoading]       = useState(false)
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
      {/* Botão hambúrguer — touch target 48×48px */}
      <Drawer.Trigger asChild>
        <button
          aria-label="Abrir menu"
          className="inline-flex items-center justify-center w-12 h-12 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 active:bg-white/10 transition-colors"
        >
          <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true">
            <rect y="0"  width="22" height="2" rx="1" fill="currentColor"/>
            <rect y="7"  width="22" height="2" rx="1" fill="currentColor"/>
            <rect y="14" width="22" height="2" rx="1" fill="currentColor"/>
          </svg>
        </button>
      </Drawer.Trigger>

      <Drawer.Portal>
        {/* Overlay escuro */}
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60" />

        {/* Sheet */}
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl bg-slate-900 border-t border-slate-700 outline-none"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-600" />
          </div>

          {/* Título */}
          <Drawer.Title className="px-5 pt-2 pb-3 text-white font-semibold text-base">
            Menu
          </Drawer.Title>

          {/* Itens primários */}
          <nav className="px-3">
            {MENU_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleClose}
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-slate-800 active:bg-slate-700 transition-colors min-h-[48px]"
              >
                <span className="text-xl w-7 shrink-0">{item.emoji}</span>
                <span className="text-white text-sm font-medium flex-1">{item.label}</span>
                <span className="text-slate-500 text-xs">›</span>
              </Link>
            ))}
          </nav>

          {/* Separador */}
          <div className="mx-5 my-2 border-t border-slate-700/60" />

          {/* Itens de conta */}
          <div className="px-3 pb-4">
            <Link
              href="/config"
              onClick={handleClose}
              className="flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-slate-800 active:bg-slate-700 transition-colors min-h-[48px]"
            >
              <span className="text-xl w-7 shrink-0">⚙️</span>
              <span className="text-white text-sm font-medium flex-1">Configurações</span>
              <span className="text-slate-500 text-xs">›</span>
            </Link>

            {/* Sair — com confirmação inline */}
            {!confirmSair ? (
              <button
                onClick={() => setConfirmSair(true)}
                className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-slate-800 active:bg-slate-700 transition-colors min-h-[48px]"
              >
                <span className="text-xl w-7 shrink-0">🚪</span>
                <span className="text-red-400 text-sm font-medium flex-1 text-left">Sair</span>
              </button>
            ) : (
              <div className="mx-0 mt-1 rounded-xl bg-red-900/20 border border-red-800/40 px-4 py-4 space-y-3">
                <p className="text-red-300 text-sm text-center">Tem certeza que quer sair?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmSair(false)}
                    className="flex-1 py-2.5 rounded-lg bg-slate-700 text-slate-300 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-60 text-white text-sm font-medium transition-colors"
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
