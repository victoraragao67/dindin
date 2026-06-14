'use client'

import { useState, useTransition } from 'react'
import { atualizarNotificacaoHora } from './actions'

export function NotificacaoHoraSelect({ casalId, horaAtual }: { casalId: string; horaAtual: number }) {
  const [hora, setHora]     = useState(horaAtual)
  const [pending, start]    = useTransition()
  const [salvo, setSalvo]   = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const h = Number(e.target.value)
    setHora(h)
    start(async () => {
      await atualizarNotificacaoHora(casalId, h)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 2000)
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <select
        value={hora}
        onChange={handleChange}
        disabled={pending}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 6,
          color: 'white',
          fontSize: 11,
          padding: '2px 6px',
          cursor: pending ? 'wait' : 'pointer',
          opacity: pending ? 0.6 : 1,
        }}
      >
        {Array.from({ length: 24 }, (_, i) => (
          <option key={i} value={i}>{String(i).padStart(2, '0')}h</option>
        ))}
      </select>
      {salvo && <span style={{ fontSize: 10, color: '#4ade80' }}>✓</span>}
    </div>
  )
}
