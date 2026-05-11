'use client'

type Props = {
  onClick: () => void
}

export function Fab({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
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
