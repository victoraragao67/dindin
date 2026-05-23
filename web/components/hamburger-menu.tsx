'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function HamburgerMenu() {
  const [open, setOpen] = useState(false)
  const [confirmSair, setConfirmSair] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  function close() {
    setOpen(false)
    setConfirmSair(false)
  }

  const navItems = [
    { href: '/config',      label: 'Configurações',  icon: '⚙️' },
    { href: '/recorrentes', label: 'Recorrentes',    icon: '🔄' },
    { href: '/acerto',      label: 'Acerto via PIX', icon: '💸' },
  ]

  return (
    <>
      {/* Botão ≡ */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Menu"
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
          stroke="var(--muted)" strokeWidth="1.8" strokeLinecap="round">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Overlay */}
      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            zIndex: 40,
          }}
          aria-hidden="true"
        />
      )}

      {/* Drawer da direita */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        style={{
          position: 'fixed',
          top: 0, right: 0, bottom: 0,
          width: 260,
          background: 'var(--card)',
          borderLeft: '1px solid var(--border)',
          zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        {/* Header do drawer */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: -1,
          }}>
            Din<span style={{ color: 'var(--coral)' }}>Din</span>
          </span>
          <button
            onClick={close}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 20, lineHeight: 1 }}
            aria-label="Fechar menu"
          >✕</button>
        </div>

        {/* Links de navegação */}
        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {navItems.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '16px 20px',
                color: 'var(--ink)',
                textDecoration: 'none',
                fontSize: 15,
                fontWeight: 500,
                borderBottom: i < navItems.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Sair */}
        <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--border)' }}>
          {!confirmSair ? (
            <button
              onClick={() => setConfirmSair(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '12px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                color: 'var(--coral)',
              }}
            >
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>🚪</span>
              Sair da conta
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 13, color: 'var(--ink)', textAlign: 'center', margin: 0 }}>Tem certeza?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setConfirmSair(false)}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 10,
                    background: 'var(--bg-2)', border: '1px solid var(--border)',
                    color: 'var(--ink)', fontSize: 13, cursor: 'pointer',
                  }}
                >Cancelar</button>
                <button
                  onClick={handleLogout}
                  disabled={loading}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 10,
                    background: 'var(--coral)', border: 'none',
                    color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    opacity: loading ? 0.6 : 1,
                  }}
                >{loading ? 'Saindo…' : 'Sair'}</button>
              </div>
            </div>
          )}
          <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', margin: '8px 0 0' }}>
            feito com ♥ por Vitim & Gaia
          </p>
        </div>
      </div>
    </>
  )
}
