'use client'

/**
 * Onboarding de 4 telas — exibido apenas no primeiro acesso.
 * Controlado por localStorage('onboarding_concluido').
 *
 * Telas:
 *  0 — Bem-vindo
 *  1 — Instalar como app  (pulada se já está em standalone)
 *  2 — Permitir notificações (pulada se já concedidas)
 *  3 — Pronto!
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { subscribeToPush } from '@/lib/push/subscribe'

type Apelido = 'Vitim' | 'Gaia'

export function Onboarding({ apelido }: { apelido: Apelido }) {
  const router = useRouter()

  const [visible,      setVisible]      = useState(false)
  const [step,         setStep]         = useState(0)
  const [isStandalone, setIsStandalone] = useState(false)
  const [notifGranted, setNotifGranted] = useState(false)
  const [loadingPush,  setLoadingPush]  = useState(false)

  useEffect(() => {
    if (localStorage.getItem('onboarding_concluido') === 'true') return

    const standalone = window.matchMedia('(display-mode: standalone)').matches
    const granted    = typeof Notification !== 'undefined' && Notification.permission === 'granted'

    setIsStandalone(standalone)
    setNotifGranted(granted)
    setVisible(true)
  }, [])

  if (!visible) return null

  // ── Passos efetivos (exclui pulados) ──────────────────────────
  const effectiveSteps = [0, isStandalone ? null : 1, notifGranted ? null : 2, 3]
    .filter((s): s is number => s !== null)

  const dotIndex  = effectiveSteps.indexOf(step)
  const totalDots = effectiveSteps.length

  function nextStep() {
    let next = step + 1
    if (next === 1 && isStandalone)  next = 2
    if (next === 2 && notifGranted)  next = 3
    setStep(next)
  }

  async function handleAllowNotifications() {
    setLoadingPush(true)
    try {
      const result = await subscribeToPush()
      if (result.ok) {
        const subJson = result.subscription.toJSON()
        const keys = subJson.keys as { p256dh?: string; auth?: string } | undefined
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            p256dh:   keys?.p256dh,
            auth:     keys?.auth,
          }),
        })
      }
    } catch { /* silencia erros — não bloqueia o fluxo */ }
    setLoadingPush(false)
    setStep(3)
  }

  function finish() {
    localStorage.setItem('onboarding_concluido', 'true')
    setVisible(false)
    router.replace('/')
  }

  // ── UI ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">

      {/* Barra de progresso */}
      <div className="flex justify-center items-center gap-2 pt-12">
        {Array.from({ length: totalDots }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === dotIndex
                ? 'w-6 h-2 bg-emerald-500'
                : i < dotIndex
                  ? 'w-2 h-2 bg-emerald-800'
                  : 'w-2 h-2 bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Conteúdo da tela atual — key={step} re-dispara a animação */}
      <div
        key={step}
        className="flex-1 flex flex-col items-center justify-center px-8 text-center animate-slideInRight"
      >
        {step === 0 && <StepWelcome    apelido={apelido} onNext={nextStep} />}
        {step === 1 && <StepInstall    onNext={nextStep} />}
        {step === 2 && <StepNotifications onAllow={handleAllowNotifications} onSkip={() => setStep(3)} loading={loadingPush} />}
        {step === 3 && <StepDone       onFinish={finish} />}
      </div>
    </div>
  )
}

// ── Tela 0: Bem-vindo ─────────────────────────────────────────────

function StepWelcome({ apelido, onNext }: { apelido: Apelido; onNext: () => void }) {
  return (
    <div className="space-y-8 w-full max-w-xs">
      <div className="space-y-4">
        <span className="text-7xl" role="img" aria-label="dinheiro">💰</span>
        <h1 className="text-3xl font-bold text-white tracking-tight">DinDin</h1>
      </div>

      <div className="space-y-3">
        <p className="text-xl font-semibold text-white">Olá, {apelido}! 👋</p>
        <p className="text-slate-300 leading-relaxed">
          Controle financeiro do casal,<br />sem complicação.
        </p>
        <p className="text-slate-400 text-sm leading-relaxed">
          Registre gastos em 3 toques.<br />
          Saiba sempre quem deve para quem.
        </p>
      </div>

      <button
        onClick={onNext}
        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 text-base transition-colors"
      >
        Vamos começar →
      </button>
    </div>
  )
}

// ── Tela 1: Instalar como app ─────────────────────────────────────

function StepInstall({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-8 w-full max-w-xs">
      <div className="space-y-3">
        <span className="text-6xl" role="img" aria-label="celular">📱</span>
        <h2 className="text-2xl font-bold text-white">Instale o app</h2>
        <p className="text-slate-300 text-sm leading-relaxed">
          Para usar o DinDin como um app de verdade, adicione à tela inicial.
        </p>
      </div>

      <div className="space-y-4 text-left">
        <div className="rounded-xl bg-slate-800 p-4 space-y-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">No iPhone (Safari)</p>
          <ol className="text-slate-300 text-sm space-y-1 list-none">
            <li>1. Toque em <span className="text-white">⬆</span> (compartilhar)</li>
            <li>2. Role até <span className="text-white">&quot;Adicionar à Tela de Início&quot;</span></li>
            <li>3. Toque em <span className="text-white">&quot;Adicionar&quot;</span></li>
          </ol>
        </div>

        <div className="rounded-xl bg-slate-800 p-4 space-y-2">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">No Android (Chrome)</p>
          <ol className="text-slate-300 text-sm space-y-1 list-none">
            <li>1. Toque em <span className="text-white">⋮</span> (menu)</li>
            <li>2. <span className="text-white">&quot;Adicionar à tela inicial&quot;</span></li>
          </ol>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-3 text-sm transition-colors"
      >
        Já está instalado, continuar →
      </button>
    </div>
  )
}

// ── Tela 2: Notificações ──────────────────────────────────────────

function StepNotifications({
  onAllow, onSkip, loading
}: {
  onAllow: () => void
  onSkip:  () => void
  loading: boolean
}) {
  return (
    <div className="space-y-8 w-full max-w-xs">
      <div className="space-y-3">
        <span className="text-6xl" role="img" aria-label="sino">🔔</span>
        <h2 className="text-2xl font-bold text-white">Fique por dentro</h2>
      </div>

      <div className="space-y-3 text-slate-300 text-sm leading-relaxed">
        <p>Todo dia às <strong className="text-white">22h</strong>, te lembramos de registrar os gastos do dia.</p>
        <p className="text-slate-400">
          É só 1 notificação por dia — e só se você não tiver registrado nada ainda.
        </p>
      </div>

      <div className="space-y-3 w-full">
        <button
          onClick={onAllow}
          disabled={loading}
          className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:text-emerald-600 text-white font-semibold py-4 text-base transition-colors"
        >
          {loading ? 'Ativando…' : 'Permitir notificações'}
        </button>
        <button
          onClick={onSkip}
          disabled={loading}
          className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors"
        >
          Agora não
        </button>
      </div>
    </div>
  )
}

// ── Tela 3: Pronto! ───────────────────────────────────────────────

function StepDone({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="space-y-8 w-full max-w-xs">
      <div className="space-y-3">
        <span className="text-7xl" role="img" aria-label="feito">✅</span>
        <h2 className="text-2xl font-bold text-white">Pronto!</h2>
        <p className="text-slate-300 leading-relaxed">O DinDin está configurado.</p>
      </div>

      <p className="text-slate-400 text-sm leading-relaxed">
        Registre seu primeiro gasto tocando no botão{' '}
        <span className="text-white font-bold text-lg">+</span>{' '}
        na tela principal.
      </p>

      <button
        onClick={onFinish}
        className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 text-base transition-colors"
      >
        Ir para o DinDin →
      </button>
    </div>
  )
}
