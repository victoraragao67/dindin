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

export function Onboarding({ apelido }: { apelido: string }) {
  const router = useRouter()

  const [visible,      setVisible]      = useState(false)
  const [step,         setStep]         = useState(0)
  const [isStandalone, setIsStandalone] = useState(false)
  const [notifGranted, setNotifGranted] = useState(false)
  const [loadingPush,  setLoadingPush]  = useState(false)
  const [pushErro,     setPushErro]     = useState<string | null>(null)

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
    setPushErro(null)
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
        // Sucesso — avança para a tela final
        setLoadingPush(false)
        setStep(3)
      } else if (result.reason === 'sw-timeout') {
        // SW não ativou — mostra erro mas deixa o usuário pular
        setLoadingPush(false)
        setPushErro('App desatualizado. Feche o Nosso DinDin, aguarde 5s e reabra.')
      } else {
        // Outro erro (denied, unsupported) — avança sem bloquear
        setLoadingPush(false)
        setStep(3)
      }
    } catch {
      // Erro inesperado — não bloqueia o fluxo
      setLoadingPush(false)
      setStep(3)
    }
  }

  function finish() {
    localStorage.setItem('onboarding_concluido', 'true')
    setVisible(false)
    router.replace('/')
  }

  // ── UI ─────────────────────────────────────────────────────────
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }}>

      {/* Barra de progresso */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, paddingTop: 48 }}>
        {Array.from({ length: totalDots }).map((_, i) => (
          <div
            key={i}
            style={{
              borderRadius: 999,
              transition: 'all 0.3s',
              width:  i === dotIndex ? 24 : 8,
              height: 8,
              background: i === dotIndex
                ? 'var(--coral)'
                : i < dotIndex
                  ? 'var(--border)'
                  : 'var(--border)',
              opacity: i === dotIndex ? 1 : i < dotIndex ? 0.6 : 0.3,
            }}
          />
        ))}
      </div>

      {/* Conteúdo da tela atual — key={step} re-dispara a animação */}
      <div
        key={step}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '0 32px',
          textAlign: 'center',
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {step === 0 && <StepWelcome    apelido={apelido} onNext={nextStep} />}
        {step === 1 && <StepInstall    onNext={nextStep} />}
        {step === 2 && <StepNotifications onAllow={handleAllowNotifications} onSkip={() => setStep(3)} loading={loadingPush} erro={pushErro} />}
        {step === 3 && <StepDone       onFinish={finish} />}
      </div>
    </div>
  )
}

// ── Botão primário reutilizável ───────────────────────────────────
function BtnPrimary({ onClick, disabled, children }: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        background: disabled ? 'var(--bg-2)' : 'var(--ink)',
        color: disabled ? 'var(--muted)' : 'var(--bg)',
        borderRadius: 100,
        padding: '14px',
        fontSize: 15,
        fontWeight: 600,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  )
}

// ── Tela 0: Bem-vindo ─────────────────────────────────────────────

function StepWelcome({ apelido, onNext }: { apelido: string; onNext: () => void }) {
  return (
    <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 32 }}>

      {/* Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 72, height: 72, borderRadius: 24,
          background: 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 32, fontWeight: 700, letterSpacing: -2, color: 'var(--bg)' }}>D</span>
          <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 32, fontWeight: 700, letterSpacing: -2, color: '#7A9E7E' }}>D</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontSize: 28, fontWeight: 700, letterSpacing: -1,
          color: 'var(--ink)', lineHeight: 1, margin: 0,
        }}>
          Nosso <em style={{ color: '#7A9E7E', fontStyle: 'italic', fontWeight: 300 }}>DinDin</em>
        </h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', margin: 0 }}>
          Olá, {apelido}! 👋
        </p>
        <p style={{ fontSize: 15, color: 'var(--ink)', margin: 0, lineHeight: 1.5 }}>
          Finanças a dois,<br />sem enrolação.
        </p>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
          Registre gastos em 3 toques.<br />
          Saiba sempre quem deve para quem.
        </p>
      </div>

      <BtnPrimary onClick={onNext}>Vamos começar →</BtnPrimary>
    </div>
  )
}

// ── Tela 1: Instalar como app ─────────────────────────────────────

function StepInstall({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 28 }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 56 }} role="img" aria-label="celular">📱</span>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
          Instale o app
        </h2>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
          Para usar o Nosso DinDin como um app de verdade, adicione à tela inicial.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '14px 16px',
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 8px' }}>
            No iPhone (Safari)
          </p>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              <>Toque em <strong style={{ color: 'var(--ink)' }}>⬆</strong> (compartilhar)</>,
              <>Role até <strong style={{ color: 'var(--ink)' }}>&quot;Adicionar à Tela de Início&quot;</strong></>,
              <>Toque em <strong style={{ color: 'var(--ink)' }}>&quot;Adicionar&quot;</strong></>,
            ].map((item, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--coral)', fontWeight: 600, marginRight: 6 }}>{i + 1}.</span>
                {item}
              </li>
            ))}
          </ol>
        </div>

        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '14px 16px',
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 8px' }}>
            No Android (Chrome)
          </p>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              <>Toque em <strong style={{ color: 'var(--ink)' }}>⋮</strong> (menu)</>,
              <><strong style={{ color: 'var(--ink)' }}>&quot;Adicionar à tela inicial&quot;</strong></>,
            ].map((item, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--coral)', fontWeight: 600, marginRight: 6 }}>{i + 1}.</span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <button
        onClick={onNext}
        style={{
          background: 'none', border: 'none',
          fontSize: 13, color: 'var(--muted)',
          cursor: 'pointer', padding: '4px 0', textAlign: 'center',
        }}
      >
        Já está instalado →{' '}
        <span style={{ color: 'var(--coral)', fontWeight: 500 }}>continuar</span>
      </button>
    </div>
  )
}

// ── Tela 2: Notificações ──────────────────────────────────────────

function StepNotifications({
  onAllow, onSkip, loading, erro
}: {
  onAllow: () => void
  onSkip:  () => void
  loading: boolean
  erro?: string | null
}) {
  return (
    <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 28 }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 56 }} role="img" aria-label="sino">🔔</span>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
          Fique por dentro
        </h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 14, color: 'var(--ink)', margin: 0, lineHeight: 1.6 }}>
          O app monitora o ritmo dos seus gastos e avisa <strong>na hora</strong> quando uma categoria está a caminho de estourar a meta — antes de acontecer.
        </p>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
          Às 22h, um lembrete leve caso você ainda não tenha registrado nada no dia.
        </p>
      </div>

      {erro && (
        <p style={{ fontSize: 13, color: 'var(--coral)', margin: 0, lineHeight: 1.5, textAlign: 'center' }}>
          ⚠️ {erro}
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <BtnPrimary onClick={erro ? onSkip : onAllow} disabled={loading}>
          {loading ? 'Ativando…' : erro ? 'Pular por agora' : 'Permitir notificações'}
        </BtnPrimary>
        {!erro && (
          <button
            onClick={onSkip}
            disabled={loading}
            style={{
              background: 'none', border: 'none',
              fontSize: 13, color: 'var(--muted)',
              cursor: 'pointer', padding: '4px 0',
            }}
          >
            Agora não
          </button>
        )}
      </div>
    </div>
  )
}

// ── Tela 3: Pronto! ───────────────────────────────────────────────

function StepDone({ onFinish }: { onFinish: () => void }) {
  return (
    <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 28 }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 64 }} role="img" aria-label="feito">🎉</span>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
          Tudo pronto!
        </h2>
        <p style={{ fontSize: 15, color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
          O Nosso DinDin está configurado e pronto pra usar.
        </p>
      </div>

      <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
        Registre seu primeiro gasto tocando no botão{' '}
        <span style={{ color: 'var(--ink)', fontWeight: 700, fontSize: 18 }}>+</span>{' '}
        na tela principal.
      </p>

      <BtnPrimary onClick={onFinish}>Ir para o Nosso DinDin →</BtnPrimary>
    </div>
  )
}
