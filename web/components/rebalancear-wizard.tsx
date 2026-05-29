'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/money'
import { Toast } from '@/components/toast'
import { rebalancearRecorrentes } from '@/app/(app)/actions'

export type TemplateItem = {
  id: string
  descricao: string
  valor_centavos: number
  categoria_emoji: string
  pagador_id: string
  pagador_apelido: string
}

type Props = {
  pagaMaisApelido:   string    // apelido de quem paga a mais
  pagaMaisId:        string    // user_id de quem paga a mais
  pagaMenosApelido:  string    // apelido de quem paga menos
  pagaMenosId:       string    // user_id de quem paga menos
  totalPagaMais:     number    // total/mês de quem paga mais (centavos)
  totalPagaMenos:    number    // total/mês de quem paga menos (centavos)
  imbalanceAtual:    number    // delta atual (centavos) — sempre positivo
  templates:         TemplateItem[]   // templates de quem paga mais (selecionáveis)
}

export function RebalancearWizard({
  pagaMaisApelido,
  pagaMaisId,
  pagaMenosApelido,
  pagaMenosId,
  totalPagaMais,
  totalPagaMenos,
  imbalanceAtual,
  templates,
}: Props) {
  const router = useRouter()
  const [step,        setStep]        = useState<1 | 2 | 3>(1)
  const [selecionados, setSelecionados] = useState<string[]>([])
  const [loading,     setLoading]     = useState(false)
  const [erro,        setErro]        = useState<string | null>(null)
  const [toast,       setToast]       = useState<string | null>(null)

  // Delta em tempo real: imbalanceAtual − transferido * 2
  const novoDelta = useMemo(() => {
    const transferido = templates
      .filter(t => selecionados.includes(t.id))
      .reduce((s, t) => s + t.valor_centavos, 0)
    return imbalanceAtual - transferido * 2
  }, [selecionados, templates, imbalanceAtual])

  const templatesSelecionados = templates.filter(t => selecionados.includes(t.id))
  const totalTransferido = templatesSelecionados.reduce((s, t) => s + t.valor_centavos, 0)
  const novoTotalPagaMais  = totalPagaMais  - totalTransferido
  const novoTotalPagaMenos = totalPagaMenos + totalTransferido

  function toggleTemplate(id: string) {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleConfirmar() {
    if (selecionados.length === 0) return
    setLoading(true)
    setErro(null)

    const result = await rebalancearRecorrentes(selecionados, pagaMenosId)
    setLoading(false)

    if (result.error) {
      setErro(result.error)
      return
    }

    setToast('✅ Recorrentes atualizados!')
    setTimeout(() => router.replace('/recorrentes'), 1500)
  }

  // ── Step 1: Situação atual ─────────────────────────────────────
  if (step === 1) {
    return (
      <div className="flex flex-col flex-1 px-4 py-6 space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Passo 1 de 3 — Situação atual
          </p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Veja o desequilíbrio mensal atual dos fixos.
          </p>
        </div>

        {/* Comparação */}
        <div className="space-y-3">
          <div
            className="rounded-2xl p-4 border"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {pagaMaisApelido} paga
              </span>
              <span className="text-sm font-bold" style={{ color: 'var(--coral)' }}>
                {formatCurrency(totalPagaMais)}/mês
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                {pagaMenosApelido} paga
              </span>
              <span className="text-sm font-bold" style={{ color: 'var(--sage)' }}>
                {formatCurrency(totalPagaMenos)}/mês
              </span>
            </div>
          </div>

          <div
            className="rounded-2xl p-4 border text-center"
            style={{
              background: 'color-mix(in srgb, var(--coral) 8%, transparent)',
              borderColor: 'var(--coral)',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--muted)' }}>
              Diferença
            </p>
            <p className="text-2xl font-bold" style={{ color: 'var(--coral)' }}>
              {formatCurrency(imbalanceAtual)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {pagaMaisApelido} paga a mais por mês
            </p>
          </div>

          <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
            Para equilibrar, {pagaMenosApelido} precisa assumir mais{' '}
            <strong style={{ color: 'var(--ink)' }}>{formatCurrency(Math.round(imbalanceAtual / 2))}</strong>/mês.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setStep(2)}
            className="w-full rounded-xl font-semibold py-4 text-base transition-opacity active:opacity-70"
            style={{ background: 'var(--sage)', color: '#fff' }}
          >
            Continuar →
          </button>
        </div>
      </div>
    )
  }

  // ── Step 2: Seleção ────────────────────────────────────────────
  if (step === 2) {
    const faltaParaEquilibrar = Math.round(imbalanceAtual / 2) - totalTransferido
    const deltaLabel = (() => {
      if (novoDelta === 0) return '✅ Equilibrado!'
      if (novoDelta > 0)   return `${pagaMaisApelido} ainda paga ${formatCurrency(novoDelta)} a mais`
      return `Atenção: ${pagaMenosApelido} passaria a pagar ${formatCurrency(Math.abs(novoDelta))} a mais`
    })()
    const deltaColor = novoDelta === 0 ? 'var(--sage)' : novoDelta > 0 ? 'var(--muted)' : 'var(--coral)'

    return (
      <div className="flex flex-col flex-1 px-4 py-6 space-y-5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Passo 2 de 3 — Escolha o que transferir
          </p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            Recorrentes de <strong style={{ color: 'var(--ink)' }}>{pagaMaisApelido}</strong> — selecione para passar para {pagaMenosApelido}.
          </p>
        </div>

        {/* Lista de templates */}
        <div className="space-y-2">
          {templates.map(t => {
            const selecionado = selecionados.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleTemplate(t.id)}
                className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 border text-left transition-all active:opacity-70"
                style={{
                  background: selecionado ? 'color-mix(in srgb, var(--sage) 12%, transparent)' : 'var(--card)',
                  borderColor: selecionado ? 'var(--sage)' : 'var(--border)',
                }}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center shrink-0 border-2 text-xs"
                  style={{
                    borderColor: selecionado ? 'var(--sage)' : 'var(--border)',
                    background:  selecionado ? 'var(--sage)' : 'transparent',
                    color: '#fff',
                  }}
                >
                  {selecionado ? '✓' : ''}
                </div>
                <span className="text-lg shrink-0">{t.categoria_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{t.descricao}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {formatCurrency(t.valor_centavos)}/mês
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Resumo dinâmico */}
        <div
          className="rounded-xl px-4 py-3 space-y-2 border"
          style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Transferidos</span>
            <span className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
              {formatCurrency(totalTransferido)}
            </span>
          </div>
          {faltaParaEquilibrar > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: 'var(--muted)' }}>Falta para equilibrar</span>
              <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                {formatCurrency(faltaParaEquilibrar)}
              </span>
            </div>
          )}
          <div className="pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs font-semibold text-center" style={{ color: deltaColor }}>
              {deltaLabel}
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setStep(1)}
            className="flex-1 rounded-xl font-medium py-3.5 text-sm transition-opacity active:opacity-70"
            style={{ background: 'var(--bg-2)', color: 'var(--ink)' }}
          >
            ← Voltar
          </button>
          <button
            onClick={() => setStep(3)}
            disabled={selecionados.length === 0}
            className="flex-1 rounded-xl font-semibold py-3.5 text-sm transition-opacity active:opacity-70 disabled:cursor-not-allowed"
            style={{
              background: selecionados.length > 0 ? 'var(--sage)' : 'var(--bg-2)',
              color:      selecionados.length > 0 ? '#fff' : 'var(--muted)',
            }}
          >
            Aplicar →
          </button>
        </div>
      </div>
    )
  }

  // ── Step 3: Confirmação ────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 px-4 py-6 space-y-5">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Passo 3 de 3 — Confirmação
        </p>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          Revise as mudanças antes de confirmar.
        </p>
      </div>

      {/* O que vai mudar */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="px-4 py-3 border-b" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
            Passam para {pagaMenosApelido}
          </p>
        </div>
        {templatesSelecionados.map(t => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <span className="text-lg">{t.categoria_emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{t.descricao}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{formatCurrency(t.valor_centavos)}/mês</p>
            </div>
          </div>
        ))}
      </div>

      {/* Resultado após mudança */}
      <div className="rounded-2xl p-4 border space-y-2" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--muted)' }}>
          Após a mudança
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--muted)' }}>{pagaMaisApelido}</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {formatCurrency(novoTotalPagaMais)}/mês
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--muted)' }}>{pagaMenosApelido}</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {formatCurrency(novoTotalPagaMenos)}/mês
          </span>
        </div>
        {Math.abs(novoDelta) > 0 && (
          <div className="pt-1 border-t text-xs text-center" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            Diferença restante: {formatCurrency(Math.abs(novoDelta))}
            {Math.abs(novoDelta) > 0 && ' — você pode ajustar mais depois.'}
          </div>
        )}
      </div>

      {erro && <p className="text-sm" style={{ color: 'var(--coral)' }}>{erro}</p>}

      <div className="flex gap-2 pt-2">
        <button
          onClick={() => setStep(2)}
          className="flex-1 rounded-xl font-medium py-3.5 text-sm transition-opacity active:opacity-70"
          style={{ background: 'var(--bg-2)', color: 'var(--ink)' }}
        >
          ← Voltar
        </button>
        <button
          onClick={handleConfirmar}
          disabled={loading}
          className="flex-1 rounded-xl font-semibold py-3.5 text-sm transition-opacity active:opacity-70 disabled:cursor-not-allowed"
          style={{ background: loading ? 'var(--bg-2)' : 'var(--sage)', color: loading ? 'var(--muted)' : '#fff' }}
        >
          {loading ? 'Salvando…' : 'Confirmar mudanças'}
        </button>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
