'use client'

export function ShareButton() {
  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: 'Nosso DinDin', url })
    } else {
      await navigator.clipboard.writeText(url)
      alert('Link copiado!')
    }
  }

  return (
    <button
      onClick={handleShare}
      style={{
        background: 'var(--sage)', color: 'var(--ink)',
        border: 'none', borderRadius: 100,
        padding: '11px 20px', fontSize: 13, fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      Compartilhar o app →
    </button>
  )
}
