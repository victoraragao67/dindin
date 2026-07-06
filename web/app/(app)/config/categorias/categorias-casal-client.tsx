'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { criarCategoria, toggleCategoria, editarCategoria } from '@/app/(app)/actions'
import { invalidarCacheCategoria } from '@/lib/hooks/use-categorias'

type Categoria = {
  id:     number
  nome:   string
  emoji:  string
  ordem:  number
  ativo:  boolean
  padrao: boolean
}

// Ícones pré-dispostos para categorias criadas pelo casal.
// (As categorias padrão têm ícone fixo e não usam este seletor.)
const EMOJI_PALETTE = [
  '🐶', '🐱', '🐾', '🌱', '🪴', '🎓', '📚', '✏️',
  '💊', '🩺', '🏥', '🏋️', '⚽', '🎾', '🚲', '🏊',
  '🎮', '🎨', '🎵', '🎬', '🎧', '📷', '🎸', '🎯',
  '✈️', '🏨', '🏖️', '⛽', '🅿️', '🔧', '🧹', '🧴',
  '💇', '💅', '👗', '👟', '👶', '🍼', '🎁', '🎉',
  '🍽️', '☕', '🍕', '🍺', '🍷', '🛒', '🛍️', '💻',
  '📱', '💡', '💧', '🔥', '📺', '📶', '🏦', '💳',
  '💰', '📈', '🎟️', '🚿', '🧾', '🕯️', '💒', '💐',
]

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 6,
        maxHeight: 168,
        overflowY: 'auto',
        padding: 4,
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 10,
      }}
    >
      {EMOJI_PALETTE.map(emoji => {
        const selected = value === emoji
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            aria-label={`Ícone ${emoji}`}
            aria-pressed={selected}
            style={{
              fontSize: 20,
              lineHeight: 1,
              aspectRatio: '1 / 1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              cursor: 'pointer',
              background: selected
                ? 'color-mix(in srgb, var(--sage) 20%, transparent)'
                : 'var(--card)',
              border: selected
                ? '2px solid var(--sage)'
                : '1px solid var(--border)',
            }}
          >
            {emoji}
          </button>
        )
      })}
    </div>
  )
}

export function CategoriasCasalClient({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // form de nova categoria
  const [novoEmoji, setNovoEmoji] = useState('')
  const [novoNome,  setNovoNome]  = useState('')
  const [erroNova,  setErroNova]  = useState('')

  // edição inline (só categorias do casal)
  const [editId,    setEditId]    = useState<number | null>(null)
  const [editEmoji, setEditEmoji] = useState('')
  const [editNome,  setEditNome]  = useState('')
  const [erroEdit,  setErroEdit]  = useState('')

  const ativas   = categorias.filter(c => c.ativo)
  const inativas = categorias.filter(c => !c.ativo)

  function refresh() {
    invalidarCacheCategoria()
    router.refresh()
  }

  function handleCriar() {
    setErroNova('')
    startTransition(async () => {
      const res = await criarCategoria(novoNome, novoEmoji)
      if (res.error) { setErroNova(res.error); return }
      setNovoEmoji('')
      setNovoNome('')
      refresh()
    })
  }

  function handleToggle(cat: Categoria) {
    startTransition(async () => {
      const res = await toggleCategoria(cat.id, !cat.ativo)
      if (!res.error) refresh()
    })
  }

  function abrirEdicao(cat: Categoria) {
    setEditId(cat.id)
    setEditEmoji(cat.emoji)
    setEditNome(cat.nome)
    setErroEdit('')
  }

  function handleSalvarEdicao() {
    if (editId == null) return
    setErroEdit('')
    startTransition(async () => {
      const res = await editarCategoria(editId, editNome, editEmoji)
      if (res.error) { setErroEdit(res.error); return }
      setEditId(null)
      refresh()
    })
  }

  const inputBase: React.CSSProperties = {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--ink)',
    padding: '10px 12px',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  }

  function Linha({ cat }: { cat: Categoria }) {
    const emEdicao = editId === cat.id
    return (
      <div
        className="rounded-xl border"
        style={{
          background: 'var(--card)',
          borderColor: 'var(--border)',
          padding: emEdicao ? '12px 14px' : '10px 14px',
          opacity: cat.ativo ? 1 : 0.6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>{cat.emoji}</span>
          <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
            {cat.nome}
          </span>

          {!emEdicao && (
            <>
              {/* Só categorias do casal (não-padrão) podem ser editadas */}
              {!cat.padrao && (
                <button
                  onClick={() => abrirEdicao(cat)}
                  disabled={isPending}
                  style={{
                    fontSize: 12, fontWeight: 600, color: 'var(--muted)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
                  }}
                >
                  Editar
                </button>
              )}
              <button
                onClick={() => handleToggle(cat)}
                disabled={isPending}
                style={{
                  fontSize: 12, fontWeight: 700,
                  padding: '5px 12px', borderRadius: 100, cursor: 'pointer',
                  background: cat.ativo
                    ? 'color-mix(in srgb, var(--coral) 12%, transparent)'
                    : 'color-mix(in srgb, var(--sage) 14%, transparent)',
                  color: cat.ativo ? 'var(--coral)' : 'var(--sage)',
                  border: `1px solid ${cat.ativo
                    ? 'color-mix(in srgb, var(--coral) 30%, transparent)'
                    : 'color-mix(in srgb, var(--sage) 30%, transparent)'}`,
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                {cat.ativo ? 'Desativar' : 'Reativar'}
              </button>
            </>
          )}
        </div>

        {emEdicao && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              value={editNome}
              onChange={e => setEditNome(e.target.value)}
              maxLength={30}
              autoFocus
              aria-label="Nome"
              style={inputBase}
            />
            <div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>Ícone</p>
              <EmojiPicker value={editEmoji} onChange={setEditEmoji} />
            </div>
            {erroEdit && <p style={{ fontSize: 12, color: 'var(--coral)' }}>{erroEdit}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setEditId(null)}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                  background: 'var(--card)', border: '1px solid var(--border)',
                  color: 'var(--muted)', fontSize: 13,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvarEdicao}
                disabled={isPending || !editNome.trim() || !editEmoji.trim()}
                style={{
                  flex: 1, padding: '9px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'var(--sage)', color: '#fff', fontSize: 13, fontWeight: 600,
                  opacity: isPending || !editNome.trim() || !editEmoji.trim() ? 0.5 : 1,
                }}
              >
                {isPending ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Nova categoria ─────────────────────────────────── */}
      <div
        className="rounded-xl border"
        style={{ background: 'var(--card)', borderColor: 'var(--border)', padding: 14 }}
      >
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          color: 'var(--muted)', marginBottom: 10,
        }}>
          Nova categoria
        </p>

        <input
          value={novoNome}
          onChange={e => setNovoNome(e.target.value)}
          placeholder="Nome (ex: Pet)"
          maxLength={30}
          aria-label="Nome da categoria"
          style={{ ...inputBase, width: '100%', marginBottom: 10 }}
        />

        <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>
          Escolha um ícone
        </p>
        <EmojiPicker value={novoEmoji} onChange={setNovoEmoji} />

        {erroNova && <p style={{ fontSize: 12, color: 'var(--coral)', marginTop: 8 }}>{erroNova}</p>}

        <button
          onClick={handleCriar}
          disabled={isPending || !novoNome.trim() || !novoEmoji}
          style={{
            marginTop: 12, width: '100%',
            padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'var(--sage)', color: '#fff', fontSize: 14, fontWeight: 700,
            opacity: isPending || !novoNome.trim() || !novoEmoji ? 0.5 : 1,
          }}
        >
          {isPending ? 'Criando…' : `+ Criar ${novoEmoji ? novoEmoji + ' ' : ''}categoria`}
        </button>
      </div>

      {/* ── Ativas ─────────────────────────────────────────── */}
      <div>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          color: 'var(--muted)', margin: '0 2px 8px',
        }}>
          Ativas ({ativas.length})
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ativas.map(cat => <Linha key={cat.id} cat={cat} />)}
          {ativas.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--muted)', padding: '8px 2px' }}>
              Nenhuma categoria ativa. Reative alguma abaixo ou crie uma nova.
            </p>
          )}
        </div>
      </div>

      {/* ── Inativas ───────────────────────────────────────── */}
      {inativas.length > 0 && (
        <div>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
            color: 'var(--muted)', margin: '0 2px 8px',
          }}>
            Inativas ({inativas.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inativas.map(cat => <Linha key={cat.id} cat={cat} />)}
          </div>
        </div>
      )}
    </div>
  )
}
