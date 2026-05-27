'use client'

import { useState, useTransition } from 'react'
import { editarCategoria, toggleCategoriaAtivo, reordenarCategoria } from '../actions'

type Categoria = {
  id:    number
  nome:  string
  emoji: string
  ordem: number
  ativo: boolean
}

export function CategoriaRow({ cat }: { cat: Categoria }) {
  const [isPending, startTransition] = useTransition()
  const [editando, setEditando]      = useState(false)
  const [nome,     setNome]          = useState(cat.nome)
  const [emoji,    setEmoji]         = useState(cat.emoji)
  const [ordem,    setOrdem]         = useState(cat.ordem)
  const [error,    setError]         = useState<string | null>(null)

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    color: 'white',
    padding: '4px 8px',
    fontSize: 12,
    outline: 'none',
  } as React.CSSProperties

  function salvar() {
    const fd = new FormData()
    fd.append('nome', nome)
    fd.append('emoji', emoji)
    startTransition(async () => {
      const res = await editarCategoria(cat.id, fd)
      if (res.error) { setError(res.error); return }
      setEditando(false)
      setError(null)
    })
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '48px 60px 1fr 70px 80px 100px',
      padding: '10px 14px',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      alignItems: 'center',
      gap: 8,
      opacity: cat.ativo ? 1 : 0.45,
    }}>
      {/* Ordem */}
      <input
        type="number"
        value={ordem}
        min={1}
        style={{ ...inputStyle, width: '100%', textAlign: 'center' }}
        onChange={e => setOrdem(Number(e.target.value))}
        onBlur={() => {
          if (ordem !== cat.ordem) {
            startTransition(() => { void reordenarCategoria(cat.id, ordem) })
          }
        }}
      />

      {/* Emoji */}
      {editando ? (
        <input
          value={emoji}
          style={{ ...inputStyle, width: 48, textAlign: 'center', fontSize: 18 }}
          onChange={e => setEmoji(e.target.value)}
          maxLength={4}
        />
      ) : (
        <span style={{ fontSize: 22, textAlign: 'center', display: 'block' }}>{cat.emoji}</span>
      )}

      {/* Nome */}
      {editando ? (
        <div>
          <input
            value={nome}
            style={{ ...inputStyle, width: '100%' }}
            onChange={e => setNome(e.target.value)}
            maxLength={50}
            autoFocus
          />
          {error && (
            <div style={{ color: '#f87171', fontSize: 10, marginTop: 3 }}>{error}</div>
          )}
        </div>
      ) : (
        <span style={{ color: 'white', fontWeight: 500, fontSize: 13 }}>
          {cat.nome.charAt(0).toUpperCase() + cat.nome.slice(1)}
        </span>
      )}

      {/* Status */}
      <span style={{
        display: 'inline-block',
        padding: '3px 8px',
        borderRadius: 10,
        fontSize: 10,
        fontWeight: 700,
        color:       cat.ativo ? '#4ade80'               : '#94a3b8',
        background:  cat.ativo ? 'rgba(74,222,128,0.1)'  : 'rgba(148,163,184,0.1)',
        border:      `1px solid ${cat.ativo ? 'rgba(74,222,128,0.2)' : 'rgba(148,163,184,0.15)'}`,
        textAlign: 'center',
      }}>
        {cat.ativo ? 'Ativa' : 'Inativa'}
      </span>

      {/* Ação ativo/inativo */}
      <button
        disabled={isPending}
        onClick={() => startTransition(() => { void toggleCategoriaAtivo(cat.id, !cat.ativo) })}
        style={{
          background: cat.ativo ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)',
          color:      cat.ativo ? '#f87171'                : '#4ade80',
          border:     `1px solid ${cat.ativo ? 'rgba(248,113,113,0.2)' : 'rgba(74,222,128,0.2)'}`,
          borderRadius: 7,
          fontSize: 11,
          fontWeight: 700,
          padding: '4px 10px',
          cursor: isPending ? 'default' : 'pointer',
          opacity: isPending ? 0.5 : 1,
        }}
      >
        {cat.ativo ? 'Desativar' : 'Reativar'}
      </button>

      {/* Botão editar/salvar/cancelar */}
      {editando ? (
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={salvar}
            disabled={isPending}
            style={{
              background: 'rgba(74,222,128,0.15)',
              color: '#4ade80',
              border: '1px solid rgba(74,222,128,0.25)',
              borderRadius: 7,
              fontSize: 11,
              fontWeight: 700,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            {isPending ? '...' : 'Salvar'}
          </button>
          <button
            onClick={() => { setEditando(false); setNome(cat.nome); setEmoji(cat.emoji); setError(null) }}
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 7,
              fontSize: 11,
              padding: '4px 8px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setEditando(true)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.5)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 7,
            fontSize: 11,
            fontWeight: 600,
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          Editar
        </button>
      )}
    </div>
  )
}
