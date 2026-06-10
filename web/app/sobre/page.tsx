import Link from 'next/link'
import { ShareButton } from '@/components/share-button'

export default function SobrePage() {
  const features = [
    {
      emoji: '➕',
      bg: 'color-mix(in srgb, var(--sage) 14%, transparent)',
      title: 'Registre em 3 toques',
      desc: 'Botão ➕ → valor → categoria → salvar. Menos de 10 segundos.',
    },
    {
      emoji: '⚖️',
      bg: 'color-mix(in srgb, var(--coral) 12%, transparent)',
      title: 'Divida do jeito de vocês',
      desc: '50/50 ou por valor real. Pagou R$120 mas só R$35 era do outro? Digite os valores — o app calcula.',
    },
    {
      emoji: '🔄',
      bg: 'color-mix(in srgb, var(--sage) 14%, transparent)',
      title: 'Recorrentes automáticos',
      desc: 'Aluguel, Netflix, plano de saúde. Cadastra uma vez, o app lança todo mês.',
    },
    {
      emoji: '💸',
      bg: 'color-mix(in srgb, var(--coral) 12%, transparent)',
      title: 'Acerto via PIX',
      desc: 'No fim do mês, o saldo mostra o valor exato do acerto. Um PIX e a conta zera.',
    },
  ]

  const compareRows = [
    ['Feitas pra grupos, adaptadas pra casais', 'Feito pra casal, ponto final'],
    ['R$ 280 em 3x = 1 lançamento de R$ 280',  '3x de R$ 93,33, mês a mês'],
    ['Lança aluguel manualmente todo mês',       'Automático. Cadastrou uma vez.'],
    ['Anúncios na versão grátis',                'Zero anúncio. Gratuito pra sempre.'],
  ]

  const categories = [
    { emoji: '🏠', label: 'Fixo',        value: 'R$ 1.400', pct: 49, color: 'var(--sage)',  opacity: 1   },
    { emoji: '🛒', label: 'Mercado',     value: 'R$ 680',   pct: 24, color: 'var(--sage)',  opacity: 0.7 },
    { emoji: '🍽️', label: 'Restaurante', value: 'R$ 420',   pct: 15, color: 'var(--coral)', opacity: 0.8 },
    { emoji: '🎉', label: 'Lazer',       value: 'R$ 340',   pct: 12, color: 'var(--coral)', opacity: 0.6 },
  ]

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--bg)', paddingBottom: 0 }}>

      {/* ── Hero escuro ── */}
      <section style={{
        background: 'var(--ink)',
        padding: '32px 24px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Círculos decorativos */}
        <div style={{
          position: 'absolute', top: -30, right: -30,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(122,158,126,0.08)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, left: -10,
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(122,158,126,0.05)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, position: 'relative' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--ink)',
            border: '1.5px solid rgba(245,240,232,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 19, fontWeight: 700, letterSpacing: -2, lineHeight: 1, color: 'var(--bg)' }}>D</span>
            <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 19, fontWeight: 700, letterSpacing: -2, lineHeight: 1, color: 'var(--sage)' }}>D</span>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'rgba(245,240,232,0.45)', letterSpacing: '0.5px', margin: '0 0 2px' }}>Nosso</p>
            <p style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 18, fontWeight: 700, color: 'var(--bg)', margin: 0, letterSpacing: -0.5 }}>
              Din<span style={{ color: 'var(--sage)' }}>Din</span>
            </p>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontSize: 28, fontWeight: 700,
          color: 'var(--bg)', lineHeight: 1.2,
          margin: '0 0 12px', letterSpacing: -0.5,
        }}>
          Finanças a dois,<br />
          <em style={{ color: 'var(--sage)', fontStyle: 'italic', fontWeight: 300 }}>sem discussão.</em>
        </h1>

        <p style={{ fontSize: 14, color: 'rgba(245,240,232,0.55)', lineHeight: 1.6, margin: '0 0 28px' }}>
          Registre qualquer gasto em 3 toques. O saldo entre vocês aparece na hora. Sem planilha, sem &ldquo;você pagou isso?&rdquo;.
        </p>

        <Link href="/login" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--sage)', color: 'var(--ink)',
          borderRadius: 100, padding: '12px 22px',
          fontSize: 14, fontWeight: 700, textDecoration: 'none',
        }}>
          Criar minha conta <span>→</span>
        </Link>
      </section>

      {/* ── Conteúdo ── */}
      <div style={{ padding: '28px 20px 0', maxWidth: 480, margin: '0 auto' }}>

        {/* Como funciona */}
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: 'var(--muted)', textTransform: 'uppercase', margin: '0 0 14px' }}>
          Como funciona
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 28 }}>
          {features.map(f => (
            <div key={f.title} style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              padding: 14, borderRadius: 14,
              background: 'var(--card)', border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: f.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17,
              }}>
                {f.emoji}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: '0 0 3px' }}>{f.title}</p>
                <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Preview — gastos por categoria */}
        <div style={{
          background: 'var(--ink)', borderRadius: 16,
          padding: 20, marginBottom: 28,
        }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: 'rgba(245,240,232,0.35)', textTransform: 'uppercase', margin: '0 0 4px' }}>
            Gastos do mês
          </p>
          <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--bg)', margin: '0 0 16px', letterSpacing: -1 }}>
            R$ 2.840<span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(245,240,232,0.35)' }}>,00</span>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categories.map(c => (
              <div key={c.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)' }}>{c.emoji} {c.label}</span>
                  <span style={{ fontSize: 11, color: 'rgba(245,240,232,0.5)' }}>{c.value}</span>
                </div>
                <div style={{ height: 3, background: 'rgba(245,240,232,0.08)', borderRadius: 100, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${c.pct}%`,
                    background: c.color,
                    opacity: c.opacity,
                    borderRadius: 100,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparativo */}
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: 'var(--muted)', textTransform: 'uppercase', margin: '0 0 14px' }}>
          Por que não outras soluções do mercado?
        </p>
        <div style={{
          background: 'var(--card)', borderRadius: 14,
          border: '1px solid var(--border)', overflow: 'hidden',
          marginBottom: 28,
        }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '10px 14px', borderRight: '1px solid var(--border)' }}>
              <p style={{ fontSize: 10, color: 'var(--muted)', margin: 0 }}>Outras soluções</p>
            </div>
            <div style={{ padding: '10px 14px', background: 'color-mix(in srgb, var(--sage) 8%, transparent)' }}>
              <p style={{ fontSize: 10, color: 'var(--sage)', fontWeight: 600, margin: 0 }}>Nosso DinDin</p>
            </div>
          </div>
          {compareRows.map(([left, right], i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              borderBottom: i < compareRows.length - 1 ? '1px solid var(--border)' : undefined,
            }}>
              <div style={{ padding: '10px 14px', borderRight: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--ink)', margin: 0, lineHeight: 1.4 }}>{left}</p>
              </div>
              <div style={{ padding: '10px 14px', background: 'color-mix(in srgb, var(--sage) 6%, transparent)' }}>
                <p style={{ fontSize: 12, color: 'var(--ink)', margin: 0, lineHeight: 1.4 }}>{right}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div style={{
          background: 'color-mix(in srgb, var(--sage) 8%, transparent)',
          borderRadius: 14, padding: 16,
          border: '1px solid color-mix(in srgb, var(--sage) 20%, transparent)',
          marginBottom: 28,
        }}>
          <p style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
            &ldquo;Nasceu de um problema real: a gente esquecia de registrar e no fim do mês não sabia quem devia pra quem.&rdquo;
          </p>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '8px 0 0' }}>
            — Vitim e Gaia, criadores do app
          </p>
        </div>

        {/* Métricas */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {[
            { value: 'R$ 0', label: 'custo por mês'       },
            { value: '3',    label: 'toques pra registrar' },
          ].map(m => (
            <div key={m.label} style={{
              flex: 1, background: 'var(--card)', borderRadius: 12,
              border: '1px solid var(--border)', padding: 12, textAlign: 'center',
            }}>
              <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{m.value}</p>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: '3px 0 0' }}>{m.label}</p>
            </div>
          ))}
        </div>

        {/* Instalar o app */}
        <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '2px', color: 'var(--muted)', textTransform: 'uppercase', margin: '0 0 14px' }}>
          Instale o app no celular
        </p>
        <div style={{
          background: 'var(--card)', borderRadius: 14,
          border: '1px solid var(--border)', overflow: 'hidden',
          marginBottom: 28,
        }}>
          {/* iOS */}
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--bg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, flexShrink: 0,
              }}>🍎</div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>iPhone (Safari)</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                <>Toque no ícone de compartilhar ⬆️ na barra do Safari</>,
                <><strong style={{ color: 'var(--ink)' }}>&ldquo;Adicionar à Tela de Início&rdquo;</strong></>,
                <>Toque em <strong style={{ color: 'var(--ink)' }}>&ldquo;Adicionar&rdquo;</strong> — pronto!</>,
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--sage)', color: 'var(--ink)',
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{i + 1}</span>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Android */}
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'var(--bg-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, flexShrink: 0,
              }}>🤖</div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>Android (Chrome)</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                <>Toque nos 3 pontos ⋮ no canto superior direito</>,
                <><strong style={{ color: 'var(--ink)' }}>&ldquo;Adicionar à tela inicial&rdquo;</strong></>,
                <>Confirme tocando em <strong style={{ color: 'var(--ink)' }}>&ldquo;Instalar&rdquo;</strong> — pronto!</>,
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--sage)', color: 'var(--ink)',
                    fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{i + 1}</span>
                  <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chamada de indicação */}
        <div style={{
          background: 'var(--ink)', borderRadius: 16,
          padding: 20, marginBottom: 20, textAlign: 'center',
        }}>
          <p style={{ fontSize: 22, margin: '0 0 10px' }}>💚</p>
          <p style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 15, fontWeight: 700, color: 'var(--bg)', margin: '0 0 8px', letterSpacing: -0.3 }}>
            Gostou? Chame seu casal.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(245,240,232,0.55)', lineHeight: 1.6, margin: '0 0 16px' }}>
            O app só faz sentido quando os dois usam. Mande esse link pro seu parceiro e comecem juntos.
          </p>
          <ShareButton />
        </div>

        {/* CTA final */}
        <Link href="/login" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'var(--ink)', color: 'var(--bg)',
          borderRadius: 100, padding: '15px',
          fontSize: 15, fontWeight: 700, textDecoration: 'none',
          marginBottom: 12,
        }}>
          Criar minha conta →
        </Link>

        <p style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', margin: '0 0 40px' }}>
          Já tem conta?{' '}
          <Link href="/login" style={{ color: 'var(--sage)', textDecoration: 'underline' }}>
            Entrar →
          </Link>
        </p>

      </div>
    </main>
  )
}
