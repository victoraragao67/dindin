'use client'

/**
 * FAB — Floating Action Button.
 * Inerte neste card (F1-05). O modal de novo gasto vem no F1-06.
 */
export function Fab() {
  return (
    <button
      onClick={() => console.log('FAB clicado')}
      aria-label="Novo gasto"
      className="
        fixed bottom-6 right-6 z-50
        flex items-center justify-center
        w-14 h-14 rounded-full
        bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700
        shadow-lg shadow-black/40
        text-white text-3xl font-light
        transition-colors
      "
    >
      +
    </button>
  )
}
