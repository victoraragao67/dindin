'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Drawer } from 'vaul'
import { createClient } from '@/lib/supabase/client'

/* ── Ações primárias — cards elevados ─────────────────────── */
const PRIMARY_ACTIONS = [
  {
    href:   '/acerto',
    emoji:  '💚',
    label:  'Acerto via PIX',
    sub:    'Registrar transferência entre vocês',
    iconBg: 'color-mix(in srgb, var(--sage) 18%, transparent)',
  },
  {
    href:   '/recorrentes',
    emoji:  '🔄',
    label:  'Recorrentes',
    sub:    'Aluguel, assinaturas e fixos',
    iconBg: 'color-mix(in srgb, var(--coral) 14%, transparent)',
  },
]

/* ── Itens secundários — linha discreta ───────────────────── */
const SECONDARY_ITEMS = [
  { href: '/resumo',            emoji: '📊', label: 'Resumo'        },
  { href: '/metas',             emoji: '🎯', label: 'Metas'         },
  { href: '/config/categorias', emoji: '🏷️', label: 'Categorias'    },
  { href: '/config',            emoji: '⚙️', label: 'Configurações' },
]

export function MenuSheet({
  nomeCasal = null,
  apelidos  = null,
}: {
  nomeCasal?: string | null
  apelidos?:  [string, string] | null
} = {}) {
  const [open, setOpen]               = useState(false)
  const [confirmSair, setConfirmSair] = useState(false)
  const [loading, setLoading]         = useState(false)
  const router = useRouter()

  const membros     = apelidos ? apelidos.join(' & ') : null
  const displayName = nomeCasal || membros || 'Nosso DinDin'

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

          {/* Cabeçalho — identidade do casal (toque p/ nomear) + fechar */}
          <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-4">
            <Link
              href="/config/casal"
              onClick={handleClose}
              className="flex items-center gap-3 flex-1 min-w-0 transition-opacity active:opacity-70"
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0"
                style={{ background: 'color-mix(in srgb, var(--sage) 16%, transparent)' }}
              >
                💑
              </div>
              <div className="min-w-0">
                <span
                  className="block text-[10px] font-semibold tracking-widest uppercase"
                  style={{ color: 'var(--muted)' }}
                >
                  Nosso DinDin
                </span>
                <Drawer.Title asChild>
                  <span
                    className="block text-lg font-bold leading-tight truncate"
                    style={{ fontFamily: 'Georgia, serif', color: 'var(--ink)' }}
                  >
                    {displayName}
                  </span>
                </Drawer.Title>
                {nomeCasal
                  ? membros && (
                      <span className="block text-xs truncate" style={{ color: 'var(--muted)' }}>
                        {membros}
                      </span>
                    )
                  : (
                      <span className="block text-xs font-medium" style={{ color: 'var(--sage)' }}>
                        Toque para dar um nome ao casal ›
                      </span>
                    )}
              </div>
            </Link>

            <button
              onClick={handleClose}
              aria-label="Fechar menu"
              className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-opacity active:opacity-70"
              style={{ background: 'var(--bg-2)', color: 'var(--muted)' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Seção: ações rápidas */}
          <div className="px-4">
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--muted)' }}
            >
              Ações rápidas
            </p>
            <div className="flex flex-col gap-2.5">
              {PRIMARY_ACTIONS.map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  onClick={handleClose}
                  className="flex items-center gap-3 p-3.5 rounded-xl border transition-opacity active:opacity-70"
                  style={{
                    background:  'var(--card)',
                    borderColor: 'var(--border)',
                    boxShadow:   '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: action.iconBg }}
                  >
                    {action.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {action.label}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                      {action.sub}
                    </p>
                  </div>
                  <span className="text-xs shrink-0" style={{ color: 'var(--muted)' }}>›</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Separador */}
          <div className="mx-5 my-3 border-t" style={{ borderColor: 'var(--border)' }} />

          {/* Seção: itens secundários */}
          <div className="px-3">
            {SECONDARY_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleClose}
                className="flex items-center gap-3 px-3 py-3 rounded-xl transition-opacity active:opacity-70 min-h-[44px]"
              >
                <span className="text-lg w-7 shrink-0">{item.emoji}</span>
                <span className="text-sm flex-1" style={{ color: 'var(--muted)' }}>{item.label}</span>
                <span className="text-xs" style={{ color: 'var(--muted)' }}>›</span>
              </Link>
            ))}
          </div>

          {/* Separador */}
          <div className="mx-5 my-1 border-t" style={{ borderColor: 'var(--border)' }} />

          {/* Sair — mantém lógica de confirmação */}
          <div className="px-3 pb-4 pt-1">
            {!confirmSair ? (
              <button
                onClick={() => setConfirmSair(true)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-opacity active:opacity-70 min-h-[44px]"
              >
                <span className="text-lg w-7 shrink-0">🚪</span>
                <span className="text-sm flex-1 text-left" style={{ color: 'var(--coral)' }}>Sair</span>
              </button>
            ) : (
              <div
                className="mt-1 rounded-xl px-4 py-4 space-y-3 border"
                style={{
                  background:  'color-mix(in srgb, var(--coral) 8%, transparent)',
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
