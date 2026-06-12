'use client'

type Props = {
  onClick: () => void
}

export function Fab({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label="Novo gasto"
      style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom) + 16px)',
        right: '1.5rem',
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '3.5rem',
        height: '3.5rem',
        borderRadius: '9999px',
        background: 'var(--coral)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
        color: '#fff',
        fontSize: '1.875rem',
        fontWeight: 300,
        transition: 'opacity 0.2s',
      }}
    >
      +
    </button>
  )
}
