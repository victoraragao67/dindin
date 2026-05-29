'use client'

import { useState } from 'react'

interface InfoTooltipProps {
  titulo:      string
  explicacao:  string
  formula?:    string  // ex: "R$ 821,97 − R$ 977,10 = R$ 155,13"
}

/**
 * Ponto de interrogação que abre um bottom sheet com explicação
 * em linguagem humana de qualquer número financeiro do app.
 */
export function InfoTooltip({ titulo, explicacao, formula }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        aria-label="Entender este número"
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          justifyContent: 'center',
          width:          18,
          height:         18,
          borderRadius:   '50%',
          border:         '1px solid var(--border)',
          background:     'var(--bg-2)',
          fontSize:       10,
          fontWeight:     600,
          color:          'var(--muted)',
          cursor:         'pointer',
          flexShrink:     0,
          lineHeight:     1,
        }}
      >
        ?
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position:   'fixed',
              inset:       0,
              zIndex:      60,
              background: 'rgba(0,0,0,0.35)',
            }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom sheet */}
          <div
            style={{
              position:   'fixed',
              bottom:      0,
              left:        0,
              right:       0,
              zIndex:      61,
              background: 'var(--card)',
              borderRadius: '24px 24px 0 0',
              padding:    '8px 20px calc(env(safe-area-inset-bottom) + 28px)',
              boxShadow:  '0 -4px 24px rgba(0,0,0,0.12)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 12 }}>
              {titulo}
            </h3>

            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: formula ? 16 : 0 }}>
              {explicacao}
            </p>

            {formula && (
              <div style={{
                background:   'var(--bg-2)',
                border:       '1px solid var(--border)',
                borderRadius: 12,
                padding:      '10px 14px',
                fontFamily:   'monospace',
                fontSize:     13,
                color:        'var(--ink)',
              }}>
                {formula}
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
