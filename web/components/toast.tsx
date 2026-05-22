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
      className="fixed top-4 left-4 right-4 z-[60] rounded-xl px-4 py-3 shadow-xl text-sm animate-[fadeSlideDown_0.2s_ease-out] border"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
        color: 'var(--ink)',
      }}
    >
      {message}
    </div>
  )
}
