'use client'

import { useEffect } from 'react'

type ToastProps = {
  message: string
  onDismiss: () => void
}

export function Toast({ message, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      role="status"
      aria-live="polite"
      className="
        fixed top-4 left-4 right-4 z-[60]
        rounded-xl bg-slate-700 border border-slate-600
        px-4 py-3 shadow-xl
        text-white text-sm
        animate-[fadeSlideDown_0.2s_ease-out]
      "
    >
      {message}
    </div>
  )
}
