'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const THRESHOLD = 80
const MAX_PULL  = 110

export function PullToRefresh() {
  const router = useRouter()

  // State apenas para renderização
  const [pullPx, setPullPx]       = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  // Refs para lógica dos handlers (sem stale closure)
  const pullRef    = useRef(0)      // espelho de pullPx, sempre atual
  const startY     = useRef<number | null>(null)
  const didFire    = useRef(false)
  const isRefRef   = useRef(false)  // espelho de refreshing

  useEffect(() => {
    function scrollTop(): number {
      const el =
        (document.querySelector('[data-scroll-root]') as HTMLElement | null) ??
        (document.querySelector('.overflow-y-auto') as HTMLElement | null)
      return el?.scrollTop ?? 0
    }

    function onTouchStart(e: TouchEvent) {
      if (scrollTop() === 0) {
        startY.current = e.touches[0].clientY
        didFire.current = false
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null || isRefRef.current) return
      if (scrollTop() > 4) {
        startY.current = null
        pullRef.current = 0
        setPullPx(0)
        return
      }
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0) {
        const capped =
          delta < THRESHOLD
            ? delta
            : THRESHOLD + (delta - THRESHOLD) * 0.25
        const val = Math.min(capped, MAX_PULL)
        pullRef.current = val
        setPullPx(val)
      }
    }

    function onTouchEnd() {
      if (startY.current === null) return
      startY.current = null

      if (pullRef.current >= THRESHOLD && !didFire.current && !isRefRef.current) {
        didFire.current = true
        isRefRef.current = true
        setRefreshing(true)
        router.refresh()
        setTimeout(() => {
          isRefRef.current = false
          pullRef.current = 0
          setRefreshing(false)
          setPullPx(0)
        }, 1400)
      } else {
        pullRef.current = 0
        setPullPx(0)
      }
    }

    // Registra uma única vez — sem pull na dep array
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove',  onTouchMove,  { passive: true })
    document.addEventListener('touchend',   onTouchEnd,   { passive: true })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchend',   onTouchEnd)
    }
  }, [router]) // ← sem `pull` aqui; refs garantem valores sempre frescos

  const visible  = pullPx > 6 || refreshing
  const progress = Math.min(pullPx / THRESHOLD, 1)

  // Não monta nada no DOM enquanto não houver gesto
  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position:       'fixed',
        top:            'calc(env(safe-area-inset-top) + 44px)',
        left:           0,
        right:          0,
        zIndex:         29,
        display:        'flex',
        justifyContent: 'center',
        paddingTop:     6,
        opacity:        visible ? 1 : 0,
        transform:      `translateY(${Math.min(pullPx * 0.4, 20)}px)`,
        transition:     'none',
        pointerEvents:  'none',
      }}
    >
      <div style={{
        width:          30,
        height:         30,
        borderRadius:   '50%',
        background:     'var(--card)',
        border:         '1px solid var(--border)',
        boxShadow:      '0 2px 8px rgba(0,0,0,0.10)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        transform:      refreshing ? undefined : `scale(${0.55 + progress * 0.45})`,
      }}>
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="var(--coral)"
          strokeWidth="2.4"
          strokeLinecap="round"
          style={{
            transform:  refreshing ? undefined : `rotate(${progress * 270}deg)`,
            animation:  refreshing ? 'ptr-spin 0.75s linear infinite' : undefined,
          }}
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 .49-3.54" />
        </svg>
      </div>

      {refreshing && (
        <style>{`@keyframes ptr-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      )}
    </div>
  )
}
