'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { copiarMetasMesAnterior } from '@/app/(app)/actions'

export function MetasEmptyActions({ mes, ano }: { mes: number; ano: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleCopiar() {
    setLoading(true)
    const res = await copiarMetasMesAnterior(mes, ano)
    setLoading(false)
    if (res.error) { setErro(res.error); return }
    router.refresh()
  }

  return (
    <div>
      <button
        onClick={handleCopiar}
        disabled={loading}
        style={{
          fontSize: 13, fontWeight: 600,
          padding: '10px 20px', borderRadius: 12,
          background: 'color-mix(in srgb, var(--sage) 14%, transparent)',
          color: 'var(--sage)',
          border: '1px solid color-mix(in srgb, var(--sage) 35%, transparent)',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? 'Copiando…' : '↩ Manter metas do mês anterior'}
      </button>
      {erro && (
        <p style={{ fontSize: 12, color: 'var(--coral)', marginTop: 8 }}>{erro}</p>
      )}
    </div>
  )
}
