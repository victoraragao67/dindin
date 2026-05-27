'use client'

import { useState, useTransition, useRef } from 'react'
import { criarCategoria } from '../actions'

export function NovaCategoriaForm() {
  const [isPending, startTransition] = useTransition()
  const [error,     setError]        = useState<string | null>(null)
  const [sucesso,   setSucesso]      = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: 'white',
    padding: '8px 12px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  } as React.CSSProperties

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSucesso(false)
    const fd = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await criarCategoria(fd)
      if (res.error) {
        setError(res.error)
        return
      }
      setSucesso(true)
      formRef.current?.reset()
      setTimeout(() => setSucesso(false), 2000)
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div style={{ flex: '0 0 70px' }}>
        <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>EMOJI</label>
        <input
          name="emoji"
          placeholder="🛒"
          required
          maxLength={4}
          style={{ ...inputStyle, textAlign: 'center', fontSize: 20 }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>NOME</label>
        <input
          name="nome"
          placeholder="Ex: Educação"
          required
          maxLength={50}
          style={inputStyle}
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={isPending}
          style={{
            background: isPending ? 'rgba(200,92,48,0.3)' : '#C85C30',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 700,
            padding: '8px 18px',
            cursor: isPending ? 'default' : 'pointer',
            height: 38,
          }}
        >
          {isPending ? 'Criando...' : '+ Criar'}
        </button>
      </div>
      {error   && <div style={{ width: '100%', color: '#f87171',  fontSize: 12 }}>❌ {error}</div>}
      {sucesso && <div style={{ width: '100%', color: '#4ade80', fontSize: 12 }}>✅ Categoria criada com sucesso!</div>}
    </form>
  )
}
