'use client'

import { useState, useTransition } from 'react'
import { salvarTemplate, enviarTestePush, gerarExemploInsight } from '@/app/admin/actions'

type Props = {
  chave:      string
  descricao:  string
  variacoes:  string[]
  ativo:      boolean
  updatedAt:  string
}

const PLACEHOLDERS: Record<string, string> = {
  'risco.vai_estourar': '{emoji} {cat} {projecao} {diff} {meta}',
  'risco.estourou':     '{emoji} {cat} {meta} {gasto} {dias}',
}

const IS_LLM_TOM = (chave: string) => chave === 'ritmo.tom_llm'

export default function TemplateForm({ chave, descricao, variacoes, ativo, updatedAt }: Props) {
  const [text, setText]         = useState(variacoes.join('\n'))
  const [isAtivo, setIsAtivo]   = useState(ativo)
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState<{ ok?: string; error?: string } | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const varicoesList = text.split('\n').map(s => s.trim()).filter(Boolean)

  function handleSave() {
    setFeedback(null)
    startTransition(async () => {
      const result = await salvarTemplate(chave, varicoesList, isAtivo)
      setFeedback(result.ok ? { ok: 'Salvo!' } : { error: result.error ?? 'Erro desconhecido.' })
    })
  }

  function handleTestPush() {
    setTestResult(null)
    startTransition(async () => {
      const result = await enviarTestePush(chave)
      if (result.ok) setTestResult(`Enviado: "${result.enviado}"`)
      else setTestResult(`Erro: ${result.error}`)
    })
  }

  function handleExemplo() {
    setTestResult(null)
    const tom = text.split('\n').map(s => s.trim()).filter(Boolean)[0] ?? ''
    startTransition(async () => {
      const result = await gerarExemploInsight(tom)
      if (result.ok) setTestResult(`Gemini respondeu: "${result.resumo}"`)
      else setTestResult(`Erro: ${result.error}`)
    })
  }

  const placeholders = PLACEHOLDERS[chave]
  const isLlmTom = IS_LLM_TOM(chave)

  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      {/* Header — clicável para expandir */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: 'white', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
            background: isAtivo ? '#22c55e' : 'rgba(255,255,255,0.3)',
          }} />
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{chave}</span>
          {descricao && (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>— {descricao}</span>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
          {varicoesList.length} variação{varicoesList.length !== 1 ? 'ões' : ''} {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {placeholders && (
            <p style={{ fontSize: 11, color: '#C85C30', marginTop: 12, marginBottom: 6 }}>
              Placeholders disponíveis: <code style={{ fontFamily: 'monospace' }}>{placeholders}</code>
            </p>
          )}
          {isLlmTom && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 12, marginBottom: 6 }}>
              Texto de instrução de tom injetado no prompt do Gemini. Apenas 1 variação.
            </p>
          )}

          <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 12, marginBottom: 6 }}>
            {isLlmTom ? 'Instrução de tom' : 'Variações (uma por linha)'}
          </label>
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setFeedback(null) }}
            rows={isLlmTom ? 5 : Math.max(3, varicoesList.length + 1)}
            style={{
              width: '100%', background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6, color: 'white', fontSize: 13, padding: '10px 12px',
              resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            {/* Toggle ativo */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={isAtivo}
                onChange={e => setIsAtivo(e.target.checked)}
                style={{ accentColor: '#22c55e' }}
              />
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>Ativo</span>
            </label>

            {/* Salvar */}
            <button
              onClick={handleSave}
              disabled={isPending || varicoesList.length === 0}
              style={{
                background: '#C85C30', color: 'white', border: 'none',
                borderRadius: 6, padding: '6px 16px', fontSize: 13, fontWeight: 600,
                cursor: isPending || varicoesList.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isPending || varicoesList.length === 0 ? 0.5 : 1,
              }}
            >
              {isPending ? 'Salvando…' : 'Salvar'}
            </button>

            {/* Enviar teste push (não mostra para ritmo.tom_llm) */}
            {!isLlmTom && (
              <button
                onClick={handleTestPush}
                disabled={isPending}
                style={{
                  background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6, padding: '6px 14px', fontSize: 13,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                Enviar teste pra mim
              </button>
            )}

            {/* Gerar exemplo insight (só para ritmo.tom_llm) */}
            {isLlmTom && (
              <button
                onClick={handleExemplo}
                disabled={isPending}
                style={{
                  background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 6, padding: '6px 14px', fontSize: 13,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                Gerar exemplo com Gemini
              </button>
            )}

            {/* Feedback de save */}
            {feedback?.ok && (
              <span style={{ fontSize: 13, color: '#22c55e' }}>{feedback.ok}</span>
            )}
            {feedback?.error && (
              <span style={{ fontSize: 13, color: '#f87171' }}>{feedback.error}</span>
            )}
          </div>

          {/* Resultado do teste */}
          {testResult && (
            <div style={{
              marginTop: 12, background: '#0f172a', borderRadius: 6,
              padding: '10px 12px', fontSize: 12, color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {testResult}
            </div>
          )}

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 10 }}>
            Última atualização: {new Date(updatedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
          </p>
        </div>
      )}
    </div>
  )
}
