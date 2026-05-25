'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const THRESHOLD = 80   // px para disparar o refresh
const MAX_PULL  = 110  // px máximo de arraste visual

export function PullToRefresh() {
  const router  = useRouter()
  const [pull, setPull]         = useState(0)   // distância atual do arraste (0–MAX)
  const [refreshing, setRefresh] = useState(false)
  const startY    = useRef<number | null>(null)
  const didFire   = useRef(false)

  useEffect(() => {
    function scrollTop(): number {
      // Encontra o primeiro div overflow-y-auto — container de conteúdo das pages
      const el = document.querySelector('[data-scroll-root]') as HTMLElement | null
               ?? document.querySelector('.overflow-y-auto') as HTMLElement | null
      return el?.scrollTop ?? 0
    }

    function onTouchStart(e: TouchEvent) {
      if (scrollTop() === 0) {
        startY.current = e.touches[0].clientY
        didFire.current = false
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null) return
      if (scrollTop() > 4) { startY.current = null; setPull(0); return }
      const delta = e.touches[0].clientY - startY.current
      if (delta > 0) {
        // resistência progressiva acima do threshold
        const capped = delta < THRESHOLD
          ? delta
          : THRESHOLD + (delta - THRESHOLD) * 0.25
        setPull(Math.min(capped, MAX_PULL))
      }
    }

    function onTouchEnd() {
      if (startY.current === null) return
      startY.current = null
      if (pull >= THRESHOLD && !didFire.current) {
        didFire.current = true
        setRefresh(true)
        router.refresh()
        setTimeout(() => { setRefresh(false); setPull(0) }, 1400)
      } else {
        setPull(0)
      }
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove',  onTouchMove,  { passive: true })
    document.addEventListener('touchend',   onTouchEnd,   { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove',  onTouchMove)
      document.removeEventListener('touchend',   onTouchEnd)
    }
  }, [router, pull])

  const visible  = pull > 8 || refreshing
  const progress = Math.min(pull / THRESHOLD, 1)
  const rotation = refreshing ? undefined : progress * 270

  return (
    <div
      aria-hidden="true"
      style={{
        position:  'fixed',
        top:       'calc(env(safe-area-inset-top) + 46px)',
        left:      0,
        right:     0,
        zIndex:    25,
        display:   'flex',
        justifyContent: 'center',
        alignItems:     'flex-start',
        paddingTop:      8,
        opacity:   visible ? 1 : 0,
        transform: `translateY(${Math.min(pull * 0.5, 28)}px)`,
        transition: pull === 0 ? 'opacity 0.3s, transform 0.3s' : 'none',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        width:  32,
        height: 32,
        borderRadius: '50%',
        background:   'var(--card)',
        border:       '1px solid var(--border)',
        boxShadow:    '0 2px 8px rgba(0,0,0,0.08)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        transform: refreshing
          ? undefined
          : `scale(${0.6 + progress * 0.4})`,
        transition: pull === 0 ? 'transform 0.3s' : 'none',
      }}>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="var(--coral)"
          strokeWidth="2.2"
          strokeLinecap="round"
          style={{
            transform:  refreshing ? undefined : `rotate(${rotation}deg)`,
            animation:  refreshing ? 'ptr-spin 0.8s linear infinite' : undefined,
            transition: pull === 0 ? 'transform 0.3s' : 'none',
          }}
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 .49-3.54" />
        </svg>
      </div>

      {/* keyframe inline via style tag */}
      {refreshing && (
        <style>{`
          @keyframes ptr-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      )}
    </div>
  )
}
